/* ============================================================
   Space Automation — an idle/incremental game layered onto the
   observatory scene. Click the asteroids to start mining; a compact
   sidebar lets you buy fleets with incremental cost & production,
   an energy economy (producers need energy), per-unit upgrades and a
   research tree. Representative 3D models spawn in the solar system,
   batched by rarity so the scene never overloads.

   Requires window.OBS (exposed by observatory.js). Pure client-side;
   no effect on the Jekyll build or on inner pages.
   ============================================================ */
(function () {
  "use strict";
  var OBS = window.OBS;
  if (!OBS) return;
  var THREE = OBS.THREE, scene = OBS.scene;
  var SAVE_KEY = "obs_idle_v1";

  // ---------- Buildings (cheap → expensive) ----------
  // per = units per spawned model (rarity ratio), cap = max models of that type.
  var BUILDINGS = [
    { id: "miner",       ic: "🛰️", name: "Asteroid Miner Ship",      desc: "Mines ore from the belt.",           baseCost: 15,       growth: 1.15, ore: 0.5,   eOut: 0,    eUse: 0,   per: 50, cap: 40, motion: "asteroid",  color: 0xffd24a },
    { id: "solar",       ic: "☀️", name: "Solar Floating Panel",      desc: "Generates energy.",                  baseCost: 50,       growth: 1.16, ore: 0,     eOut: 2,    eUse: 0,   per: 40, cap: 30, motion: "sun",       radius: 2.7, color: 0x2ec4b6 },
    { id: "drone",       ic: "🛩️", name: "Cargo Drone",              desc: "Light ore hauler. Sips energy.",     baseCost: 220,      growth: 1.16, ore: 2,     eOut: 0,    eUse: 0.5, per: 45, cap: 30, motion: "asteroid",  color: 0xbfe3ff },
    { id: "transport",   ic: "🚀", name: "Planet Transport Ship",    desc: "Hauls ore between planets.",         baseCost: 900,      growth: 1.17, ore: 7,     eOut: 0,    eUse: 2,   per: 30, cap: 24, motion: "transport", color: 0xffb060 },
    { id: "tether",      ic: "🪢", name: "Space Tether",             desc: "Cheap launches, big throughput.",    baseCost: 4000,     growth: 1.17, ore: 24,    eOut: 0,    eUse: 5,   per: 24, cap: 20, motion: "ring",      radius: 8.6, color: 0x9b8cff },
    { id: "station",     ic: "🛸", name: "Space Station",            desc: "Orbital ore hub.",                   baseCost: 18000,    growth: 1.18, ore: 70,    eOut: 0,    eUse: 12,  per: 18, cap: 18, motion: "ring",      radius: 3.6, color: 0xe8eaf2 },
    { id: "reactor",     ic: "⚛️", name: "Fusion Reactor",           desc: "Serious energy output.",             baseCost: 65000,    growth: 1.18, ore: 0,     eOut: 60,   eUse: 0,   per: 16, cap: 16, motion: "ring",      radius: 5.0, color: 0xffd27d },
    { id: "facility",    ic: "🏭", name: "Planetary Mining Facility", desc: "Strip-mines whole worlds.",         baseCost: 220000,   growth: 1.19, ore: 320,   eOut: 0,    eUse: 45,  per: 12, cap: 14, motion: "asteroid",  color: 0xff8c69 },
    { id: "shipyard",    ic: "🏗️", name: "Orbital Shipyard",         desc: "Fleets that build ore.",             baseCost: 900000,   growth: 1.19, ore: 1000,  eOut: 0,    eUse: 120, per: 10, cap: 12, motion: "asteroid",  color: 0x9fb0c8 },
    { id: "satellite",   ic: "📡", name: "Deep Space Satellite",     desc: "Beams down ore and energy.",         baseCost: 3500000,  growth: 1.20, ore: 2600,  eOut: 120,  eUse: 0,   per: 9,  cap: 12, motion: "far",       color: 0x8fd3ff },
    { id: "dyson",       ic: "🌐", name: "Dyson Swarm Node",         desc: "Drinks the star's light.",           baseCost: 14000000, growth: 1.20, ore: 0,     eOut: 1500, eUse: 0,   per: 8,  cap: 10, motion: "sun",       radius: 2.1, color: 0xffe6a6 },
    { id: "exploration", ic: "🧭", name: "Space Exploration Team",   desc: "Finds rich new belts.",              baseCost: 60000000, growth: 1.22, ore: 12000, eOut: 0,    eUse: 400, per: 6,  cap: 10, motion: "transport", color: 0x6ff2e4 }
  ];
  var byId = {};
  BUILDINGS.forEach(function (b) { byId[b.id] = b; });

  // ---------- Research (global one-time upgrades) ----------
  var RESEARCH = [
    { id: "pickaxe",    name: "Ergonomic Pickaxe",    desc: "Click yields ×5",         cost: 200,       req: {},                     effect: { kind: "click", mult: 5 } },
    { id: "drills",     name: "Reinforced Drills",    desc: "Miners ×3",               cost: 1500,      req: { b: "miner", n: 15 },  effect: { kind: "bld", id: "miner", mult: 3 } },
    { id: "logistics",  name: "Swarm Logistics",      desc: "Cargo Drones ×3",         cost: 9000,      req: { b: "drone", n: 15 },  effect: { kind: "bld", id: "drone", mult: 3 } },
    { id: "fleetcmd",   name: "Fleet Command",        desc: "Transport Ships ×3",      cost: 60000,     req: { b: "transport", n: 10 }, effect: { kind: "bld", id: "transport", mult: 3 } },
    { id: "supercond",  name: "Superconductors",      desc: "Energy use −25%",         cost: 150000,    req: {},                     effect: { kind: "eUse", mult: 0.75 } },
    { id: "colonize_g", name: "Colonize Planet Gamedev", desc: "All ore ×1.5",         cost: 400000,    req: { ore: 300000 },        effect: { kind: "all", mult: 1.5 } },
    { id: "overgrid",   name: "Overcharged Grid",     desc: "Energy output ×1.5",      cost: 800000,    req: {},                     effect: { kind: "eOut", mult: 1.5 } },
    { id: "refineries", name: "Automated Refineries", desc: "Mining Facilities ×3",    cost: 2500000,   req: { b: "facility", n: 8 },effect: { kind: "bld", id: "facility", mult: 3 } },
    { id: "colonize_w", name: "Colonize Planet Web",  desc: "All ore ×1.5",            cost: 6000000,   req: { ore: 4000000 },       effect: { kind: "all", mult: 1.5 } },
    { id: "charter",    name: "Deep-Space Charter",   desc: "Exploration Teams ×3",    cost: 20000000,  req: { b: "exploration", n: 5 }, effect: { kind: "bld", id: "exploration", mult: 3 } },
    { id: "colonize_c", name: "Colonize Planet CS",   desc: "All ore ×1.5",            cost: 80000000,  req: { ore: 50000000 },      effect: { kind: "all", mult: 1.5 } },
    { id: "quantum",    name: "Quantum Uplink",       desc: "All ore ×2",              cost: 500000000, req: { ore: 300000000 },     effect: { kind: "all", mult: 2 } }
  ];
  var rById = {};
  RESEARCH.forEach(function (r) { rById[r.id] = r; });

  // ---------- State ----------
  function fresh() { return { ore: 0, started: false, maxOre: 0, b: {}, up: {}, rs: {} }; }
  var S = load() || fresh();

  function owned(id) { return S.b[id] || 0; }
  function cost(b) { return Math.floor(b.baseCost * Math.pow(b.growth, owned(b.id))); }
  function upTier(id) { return S.up[id] || 0; }
  function upCost(b) { return Math.round(b.baseCost * 15 * Math.pow(8, upTier(b.id))); }

  function fmt(n) {
    n = +n || 0;
    if (n < 0) return "−" + fmt(-n);
    if (n < 1) return n === 0 ? "0" : (+n.toFixed(2)) + "";   // keep small per-unit decimals (0.5, 0.05)
    if (n < 1000) return (+n.toFixed(n < 10 ? 1 : 0)) + "";
    var u = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"], i = -1;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
  }

  // ---------- Derived modifiers (recomputed on any purchase) ----------
  var mods = { all: 1, click: 1, eUse: 1, eOut: 1, bld: {} };
  function recompute() {
    mods = { all: 1, click: 1, eUse: 1, eOut: 1, bld: {} };
    RESEARCH.forEach(function (r) {
      if (!S.rs[r.id]) return;
      var e = r.effect;
      if (e.kind === "all") mods.all *= e.mult;
      else if (e.kind === "click") mods.click *= e.mult;
      else if (e.kind === "eUse") mods.eUse *= e.mult;
      else if (e.kind === "eOut") mods.eOut *= e.mult;
      else if (e.kind === "bld") mods.bld[e.id] = (mods.bld[e.id] || 1) * e.mult;
    });
    BUILDINGS.forEach(function (b) {
      mods.bld[b.id] = (mods.bld[b.id] || 1) * Math.pow(2, upTier(b.id));
    });
  }
  recompute();
  function clickPower() { return 1 * mods.click; }

  // ---------- 3D models (batched by rarity) ----------
  var unitsGroup = new THREE.Group();
  scene.add(unitsGroup);
  var models = {}; // id -> [mesh]
  var FAR = new THREE.Vector3(0, 2.5, -20);

  function geoFor(b) {
    if (b._geo) return b._geo;
    var g;
    switch (b.id) {
      case "solar":       g = new THREE.BoxGeometry(0.42, 0.3, 0.04); break; // thin panel, flat face toward the sun
      case "drone":       g = new THREE.BoxGeometry(0.12, 0.08, 0.18); break;
      case "transport":   g = new THREE.ConeGeometry(0.07, 0.22, 6); g.rotateX(-Math.PI / 2); break; // small, tip points at destination
      case "tether":      g = new THREE.BoxGeometry(0.035, 0.035, 1.3); break;
      case "station":     g = new THREE.TorusGeometry(0.17, 0.05, 6, 16); break;
      case "reactor":     g = new THREE.BoxGeometry(0.22, 0.22, 0.22); break;
      case "facility":    g = new THREE.BoxGeometry(0.28, 0.18, 0.28); break;
      case "shipyard":    g = new THREE.BoxGeometry(0.36, 0.12, 0.24); break;
      case "satellite":   g = new THREE.BoxGeometry(0.11, 0.11, 0.11); break;
      case "dyson":       g = new THREE.OctahedronGeometry(0.26, 0); break;
      case "exploration": g = new THREE.ConeGeometry(0.1, 0.34, 5); g.rotateX(-Math.PI / 2); break;
      default:            g = new THREE.ConeGeometry(0.08, 0.22, 4); g.rotateX(-Math.PI / 2); // miner = small pyramid ship facing its rock
    }
    b._geo = g; return g;
  }
  function matFor(b) {
    if (b._mat) return b._mat;
    b._mat = new THREE.MeshStandardMaterial({
      color: b.color, flatShading: true, roughness: 0.7, metalness: 0.1,
      emissive: b.color, emissiveIntensity: b.eOut > 0 ? 0.5 : 0.15
    });
    return b._mat;
  }
  function makeMesh(b) {
    var mesh = new THREE.Mesh(geoFor(b), matFor(b));
    if (b.id === "satellite") {
      var wm = new THREE.MeshStandardMaterial({ color: 0x2ec4b6, emissive: 0x2ec4b6, emissiveIntensity: 0.35, flatShading: true });
      var w1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.32), wm);
      var w2 = w1.clone(); w1.position.x = 0.13; w2.position.x = -0.13;
      mesh.add(w1); mesh.add(w2);
    }
    return mesh;
  }
  var TAU = Math.PI * 2, _wp = new THREE.Vector3();
  function initMotion(mesh, b, i) {
    var u = mesh.userData;
    if (b.motion === "transport") {
      var np = OBS.planets.length;
      u.mt = "transport"; u.a = i % np; u.b = (i + 1) % np;
      u.t = Math.random(); u.sp = 0.05 + Math.random() * 0.07; u.far = (b.id === "exploration");
    } else if (b.motion === "sun") {
      // hug the sun on a sphere, always facing it
      u.mt = "sun"; u.r = b.radius;
      u.theta = Math.random() * TAU; u.phi = Math.acos(2 * Math.random() - 1);
      u.sp = (0.1 + Math.random() * 0.1) * (Math.random() < 0.5 ? 1 : -1);
    } else if (b.motion === "asteroid") {
      // sit beside a real asteroid and point at it
      u.mt = "asteroid";
      var rocks = OBS.belt.children; u.rock = rocks[i % rocks.length];
      var a = Math.random() * TAU, rr = 0.26 + Math.random() * 0.14;
      u.off = new THREE.Vector3(Math.cos(a) * rr, (Math.random() - 0.5) * 0.14, Math.sin(a) * rr);
    } else {
      u.mt = "orbit";
      u.r = (b.motion === "ring") ? b.radius : (b.motion === "far" ? 14 : (11.2 + (Math.random() - 0.5) * 1.6));
      u.ang = Math.random() * TAU;
      u.y = (Math.random() - 0.5) * (b.motion === "ring" ? 1.4 : 0.7);
      u.sp = (0.03 + Math.random() * 0.05) * (Math.random() < 0.5 ? 1 : -1);
      if (b.id === "tether") { u.y = 0; u.radial = true; }
    }
  }
  function reconcile(b) {
    var o = owned(b.id);
    // Always show at least one model once you own any (then scale by rarity ratio).
    var target = o > 0 ? Math.max(1, Math.min(b.cap, Math.floor(o / b.per))) : 0;
    var arr = models[b.id] || (models[b.id] = []);
    while (arr.length < target) { var m = makeMesh(b); initMotion(m, b, arr.length); unitsGroup.add(m); arr.push(m); }
    while (arr.length > target) { unitsGroup.remove(arr.pop()); }
  }
  function updateModels(dt) {
    for (var id in models) {
      var arr = models[id];
      for (var i = 0; i < arr.length; i++) {
        var mesh = arr[i], u = mesh.userData;
        if (u.mt === "transport") {
          u.t += u.sp * dt;
          if (u.t > 1) { u.t = 0; var sw = u.a; u.a = u.b; u.b = sw; }
          var pa = OBS.planets[u.a].group.position;
          var pb = u.far ? FAR : OBS.planets[u.b].group.position;
          var tt = u.t;
          mesh.position.set(pa.x + (pb.x - pa.x) * tt, pa.y + (pb.y - pa.y) * tt + Math.sin(tt * Math.PI) * 1.1, pa.z + (pb.z - pa.z) * tt);
          mesh.lookAt(pb.x, pb.y, pb.z);
        } else if (u.mt === "sun") {
          u.theta += u.sp * dt;
          var s = Math.sin(u.phi);
          mesh.position.set(u.r * s * Math.cos(u.theta), u.r * Math.cos(u.phi), u.r * s * Math.sin(u.theta));
          mesh.lookAt(0, 0, 0);
        } else if (u.mt === "asteroid") {
          u.rock.getWorldPosition(_wp);
          mesh.position.set(_wp.x + u.off.x, _wp.y + u.off.y, _wp.z + u.off.z);
          mesh.lookAt(_wp.x, _wp.y, _wp.z);
        } else {
          u.ang += u.sp * dt;
          mesh.position.set(Math.cos(u.ang) * u.r, u.y, Math.sin(u.ang) * u.r);
          if (u.radial) { mesh.lookAt(0, u.y, 0); }
          else { var dir = u.sp < 0 ? -1 : 1; mesh.lookAt(mesh.position.x - Math.sin(u.ang) * dir, mesh.position.y, mesh.position.z + Math.cos(u.ang) * dir); }
        }
      }
    }
  }

  // ---------- Economy ----------
  var rate = { ore: 0, eOut: 0, eUse: 0, ratio: 1 };
  OBS.onFrame(function (dt) {
    updateModels(dt);
    if (!S.started) return;
    var eOut = 0, eUse = 0, i, b, o;
    for (i = 0; i < BUILDINGS.length; i++) { b = BUILDINGS[i]; o = owned(b.id); if (!o) continue; eOut += b.eOut * o; eUse += b.eUse * o; }
    eOut *= mods.eOut; eUse *= mods.eUse;
    var ratio = eUse > 0 ? Math.min(1, eOut / eUse) : 1;
    var ore = 0;
    for (i = 0; i < BUILDINGS.length; i++) {
      b = BUILDINGS[i]; o = owned(b.id); if (!o || !b.ore) continue;
      var p = b.ore * o * (mods.bld[b.id] || 1) * mods.all;
      if (b.eUse > 0) p *= ratio;
      ore += p;
    }
    rate.ore = ore; rate.eOut = eOut; rate.eUse = eUse; rate.ratio = ratio;
    S.ore += ore * dt;
    if (S.ore > S.maxOre) S.maxOre = S.ore;
  });

  // ---------- Asteroid click ----------
  OBS.onAsteroidClick(function (obj, point) {
    if (!S.started) { S.started = true; openPanel(); }
    var g = clickPower();
    S.ore += g; if (S.ore > S.maxOre) S.maxOre = S.ore;
    pop(point, "+" + fmt(g) + " ore");
    if (obj) { obj.scale.setScalar(1.7); setTimeout(function () { obj.scale.setScalar(1); }, 120); }
    scheduleSave();
  });

  function pop(point, text) {
    if (!point) return;
    var v = point.clone().project(OBS.camera);
    var r = OBS.canvas.getBoundingClientRect();
    var d = document.createElement("div");
    d.className = "idle-pop"; d.textContent = text;
    d.style.left = ((v.x * 0.5 + 0.5) * r.width + r.left) + "px";
    d.style.top = ((-v.y * 0.5 + 0.5) * r.height + r.top) + "px";
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 850);
  }

  // ---------- Buying ----------
  function canReq(r) {
    if (r.req.b) return owned(r.req.b) >= r.req.n;
    if (r.req.ore) return S.maxOre >= r.req.ore;
    return true;
  }
  function buy(id) {
    var b = byId[id], c = cost(b);
    if (S.ore < c) return;
    S.ore -= c; S.b[id] = owned(id) + 1;
    reconcile(b); recompute(); refresh(); scheduleSave();
  }
  function buyUp(id) {
    var b = byId[id]; if (upTier(id) >= 3) return;
    var c = upCost(b);
    if (S.ore < c) return;
    S.ore -= c; S.up[id] = upTier(id) + 1;
    recompute(); refresh(); scheduleSave();
  }
  function buyResearch(id) {
    var r = rById[id]; if (S.rs[id] || !canReq(r) || S.ore < r.cost) return;
    S.ore -= r.cost; S.rs[id] = 1;
    recompute(); refresh(); scheduleSave();
  }
  function doReset() {
    if (!window.confirm("Reset your space empire? This cannot be undone.")) return;
    S = fresh();
    for (var id in models) { models[id].forEach(function (m) { unitsGroup.remove(m); }); models[id] = []; }
    recompute(); try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    panel.hidden = true; panel.classList.remove("idle--open"); refresh();
  }

  // ---------- Persistence ----------
  var saveT = 0;
  function scheduleSave() { if (saveT) return; saveT = setTimeout(function () { saveT = 0; save(); }, 1500); }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ore: S.ore, started: S.started, maxOre: S.maxOre, b: S.b, up: S.up, rs: S.rs })); } catch (e) {} }
  function load() { try { var raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; var o = JSON.parse(raw); o.b = o.b || {}; o.up = o.up || {}; o.rs = o.rs || {}; o.maxOre = o.maxOre || o.ore || 0; return o; } catch (e) { return null; } }
  window.addEventListener("beforeunload", save);

  // ---------- UI (left slide-drawer) ----------
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var panel = el("aside", "idle"); panel.hidden = true;
  panel.innerHTML =
    '<button class="idle__handle" aria-label="Toggle panel"><span class="idle__hgem">◆</span><span class="idle__hore">0</span></button>' +
    '<div class="idle__inner">' +
      '<div class="idle__bar"><span class="idle__gem">◆</span><b class="idle__ore">0</b><span class="idle__u">ore</span><span class="idle__rate">+0/s</span></div>' +
      '<div class="idle__energy"><span class="idle__elbl">⚡ energy/s</span><span class="idle__evals">+0 / −0</span><i class="idle__ebar"><b></b></i></div>' +
      '<div class="idle__tabs"><button data-tab="build" class="on">Build</button><button data-tab="research">Research</button></div>' +
      '<div class="idle__scroll"><div class="idle__list" data-panel="build"></div><div class="idle__list idle__list--grid" data-panel="research" hidden></div></div>' +
      '<div class="idle__foot"><button class="idle__reset">reset</button></div>' +
    '</div>';
  document.body.appendChild(panel);

  var oreEl = panel.querySelector(".idle__ore");
  var hOreEl = panel.querySelector(".idle__hore");
  var rateEl = panel.querySelector(".idle__rate");
  var eValsEl = panel.querySelector(".idle__evals");
  var eBarEl = panel.querySelector(".idle__ebar b");
  var buildList = panel.querySelector('[data-panel="build"]');
  var researchList = panel.querySelector('[data-panel="research"]');

  function openPanel() {
    panel.hidden = false;
    panel.classList.add("idle--reveal");
    void panel.offsetWidth;              // reflow so the closed state paints first → it slides + fades in
    panel.classList.add("idle--open");
  }
  panel.querySelector(".idle__handle").addEventListener("click", function () { panel.classList.toggle("idle--open"); });
  panel.querySelector(".idle__reset").addEventListener("click", doReset);
  panel.querySelectorAll(".idle__tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      panel.querySelectorAll(".idle__tabs button").forEach(function (x) { x.classList.remove("on"); });
      btn.classList.add("on");
      var t = btn.getAttribute("data-tab");
      buildList.hidden = t !== "build"; researchList.hidden = t !== "research";
    });
  });

  // Build rows
  BUILDINGS.forEach(function (b) {
    var row = el("div", "irow"); row.hidden = true;
    row.innerHTML =
      '<div class="irow__top"><span class="irow__ic">' + b.ic + '</span>' +
      '<span class="irow__nm">' + b.name + '</span><span class="irow__ct">×0</span></div>' +
      '<div class="irow__stats"><span class="irow__each"></span><span class="irow__all"></span></div>' +
      '<div class="irow__bot"><button class="irow__upt" title="upgrade">Mk</button>' +
      '<button class="irow__buy"></button></div>';
    row.querySelector(".irow__buy").addEventListener("click", function () { buy(b.id); });
    row.querySelector(".irow__upt").addEventListener("click", function () { buyUp(b.id); });
    buildList.appendChild(row);
    b._row = row;
    b._ct = row.querySelector(".irow__ct");
    b._each = row.querySelector(".irow__each");
    b._all = row.querySelector(".irow__all");
    b._buy = row.querySelector(".irow__buy");
    b._upt = row.querySelector(".irow__upt");
  });

  // Research tiles — a grid of available + already-acquired upgrades
  RESEARCH.forEach(function (r) {
    var tile = el("button", "rtile"); tile.hidden = true;
    tile.innerHTML = '<b>' + r.name + '</b><span class="rtile__d">' + r.desc + '</span><span class="rtile__c"></span>';
    tile.addEventListener("click", function () { buyResearch(r.id); });
    researchList.appendChild(tile);
    r._row = tile;
    r._cost = tile.querySelector(".rtile__c");
  });

  function lineRate(b) {
    var o = owned(b.id); if (!o || !b.ore) return 0;
    var p = b.ore * o * (mods.bld[b.id] || 1) * mods.all; if (b.eUse > 0) p *= rate.ratio; return p;
  }
  // "+ore/s · ±energy" for a given ore & energy rate (energy>0 produces, <0 consumes)
  function statStr(ore, e) {
    var s = [];
    if (ore > 0) s.push("+" + fmt(ore) + "/s");
    if (e > 0) s.push("+" + fmt(e) + "⚡");
    else if (e < 0) s.push("−" + fmt(-e) + "⚡");
    return s.length ? s.join(" · ") : "—";
  }

  function refresh() {
    oreEl.textContent = fmt(S.ore);
    hOreEl.textContent = fmt(S.ore);
    rateEl.textContent = "+" + fmt(rate.ore) + "/s";
    eValsEl.textContent = "+" + fmt(rate.eOut) + " / −" + fmt(rate.eUse);
    var pct = rate.eUse > 0 ? Math.round(rate.ratio * 100) : 100;
    eBarEl.style.width = pct + "%";
    eBarEl.className = pct >= 100 ? "" : (pct >= 60 ? "warn" : "low");

    BUILDINGS.forEach(function (b) {
      var o = owned(b.id);
      var visible = o > 0 || S.maxOre >= b.baseCost * 0.5;
      b._row.hidden = !visible; if (!visible) return;
      b._ct.textContent = "×" + o;
      // per-unit and total, so "one" vs "all" is explicit
      var mult = (mods.bld[b.id] || 1) * mods.all;
      var perOre = b.ore > 0 ? b.ore * mult * (b.eUse > 0 ? rate.ratio : 1) : 0;
      var perE = b.eOut > 0 ? b.eOut * mods.eOut : (b.eUse > 0 ? -b.eUse * mods.eUse : 0);
      b._each.innerHTML = '<em>each</em>' + statStr(perOre, perE);
      b._all.innerHTML = o > 0 ? ('<em>all</em>' + statStr(perOre * o, perE * o)) : '';
      var c = cost(b);
      b._buy.textContent = "Buy · " + fmt(c);
      b._buy.disabled = S.ore < c;
      var t = upTier(b.id);
      if (o < 1) { b._upt.hidden = true; }
      else if (t >= 3) { b._upt.hidden = false; b._upt.textContent = "Mk IV ✓"; b._upt.disabled = true; }
      else { var uc = upCost(b); b._upt.hidden = false; b._upt.textContent = "Mk" + [" II", " III", " IV"][t] + " · " + fmt(uc); b._upt.disabled = S.ore < uc; }
    });

    RESEARCH.forEach(function (r) {
      var bought = !!S.rs[r.id];
      var show = bought || canReq(r);
      r._row.hidden = !show; if (!show) return;
      r._row.classList.toggle("done", bought);
      r._row.disabled = bought || S.ore < r.cost;
      r._cost.textContent = bought ? "✓ owned" : "◆ " + fmt(r.cost);
    });
  }

  // ---------- Boot ----------
  BUILDINGS.forEach(reconcile);         // spawn models for saved counts
  if (S.started) panel.hidden = false;  // start collapsed (handle only); asteroid click opens it
  refresh();
  setInterval(refresh, 220);
})();
