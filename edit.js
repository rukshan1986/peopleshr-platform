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
  var bar, cfg = {owner:"", repo:"", branch:"main", path:"content.json", token:""};

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
        '<button type="button" class="pbtn" id="pSetup">' + (ok ? "Settings" : "Connect repository") + '</button>' +
        '<button type="button" class="pbtn prim" id="pGo"' + (d && ok ? "" : " disabled") + '>Publish</button>' +
      '</span>' +
      '<span class="pstatus" id="pStatus"></span>';

    document.getElementById("pGo").onclick = publish;
    document.getElementById("pSetup").onclick = setup;
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

  function init(){
    bar = document.getElementById("pubbar");
    if(!bar || !window.PHR) { setTimeout(init, 120); return; }
    window.PHR.onChange = render;
    render();
    if(!ready()) status("Connect a repository to publish.", "");
  }
  init();
})();
