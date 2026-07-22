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
    { id: "miner",       ic: "🛰️", name: "Asteroid Miner Ship",      desc: "Mines ore from the belt.",              baseCost: 15,       growth: 1.15, ore: 0.5,   eOut: 0,    eUse: 0,   per: 2,  cap: 60, motion: "asteroid",  color: 0xffb35c },
    { id: "solar",       ic: "☀️", name: "Solar Floating Panel",      desc: "Generates energy.",                     baseCost: 50,       growth: 1.16, ore: 0,     eOut: 2,    eUse: 0,   per: 2,  cap: 60, motion: "sun",       radius: 2.4, color: 0x8fdcff },
    { id: "drone",       ic: "🛩️", name: "Cargo Drone",              desc: "Hops between miners hauling ore.",      baseCost: 220,      growth: 1.16, ore: 2,     eOut: 0,    eUse: 0.5, per: 2,  cap: 40, motion: "dronehop",  color: 0x4dd6c4 },
    { id: "transport",   ic: "🚀", name: "Planet Transport Ship",    desc: "Hauls ore between planets & stations.", baseCost: 900,      growth: 1.17, ore: 7,     eOut: 0,    eUse: 2,   per: 2,  cap: 30, motion: "transport", color: 0x74a8ff },
    { id: "station",     ic: "🛸", name: "Space Station",            desc: "Orbital ore hub.",                      baseCost: 18000,    growth: 1.18, ore: 70,    eOut: 0,    eUse: 12,  per: 2,  cap: 24, motion: "ring",      radius: 3.0, color: 0xe6f4ff },
    { id: "tether",      ic: "🌀", name: "Warp Station",             desc: "Warps distant cargo drones across the belt.", baseCost: 45000, growth: 1.18, ore: 150, eOut: 0, eUse: 10, per: 2,  cap: 10, motion: "warp",      radius: 7.9, color: 0xc9a3ff },
    { id: "reactor",     ic: "⚛️", name: "Fusion Reactor",           desc: "Studs the sun. Big energy output.",     baseCost: 65000,    growth: 1.18, ore: 0,     eOut: 60,   eUse: 0,   per: 2,  cap: 40, motion: "sun",       radius: 1.4, color: 0xffcf6a },
    { id: "facility",    ic: "🏭", name: "Planetary Mining Facility", desc: "Sits on a planet, strip-mining it.",   baseCost: 220000,   growth: 1.19, ore: 320,   eOut: 0,    eUse: 45,  per: 2,  cap: 24, motion: "planet",    color: 0x66c9e0 },
    { id: "shipyard",    ic: "🏗️", name: "Orbital Shipyard",         desc: "Fleets that build ore.",                baseCost: 900000,   growth: 1.19, ore: 1000,  eOut: 0,    eUse: 120, per: 2,  cap: 24, motion: "ring",      radius: 10.2, color: 0xa9c3dd },
    { id: "satellite",   ic: "📡", name: "Deep Space Satellite",     desc: "Beams down ore and energy.",            baseCost: 3500000,  growth: 1.20, ore: 2600,  eOut: 120,  eUse: 0,   per: 2,  cap: 24, motion: "far",       color: 0x8ec9ff },
    { id: "dyson",       ic: "🌐", name: "Dyson Swarm Node",         desc: "Drinks the star's light.",              baseCost: 14000000, growth: 1.20, ore: 0,     eOut: 1500, eUse: 0,   per: 4,  cap: 12, motion: "dysonring", color: 0xffe3a0 },
    { id: "exploration", ic: "🧭", name: "Space Exploration Team",   desc: "Finds rich new belts.",                 baseCost: 60000000, growth: 1.22, ore: 12000, eOut: 0,    eUse: 400, per: 2,  cap: 20, motion: "explore",   color: 0x8affd6 }
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
    { id: "quantum",    name: "Quantum Uplink",       desc: "All ore ×2",              cost: 500000000, req: { ore: 300000000 },     effect: { kind: "all", mult: 2 } },
    { id: "rushjob",    name: "Rush Job",             desc: "Click ×25 · production ×0.85",     cost: 40000,      req: {},                     effect: [{ kind: "click", mult: 25 }, { kind: "all", mult: 0.85 }] },
    { id: "overclock",  name: "Overclock Cores",      desc: "All ore ×2 · energy use +60%",     cost: 250000,     req: { b: "station", n: 3 }, effect: [{ kind: "all", mult: 2 }, { kind: "eUse", mult: 1.6 }] },
    { id: "leanpower",  name: "Lean Power Grid",      desc: "Energy output ×2 · all ore −25%",  cost: 1200000,    req: {},                     effect: [{ kind: "eOut", mult: 2 }, { kind: "all", mult: 0.75 }] },
    { id: "singularity",name: "Singularity Drive",    desc: "All ore ×5 · energy use +150%",    cost: 2000000000, req: { ore: 1000000000 },    effect: [{ kind: "all", mult: 5 }, { kind: "eUse", mult: 2.5 }] },
    { id: "plasma",     name: "Plasma Drills",        desc: "Miners ×4 · energy use +40%",      cost: 120000,     req: { b: "miner", n: 40 },     effect: [{ kind: "bld", id: "miner", mult: 4 }, { kind: "eUse", mult: 1.4 }] },
    { id: "nanites",    name: "Cargo Nanites",        desc: "Cargo Drones ×4 · energy use +30%", cost: 300000,    req: { b: "drone", n: 30 },     effect: [{ kind: "bld", id: "drone", mult: 4 }, { kind: "eUse", mult: 1.3 }] },
    { id: "fusionopt",  name: "Fusion Optimization",  desc: "Energy output ×2",                 cost: 900000,     req: {},                        effect: { kind: "eOut", mult: 2 } },
    { id: "orecomp",    name: "Ore Compression",      desc: "All ore ×3",                       cost: 5000000,    req: { ore: 3000000 },          effect: { kind: "all", mult: 3 } },
    { id: "foundry",    name: "Orbital Foundries",    desc: "Shipyards ×4 · energy use +40%",   cost: 8000000,    req: { b: "shipyard", n: 8 },   effect: [{ kind: "bld", id: "shipyard", mult: 4 }, { kind: "eUse", mult: 1.4 }] },
    { id: "antimatter", name: "Antimatter Catalyst",  desc: "All ore ×4 · energy use ×2",       cost: 5000000000, req: { ore: 3000000000 },       effect: [{ kind: "all", mult: 4 }, { kind: "eUse", mult: 2 }] },
    { id: "prospector", name: "Prospector Drone",     desc: "A rig that drills wherever you last mined · all ore ×1.5", cost: 8000, req: { b: "miner", n: 10 }, effect: { kind: "all", mult: 1.5 } },
    { id: "diamondtip", name: "Diamond-Tipped Drills",desc: "Click yields ×5",                   cost: 20000,      req: {},                        effect: { kind: "click", mult: 5 } },
    { id: "cargobots",  name: "Cargo Robotics",       desc: "Transport Ships ×3",                cost: 6000,       req: { b: "transport", n: 20 }, effect: { kind: "bld", id: "transport", mult: 3 } },
    { id: "photovolt",  name: "Photovoltaic Coating", desc: "Solar Panels ×3 (energy)",          cost: 40000,      req: { b: "solar", n: 20 },     effect: { kind: "bld", id: "solar", mult: 3 } },
    { id: "stationnet", name: "Station Networks",     desc: "Space Stations ×3",                 cost: 120000,     req: { b: "station", n: 10 },   effect: { kind: "bld", id: "station", mult: 3 } },
    { id: "bulk",       name: "Bulk Discount",        desc: "Building costs ×0.85",              cost: 250000,     req: {},                        effect: { kind: "cost", mult: 0.85 } },
    { id: "warpflow",   name: "Warp Throughput",      desc: "Warp Stations ×3",                  cost: 400000,     req: { b: "tether", n: 6 },     effect: { kind: "bld", id: "tether", mult: 3 } },
    { id: "confinement",name: "Magnetic Confinement", desc: "Fusion Reactors ×3 (energy)",       cost: 700000,     req: { b: "reactor", n: 10 },   effect: { kind: "bld", id: "reactor", mult: 3 } },
    { id: "supercon2",  name: "Room-Temp Superconductors", desc: "Energy use −40%",              cost: 4000000,    req: {},                        effect: { kind: "eUse", mult: 0.6 } },
    { id: "overtuned",  name: "Overtuned Reactors",   desc: "Energy output ×4 · all ore ×0.7",   cost: 2500000,    req: {},                        effect: [{ kind: "eOut", mult: 4 }, { kind: "all", mult: 0.7 }] },
    { id: "market",     name: "Galactic Market",      desc: "All ore ×3",                        cost: 300000000,  req: { ore: 150000000 },        effect: { kind: "all", mult: 3 } },
    { id: "antigrid",   name: "Antimatter Grid",      desc: "Energy output ×3",                  cost: 15000000,   req: {},                        effect: { kind: "eOut", mult: 3 } },
    { id: "satarray",   name: "Satellite Array",      desc: "Deep Space Satellites ×3",          cost: 25000000,   req: { b: "satellite", n: 8 },  effect: { kind: "bld", id: "satellite", mult: 3 } },
    { id: "subsidy",    name: "Cosmic Subsidy",       desc: "Building costs ×0.7",               cost: 50000000,   req: { ore: 30000000 },         effect: { kind: "cost", mult: 0.7 } },
    { id: "dysoneff",   name: "Dyson Efficiency",     desc: "Dyson Nodes ×3 (energy)",           cost: 40000000,   req: { b: "dyson", n: 6 },      effect: { kind: "bld", id: "dyson", mult: 3 } },
    { id: "reckless",   name: "Reckless Expansion",   desc: "All ore ×3 · building costs ×1.3",  cost: 1500000,    req: {},                        effect: [{ kind: "all", mult: 3 }, { kind: "cost", mult: 1.3 }] },
    { id: "blackmarket",name: "Black Market Deal",    desc: "All ore ×6 · energy use ×2 · costs ×1.5", cost: 3000000000, req: { ore: 2000000000 }, effect: [{ kind: "all", mult: 6 }, { kind: "eUse", mult: 2 }, { kind: "cost", mult: 1.5 }] },
    { id: "jackpot",    name: "Cosmic Jackpot",       desc: "All ore ×10",                       cost: 100000000000, req: { ore: 50000000000 },    effect: { kind: "all", mult: 10 } }
  ];
  var rById = {};
  RESEARCH.forEach(function (r) { rById[r.id] = r; });

  // ---------- State ----------
  function fresh() { return { ore: 0, started: false, maxOre: 0, b: {}, up: {}, rs: {} }; }
  var S = load() || fresh();

  function owned(id) { return S.b[id] || 0; }
  function cost(b) { return Math.floor(b.baseCost * Math.pow(b.growth, owned(b.id)) * mods.cost); }
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
  var mods = { all: 1, click: 1, eUse: 1, eOut: 1, cost: 1, bld: {} };
  function applyEffect(e) {
    if (e.kind === "all") mods.all *= e.mult;
    else if (e.kind === "click") mods.click *= e.mult;
    else if (e.kind === "eUse") mods.eUse *= e.mult;
    else if (e.kind === "eOut") mods.eOut *= e.mult;
    else if (e.kind === "bld") mods.bld[e.id] = (mods.bld[e.id] || 1) * e.mult;
    else if (e.kind === "cost") mods.cost *= e.mult;
  }
  function recompute() {
    mods = { all: 1, click: 1, eUse: 1, eOut: 1, cost: 1, bld: {} };
    RESEARCH.forEach(function (r) {
      if (!S.rs[r.id]) return;
      var e = r.effect;
      if (e.length) { for (var k = 0; k < e.length; k++) applyEffect(e[k]); } else applyEffect(e);
    });
    BUILDINGS.forEach(function (b) {
      mods.bld[b.id] = (mods.bld[b.id] || 1) * Math.pow(2, upTier(b.id));
    });
    syncCustomMiner();
  }
  recompute();
  function clickPower() { return 1 * mods.click; }

  // ---------- 3D models (batched by rarity) ----------
  var unitsGroup = new THREE.Group();
  scene.add(unitsGroup);
  var models = {}; // id -> [mesh]
  var FAR = new THREE.Vector3(0, 2.5, -20);

  // Prospector Drone (research upgrade): a drill that mines wherever you last clicked.
  var clickPoint = new THREE.Vector3(0, 0, 11);
  var customMiner = null;
  function syncCustomMiner() {
    if (S.rs && S.rs.prospector && !customMiner) {
      var g = new THREE.CylinderGeometry(0.05, 0.14, 0.5, 6); g.rotateX(Math.PI / 2);
      customMiner = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffd24a, emissiveIntensity: 0.5, flatShading: true }));
      customMiner.userData = { roll: 0 };
      scene.add(customMiner);
    } else if ((!S.rs || !S.rs.prospector) && customMiner) {
      scene.remove(customMiner); customMiner = null;
    }
  }
  function updateCustomMiner(dt) {
    if (!customMiner) return;
    // nearest body to the last mined point: sun (origin), a planet, or the nearest asteroid
    _wp.set(0, 0, 0); var tr = 1.3, bd = clickPoint.lengthSq();
    for (var pi = 0; pi < OBS.planets.length; pi++) {
      var pp = OBS.planets[pi].group.position, d = clickPoint.distanceToSquared(pp);
      if (d < bd) { bd = d; _wp.copy(pp); tr = OBS.planets[pi].cfg.size; }
    }
    var rocks = OBS.belt.children;
    for (var ri = 0; ri < rocks.length; ri++) {
      rocks[ri].getWorldPosition(_base); var dr = clickPoint.distanceToSquared(_base);
      if (dr < bd) { bd = dr; _wp.copy(_base); tr = 0.14; }
    }
    _dir.copy(clickPoint).sub(_wp);
    if (_dir.lengthSq() < 0.0001) _dir.set(1, 0, 0);
    _dir.normalize();
    _base.copy(_wp).addScaledVector(_dir, tr + 0.18);
    customMiner.position.lerp(_base, Math.min(1, dt * 1.5));
    customMiner.lookAt(_wp.x, _wp.y, _wp.z);
    customMiner.userData.roll += dt * 8; customMiner.rotateZ(customMiner.userData.roll);
  }

  function geoFor(b) {
    if (b._geo) return b._geo;
    var g;
    switch (b.id) {
      case "solar":       g = new THREE.BoxGeometry(0.42, 0.3, 0.04); break; // thin panel, faces the sun
      case "drone":       g = new THREE.ConeGeometry(0.09, 0.26, 4); g.rotateX(Math.PI / 2); break; // pyramid, tip forward
      case "transport":   g = new THREE.BoxGeometry(0.09, 0.07, 0.18); break; // short rectangle, long axis = travel direction
      case "tether":      g = new THREE.CylinderGeometry(0.09, 0.09, 0.4, 12); g.rotateX(Math.PI / 2); break; // horizontal warp barrel
      case "station":     g = new THREE.TorusGeometry(0.17, 0.05, 6, 16); break;
      case "reactor":     g = new THREE.BoxGeometry(0.22, 0.22, 0.22); break;
      case "facility":    g = new THREE.BoxGeometry(0.26, 0.16, 0.26); break;
      case "shipyard":    g = new THREE.BoxGeometry(0.36, 0.12, 0.24); break;
      case "satellite":   g = new THREE.BoxGeometry(0.11, 0.11, 0.11); break;
      case "dyson":       g = new THREE.TorusGeometry(1, 0.03, 6, 40); g.rotateX(Math.PI / 2); break; // thin horizontal ring (scaled per node)
      case "exploration": g = new THREE.ConeGeometry(0.1, 0.34, 5); g.rotateX(Math.PI / 2); break;
      default:            g = new THREE.CylinderGeometry(0.02, 0.06, 0.24, 6); g.rotateX(Math.PI / 2); // miner = small drill bit
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
  var TAU = Math.PI * 2, STD = 0.12, SUN_KEEP = 2.3;  // STD = shared standard rotation speed
  var _wp = new THREE.Vector3(), _dir = new THREE.Vector3(), _base = new THREE.Vector3();
  var _aimObj = new THREE.Object3D();   // scratch for smooth barrel aiming
  function initMotion(mesh, b, i) {
    var u = mesh.userData;
    if (b.motion === "transport") {
      var np = OBS.planets.length;
      u.mt = "transport"; u.a = i % np; u.b = (i + 1) % np;
      u.t = Math.random(); u.sp = 0.05 + Math.random() * 0.07; u.far = (b.id === "exploration"); u.station = null;
    } else if (b.motion === "sun") {
      // orbit the sun near its equator (stays clear of the Dyson rings at the poles)
      u.mt = "sun"; u.r = b.radius;
      u.theta = Math.random() * TAU; u.phi = Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      u.sp = STD;   // synced standard speed (panels move together)
    } else if (b.motion === "asteroid") {
      // sit beside a real asteroid; miners drill into its centre
      u.mt = "asteroid";
      var rocks = OBS.belt.children; u.rock = rocks[i % rocks.length];
      var a = Math.random() * TAU, rr = 0.18 + Math.random() * 0.1;
      u.off = new THREE.Vector3(Math.cos(a) * rr, (Math.random() - 0.5) * 0.12, Math.sin(a) * rr);
      u.spin = (b.id === "miner"); u.roll = 0;
    } else if (b.motion === "dronehop") {
      // hop from miner to miner
      u.mt = "dronehop"; u.target = null; u.st = null; u.wait = Math.random() * 2;
      mesh.position.set(Math.cos(i) * 11, (Math.random() - 0.5) * 0.6, Math.sin(i) * 11);
    } else if (b.motion === "planet") {
      // sit on a planet's surface, facing outward
      u.mt = "planet"; u.p = i % OBS.planets.length;
      var pa = Math.random() * TAU, pph = Math.acos(2 * Math.random() - 1), ps = Math.sin(pph);
      u.dir = new THREE.Vector3(ps * Math.cos(pa), Math.cos(pph), ps * Math.sin(pa));
    } else if (b.motion === "warp") {
      // warp station: orbit at a fixed standard speed; aims + fires on demand
      u.mt = "warp"; u.r = b.radius; u.ang = Math.random() * TAU; u.y = (Math.random() - 0.5) * 0.5;
      u.aimT = 0; u.aimPos = new THREE.Vector3();
    } else if (b.motion === "dysonring") {
      // thin rings stacked above & below the sun, growing outward
      u.mt = "dysonring";
      var dl = Math.floor(i / 2), dside = (i % 2 === 0) ? 1 : -1;
      u.y = dside * (1.5 + dl * 0.32);
      u.rad = 0.5 + dl * 0.4;
      mesh.geometry = new THREE.TorusGeometry(u.rad, 0.02, 6, 44);   // per-ring size, uniform tube thickness
      mesh.geometry.rotateX(Math.PI / 2);
    } else if (b.motion === "explore") {
      // fly out past the belt, wait, hyper-light jump away, reappear after a few seconds
      u.mt = "explore"; u.est = "out"; u.timer = 0;
      u.dest = new THREE.Vector3(); u.jdir = new THREE.Vector3();
      var ea = Math.random() * TAU, er = 12 + Math.random() * 2;
      mesh.position.set(Math.cos(ea) * er, (Math.random() - 0.5) * 2, Math.sin(ea) * er);
      outwardDest(u.dest, mesh.position);
    } else {
      u.mt = "orbit";
      u.r = (b.motion === "ring") ? b.radius : (b.motion === "far" ? 14 : (11.2 + (Math.random() - 0.5) * 1.6));
      u.ang = Math.random() * TAU;
      u.y = (Math.random() - 0.5) * (b.motion === "ring" ? 1.4 : 0.7);
      u.sp = (0.03 + Math.random() * 0.05) * (Math.random() < 0.5 ? 1 : -1);
    }
  }
  function reconcile(b) {
    var o = owned(b.id);
    // Always show at least one model once you own any (then scale by rarity ratio).
    var target = o > 0 ? Math.min(b.cap, Math.ceil(o / b.per)) : 0;
    var arr = models[b.id] || (models[b.id] = []);
    while (arr.length < target) { var m = makeMesh(b); initMotion(m, b, arr.length); unitsGroup.add(m); arr.push(m); }
    while (arr.length > target) { unitsGroup.remove(arr.pop()); }
  }
  // Warp flash effect (shared texture, per-flash material for independent fade)
  var _flashTex = null, fx = [];
  function flashTex() {
    if (_flashTex) return _flashTex;
    var cv = document.createElement("canvas"); cv.width = cv.height = 64;
    var c = cv.getContext("2d");
    var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(210,200,255,0.95)");
    g.addColorStop(0.4, "rgba(155,140,255,0.5)");
    g.addColorStop(1, "rgba(155,140,255,0)");
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    _flashTex = new THREE.CanvasTexture(cv); return _flashTex;
  }
  function flash(pos) {
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); sp.scale.set(0.3, 0.3, 1);
    scene.add(sp); fx.push({ sp: sp, life: 0, ttl: 0.4 });
  }
  function updateFx(dt) {
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i]; f.life += dt; var k = f.life / f.ttl;
      var s = 0.3 + k * 1.7; f.sp.scale.set(s, s, 1);
      f.sp.material.opacity = Math.max(0, 1 - k);
      if (f.life >= f.ttl) { scene.remove(f.sp); f.sp.material.dispose(); fx.splice(i, 1); }
    }
  }

  // keep a moving point from crossing the sun (bends the path around it)
  function avoidSun(v) {
    var d = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (d < SUN_KEEP) {
      if (d < 0.0001) { v.y += SUN_KEEP; return; }
      var k = SUN_KEEP / d; v.x *= k; v.y *= k; v.z *= k;
    }
  }
  // a staging point well outside the asteroid belt, roughly outward from `from`
  function outwardDest(v, from) {
    var a = Math.atan2(from.z, from.x) + (Math.random() - 0.5);
    var r = 15 + Math.random() * 4;
    v.set(Math.cos(a) * r, (Math.random() - 0.5) * 3, Math.sin(a) * r);
  }
  function updateModels(dt) {
    updateFx(dt);
    updateCustomMiner(dt);
    for (var id in models) {
      var arr = models[id];
      for (var i = 0; i < arr.length; i++) {
        var mesh = arr[i], u = mesh.userData;
        if (u.mt === "transport") {
          u.t += u.sp * dt;
          if (u.t > 1) {
            u.t = 0; var sw = u.a; u.a = u.b; u.b = sw;
            var st = models.station;                // sometimes route via a space station
            u.station = (st && st.length && Math.random() < 0.35) ? st[(Math.random() * st.length) | 0] : null;
          }
          var pa = OBS.planets[u.a].group.position;
          var pb = u.station ? u.station.position : (u.far ? FAR : OBS.planets[u.b].group.position);
          var tt = u.t;
          _wp.set(pa.x + (pb.x - pa.x) * tt, pa.y + (pb.y - pa.y) * tt, pa.z + (pb.z - pa.z) * tt);
          avoidSun(_wp); mesh.position.copy(_wp);           // straight path, curved around the sun
          mesh.lookAt(pb.x, pb.y, pb.z);
        } else if (u.mt === "sun") {
          u.theta += u.sp * dt;
          var s = Math.sin(u.phi);
          mesh.position.set(u.r * s * Math.cos(u.theta), u.r * Math.cos(u.phi), u.r * s * Math.sin(u.theta));
          mesh.lookAt(0, 0, 0);
        } else if (u.mt === "asteroid") {
          u.rock.getWorldPosition(_wp);
          mesh.position.set(_wp.x + u.off.x, _wp.y + u.off.y, _wp.z + u.off.z);
          mesh.lookAt(_wp.x, _wp.y, _wp.z);                     // point the drill at the asteroid centre
          if (u.spin) { u.roll += dt * 7; mesh.rotateZ(u.roll); } // miners spin around that axis like a drill
        } else if (u.mt === "dronehop") {
          var miners = models.miner;
          if (miners && miners.length) {
            if (u.st) { u.wl = (u.wl || 0) + dt; if (u.wl > 8) { u.st = null; u.wl = 0; } } else { u.wl = 0; } // safety: never stay stuck in a warp state
            if (u.wait > 0) {
              u.wait -= dt;
            } else if (u.st === "toTether") {
              // fly to the warp station (which is orbiting) — catch it, with a timeout so it never sticks
              var wt = (u.tether && u.tether.parent) ? u.tether.position : null;
              var dv = (u.target && u.target.parent) ? u.target.position : null;
              if (!wt || !dv) { u.st = null; u.target = null; }
              else {
                u.tt = (u.tt || 0) + dt;
                u.tether.userData.aimPos.copy(dv); u.tether.userData.aimT = 0.3;  // station tracks the target while the drone approaches
                mesh.position.lerp(wt, Math.min(1, dt * 2.5));
                mesh.lookAt(dv.x, dv.y, dv.z);
                if (mesh.position.distanceTo(wt) < 0.6 || u.tt > 2.5) { u.st = "aim"; u.aimT = 0.5; u.tt = 0; }
              }
            } else if (u.st === "aim") {
              // sit at the station while it rotates to aim, then get fired
              var tg = (u.target && u.target.parent) ? u.target.position : null;
              var stn = (u.tether && u.tether.parent) ? u.tether : null;
              if (!tg || !stn) { u.st = null; u.target = null; }
              else {
                stn.userData.aimPos.copy(tg); stn.userData.aimT = 0.3;   // drive the station's barrel toward the target
                mesh.position.copy(stn.position);
                u.aimT -= dt;
                if (u.aimT <= 0) { flash(mesh.position); u.st = "fired"; }
              }
            } else if (u.st === "fired") {
              // launched: streak fast to the far miner
              var ft = (u.target && u.target.parent) ? u.target.position : null;
              if (!ft) { u.st = null; u.target = null; }
              else {
                mesh.position.lerp(ft, Math.min(1, dt * 3.2));
                mesh.lookAt(ft.x, ft.y, ft.z);
                if (mesh.position.distanceTo(ft) < 0.35) { flash(mesh.position); u.wait = 0.5 + Math.random() * 1.2; u.target = null; u.st = null; }
              }
            } else {
              // pick a miner; if it's far and a warp station exists, route via the nearest one
              if (!u.target || !u.target.parent) {
                u.target = miners[(Math.random() * miners.length) | 0];
                var stns = models.tether;
                if (stns && stns.length && mesh.position.distanceTo(u.target.position) > 8) {
                  var best = null, bd = Infinity;
                  for (var w = 0; w < stns.length; w++) { var dd = mesh.position.distanceTo(stns[w].position); if (dd < bd) { bd = dd; best = stns[w]; } }
                  u.tether = best; u.st = "toTether"; u.tt = 0;
                }
              }
              if (u.st !== "toTether") {
                var mt = u.target;
                _dir.set(0, 0, 1).applyQuaternion(mt.quaternion);                   // dock at the miner's base (behind the drill)
                _base.set(mt.position.x - _dir.x * 0.22, mt.position.y - _dir.y * 0.22, mt.position.z - _dir.z * 0.22);
                mesh.position.lerp(_base, Math.min(1, dt * 0.9));
                mesh.lookAt(mt.position.x, mt.position.y, mt.position.z);
                if (mesh.position.distanceTo(_base) < 0.25) { u.wait = 0.5 + Math.random() * 1.4; u.target = null; }
              }
            }
          }
        } else if (u.mt === "planet") {
          var pl = OBS.planets[u.p], pp = pl.group.position, rad = pl.cfg.size - 0.02;
          mesh.position.set(pp.x + u.dir.x * rad, pp.y + u.dir.y * rad, pp.z + u.dir.z * rad);
          mesh.lookAt(pp.x + u.dir.x * 2, pp.y + u.dir.y * 2, pp.z + u.dir.z * 2); // face outward
        } else if (u.mt === "warp") {
          u.ang += STD * dt;                                    // synced standard speed
          mesh.position.set(Math.cos(u.ang) * u.r, u.y, Math.sin(u.ang) * u.r);
          _aimObj.position.copy(mesh.position);
          if (u.aimT > 0) { _aimObj.lookAt(u.aimPos.x, u.aimPos.y, u.aimPos.z); u.aimT -= dt; }
          else { _aimObj.lookAt(mesh.position.x - Math.sin(u.ang), mesh.position.y, mesh.position.z + Math.cos(u.ang)); }
          mesh.quaternion.rotateTowards(_aimObj.quaternion, dt * 3.5);   // turn smoothly toward the aim, not an instant snap
        } else if (u.mt === "dysonring") {
          mesh.position.set(0, u.y, 0);
        } else if (u.mt === "explore") {
          if (u.est === "out") {
            mesh.position.lerp(u.dest, Math.min(1, dt * 0.6));
            mesh.lookAt(u.dest.x, u.dest.y, u.dest.z);
            if (mesh.position.distanceTo(u.dest) < 0.6) { u.est = "charge"; u.timer = 1.0 + Math.random() * 0.8; }
          } else if (u.est === "charge") {
            u.timer -= dt;
            if (u.timer <= 0) { u.est = "jump"; u.timer = 0.35; u.jdir.copy(mesh.position).normalize(); flash(mesh.position); }
          } else if (u.est === "jump") {
            u.timer -= dt;
            mesh.position.addScaledVector(u.jdir, dt * 50);
            mesh.lookAt(mesh.position.x + u.jdir.x, mesh.position.y + u.jdir.y, mesh.position.z + u.jdir.z);
            mesh.scale.set(1, 1, 2 + (0.35 - u.timer) * 30);   // stretch into a light streak
            if (u.timer <= 0) { mesh.visible = false; mesh.scale.set(1, 1, 1); u.est = "gone"; u.timer = 3 + Math.random() * 2.5; }
          } else { // gone — reappear after a few seconds
            u.timer -= dt;
            if (u.timer <= 0) {
              var ra = Math.random() * TAU, rr2 = 12 + Math.random() * 2;
              mesh.position.set(Math.cos(ra) * rr2, (Math.random() - 0.5) * 2, Math.sin(ra) * rr2);
              mesh.visible = true; outwardDest(u.dest, mesh.position); u.est = "out";
            }
          }
        } else {
          u.ang += u.sp * dt;
          mesh.position.set(Math.cos(u.ang) * u.r, u.y, Math.sin(u.ang) * u.r);
          var dir = u.sp < 0 ? -1 : 1;
          mesh.lookAt(mesh.position.x - Math.sin(u.ang) * dir, mesh.position.y, mesh.position.z + Math.cos(u.ang) * dir);
        }
      }
    }
  }

  // ---------- Economy ----------
  var rate = { ore: 0, eOut: 0, eUse: 0, ratio: 1 };
  function computeRate() {
    var eOut = 0, eUse = 0, i, b, o;
    for (i = 0; i < BUILDINGS.length; i++) { b = BUILDINGS[i]; o = owned(b.id); if (!o) continue; eOut += b.eOut * o * (mods.bld[b.id] || 1); eUse += b.eUse * o; }
    eOut *= mods.eOut; eUse *= mods.eUse;
    // deficit → down to 15% efficiency (never fully off); surplus → up to +50% (so energy upgrades pay off)
    var ratio;
    if (eUse <= 0) { ratio = 1; }
    else { var rr = eOut / eUse; ratio = rr >= 1 ? (1 + Math.min(1, rr - 1) * 0.5) : Math.max(0.15, rr); }
    var ore = 0;
    for (i = 0; i < BUILDINGS.length; i++) {
      b = BUILDINGS[i]; o = owned(b.id); if (!o || !b.ore) continue;
      var p = b.ore * o * (mods.bld[b.id] || 1) * mods.all;
      if (b.eUse > 0) p *= ratio;
      ore += p;
    }
    rate.ore = ore; rate.eOut = eOut; rate.eUse = eUse; rate.ratio = ratio;
  }
  // Wall-clock accrual so production keeps running in a backgrounded tab (that's the "idle").
  var lastAccrue = Date.now();
  function accrue() {
    var now = Date.now(), dtSec = (now - lastAccrue) / 1000;
    lastAccrue = now;
    if (!S.started || dtSec <= 0) return;
    if (dtSec > 3600) dtSec = 3600;                 // cap catch-up to 1 hour
    computeRate();
    S.ore += rate.ore * dtSec;
    if (S.ore > S.maxOre) S.maxOre = S.ore;
  }
  OBS.onFrame(function (dt) { updateModels(dt); accrue(); });
  setInterval(accrue, 1000);                         // keeps ticking (throttled ~1/s) while the tab is hidden
  document.addEventListener("visibilitychange", accrue);

  // ---------- Asteroid click ----------
  OBS.onAsteroidClick(function (obj, point) {
    if (!S.started) { S.started = true; openPanel(); }
    if (point) clickPoint.copy(point);              // Prospector Drone follows your last mined spot
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
  function sellBuilding(id) {
    var b = byId[id]; if (owned(id) <= 0) return;
    S.b[id] = owned(id) - 1;
    S.ore += Math.floor(0.5 * b.baseCost * Math.pow(b.growth, owned(id)));  // refund ~50%
    if (owned(id) === 0) S.up[id] = 0;                                       // lose its upgrades if it's the last one
    reconcile(b); recompute(); refresh(); scheduleSave();
  }
  function sellResearch(id) {
    if (!S.rs[id]) return;
    S.ore += Math.floor(rById[id].cost * 0.5);
    S.rs[id] = 0;
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

  // How-to-play tooltip, shown while you own nothing
  var helpEl = el("div", "idle-help",
    "⛏ <b>Mine the asteroid belt</b> to earn ore, then buy your first <b>Miner</b> below — it mines on its own. Grow a fleet, watch your ⚡ energy, and research upgrades.");
  buildList.appendChild(helpEl);

  // Build rows
  BUILDINGS.forEach(function (b) {
    var row = el("div", "irow"); row.hidden = true;
    row.innerHTML =
      '<div class="irow__top"><span class="irow__ic">' + b.ic + '</span>' +
      '<span class="irow__nm">' + b.name + '</span><span class="irow__ct">×0</span></div>' +
      '<div class="irow__stats"><span class="irow__each"></span><span class="irow__all"></span></div>' +
      '<div class="irow__bot"><button class="irow__sell" title="Sell one (50% refund)">−</button><button class="irow__buy"></button></div>';
    row.querySelector(".irow__buy").addEventListener("click", function () { buy(b.id); });
    row.querySelector(".irow__sell").addEventListener("click", function () { sellBuilding(b.id); });
    buildList.appendChild(row);
    b._row = row;
    b._ct = row.querySelector(".irow__ct");
    b._each = row.querySelector(".irow__each");
    b._all = row.querySelector(".irow__all");
    b._buy = row.querySelector(".irow__buy");
    b._sell = row.querySelector(".irow__sell");
  });

  // Research tiles — a grid of available + already-acquired upgrades
  RESEARCH.forEach(function (r) {
    var tile = el("button", "rtile"); tile.hidden = true;
    tile.innerHTML = '<b>' + r.name + '</b><span class="rtile__d">' + r.desc + '</span><span class="rtile__c"></span>';
    tile.addEventListener("click", function () { if (S.rs[r.id]) sellResearch(r.id); else buyResearch(r.id); });
    researchList.appendChild(tile);
    r._row = tile;
    r._cost = tile.querySelector(".rtile__c");
  });

  // Per-building upgrade tiles — the Mk upgrades now live in Research too
  BUILDINGS.forEach(function (b) {
    var tile = el("button", "rtile rtile--up"); tile.hidden = true;
    tile.innerHTML = '<b>' + b.ic + ' ' + b.name + '</b><span class="rtile__d">Production ×2 per level</span><span class="rtile__c"></span>';
    tile.addEventListener("click", function () { buyUp(b.id); });
    researchList.appendChild(tile);
    b._utile = tile;
    b._ucost = tile.querySelector(".rtile__c");
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

    var totalOwned = 0;
    for (var bi = 0; bi < BUILDINGS.length; bi++) totalOwned += owned(BUILDINGS[bi].id);
    helpEl.hidden = totalOwned > 0;

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
      b._sell.hidden = o <= 0;
      // per-building upgrade tile (lives in Research) — only once you own the building
      if (o > 0) {
        var t = upTier(b.id);
        b._utile.hidden = false;
        if (t >= 3) { b._utile.classList.add("done"); b._utile.disabled = true; b._ucost.textContent = "✓ Mk IV"; }
        else { var uc = upCost(b); b._utile.classList.remove("done"); b._utile.disabled = S.ore < uc; b._ucost.textContent = "◆ " + fmt(uc) + " · Mk" + [" II", " III", " IV"][t]; }
      } else { b._utile.hidden = true; }
    });

    RESEARCH.forEach(function (r) {
      var bought = !!S.rs[r.id];
      var show = bought || canReq(r);
      r._row.hidden = !show; if (!show) return;
      r._row.classList.toggle("done", bought);
      r._row.disabled = bought ? false : (S.ore < r.cost);
      r._cost.textContent = bought ? "✓ · sell" : "◆ " + fmt(r.cost);
    });
  }

  // ---------- Boot ----------
  BUILDINGS.forEach(reconcile);         // spawn models for saved counts
  if (S.started) panel.hidden = false;  // start collapsed (handle only); asteroid click opens it
  refresh();
  setInterval(refresh, 220);

  // Debug: "]" grants ore, "[" toggles a live object counter (bottom-left).
  var dbgEl = el("div", "idle-debug"); dbgEl.hidden = true;
  document.body.appendChild(dbgEl);
  function updateDbg() {
    if (dbgEl.hidden) return;
    var n = 0; OBS.scene.traverse(function () { n++; });
    var rows = [], mm = 0;
    for (var bi = 0; bi < BUILDINGS.length; bi++) {
      var b = BUILDINGS[bi], c = models[b.id] ? models[b.id].length : 0;
      mm += c;
      if (c > 0) rows.push(b.ic + " " + b.id + ": " + c + " models · own " + owned(b.id));
    }
    if (customMiner) rows.push("⛏ prospector: 1");
    dbgEl.innerHTML = ["scene objects: " + n, "unit models: " + mm + "   fx: " + fx.length, "───"].concat(rows).join("<br>");
  }
  setInterval(updateDbg, 400);
  window.addEventListener("keydown", function (e) {
    if (e.key === "]") {
      if (!S.started) { S.started = true; openPanel(); }
      S.ore += 1e12; if (S.ore > S.maxOre) S.maxOre = S.ore;
      refresh(); scheduleSave();
    } else if (e.key === "[") {
      dbgEl.hidden = !dbgEl.hidden; updateDbg();
    }
  });
})();
