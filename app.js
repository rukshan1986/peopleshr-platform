/* PeoplesHR Platform — shared application.
   Reads content.json at load. The editor page sets window.PHR_EDIT = true
   before this script runs, which is the only thing that turns the editing
   affordances on. The public page never sets it. */
(function(){
  var CAN_EDIT = !!window.PHR_EDIT;

  /* Colour theme. Three states: follow the device, force light, force dark.
     The choice is this visitor's alone, kept in their browser. The head
     applies it before paint; this only wires the buttons and their state. */
  (function(){
    var KEY = "phr-theme", root = document.documentElement;
    function current(){
      try { return localStorage.getItem(KEY) || "system"; } catch(e){ return "system"; }
    }
    function apply(v){
      if(v === "light" || v === "dark") root.setAttribute("data-theme", v);
      else root.removeAttribute("data-theme");
      var btns = document.querySelectorAll("[data-theme-set]");
      Array.prototype.forEach.call(btns, function(b){
        b.setAttribute("aria-pressed", b.dataset.themeSet === v ? "true" : "false");
      });
    }
    function wire(){
      var host = document.querySelector(".themesw");
      if(!host) return;
      host.addEventListener("click", function(e){
        var b = e.target.closest("[data-theme-set]"); if(!b) return;
        var v = b.dataset.themeSet;
        try { v === "system" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, v); }
        catch(err){}
        apply(v);
      });
      apply(current());
    }
    if(document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", wire);
    else wire();
  })();

  function fail(msg){
    document.getElementById("board").innerHTML =
      '<div class="loadfail"><h2>Could not load the content</h2><p>' + msg + '</p></div>';
    var s = document.getElementById("viewStrategy");
    if(s) s.hidden = true;
    document.getElementById("viewRoadmap").hidden = false;
  }

  function start(data){
    window.ROADMAP = data;
    boot();
  }

  function boot(){

    var R = window.ROADMAP, LANES = [
      {k:"now",   label:"Now",   c:"--now",   bg:"--nowbg"},
      {k:"next",  label:"Next",  c:"--next",  bg:"--nextbg"},
      {k:"later", label:"Later", c:"--later", bg:"--laterbg"}
    ];
    var CAN_EDIT = !!window.PHR_EDIT;

  /* Colour theme. Three states: follow the device, force light, force dark.
     The choice is this visitor's alone, kept in their browser. The head
     applies it before paint; this only wires the buttons and their state. */
  (function(){
    var KEY = "phr-theme", root = document.documentElement;
    function current(){
      try { return localStorage.getItem(KEY) || "system"; } catch(e){ return "system"; }
    }
    function apply(v){
      if(v === "light" || v === "dark") root.setAttribute("data-theme", v);
      else root.removeAttribute("data-theme");
      var btns = document.querySelectorAll("[data-theme-set]");
      Array.prototype.forEach.call(btns, function(b){
        b.setAttribute("aria-pressed", b.dataset.themeSet === v ? "true" : "false");
      });
    }
    function wire(){
      var host = document.querySelector(".themesw");
      if(!host) return;
      host.addEventListener("click", function(e){
        var b = e.target.closest("[data-theme-set]"); if(!b) return;
        var v = b.dataset.themeSet;
        try { v === "system" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, v); }
        catch(err){}
        apply(v);
      });
      apply(current());
    }
    if(document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", wire);
    else wire();
  })();
    var state = {q:"", pkg:new Set(), pil:new Set()};
    var ITEMEDIT = false, DELARM = false;
    var byId = {}; R.items.forEach(function(i){ byId[i.id]=i; });
    var $ = function(id){ return document.getElementById(id); };

    $("ttl").textContent = R.title;
    document.title = R.title;
    var STAMPED = new Date(R.updated+"T00:00:00")
      .toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});

    function esc(s){ return String(s).replace(/[&<>"]/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

    /* ── matching ─────────────────────────────────────────── */
    function hit(i,skip){
      if(skip!=="pkg" && state.pkg.size && !state.pkg.has(i.p)) return false;
      if(skip!=="pil" && state.pil.size && !state.pil.has(i.pl)) return false;
      if(!state.q) return true;
      return (i.t+" "+i.d+" "+i.p+" "+i.pl).toLowerCase().indexOf(state.q)>-1;
    }
    function match(i){ return hit(i,null); }

    /* ── one filter control per taxonomy ──────────────────── */
    var CHECK = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
    var CHEV  = '<svg class="chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';

    function Filter(host, key, label, groups){
      var set = state[key], btn, pop, rows = [];

      btn = document.createElement("button");
      btn.className = "fbtn"; btn.type = "button";
      btn.setAttribute("aria-expanded","false"); btn.setAttribute("aria-haspopup","true");
      host.appendChild(btn);

      pop = document.createElement("div");
      pop.className = "pop"; pop.setAttribute("role","group");
      pop.setAttribute("aria-label",label);
      host.appendChild(pop);

      groups.forEach(function(g){
        if(g.title){
          var h = document.createElement("div");
          h.className = "grp";
          h.innerHTML = esc(g.title) + (g.note ? ' <em>'+esc(g.note)+'</em>' : "");
          pop.appendChild(h);
        }
        g.opts.forEach(function(o){
          var r = document.createElement("button");
          r.className = "opt"; r.type = "button";
          r.style.setProperty("--c", o.color);
          r.setAttribute("aria-pressed","false");
          r.innerHTML = '<span class="box">'+CHECK+'</span>'+
                        '<span class="swatch"></span>'+
                        '<span class="nm">'+esc(o.name)+'</span>'+
                        '<span class="meta"></span>';
          r.onclick = function(){
            set.has(o.name) ? set.delete(o.name) : set.add(o.name);
            render();
          };
          r.dataset.name = o.name; r.dataset.wt = o.weight || "";
          rows.push(r); pop.appendChild(r);
        });
      });

      var foot = document.createElement("div");
      foot.className = "popfoot";
      var clr = document.createElement("button");
      clr.className = "link"; clr.type = "button"; clr.textContent = "Clear " + label.toLowerCase();
      clr.onclick = function(){ set.clear(); render(); };
      foot.appendChild(clr); pop.appendChild(foot);

      btn.onclick = function(e){ e.stopPropagation(); toggle(!pop.classList.contains("open")); };
      pop.onclick = function(e){ e.stopPropagation(); };

      function toggle(on){
        if(on) closeAll(api);
        pop.classList.toggle("open", on);
        btn.setAttribute("aria-expanded", on ? "true" : "false");
      }

      var api = {
        close:function(){ toggle(false); },
        sync:function(){
          var n = set.size;
          btn.classList.toggle("act", n>0);
          btn.innerHTML = '<span class="k">'+esc(label)+'</span><span class="v">'+
            (n===0 ? "All" : n===1 ? esc(Array.from(set)[0]) : n+" selected")+'</span>'+CHEV;
          btn.setAttribute("aria-expanded", pop.classList.contains("open") ? "true" : "false");
          rows.forEach(function(r){
            var nm = r.dataset.name, on = set.has(nm);
            var c = R.items.filter(function(i){
              return (key==="pkg" ? i.p===nm : i.pl===nm) && hit(i,key); }).length;
            r.classList.toggle("on", on);
            r.classList.toggle("zero", c===0 && !on);
            r.setAttribute("aria-pressed", on ? "true" : "false");
            r.querySelector(".meta").textContent =
              (r.dataset.wt ? r.dataset.wt + "   ·   " : "") + c;
          });
          clr.hidden = set.size===0;
        }
      };
      return api;
    }

    var filters = [];
    function syncAll(){ filters.forEach(function(x){ x.sync(); }); syncPillars(); }
    function closeAll(except){
      filters.forEach(function(f){ if(f!==except) f.close(); });
    }
    document.addEventListener("click", function(){ closeAll(null); syncAll(); });

    filters.push(Filter($("fPkg"), "pkg", "Package", [
      {opts: Object.keys(R.packages).map(function(p){
        return {name:p, color:R.packages[p]}; })}
    ]));


    /* pillar glyphs: 24x24, stroked, inherit the pillar colour */
    var GLYPH = {
      flag:       '<path d="M5.6 21V3.6"/><path d="M5.6 4.6h12.2l-2.7 4.2 2.7 4.2H5.6z"/>',
      growth:     '<path d="M3.8 17.2l5-5 3.3 3.3 7.1-7.1"/><path d="M14.6 8.4h4.6V13"/>',
      heart:      '<path d="M12 20.4S4.6 15.6 4.6 10.6A3.9 3.9 0 0 1 12 8.4a3.9 3.9 0 0 1 7.4 2.2c0 5-7.4 9.8-7.4 9.8z"/>',
      shield:     '<path d="M12 3.2l7.2 3v5.4c0 4.4-3 7.6-7.2 8.8-4.2-1.2-7.2-4.4-7.2-8.8V6.2z"/><path d="M9.2 11.8l2 2 3.6-3.6"/>',
      rocket:     '<path d="M12 2.7c3 2.5 4.6 5.8 4.6 9.5L14.8 15.4H9.2L7.4 12.2c0-3.7 1.6-7 4.6-9.5z"/><circle cx="12" cy="9.5" r="1.7"/><path d="M9.2 15.4L5.9 18.4l1.7-5.6M14.8 15.4l3.3 3-1.7-5.6"/>',
      wrench:     '<path d="M15.4 4.3a4.6 4.6 0 0 0-6 5.7L4 15.4V20h4.6l5.4-5.4a4.6 4.6 0 0 0 5.7-6l-2.9 2.9-2.5-.7-.7-2.5z"/>',
      compliance: '<path d="M6.2 3.6h8.2l4 4V20.4H6.2z"/><path d="M14.2 3.6v4.2h4.2"/><path d="M9.4 14l1.9 1.9 3.5-3.5"/>'
    };
    function glyph(name){
      return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" '+
             'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+
             (GLYPH[name] || '<circle cx="12" cy="12" r="5"/>')+'</svg>';
    }

    /* pillar strip: contested group, gap column, protected group */
    var pilTiles = [];
    (function(){
      var host = $("pillars"), B = [], A = [];
      Object.keys(R.pillars).forEach(function(p){
        (R.pillars[p].cls==="A" ? A : B).push(p); });
      host.style.gridTemplateColumns =
        "repeat("+B.length+",1fr) 26px repeat("+A.length+",1fr)";

      function head(txt, note, a, b){
        var h = document.createElement("div");
        h.className = "ghead"; h.style.setProperty("--gh", a+"/"+b);
        h.innerHTML = esc(txt)+' <em>'+esc(note)+'</em>';
        host.appendChild(h);
      }
      function tile(name, col){
        var P = R.pillars[name];
        var t = document.createElement("button");
        t.className = "ptile"; t.type = "button";
        t.style.setProperty("--c", P.c);
        t.style.setProperty("--gc", col);
        t.dataset.pil = name;
        t.title = P.q;
        t.setAttribute("aria-pressed","false");
        t.innerHTML = '<span class="pic">'+glyph(P.ic)+'</span>'+
                      '<span class="nm">'+esc(name)+'</span>'+
                      '<span class="wt">'+esc(P.w)+'</span>'+
                      '<span class="ct"></span>';
        t.onclick = function(){
          state.pil.has(name) ? state.pil.delete(name) : state.pil.add(name);
          render();
        };
        pilTiles.push(t); host.appendChild(t);
      }

      head("Pillars \u00b7 contested capacity", "75%", 1, B.length+1);
      B.forEach(function(p,i){ tile(p, i+1); });
      var dv = document.createElement("div");
      dv.className = "gdiv"; dv.style.setProperty("--gc", String(B.length+1));
      host.appendChild(dv);
      head("Protected", "25%", B.length+2, B.length+A.length+2);
      A.forEach(function(p,i){ tile(p, B.length+2+i); });
    })();

    function syncPillars(){
      pilTiles.forEach(function(t){
        var nm = t.dataset.pil, on = state.pil.has(nm);
        var c = R.items.filter(function(i){ return i.pl===nm && hit(i,"pil"); }).length;
        t.classList.toggle("on", on);
        t.classList.toggle("zero", c===0 && !on);
        t.title = R.pillars[nm].q;
        t.setAttribute("aria-pressed", on ? "true" : "false");
        t.querySelector(".ct").textContent = c;
      });
    }

    /* ── board ────────────────────────────────────────────── */
    function render(){
      var board = $("board"); board.innerHTML = "";
      var shown = 0;
      LANES.forEach(function(L){
        var list = R.items.filter(function(i){ return i.s===L.k && match(i); });
        shown += list.length;
        var lane = document.createElement("section"); lane.className = "lane";
        lane.style.setProperty("--lc","var("+L.c+")");
        lane.style.setProperty("--lbg","var("+L.bg+")");
        var sub = (R.lanes && R.lanes[L.k]) || "";
        var h = '<div class="lanehead"><span class="mark"></span><span class="txt">'+
                '<h2>'+L.label+'</h2>'+
                (sub ? '<span class="sub">'+esc(sub)+'</span>' : "")+
                '</span><span class="n">'+list.length+'</span></div><div class="cards">';
        h += list.length ? list.map(function(i){
          return '<button class="card" data-id="'+i.id+'" style="--c:'+R.packages[i.p]+
                 ';--pc:'+R.pillars[i.pl].c+'">'+
                 '<h3>'+esc(i.t)+'</h3><p>'+esc(i.d)+'</p>'+
                 '<span class="foot"><span class="pk"><i></i>'+esc(i.p)+'</span>'+
                 '<span class="pl">'+esc(i.pl)+'</span></span></button>';
        }).join("") : '<div class="empty">Nothing matches.</div>';
        h += '</div>';
        if(CAN_EDIT) h += '<button type="button" class="addcap" data-lane="'+L.k+'">'+
                      ico('<path d="M12 5v14M5 12h14"/>',13)+'Add capability</button>';
        lane.innerHTML = h;
        board.appendChild(lane);
      });
      var active = state.q || state.pkg.size || state.pil.size;
      $("count").textContent = active ? shown+" of "+R.items.length : "";
      $("reset").hidden = !active;
      syncAll();
      hh();
    }


    /* ── links out ────────────────────────────────────────── */
    var ICO = {
      board:  '<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2.6"/><path d="M9.2 4.6v14.8M14.8 4.6v14.8"/>',
      ticket: '<path d="M3.8 11.2l7.4-7.4h7.2a1.8 1.8 0 0 1 1.8 1.8v7.2l-7.4 7.4a1.6 1.6 0 0 1-2.3 0l-6.7-6.7a1.6 1.6 0 0 1 0-2.3z"/><circle cx="15.6" cy="8.4" r="1.5"/>',
      arrow:  '<path d="M7.5 16.5L16.5 7.5M9.5 7.5h7v7"/>'
    };
    function ico(pathStr, size){
      return '<svg viewBox="0 0 24 24" width="'+(size||15)+'" height="'+(size||15)+'" aria-hidden="true" '+
             'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '+
             'stroke-linejoin="round">'+pathStr+'</svg>';
    }
    function mondayLabel(u){
      if(!u) return "";
      var m = /pulses\/(\d+)/.exec(u);
      return m ? "Item " + m[1].slice(-6) : "Open item";
    }
    function adoLabel(u){
      if(!u) return "";
      var m = /_workitems\/edit\/(\d+)/i.exec(u) || /[?&]id=(\d+)/i.exec(u);
      return m ? "#" + m[1] : "Open work item";
    }
    function link(name, url, colour, path, label){
      var body = '<span class="lkic">'+ico(path)+'</span>'+
                 '<span class="lknm">'+esc(name)+'</span>';
      if(!url) return '<div class="lk off" style="--lc2:'+colour+'">'+body+
                      '<span class="lkv">Not linked</span></div>';
      return '<a class="lk" style="--lc2:'+colour+'" href="'+esc(url)+'" target="_blank" '+
             'rel="noopener noreferrer">'+body+'<span class="lkv">'+esc(label)+'</span>'+
             '<span class="arw">'+ico(ICO.arrow,14)+'</span></a>';
    }

    /* ── strategy view ────────────────────────────────────── */
    var MARKETS = {sl:"Sri Lanka", ph:"Philippines", id:"Indonesia"};
    var MKEYS = ["sl","ph","id"];
    /* Inline SVG flags. Windows ships no country flag emoji, so emoji flags
       render there as a letter pair or as nothing at all. */
    var FLAGS = {
      sl:'<rect width="24" height="16" fill="#FFB700"/><rect x="1.3" y="1.3" width="3.2" height="13.4" fill="#00534E"/><rect x="5.1" y="1.3" width="3.2" height="13.4" fill="#EB7400"/><rect x="9.3" y="1.3" width="13.4" height="13.4" fill="#8D153A"/><path d="M14.4 5.2c1.1-.5 2.4-.2 3 .8.5.9.3 2.1-.4 2.8.5.6.6 1.5.2 2.2-.5.9-1.7 1.2-2.7.7l.4-.8c.6.3 1.3.1 1.6-.4.2-.4.1-.9-.2-1.2l-.7-.6.7-.5c.5-.4.6-1.1.3-1.6-.4-.6-1.1-.7-1.7-.4z" fill="#FFB700"/><rect x="12.6" y="5" width="1" height="6.4" rx=".4" fill="#FFB700"/><circle cx="10.7" cy="2.7" r=".85" fill="#FFB700"/><circle cx="21.3" cy="2.7" r=".85" fill="#FFB700"/><circle cx="10.7" cy="13.3" r=".85" fill="#FFB700"/><circle cx="21.3" cy="13.3" r=".85" fill="#FFB700"/>',
      ph:'<rect width="24" height="8" fill="#0038A8"/><rect y="8" width="24" height="8" fill="#CE1126"/><polygon points="0,0 0,16 13,8" fill="#FFFFFF"/><circle cx="3.6" cy="8" r="1.7" fill="#FCD116"/><circle cx="1.1" cy="1.9" r=".8" fill="#FCD116"/><circle cx="1.1" cy="14.1" r=".8" fill="#FCD116"/><circle cx="10.4" cy="8" r=".8" fill="#FCD116"/>',
      id:'<rect width="24" height="8" fill="#CE1126"/><rect y="8" width="24" height="8" fill="#FFFFFF"/>'
    };
    function flag(m){
      if(!FLAGS[m]) return "";
      return '<svg class="flg" viewBox="0 0 24 16" role="img" aria-label="'+esc(MARKETS[m])+
             ' flag">'+FLAGS[m]+'</svg>';
    }
    function flags(list){ return (list||[]).map(flag).join(""); }
    function pct(w){ return parseFloat(String(w)) || 0; }

    /* Content items are authored HTML. Only <strong> <em> <b> <i> <ul> <ol> <li>
       survive; the DOM is walked rather than the markup regexed, so anything
       pasted in or produced by execCommand is safe to render. */
    function rich(html){
      var INLINE = {STRONG:"strong", B:"strong", EM:"em", I:"em"};
      var LIST   = {UL:"ul", OL:"ol", LI:"li", P:"p"};
      var box = document.createElement("div");
      box.innerHTML = String(html == null ? "" : html);
      function walk(node){
        var out = "";
        Array.prototype.forEach.call(node.childNodes, function(ch){
          if(ch.nodeType === 3){ out += esc(ch.nodeValue); return; }
          if(ch.nodeType !== 1) return;
          if(ch.tagName === "BR"){ out += " "; return; }
          var inner = walk(ch);
          if(INLINE[ch.tagName]){
            if(inner.trim()) out += "<"+INLINE[ch.tagName]+">"+inner+"</"+INLINE[ch.tagName]+">";
          } else if(LIST[ch.tagName]){
            out += "<"+LIST[ch.tagName]+">"+inner+"</"+LIST[ch.tagName]+">";
          } else {
            out += inner + " ";
          }
        });
        return out;
      }
      return walk(box).replace(/\s+/g," ").trim();
    }
    /* An item that is nothing but a list continues the item above it, so it
       renders without a bullet of its own. */
    function listOnly(h){ return /^<(ul|ol)[\s>]/i.test(h); }

    /* ── content state ────────────────────────────────────────
       The live R objects are the model. Saved edits are applied onto them at
       boot, so the strip tooltips and the card drawers read the same strings
       the strategy tab shows. snapshot() writes them back out in the exact
       shape the Strategic Pillars artifact exports. */
    var SKEY = "phr-platform-draft-v1";
    var BKEY = {};   /* export key -> pillar name */
    Object.keys(R.pillars).forEach(function(p){ BKEY[R.pillars[p].key] = p; });
    function contested(){
      return Object.keys(R.pillars).filter(function(p){ return R.pillars[p].cls !== "A"; });
    }
    function det(p){
      var S = R.strategy;
      S.detail = S.detail || {};
      var d = S.detail[p] || (S.detail[p] = {});
      d.content = d.content || {general:[], byMarket:{sl:[],ph:[],id:[]}};
      d.content.byMarket = d.content.byMarket || {sl:[],ph:[],id:[]};
      MKEYS.forEach(function(m){
        d.content.byMarket[m] = d.content.byMarket[m] || [];
        d[m] = d[m] || {marker:"", tone:"mid", text:""};
      });
      return d;
    }
    function snapshot(){
      var out = {content:{}, boxes:{}, questions:{}};
      contested().forEach(function(p){
        var k = R.pillars[p].key, d = det(p);
        out.questions[k] = R.pillars[p].q;
        out.content[k] = {general:d.content.general.slice(), byMarket:{}};
        out.boxes[k] = {};
        MKEYS.forEach(function(m){
          out.content[k].byMarket[m] = d.content.byMarket[m].slice();
          out.boxes[k][m] = {marker:d[m].marker, tone:d[m].tone, text:d[m].text};
        });
      });
      return out;
    }
    function applySaved(saved){
      if(!saved || typeof saved !== "object") return false;
      var touched = false;
      Object.keys(saved.questions || {}).forEach(function(k){
        var p = BKEY[k]; if(!p) return;
        R.pillars[p].q = String(saved.questions[k]); touched = true;
      });
      Object.keys(saved.boxes || {}).forEach(function(k){
        var p = BKEY[k]; if(!p) return;
        var d = det(p);
        MKEYS.forEach(function(m){
          var b = saved.boxes[k][m]; if(!b) return;
          d[m] = {marker:String(b.marker||""), tone:String(b.tone||"mid"),
                  text:rich(b.text||"")};
          touched = true;
        });
      });
      Object.keys(saved.content || {}).forEach(function(k){
        var p = BKEY[k]; if(!p) return;
        var d = det(p), c = saved.content[k] || {};
        if(Array.isArray(c.general)) d.content.general = c.general.map(rich);
        MKEYS.forEach(function(m){
          if(c.byMarket && Array.isArray(c.byMarket[m]))
            d.content.byMarket[m] = c.byMarket[m].map(rich);
        });
        touched = true;
      });
      return touched;
    }
    var STORE_OK = true;
    function persist(){
      if(!CAN_EDIT) return;
      try { localStorage.setItem(SKEY, JSON.stringify(R)); }
      catch(e){ STORE_OK = false; }
      if(window.PHR && window.PHR.onChange) window.PHR.onChange();
      note();
    }
    function note(){
      var el = $("storeNote"); if(!el) return;
      el.textContent = STORE_OK
        ? "Edits are a private draft in this browser until you publish."
        : "This browser will not keep your draft. Publish or export before closing.";
      el.dataset.ok = STORE_OK ? "1" : "0";
    }

    /* ── editing ──────────────────────────────────────────── */
    var EDIT = null, OPEN = null, CUR = {};
    var GENERAL_LABEL = "Problem Space & Strategy";
    var PENCIL = '<path d="M16.5 3.2a2.6 2.6 0 1 1 3.7 3.7L7.6 19.5 2.6 21l1.5-5z"/>';
    function edBtn(attrs, label){
      if(!CAN_EDIT) return "";
      return '<button type="button" class="ed'+(label?"":" icon")+'" '+attrs+
             ' aria-label="Edit">'+ico(PENCIL,11)+esc(label)+'</button>';
    }
    function actions(){
      return '<div class="edact"><button type="button" class="btn-sv" data-save="1">Save</button>'+
             '<button type="button" class="btn-cx" data-cancel="1">Cancel</button></div>';
    }
    var RTOOL = '<div class="rtool">'+
      '<button type="button" class="rt" data-cmd="bold" title="Bold"><b>B</b></button>'+
      '<button type="button" class="rt" data-cmd="italic" title="Italic"><i>I</i></button>'+
      '<span class="rtsep"></span>'+
      '<button type="button" class="rt" data-cmd="insertUnorderedList" title="Bulleted list">&bull;&nbsp;List</button>'+
      '<button type="button" class="rt" data-cmd="insertOrderedList" title="Numbered list">1.&nbsp;List</button>'+
      '<span class="rtsep"></span>'+
      '<button type="button" class="rt" data-cmd="indent" title="Indent (Tab)">&rarr;</button>'+
      '<button type="button" class="rt" data-cmd="outdent" title="Outdent (Shift Tab)">&larr;</button>'+
      '</div>';

    function editingHere(t, p, x){
      return EDIT && EDIT.t===t && EDIT.p===p && (x===undefined || EDIT.x===x);
    }
    function listHost(items){
      return '<div class="rlist" contenteditable="true" spellcheck="false">'+
        (items.length ? '<ul>'+items.map(function(i){ return "<li>"+rich(i)+"</li>"; }).join("")+'</ul>'
                      : '<ul><li></li></ul>')+'</div>';
    }
    /* Chrome's execCommand indent/outdent emits a <ul> as a sibling of <li>
       when the whole host is list content, so nesting is done by hand. */
    function curLi(){
      var sel = window.getSelection(); if(!sel.rangeCount) return null;
      var n = sel.getRangeAt(0).startContainer;
      if(n.nodeType === 3) n = n.parentElement;
      return n && n.closest ? n.closest("li") : null;
    }
    function caretIn(node){
      if(!window.getSelection || !document.createRange) return;
      var host = node.closest && node.closest('[contenteditable="true"]');
      if(host) host.focus();
      var r = document.createRange(); r.selectNodeContents(node); r.collapse(false);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    function doIndent(){
      var li = curLi(); if(!li) return;
      var prev = li.previousElementSibling;
      if(!prev || prev.tagName !== "LI") return;
      var tag = li.parentElement.tagName.toLowerCase();
      var sub = prev.querySelector(":scope > ul, :scope > ol");
      if(!sub){ sub = document.createElement(tag); prev.appendChild(sub); }
      sub.appendChild(li); caretIn(li);
    }
    function doOutdent(){
      var li = curLi(); if(!li) return;
      var list = li.parentElement, gl = list.parentElement;
      if(!gl || gl.tagName !== "LI") return;
      gl.parentElement.insertBefore(li, gl.nextSibling);
      if(!list.children.length) list.remove();
      caretIn(li);
    }
    function readList(host){
      var out = [];
      Array.prototype.forEach.call(host.children, function(ch){
        if(ch.tagName === "UL" || ch.tagName === "OL"){
          Array.prototype.forEach.call(ch.children, function(li){
            if(li.tagName === "LI"){ var v = rich(li.innerHTML); if(v) out.push(v); }
          });
        } else {
          var v = rich(ch.innerHTML !== undefined ? ch.innerHTML : ch.textContent);
          if(v) out.push(v);
        }
      });
      return out;
    }

    function saveEdit(){
      if(!EDIT) return;
      var d = det(EDIT.p), root = $("viewStrategy");
      if(EDIT.t === "q"){
        R.pillars[EDIT.p].q = root.querySelector(".qin").value.trim();
      } else if(EDIT.t === "box"){
        d[EDIT.x] = {
          marker: root.querySelector(".bmk").value.trim(),
          tone:   root.querySelector(".btn-tone").value,
          text:   rich(root.querySelector(".btx").value.trim())
        };
      } else if(EDIT.t === "list"){
        var items = readList(root.querySelector(".rlist"));
        if(EDIT.x === "general") d.content.general = items;
        else d.content.byMarket[EDIT.x] = items;
      }
      EDIT = null; persist(); renderStrategy(); render();
    }

    /* ── render ───────────────────────────────────────────── */
    function renderStrategy(){
      var S = R.strategy; if(!S) return;
      var names = Object.keys(R.pillars);
      var B = names.filter(function(p){ return R.pillars[p].cls !== "A"; });
      var A = names.filter(function(p){ return R.pillars[p].cls === "A"; });
      var h = "";

      h += '<header class="shero">'+
        '<div class="eyebrow">'+esc(S.eyebrow)+'</div>'+
        '<h2>'+esc(S.title)+'</h2>'+
        '<p class="dek">'+esc(S.dek)+'</p>'+
        '<div class="ns">'+
          '<div class="eyebrow lbl">Organisational north star</div>'+
          '<div><div class="fig">'+esc(S.northstar.figure)+'</div>'+
          '<p class="said">'+esc(S.northstar.said)+'</p></div>'+
          '<div class="how"><div class="lbl2">Achieved by</div>'+
            S.northstar.how.map(function(r){
              return '<div class="row"><span class="fl">'+flags(r.markets)+'</span>'+
                     '<span>'+esc(r.text)+'</span></div>'; }).join("")+
          '</div></div></header>';

      h += '<section class="sec"><div class="sechead"><div class="eyebrow">Execution</div>'+
        '<h3>What has to be true in each market</h3>'+
        '<p>The two routes above, turned into the conditions the roadmap has to satisfy. '+
        'Every weight that follows answers to one of them.</p></div><div class="cards2">'+
        S.conditions.map(function(c){
          return '<div class="ccard"><div class="eyebrow">Condition for success</div>'+
                 '<div class="mk"><span class="fl">'+flags(c.markets)+'</span>'+esc(c.label)+'</div>'+
                 '<p>'+esc(c.text)+'</p></div>'; }).join("")+
        '</div></section>';

      var ordered = B.concat(A);
      var sumB = B.reduce(function(a,p){ return a+pct(R.pillars[p].w); },0);
      var sumA = A.reduce(function(a,p){ return a+pct(R.pillars[p].w); },0);
      var NARROW = 8, acc = 0;
      var centres = ordered.map(function(p){
        var w = pct(R.pillars[p].w), c = acc + w/2; acc += w; return c; });

      var slices = ordered.map(function(p){
        var P = R.pillars[p], w = pct(P.w), narrow = w < NARROW;
        var attr = P.cls === "A" ? 'data-scroll="protected"' : 'data-open="'+esc(p)+'"';
        return '<button type="button" class="slice'+(narrow?" narrow":"")+'" '+
               'style="flex:'+w+';--c:'+P.c+'" '+attr+' '+
               'aria-label="'+esc(p)+', '+w+' percent, open its section">'+
               (narrow?"":'<span class="sn">'+esc(p)+'</span>')+
               '<span class="sv">'+w+'%</span></button>';
      }).join("");

      var callouts = ordered.map(function(p,i){
        var P = R.pillars[p]; if(pct(P.w) >= NARROW) return "";
        return '<div class="co'+(centres[i]>82?" right":"")+'" style="left:'+centres[i]+'%">'+
               '<span class="tick" style="background:'+P.c+'"></span>'+
               '<span class="con">'+esc(p)+'</span></div>';
      }).join("");

      h += '<section class="sec"><div class="sechead"><div class="eyebrow">Capacity</div>'+
        '<h3>Where roadmap capacity goes</h3>'+
        '<p>The whole of roadmap capacity, sliced seven ways. Width is share, so the picture and '+
        'the numbers say the same thing. Click a slice to open its section.</p></div>'+
        '<div class="brackets">'+
          '<div class="bkt" style="flex:'+sumB+'"><span class="bn">Contested pillars</span>'+
          '<span class="bs">'+sumB+'%</span></div>'+
          '<div class="bkt" style="flex:'+sumA+'"><span class="bn">Protected</span>'+
          '<span class="bs">'+sumA+'%</span></div>'+
        '</div>'+
        '<div class="band">'+slices+'</div><div class="callouts">'+callouts+'</div>'+
        '<div class="subhead" id="protected"><h4>Protected investments</h4>'+
        '<p>'+esc(S.protectedNote)+'</p></div>'+
        '<div class="cards2">'+
          A.map(function(p){
            var P = R.pillars[p];
            return '<div class="acard" style="--c:'+P.c+'">'+
              '<div class="nr"><span class="pic">'+glyph(P.ic)+'</span>'+
              '<h4>'+esc(P.full || p)+'</h4><span class="wt">'+esc(P.w)+'</span></div>'+
              '<p>'+esc(S.protected[p] || P.q)+'</p></div>';
          }).join("")+
        '</div></section>';

      h += '<section class="sec"><div class="sechead"><div class="eyebrow">Roadmap</div>'+
        '<h3>Product Roadmap Strategy</h3>'+
        '<p>Click a pillar to open it. Problem Space and Strategy always shows, and clicking a '+
        'market loads what is specific to it. The question, the problem space, the market claims '+
        'and the market-specific strategy are all editable.</p></div>';

      /* overview grid: one card per contested pillar, one open at a time */
      h += '<div class="povgrid">'+ B.map(function(p){
        var P = R.pillars[p], on = OPEN === p;
        return '<div class="pov'+(on?" on":"")+'" style="--c:'+P.c+'" id="pov-'+esc(p)+'">'+
          '<button type="button" class="povhit" data-open="'+esc(p)+'" '+
            'aria-expanded="'+(on?"true":"false")+'" aria-controls="pillar-'+esc(p)+'">'+
            '<span class="plus">'+ico('<path d="M12 5v14M5 12h14"/>',15)+'</span>'+
            '<span class="pic">'+glyph(P.ic)+'</span>'+
            '<span class="top"><span class="nm">'+esc(p)+'</span>'+
            '<span class="wt">'+esc(P.w)+'</span></span></button>'+
          '<div class="povq"><p>'+esc(P.q)+'</p>'+
            edBtn('data-edit="q" data-p="'+esc(p)+'"',"")+'</div>'+
        '</div>';
      }).join("") + '</div>';

      /* the open pillar */
      if(OPEN){
        var p = OPEN, P = R.pillars[p], d = det(p);
        var n = R.items.filter(function(i){ return i.pl === p; }).length;
        var market = CUR[p] || null;

        h += '<div class="pblk open" style="--c:'+P.c+'" id="pillar-'+esc(p)+'">'+
          '<div class="phead"><span class="pic">'+glyph(P.ic)+'</span>'+
          '<h3>'+esc(p)+'</h3><span class="wt">'+esc(P.w)+'</span>'+
          '<button type="button" class="goto" data-jump="'+esc(p)+'">'+
          n+' roadmap item'+(n===1?"":"s")+ico(ICO.arrow,13)+'</button></div>';

        if(editingHere("q", p)){
          h += '<div class="edbox"><label class="edlab">Pillar question</label>'+
               '<input class="qin" type="text" value="'+esc(P.q)+'">'+actions()+'</div>';
        } else {
          h += '<div class="qrow"><p class="pq">'+esc(P.q)+'</p>'+
               edBtn('data-edit="q" data-p="'+esc(p)+'"',"")+'</div>';
        }
        if(d.note) h += '<p class="note">'+esc(d.note)+'</p>';

        /* problem space and strategy: always shown */
        h += section(GENERAL_LABEL, "", "general", d.content.general,
                     "No problem space or strategy yet.");

        /* market claims, clickable */
        h += '<div class="mrow">'+ MKEYS.map(function(m){
          var box = d[m] || {}, act = market === m;
          if(editingHere("box", p, m)){
            return '<div class="mbox editing"><div class="cn">'+flag(m)+
              '<span>'+esc(MARKETS[m])+'</span></div>'+
              '<label class="edlab">Marker</label>'+
              '<input class="bmk" type="text" value="'+esc(box.marker||"")+'" placeholder="Tag, e.g. Primary">'+
              '<label class="edlab">Tone</label>'+
              '<select class="btn-tone">'+
                ["primary","mid","none"].map(function(t){
                  return '<option value="'+t+'"'+((box.tone||"mid")===t?" selected":"")+'>'+t+'</option>';
                }).join("")+'</select>'+
              '<label class="edlab">Claim</label>'+
              '<textarea class="btx" rows="3">'+esc(box.text||"")+'</textarea>'+actions()+'</div>';
          }
          return '<div class="mbox pick'+(act?" active":"")+'">'+
                 edBtn('data-edit="box" data-p="'+esc(p)+'" data-x="'+m+'" class-corner','')
                   .replace('class="ed icon"','class="ed icon corner"')+
                 '<button type="button" class="mpick" data-market="'+m+'" '+
                   'aria-pressed="'+(act?"true":"false")+'">'+
                   '<span class="cn">'+flag(m)+'<span>'+esc(MARKETS[m])+'</span></span>'+
                   (box.marker ? '<span class="mk2" data-t="'+esc(box.tone||"mid")+'">'+
                                 esc(box.marker)+'</span>' : "")+
                   (box.text ? '<span class="mtx">'+rich(box.text)+'</span>' : "")+
                 '</button></div>';
        }).join("") +'</div>';

        /* market strategy: loads only once a market is picked */
        if(market){
          h += section("Country-specific strategy · "+MARKETS[market], flag(market), market,
                       d.content.byMarket[market], "No market-specific strategy yet.");
        } else {
          h += '<div class="blk"><div class="blkm">Country-specific strategy</div>'+
               '<p class="chint">Select a market above to see and edit its strategy.</p></div>';
        }
        h += '</div>';
      }

      function section(label, fl, key, items, emptyMsg){
        items = items || [];
        var p = OPEN;
        if(editingHere("list", p, key)){
          return '<div class="blk'+(key==="general"?" gen":"")+'">'+
                 '<div class="blkm'+(fl?"":" gen")+'">'+
                 (fl ? '<span class="fl">'+fl+'</span>' : "")+esc(label)+'</div>'+
                 '<div class="edbox">'+RTOOL+listHost(items)+
                 '<p class="edhint">Select text for Bold or Italic. Use the list buttons for '+
                 'bullets or numbers, and the arrows to nest or un-nest a line.</p>'+
                 actions()+'</div></div>';
        }
        return '<div class="blk'+(key==="general"?" gen":"")+'">'+
               '<div class="blkm'+(fl?"":" gen")+'">'+
               (fl ? '<span class="fl">'+fl+'</span>' : "")+esc(label)+
               edBtn('data-edit="list" data-p="'+esc(p)+'" data-x="'+esc(key)+'"',"Edit")+'</div>'+
               (items.length
                 ? '<ul>'+items.map(function(x){
                     var r = rich(x);
                     return '<li'+(listOnly(r)?' class="sub"':'')+'>'+r+'</li>';
                   }).join("")+'</ul>'
                 : '<p class="blkempty solo">'+esc(emptyMsg)+'</p>')+'</div>';
      }

      h += '</section>';

      h += '<div class="docfoot">'+
        '<div>Internal draft, prepared to be argued with, not adopted as written.</div>'+
        (CAN_EDIT ? '<div class="storenote" id="storeNote"></div>'+
        '<div class="exprow">'+
          '<button type="button" class="expbtn" id="expToggle">Export content</button>'+
          '<button type="button" class="expbtn" id="expCopy" hidden>Copy to clipboard</button>'+
          '<button type="button" class="expbtn" id="expDl" hidden>Download JSON</button>'+
          '<span class="expstatus" id="expStatus"></span>'+
        '</div>'+
        '<div class="exppanel" id="expPanel" hidden>'+
          '<p>This is the current content of the page. Copy it and paste it into Claude to have '+
          'the document rebuilt, exported to Word, or handed over.</p>'+
          '<textarea class="expta" id="expTa" readonly spellcheck="false"></textarea>'+
        '</div>' : "")+'</div>';

      $("viewStrategy").innerHTML = h;
      if(CAN_EDIT){ note(); wireExport(); }
      var live = $("viewStrategy").querySelector(".rlist, .qin, .bmk");
      if(live) live.focus();
    }

    /* ── strategy interactions ────────────────────────────── */
    function scrollToId(id){
      var el = document.getElementById(id); if(!el) return;
      var y = el.getBoundingClientRect().top + window.pageYOffset -
              (document.querySelector("header.top").offsetHeight + 16);
      window.scrollTo({top:Math.max(y,0), behavior:"smooth"});
    }
    $("viewStrategy").addEventListener("click", function(e){
      var t = e.target;

      var cmd = t.closest(".rt");
      if(cmd){
        e.preventDefault();
        var host = $("viewStrategy").querySelector(".rlist");
        if(host) host.focus();
        if(cmd.dataset.cmd === "indent") doIndent();
        else if(cmd.dataset.cmd === "outdent") doOutdent();
        else document.execCommand(cmd.dataset.cmd, false, null);
        return;
      }
      if(t.closest("[data-save]")){ saveEdit(); return; }
      if(t.closest("[data-cancel]")){ EDIT = null; renderStrategy(); return; }

      var ed = t.closest("[data-edit]");
      if(ed){
        EDIT = {t:ed.dataset.edit, p:ed.dataset.p, x:ed.dataset.x};
        renderStrategy(); return;
      }

      var op = t.closest("[data-open]");
      if(op){
        var k = op.dataset.open;
        OPEN = (OPEN === k && !t.closest(".slice")) ? null : k;
        EDIT = null; renderStrategy();
        if(OPEN) setTimeout(function(){ scrollToId("pillar-"+OPEN); }, 20);
        return;
      }

      var mp = t.closest(".mpick");
      if(mp){
        CUR[OPEN] = CUR[OPEN] === mp.dataset.market ? null : mp.dataset.market;
        EDIT = null; renderStrategy(); return;
      }

      var sc = t.closest("[data-scroll]");
      if(sc){ scrollToId(sc.dataset.scroll); return; }

      var jump = t.closest("[data-jump]");
      if(jump){
        state.pil.clear(); state.pil.add(jump.dataset.jump);
        state.pkg.clear(); state.q = ""; $("q").value = "";
        show("roadmap"); render(); window.scrollTo(0,0);
      }
    });
    $("viewStrategy").addEventListener("keydown", function(e){
      if(!e.target.closest || !e.target.closest(".rlist")) return;
      if(e.key === "Tab"){ e.preventDefault(); e.shiftKey ? doOutdent() : doIndent(); }
      if(e.key === "Escape"){ EDIT = null; renderStrategy(); }
    });

    function status(msg){
      var el = $("expStatus"); if(!el) return;
      el.textContent = msg;
      setTimeout(function(){ if($("expStatus")===el) el.textContent = ""; }, 2600);
    }
    function wireExport(){
      var ta = $("expTa");
      $("expToggle").onclick = function(){
        var pnl = $("expPanel"), open = pnl.hidden;
        pnl.hidden = !open;
        $("expCopy").hidden = !open;
        $("expDl").hidden = !open;
        if(open) ta.value = JSON.stringify(snapshot(), null, 2);
      };
      $("expCopy").onclick = function(){
        ta.select();
        if(navigator.clipboard) navigator.clipboard.writeText(ta.value)
          .then(function(){ status("Copied"); })
          .catch(function(){ status("Select the text and copy"); });
        else status("Select the text and copy");
      };
      $("expDl").onclick = function(){
        var blob = new Blob([ta.value || JSON.stringify(snapshot(), null, 2)],
                            {type:"application/json"});
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "strategicpillarscontent.json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
        status("Downloaded");
      };
    }


    /* ── capability editing ───────────────────────────────── */
    function opts(list, cur){
      return list.map(function(o){
        return '<option value="'+esc(o)+'"'+(o===cur?" selected":"")+'>'+esc(o)+'</option>';
      }).join("");
    }
    function itemForm(i){
      var d = i.detail || {};
      return '<div class="edbox itemform">'+
        '<label class="edlab">Title</label>'+
        '<input id="f-t" type="text" value="'+esc(i.t||"")+'">'+
        '<label class="edlab">One line on the card</label>'+
        '<input id="f-d" type="text" value="'+esc(i.d||"")+'">'+
        '<div class="frow">'+
          '<div><label class="edlab">Lane</label><select id="f-s">'+
            opts(["now","next","later"], i.s)+'</select></div>'+
          '<div><label class="edlab">Package</label><select id="f-p">'+
            opts(Object.keys(R.packages), i.p)+'</select></div>'+
          '<div><label class="edlab">Pillar</label><select id="f-pl">'+
            opts(Object.keys(R.pillars), i.pl)+'</select></div>'+
        '</div>'+
        '<label class="edlab">Captured on the board</label>'+
        '<input id="f-c" type="date" value="'+esc(d.captured||"")+'">'+
        '<label class="edlab">Thesis, the Problem and Opportunity section</label>'+
        '<textarea id="f-th" rows="10">'+esc(d.thesis||"")+'</textarea>'+
        '<p class="edhint">Paragraphs and bullets are kept. Everything else is stripped.</p>'+
        '<label class="edlab">monday.com item URL</label>'+
        '<input id="f-m" type="url" value="'+esc(d.monday||"")+'" placeholder="https://peopleshr.monday.com/boards/.../pulses/...">'+
        '<label class="edlab">Azure DevOps work item URL</label>'+
        '<input id="f-a" type="url" value="'+esc(d.ado||"")+'" placeholder="https://dev.azure.com/<org>/<project>/_workitems/edit/1234">'+
        '<div class="edact"><button type="button" class="btn-sv" id="f-save">Save</button>'+
        '<button type="button" class="btn-cx" id="f-cancel">Cancel</button>'+
        '<button type="button" class="btn-del" id="f-del">Delete</button></div>'+
      '</div>';
    }
    function wireItemForm(i){
      DELARM = false;
      $("f-save").onclick = function(){
        i.t  = $("f-t").value.trim() || "Untitled";
        i.d  = $("f-d").value.trim();
        i.s  = $("f-s").value;
        i.p  = $("f-p").value;
        i.pl = $("f-pl").value;
        i.detail = i.detail || {};
        i.detail.thesis   = $("f-th").value.trim();
        i.detail.captured = $("f-c").value;
        i.detail.monday = $("f-m").value.trim();
        i.detail.ado    = $("f-a").value.trim();
        delete i.isNew;
        ITEMEDIT = false; persist(); render(); open(i.id);
      };
      $("f-cancel").onclick = function(){
        ITEMEDIT = false;
        if(i.isNew){ removeItem(i.id); close(); render(); }
        else open(i.id);
      };
      $("f-del").onclick = function(){
        var b = $("f-del");
        if(!DELARM){ DELARM = true; b.textContent = "Confirm delete"; b.classList.add("armed"); return; }
        removeItem(i.id); ITEMEDIT = false; persist(); close(); render();
      };
    }
    function removeItem(id){
      R.items = R.items.filter(function(x){ return x.id !== id; });
      delete byId[id];
    }
    function addItem(lane){
      var it = {
        id: "cap-" + Date.now().toString(36),
        t: "New capability", d: "",
        s: lane, p: Object.keys(R.packages)[0], pl: "Land",
        detail: {thesis:"", captured:"", monday:"", ado:""},
        isNew: true
      };
      R.items.push(it); byId[it.id] = it;
      render(); ITEMEDIT = true; open(it.id);
    }

    /* ── view switch ──────────────────────────────────────── */
    var TABS = [
      {k:"strategy", label:"Strategy", pre:"Platform ", c:"#5b63c9",
       sub:"Capacity model and the seven pillars",
       ic:'<circle cx="12" cy="12" r="8.6"/><path d="M15.6 8.4l-2.2 5-5 2.2 2.2-5z"/>'},
      {k:"roadmap",  label:"Roadmap", pre:"Platform ", c:"#12876a",
       sub:R.items.length+" capabilities, Now to Later",
       ic:'<rect x="3.2" y="4.4" width="17.6" height="15.2" rx="2.6"/><path d="M9.1 4.4v15.2M14.9 4.4v15.2"/><path d="M5.6 8.2h1.6M11.5 8.2h1.6M17.3 8.2h1.6"/>'}
    ];
    var view = "roadmap";
    function show(k){
      view = k;
      TABS.forEach(function(T){
        var btn = $("tab-"+T.k);
        btn.setAttribute("aria-selected", T.k===k ? "true" : "false");
        btn.tabIndex = T.k===k ? 0 : -1;
      });
      $("viewStrategy").hidden = k!=="strategy";
      $("viewRoadmap").hidden  = k!=="roadmap";
      $("rmControls").hidden   = k!=="roadmap";
      $("pillars").hidden      = k!=="roadmap";
      $("stamp").textContent = (k==="roadmap"
        ? R.items.length + " capabilities" : "Capacity model") + "   ·   updated " + STAMPED;
      if(history.replaceState) history.replaceState(null,"","#"+k);
      hh();
    }
    (function(){
      var host = $("tabs");
      TABS.forEach(function(T){
        var b = document.createElement("button");
        b.className = "tab"; b.type = "button"; b.id = "tab-"+T.k;
        b.setAttribute("role","tab"); b.setAttribute("aria-selected","false");
        b.style.setProperty("--tc", T.c);
        b.innerHTML = '<span class="tic">'+ico(T.ic,19)+'</span><span>'+
          '<span class="tl"><span class="tw">'+esc(T.pre)+'</span>'+esc(T.label)+'</span>'+
          '<span class="ts">'+esc(T.sub)+'</span></span>';
        b.onclick = function(){ show(T.k); };
        host.appendChild(b);
      });
    })();

    /* ── drawer ───────────────────────────────────────────── */
    var drawer = $("drawer"), scrim = $("scrim"), last = null;
    function f(k,v){ return '<div class="field"><h4>'+k+"</h4>"+v+"</div>"; }
    function open(id){
      var i = byId[id]; if(!i) return; last = document.activeElement;
      var lane = LANES.filter(function(L){ return L.k===i.s; })[0];
      var sec = $("dsec"); sec.textContent = lane.label; sec.style.background = "var("+lane.c+")";
      var pk = $("dpkg"); pk.textContent = i.p; pk.style.color = R.packages[i.p];
      var P = R.pillars[i.pl], pl = $("dpil");
      pl.textContent = i.pl; pl.style.background = P.c;
      $("dttl").textContent = i.t;
      drawer.dataset.id = i.id;
      var d = i.detail || {}, h = "";
      var cap = $("dcap");
      if(d.captured){
        cap.hidden = false;
        cap.textContent = "Captured " + new Date(d.captured+"T00:00:00")
          .toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
      } else { cap.hidden = true; cap.textContent = ""; }
      $("dedit").hidden = !CAN_EDIT || ITEMEDIT;

      if(ITEMEDIT){
        $("dbody").innerHTML = itemForm(i);
        wireItemForm(i);
        drawer.classList.add("open"); scrim.classList.add("open");
        return;
      }

      h += f("Strategic pillar",
        '<div class="pilbox" style="--c:'+P.c+'"><span class="pic">'+glyph(P.ic)+'</span><div>'+
        '<div class="pnm">'+esc(i.pl)+'</div>'+
        '<div class="pillnote">'+esc(P.q)+'</div></div></div>');

      if(d.thesis) h += f("Thesis", rich(d.thesis));

      h += f("Links",
        '<div class="links">'+
          link("monday.com", d.monday, "#6161ff", ICO.board, mondayLabel(d.monday)) +
          link("Azure DevOps", d.ado, "#0b7a9e", ICO.ticket, adoLabel(d.ado)) +
        '</div>');

      $("dbody").innerHTML = h;
      drawer.classList.add("open"); scrim.classList.add("open");
      $("close").focus();
    }
    function close(){ ITEMEDIT = false;
      drawer.classList.remove("open"); scrim.classList.remove("open");
      if(last) last.focus(); }

    $("board").addEventListener("click", function(e){
      var a = e.target.closest(".addcap");
      if(a){ addItem(a.dataset.lane); return; }
      var c = e.target.closest(".card");
      if(c){ ITEMEDIT = false; open(c.dataset.id); } });
    if(CAN_EDIT) $("dedit").onclick = function(){
      var id = drawer.dataset.id; if(!id) return;
      ITEMEDIT = true; open(id);
    };
    scrim.onclick = close; $("close").onclick = close;
    document.addEventListener("keydown", function(e){
      if(e.key==="Escape"){ closeAll(null); syncAll(); close(); } });
    $("q").addEventListener("input", function(e){
      state.q = e.target.value.trim().toLowerCase(); render(); });
    $("reset").onclick = function(){
      state.q = ""; state.pkg.clear(); state.pil.clear(); $("q").value = ""; render(); };

    function hh(){
      var h = document.querySelector("header.top").offsetHeight;
      document.documentElement.style.setProperty("--hh",(h+10)+"px");
    }
    window.PHR = window.PHR || {};
    window.PHR.doc       = function(){ return R; };
    window.PHR.draftKey  = SKEY;
    window.PHR.rerender  = function(){ renderStrategy(); render(); };
    window.PHR.clearDraft = function(){ try{ localStorage.removeItem(SKEY); }catch(e){} };

    /* The monday.com sync in edit.js writes straight into the document, so it
       needs to save the draft and rebuild the id index after changing items. */
    window.PHR.persist = persist;
    window.PHR.reindex = function(){
      byId = {}; R.items.forEach(function(i){ byId[i.id] = i; });
    };

      /* A hash typed or pasted into an already open page switches the view,
       so a shared #strategy link works whether or not the page was loaded. */
    window.addEventListener("hashchange", function(){
      var k = location.hash === "#strategy" ? "strategy" : "roadmap";
      if(k !== view) show(k);
    });

    window.addEventListener("resize", hh);
    renderStrategy();
    show(location.hash === "#strategy" ? "strategy" : "roadmap");
    render();

  }

  /* A draft is the whole document, held in this browser until it is published.
     If the live content has moved on since the draft was taken, edit.js says so
     rather than letting the draft quietly overwrite it. */
  function draft(published){
    if(!CAN_EDIT) return published;
    try {
      var raw = localStorage.getItem("phr-platform-draft-v1");
      if(!raw) return published;
      var d = JSON.parse(raw);
      window.PHR_PUBLISHED = published;
      return d;
    } catch(e){ return published; }
  }

  fetch("content.json?v=" + Date.now(), {cache:"no-store"})
    .then(function(r){
      if(!r.ok) throw new Error("The server answered " + r.status + ".");
      return r.json();
    })
    .then(function(data){
      window.PHR_PUBLISHED = JSON.parse(JSON.stringify(data));
      start(draft(data));
    })
    .catch(function(err){
      fail(String(err && err.message || err) +
           " Open the site over http rather than from a file, and check that content.json sits beside this page.");
    });
})();
