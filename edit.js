/* PeoplesHR Platform — publishing layer. Loaded only by editor.html.

   Your edits are a private draft in this browser. Publishing writes
   content.json back to the GitHub repository over the API, and the host
   redeploys the public site from that commit. Nothing here ships to the
   public page: index.html does not load this file.

   The token is a fine-grained personal access token with Contents read and
   write on this one repository, kept in this browser's localStorage. It never
   leaves your machine except as an Authorization header to api.github.com.  */
(function(){
  var CFG_KEY = "phr-platform-publish-cfg-v1";
  var bar, cfg = {owner:"", repo:"", branch:"main", path:"content.json", token:"",
                syncUrl:"/api/sync", syncKey:""};

  try {
    var raw = localStorage.getItem(CFG_KEY);
    if(raw) cfg = Object.assign(cfg, JSON.parse(raw));
  } catch(e){}

  function saveCfg(){
    var keep = Object.assign({}, cfg);
    try { localStorage.setItem(CFG_KEY, JSON.stringify(keep)); } catch(e){}
  }
  function ready(){ return cfg.owner && cfg.repo && cfg.token; }

  function stable(o){
    /* Key-order-independent compare, so a draft that only reordered keys is
       not reported as a change. */
    return JSON.stringify(o, Object.keys(flatten(o)).sort());
  }
  function flatten(o, out, pre){
    out = out || {}; pre = pre || "";
    if(o && typeof o === "object"){
      Object.keys(o).forEach(function(k){ out[k] = 1; flatten(o[k], out, pre+k); });
    }
    return out;
  }
  function dirty(){
    if(!window.PHR || !window.PHR_PUBLISHED) return false;
    try { return stable(window.PHR.doc()) !== stable(window.PHR_PUBLISHED); }
    catch(e){ return true; }
  }

  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function b64(str){
    /* btoa only speaks latin-1, and the content is full of typographic
       characters, so encode to UTF-8 bytes first. */
    var bytes = new TextEncoder().encode(str), bin = "";
    bytes.forEach(function(b){ bin += String.fromCharCode(b); });
    return btoa(bin);
  }

  function render(){
    var d = dirty(), ok = ready();
    bar.hidden = false;
    bar.className = "pubbar" + (d ? " dirty" : "");
    bar.innerHTML =
      '<span class="pdot"></span>' +
      '<span class="ptxt">' +
        (d ? "<strong>Unpublished draft.</strong> The public site still shows the last published version."
           : "<strong>Published.</strong> The public site matches what you are looking at.") +
      '</span>' +
      '<span class="pacts">' +
        (d ? '<button type="button" class="pbtn ghost" id="pDiscard">Discard draft</button>' : "") +
        '<button type="button" class="pbtn" id="pSync">Sync from monday.com</button>' +
        '<button type="button" class="pbtn" id="pSetup">' + (ok ? "Settings" : "Connect repository") + '</button>' +
        '<button type="button" class="pbtn prim" id="pGo"' + (d && ok ? "" : " disabled") + '>Publish</button>' +
      '</span>' +
      '<span class="pstatus" id="pStatus"></span>';

    document.getElementById("pGo").onclick = publish;
    document.getElementById("pSetup").onclick = setup;
    document.getElementById("pSync").onclick = sync;
    var dc = document.getElementById("pDiscard");
    if(dc) dc.onclick = function(){
      if(dc.dataset.armed !== "1"){ dc.dataset.armed = "1"; dc.textContent = "Confirm discard"; return; }
      window.PHR.clearDraft();
      location.reload();
    };
  }

  function status(msg, tone){
    var el = document.getElementById("pStatus");
    if(!el) return;
    el.textContent = msg || "";
    el.dataset.tone = tone || "";
  }

  function setup(){
    var w = document.getElementById("pSheet");
    if(w){ w.remove(); return; }
    var sheet = document.createElement("div");
    sheet.id = "pSheet"; sheet.className = "psheet";
    sheet.innerHTML =
      '<h4>Where the published content lives</h4>' +
      '<div class="frow3">' +
        '<div><label class="edlab">GitHub owner</label><input id="cOwner" type="text" value="' + esc(cfg.owner) + '" placeholder="your-github-username"></div>' +
        '<div><label class="edlab">Repository</label><input id="cRepo" type="text" value="' + esc(cfg.repo) + '" placeholder="peopleshr-platform"></div>' +
        '<div><label class="edlab">Branch</label><input id="cBranch" type="text" value="' + esc(cfg.branch) + '"></div>' +
      '</div>' +
      '<label class="edlab">Fine-grained token, Contents read and write on that repository</label>' +
      '<input id="cToken" type="password" value="' + esc(cfg.token) + '" placeholder="github_pat_...">' +
      '<p class="phint">Kept in this browser only. Anyone who can use this browser profile can read it, so scope the token to this one repository and revoke it if the machine changes hands.</p>' +
      '<h4>Syncing from monday.com</h4>' +
      '<div class="frow2">' +
        '<div><label class="edlab">Sync endpoint</label><input id="cSyncUrl" type="text" value="' + esc(cfg.syncUrl) + '" placeholder="/api/sync"></div>' +
        '<div><label class="edlab">Sync key</label><input id="cSyncKey" type="password" value="' + esc(cfg.syncKey) + '" placeholder="matches SYNC_KEY in Vercel"></div>' +
      '</div>' +
      '<p class="phint">The monday.com token lives in the Vercel project, not here. This key only proves the request came from you.</p>' +
      '<div class="edact">' +
        '<button type="button" class="btn-sv" id="cSave">Save</button>' +
        '<button type="button" class="btn-cx" id="cClose">Close</button>' +
        '<button type="button" class="btn-cx" id="cTest">Test connection</button>' +
      '</div>';
    bar.after(sheet);

    document.getElementById("cSave").onclick = function(){
      cfg.owner  = document.getElementById("cOwner").value.trim();
      cfg.repo   = document.getElementById("cRepo").value.trim();
      cfg.branch = document.getElementById("cBranch").value.trim() || "main";
      cfg.token  = document.getElementById("cToken").value.trim();
      cfg.syncUrl = document.getElementById("cSyncUrl").value.trim() || "/api/sync";
      cfg.syncKey = document.getElementById("cSyncKey").value.trim();
      saveCfg(); sheet.remove(); render(); status("Saved", "ok");
    };
    document.getElementById("cClose").onclick = function(){ sheet.remove(); };
    document.getElementById("cTest").onclick = function(){
      var o = document.getElementById("cOwner").value.trim(),
          r = document.getElementById("cRepo").value.trim(),
          t = document.getElementById("cToken").value.trim();
      status("Checking…");
      api("GET", "/repos/" + o + "/" + r, null, t)
        .then(function(res){ status("Connected to " + res.full_name, "ok"); })
        .catch(function(err){ status(err.message, "bad"); });
    };
  }

  function api(method, path, body, token){
    return fetch("https://api.github.com" + path, {
      method: method,
      headers: {
        "Authorization": "Bearer " + (token || cfg.token),
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(j){
        if(r.ok) return j;
        var msg = j && j.message ? j.message : "HTTP " + r.status;
        if(r.status === 401) msg = "The token was rejected. Check it has not expired.";
        if(r.status === 403) msg = "Forbidden. The token needs Contents read and write on this repository.";
        if(r.status === 404) msg = "Not found. Check the owner, repository and that the token can see it.";
        if(r.status === 409) msg = "The file changed on GitHub since this page loaded. Reload and publish again.";
        throw new Error(msg);
      });
    }, function(){
      throw new Error("Could not reach GitHub. Check your connection.");
    });
  }

  function publish(){
    if(!ready()){ setup(); return; }
    var go = document.getElementById("pGo");
    go.disabled = true;
    status("Publishing…");

    var doc = window.PHR.doc();
    doc.updated = new Date().toISOString().slice(0,10);
    var text = JSON.stringify(doc, null, 2) + "\n";
    var base = "/repos/" + cfg.owner + "/" + cfg.repo + "/contents/" + cfg.path;

    api("GET", base + "?ref=" + encodeURIComponent(cfg.branch))
      .then(function(cur){ return cur.sha; }, function(){ return null; })
      .then(function(sha){
        var payload = {
          message: "Publish platform content " + doc.updated,
          content: b64(text),
          branch: cfg.branch
        };
        if(sha) payload.sha = sha;
        return api("PUT", base, payload);
      })
      .then(function(){
        window.PHR_PUBLISHED = JSON.parse(JSON.stringify(doc));
        window.PHR.clearDraft();
        render();
        status("Published. The public site rebuilds in about a minute.", "ok");
      })
      .catch(function(err){
        go.disabled = false;
        status(err.message, "bad");
      });
  }

  /* ── syncing from the monday.com board ──────────────────────────────────
     The browser calls this site's own /api/sync, which does the monday.com
     work server-side. What comes back is merged into the draft: the board
     owns lane, pillar, package, capture date, link and thesis, while the
     card title and one-line summary stay yours to write. Nothing reaches
     the public site until you press Publish.                              */

  function shortTitle(name){
    var t = String(name || "").split(/\s+[–—-]\s+/)[0].trim();
    return t.length > 52 ? t.slice(0, 51).trim() + "…" : t;
  }
  function firstSentence(s){
    var t = String(s || "").trim();
    if(!t) return "";
    var m = t.match(/^.{20,150}?[.!?](\s|$)/);
    t = m ? m[0].trim() : (t.length > 140 ? t.slice(0, 139).trim() + "…" : t);
    return t;
  }

  function sync(){
    var btn = document.getElementById("pSync");
    if(!cfg.syncKey){
      setup();
      status("Add a sync key first. It has to match SYNC_KEY in the Vercel project.", "bad");
      return;
    }
    btn.disabled = true;
    status("Reading the board…");

    fetch(cfg.syncUrl, {
      method: "POST",
      cache: "no-store",
      headers: { "x-sync-key": cfg.syncKey, "Content-Type": "application/json" }
    })
      .then(function(r){
        return r.json().catch(function(){ return null; }).then(function(j){
          if(r.status === 404) throw new Error("No sync endpoint at " + cfg.syncUrl + ". Deploy api/sync.js and try again.");
          if(j && j.error) throw new Error(j.error);
          if(!r.ok) throw new Error("The sync endpoint returned HTTP " + r.status + ".");
          if(!j || !j.ok) throw new Error("The sync endpoint returned something unexpected.");
          return j;
        });
      })
      .then(function(payload){
        var res = merge(payload);
        btn.disabled = false;
        report(payload, res);
      })
      .catch(function(err){
        btn.disabled = false;
        var m = /failed to fetch|networkerror/i.test(err.message || "")
          ? "Could not reach " + cfg.syncUrl + ". Check the site is deployed and you are online."
          : err.message;
        status(m, "bad");
      });
  }

  function merge(payload){
    var doc = window.PHR.doc();
    var pkgKeys = Object.keys(doc.packages || {});
    var pilKeys = Object.keys(doc.pillars || {});
    var laneKeys = Object.keys(doc.lanes || {now:1,next:1,later:1});

    var index = {};
    doc.items.forEach(function(i){ index[i.id] = i; });

    var added = [], changed = [], unchanged = 0, notes = [];
    var seen = {};

    payload.items.forEach(function(m){
      seen[m.id] = true;
      var cur = index[m.id], isNew = !cur, diffs = [];

      if(isNew){
        cur = {
          id: m.id,
          t: shortTitle(m.name),
          d: firstSentence(m.notes),
          s: laneKeys.indexOf(m.lane) >= 0 ? m.lane : laneKeys[0],
          p: pkgKeys[0],
          pl: pilKeys[0],
          detail: { captured:"", monday:"", ado:"", thesis:"" }
        };
        doc.items.push(cur);
        index[cur.id] = cur;
      }
      cur.detail = cur.detail || {};

      function set(obj, key, val, label){
        if(val == null || val === "" || obj[key] === val) return;
        if(!isNew) diffs.push(label);
        obj[key] = val;
      }

      if(laneKeys.indexOf(m.lane) < 0) notes.push('"' + cur.t + '" is in a group this site has no lane for.');
      else set(cur, "s", m.lane, "lane");

      if(m.pillar){
        if(pilKeys.indexOf(m.pillar) < 0) notes.push('"' + cur.t + '" has pillar "' + m.pillar + '", which is not one of the seven on this site, so it was left alone.');
        else set(cur, "pl", m.pillar, "pillar");
      }
      if(m.pkg){
        if(pkgKeys.indexOf(m.pkg) < 0) notes.push('"' + cur.t + '" has package "' + m.pkg + '", which is not one of this site’s packages, so it was left alone.');
        else set(cur, "p", m.pkg, "package");
      }
      set(cur.detail, "captured", m.captured, "captured date");
      set(cur.detail, "monday", m.monday, "monday link");
      set(cur.detail, "thesis", m.thesis, "thesis");

      if(isNew) added.push(cur.t);
      else if(diffs.length) changed.push(cur.t + " (" + diffs.join(", ") + ")");
      else unchanged++;
    });

    var missing = doc.items.filter(function(i){ return !seen[i.id]; })
                           .map(function(i){ return i.t; });

    window.PHR.reindex();
    window.PHR.persist();
    window.PHR.rerender();
    return { added:added, changed:changed, unchanged:unchanged, missing:missing, notes:notes };
  }

  function report(payload, res){
    var old = document.getElementById("pSheet");
    if(old) old.remove();

    var parts = [];
    parts.push(res.added.length + " added, " + res.changed.length + " changed, " + res.unchanged + " unchanged");
    status("Synced from " + (payload.board ? payload.board.name : "the board") + ". " + parts[0] + ".", "ok");

    var lines = [];
    if(res.added.length)   lines.push("<h4>Added</h4><ul><li>" + res.added.map(esc).join("</li><li>") + "</li></ul>");
    if(res.changed.length) lines.push("<h4>Changed</h4><ul><li>" + res.changed.map(esc).join("</li><li>") + "</li></ul>");
    if(res.missing.length) lines.push("<h4>On the site but not on the board</h4><ul><li>" + res.missing.map(esc).join("</li><li>") +
                                      "</li></ul><p class=\"phint\">These were left in place. Delete them from a capability drawer if they should go.</p>");
    var warn = (payload.warnings || []).concat(res.notes);
    if(warn.length)        lines.push("<h4>Worth knowing</h4><ul><li>" + warn.map(esc).join("</li><li>") + "</li></ul>");
    if(!lines.length)      lines.push("<p class=\"phint\">The site already matched the board. Nothing changed.</p>");

    var sheet = document.createElement("div");
    sheet.id = "pSheet"; sheet.className = "psheet";
    sheet.innerHTML = "<h4>Sync result</h4>" + lines.join("") +
      '<div class="edact"><button type="button" class="btn-cx" id="sClose">Close</button></div>';
    bar.after(sheet);
    document.getElementById("sClose").onclick = function(){ sheet.remove(); };
  }

  function init(){
    bar = document.getElementById("pubbar");
    if(!bar || !window.PHR) { setTimeout(init, 120); return; }
    window.PHR.onChange = render;
    render();
    if(!ready()) status("Connect a repository to publish.", "");
  }
  init();
})();
