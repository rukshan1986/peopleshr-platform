/* Server-side sync from the monday.com board.
   Runs on Vercel, never in the browser, so the monday token stays in the
   deployment's environment variables and never reaches a visitor's machine.
   monday's API does not answer cross-origin browser requests, which is the
   other reason this lives here.

   Environment variables, set in the Vercel project:
     MONDAY_TOKEN      a monday.com personal API token, read access is enough
     SYNC_KEY          any long random string, also pasted into the editor
     MONDAY_BOARD_ID   optional, defaults to the 2H 2026 board

   Without SYNC_KEY the endpoint refuses every request, so an unconfigured
   deployment cannot leak the board.                                        */

const API = "https://api.monday.com/v2";
const DEFAULT_BOARD = "5029507352";

const COL = {
  pillar:   "S Pillar",
  pkg:      "Package",
  thesis:   "Thesis",
  captured: "Date Insight Created",
  itemId:   "Item ID",
  ado:      "Azure DevOps ID",
  notes:    "Notes",
  module:   "Module"
};
const LANES = { now: "now", next: "next", later: "later" };
/* The Azure DevOps column normally holds a full work item URL. A bare number
   is accepted too and turned into one against this base. */
const ADO_BASE = (process.env.ADO_BASE_URL || "https://dev.azure.com/PeoplesHR/HRM").replace(/\/+$/, "");
function adoUrl(raw){
  const v = String(raw == null ? "" : raw).trim();
  if(!v) return null;
  if(/^https?:\/\//i.test(v)) return v;
  const n = v.match(/(\d+)/);
  return n ? ADO_BASE + "/_workitems/edit/" + n[1] : null;
}
const TITLE_BLOCK = /title$/i;
const LIST_BLOCK = { "bulleted list": "ul", "check list": "ul", "numbered list": "ol" };

function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function gql(query, variables, token){
  const r = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
      "API-Version": "2024-10"
    },
    body: JSON.stringify({ query, variables: variables || {} })
  });
  const j = await r.json().catch(function(){ return null; });
  if(!r.ok) throw new Error("monday.com returned HTTP " + r.status);
  if(!j) throw new Error("monday.com returned something that was not JSON.");
  if(j.errors && j.errors.length) throw new Error(j.errors[0].message || "monday.com rejected the query.");
  return j.data;
}

/* A monday doc is a flat list of blocks. Each block's content is JSON holding
   deltaFormat runs. The whole document is rendered, in order, into the small
   subset of HTML the page sanitises to: h5, p, ul, ol, li, strong, em.      */
function runsToHtml(runs){
  return (runs || []).map(function(run){
    let t = esc(run.insert);
    if(!t) return "";
    const a = run.attributes || {};
    if(a.bold)   t = "<strong>" + t + "</strong>";
    if(a.italic) t = "<em>" + t + "</em>";
    return t;
  }).join("");
}

function docHtml(blocks){
  const out = [];
  let list = null;

  function closeList(){
    if(list){ out.push("<" + list.tag + ">" + list.items.join("") + "</" + list.tag + ">"); list = null; }
  }

  for(const b of (blocks || [])){
    let c = {};
    try { c = JSON.parse(b.content || "{}"); } catch(e){ c = {}; }
    const html = runsToHtml(c.deltaFormat).trim();
    const type = String(b.type || "");

    if(TITLE_BLOCK.test(type)){            /* large, medium and small title */
      closeList();
      if(html) out.push("<h5>" + html + "</h5>");
      continue;
    }
    if(LIST_BLOCK[type]){
      const tag = LIST_BLOCK[type];
      if(!list || list.tag !== tag){ closeList(); list = { tag: tag, items: [] }; }
      if(html) list.items.push("<li>" + html + "</li>");
      continue;
    }
    closeList();
    if(html) out.push("<p>" + html + "</p>");   /* empty blocks are spacing */
  }
  closeList();
  return out.join("");
}

/* monday pages document blocks, 25 at a time by default, so a long document
   has to be walked page by page or it arrives silently truncated. */
async function docBlocks(objectId, token){
  const PAGE = 100;
  let all = [], page = 1;
  for(;;){
    const d = await gql(
      "query($o:[ID!],$p:Int,$l:Int){ docs(object_ids:$o){ blocks(limit:$l, page:$p){ type content } } }",
      { o: [objectId], p: page, l: PAGE }, token);
    const doc = d && d.docs && d.docs[0];
    const got = (doc && doc.blocks) || [];
    all = all.concat(got);
    if(got.length < PAGE || page >= 25) break;
    page++;
  }
  return all;
}

function colValue(item, byId, title){
  const id = byId[title];
  if(!id) return null;
  return (item.column_values || []).find(function(c){ return c.id === id; }) || null;
}

module.exports = async function handler(req, res){
  res.setHeader("Cache-Control", "no-store");

  const expected = process.env.SYNC_KEY;
  const given = req.headers["x-sync-key"];
  if(!expected){
    res.status(503).json({ ok:false, error:"This deployment has no SYNC_KEY set, so syncing is switched off." });
    return;
  }
  if(given !== expected){
    res.status(401).json({ ok:false, error:"Wrong sync key." });
    return;
  }
  const token = process.env.MONDAY_TOKEN;
  if(!token){
    res.status(503).json({ ok:false, error:"This deployment has no MONDAY_TOKEN set." });
    return;
  }

  const board = String(process.env.MONDAY_BOARD_ID || DEFAULT_BOARD);
  const warnings = [];

  try {
    const data = await gql(
      "query($b:[ID!]){ boards(ids:$b){ id name columns{ id title } " +
      "items_page(limit:200){ items{ id name group{ title } " +
      "column_values{ id text value } } } } }",
      { b: [board] }, token);

    const b = data && data.boards && data.boards[0];
    if(!b){ throw new Error("Board " + board + " was not found, or the token cannot see it."); }

    const byTitle = {};
    (b.columns || []).forEach(function(c){ byTitle[c.title] = c.id; });
    Object.keys(COL).forEach(function(k){
      if(!byTitle[COL[k]]) warnings.push('No column called "' + COL[k] + '" on the board.');
    });

    const raw = (b.items_page && b.items_page.items) || [];
    const items = [];
    const docJobs = [];

    raw.forEach(function(it){
      const lane = LANES[String((it.group && it.group.title) || "").trim().toLowerCase()];
      if(!lane){
        warnings.push('"' + it.name + '" sits in group "' + ((it.group && it.group.title) || "?") +
                      '", which is not Now, Next or Later, so it was skipped.');
        return;
      }
      const idCell = colValue(it, byTitle, COL.itemId);
      const itemId = (idCell && idCell.text) || it.id;

      const pillarCell   = colValue(it, byTitle, COL.pillar);
      const pkgCell      = colValue(it, byTitle, COL.pkg);
      const capturedCell = colValue(it, byTitle, COL.captured);
      const notesCell    = colValue(it, byTitle, COL.notes);
      const adoCell      = colValue(it, byTitle, COL.ado);
      const docCell      = colValue(it, byTitle, COL.thesis);

      let docId = null;
      if(docCell && docCell.value){
        try {
          const files = (JSON.parse(docCell.value).files || []);
          if(files.length && files[0].objectId) docId = String(files[0].objectId);
        } catch(e){}
      }

      const entry = {
        id: board + "-" + itemId,
        itemId: String(itemId),
        name: it.name,
        lane: lane,
        pillar: (pillarCell && pillarCell.text) || null,
        pkg: (pkgCell && pkgCell.text) ? String(pkgCell.text).split(",")[0].trim() : null,
        captured: (capturedCell && capturedCell.text) || null,
        notes: (notesCell && notesCell.text) || "",
        monday: "https://peopleshr-squad.monday.com/boards/" + board + "/pulses/" + it.id,
        ado: adoUrl(adoCell && adoCell.text),
        thesis: null
      };
      items.push(entry);
      if(docId) docJobs.push({ entry: entry, docId: docId });
      else warnings.push('"' + it.name + '" has no Thesis document, so its thesis was left as it was.');
    });

    /* monday returns an empty list when several doc ids are asked for at once,
       so the docs are fetched one at a time. */
    for(const job of docJobs){
      try {
        const html = docHtml(await docBlocks(job.docId, token));
        if(html) job.entry.thesis = html;
        else warnings.push('The Thesis document for "' + job.entry.name + '" is empty, so its thesis was left as it was.');
      } catch(e){
        warnings.push('Could not read the Thesis document for "' + job.entry.name + '": ' + e.message);
      }
    }

    res.status(200).json({
      ok: true,
      board: { id: b.id, name: b.name },
      /* Which optional columns exist on the board. The editor only clears a
         value the board owns when its column is actually there, so renaming a
         column cannot silently wipe the site. */
      columns: { ado: !!byTitle[COL.ado] },
      fetchedAt: new Date().toISOString(),
      items: items,
      warnings: warnings
    });
  } catch(e){
    res.status(502).json({ ok:false, error: e.message || String(e), warnings: warnings });
  }
};
