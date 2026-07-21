/* ============================================================
   Cosmic Observatory — the 3D home scene.
   Vanilla Three.js (global THREE, r149). No modules, no bundler.
   Gracefully degrades: if WebGL is missing it leaves the
   accessible fallback (the .no3d state) in place.
   ============================================================ */
(function () {
  "use strict";

  var root = document.querySelector(".observatory");
  var canvas = document.getElementById("observatory-canvas");
  if (!root || !canvas || typeof THREE === "undefined") return;

  // --- WebGL support check -------------------------------------------------
  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }
  if (!webglOK()) return; // keep .no3d fallback

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Planet definitions --------------------------------------------------
  var PLANETS = [
    { key: "gamedev", name: "Gamedev",          blurb: "Games as art you can play",
      color: 0xff8c69, glow: "255,140,105", size: 0.85, orbit: 4.4, speed: 0.16, angle: 0.4,
      url: root.getAttribute("data-gamedev") || "/gamedev/" },
    { key: "web",     name: "Web & Tools",      blurb: "Interfaces & the tools behind them",
      color: 0x2ec4b6, glow: "46,196,182",  size: 0.7,  orbit: 6.6, speed: 0.11, angle: 2.4,
      url: root.getAttribute("data-web") || "/web/" },
    { key: "cs",      name: "Computer Science", blurb: "Low-level systems, rendering & AI",
      color: 0x9b8cff, glow: "155,140,255", size: 0.78, orbit: 8.8, speed: 0.08, angle: 4.5,
      url: root.getAttribute("data-cs") || "/cs/" }
  ];

  // --- Renderer / scene / camera -------------------------------------------
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x05070f, 1);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.014);

  var camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  var CAM_BASE = new THREE.Vector3(0, 4.2, 13);
  camera.position.copy(CAM_BASE);
  camera.lookAt(0, 0, 0);

  // --- Lights --------------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x8899cc, 0.55));
  var sunLight = new THREE.PointLight(0xffe4a8, 2.2, 60);
  scene.add(sunLight);

  // --- Radial glow sprite helper -------------------------------------------
  function glowSprite(rgb, scale) {
    var cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    var ctx = cv.getContext("2d");
    var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0.0, "rgba(" + rgb + ",0.9)");
    g.addColorStop(0.25, "rgba(" + rgb + ",0.45)");
    g.addColorStop(1.0, "rgba(" + rgb + ",0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(cv);
    var mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    var s = new THREE.Sprite(mat);
    s.scale.set(scale, scale, 1);
    return s;
  }

  // --- Sun (the author) ----------------------------------------------------
  var sun = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 2),
    new THREE.MeshBasicMaterial({ color: 0xffd27d })
  );
  scene.add(sun);
  sun.add(glowSprite("255,210,125", 8.5));

  // --- Orbit rings ---------------------------------------------------------
  function orbitRing(radius) {
    var seg = 128, pts = [];
    for (var i = 0; i <= seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({ color: 0x3a4780, transparent: true, opacity: 0.4 });
    return new THREE.LineLoop(geo, mat);
  }

  // --- Planets -------------------------------------------------------------
  var planetMeshes = [];
  PLANETS.forEach(function (p) {
    var mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(p.size, 1), // low-poly
      new THREE.MeshStandardMaterial({
        color: p.color, emissive: p.color, emissiveIntensity: 0.18,
        flatShading: true, roughness: 0.75, metalness: 0.1
      })
    );
    mesh.userData = p;
    mesh.userData.baseScale = 1;
    mesh.add(glowSprite(p.glow, p.size * 5));
    scene.add(mesh);
    scene.add(orbitRing(p.orbit));
    planetMeshes.push(mesh);
  });

  // --- Starfield -----------------------------------------------------------
  (function stars() {
    var N = 1600, pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var r = 40 + Math.random() * 90;
      var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.85
    })));
  })();

  // --- Interaction state ---------------------------------------------------
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2(-2, -2);       // NDC of cursor
  var mouseNorm = new THREE.Vector2(0, 0);        // -1..1 for parallax
  var hovered = null;
  var warping = false;
  var label = document.getElementById("planet-label");
  var hint = document.getElementById("observatory-hint");
  var fade = document.getElementById("warp-fade");
  var tmpV = new THREE.Vector3();

  function onPointerMove(e) {
    var r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    mouseNorm.x = pointer.x; mouseNorm.y = pointer.y;
  }
  function onLeave() { pointer.set(-2, -2); mouseNorm.set(0, 0); }

  function go(planet) {
    if (warping || !planet) return;
    warping = true;
    if (fade) fade.classList.add("on");
    warpTarget.copy(planet.position);
    setTimeout(function () { window.location.href = planet.userData.url; }, 560);
  }
  var warpTarget = new THREE.Vector3();

  function onClick() {
    if (hovered) go(hovered);
  }
  function onKey(e) {
    // number keys 1/2/3 jump to planets (keyboard affordance beyond the fallback links)
    if (e.key === "1") go(planetMeshes[0]);
    else if (e.key === "2") go(planetMeshes[1]);
    else if (e.key === "3") go(planetMeshes[2]);
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);

  // --- Resize --------------------------------------------------------------
  function resize() {
    var w = canvas.clientWidth || root.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || root.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // --- Pause when hidden ---------------------------------------------------
  var running = true;
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) loop();
  });

  // --- Animation -----------------------------------------------------------
  var clock = new THREE.Clock();

  function updateLabel() {
    if (!hovered || !label) { if (label) label.classList.remove("show"); return; }
    hovered.getWorldPosition(tmpV);
    tmpV.project(camera);
    var r = canvas.getBoundingClientRect();
    var x = (tmpV.x * 0.5 + 0.5) * r.width + r.left;
    var y = (-tmpV.y * 0.5 + 0.5) * r.height + r.top;
    label.style.left = x + "px";
    label.style.top = y + "px";
    label.innerHTML = "<b>" + hovered.userData.name + "</b><span>" + hovered.userData.blurb + "</span>";
    label.classList.add("show");
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    var t = clock.getElapsedTime();
    var dt = Math.min(clock.getDelta(), 0.05);

    // Orbit + spin (frozen positions when reduced motion, but scene still renders)
    planetMeshes.forEach(function (m) {
      if (!reduceMotion) m.userData.angle += m.userData.speed * dt;
      var a = m.userData.angle;
      m.position.set(Math.cos(a) * m.userData.orbit, Math.sin(a * 1.3) * 0.35, Math.sin(a) * m.userData.orbit);
      if (!reduceMotion) m.rotation.y += dt * 0.4;
    });
    if (!reduceMotion) {
      sun.rotation.y += dt * 0.12;
      sun.scale.setScalar(1 + Math.sin(t * 1.4) * 0.02);
    }

    // Hover detection
    if (!warping) {
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(planetMeshes, false);
      var newHover = hits.length ? hits[0].object : null;
      if (newHover !== hovered) {
        hovered = newHover;
        canvas.style.cursor = hovered ? "pointer" : "default";
        if (hint) hint.style.opacity = hovered ? "0" : "";
      }
    }

    // Smooth hover scale
    planetMeshes.forEach(function (m) {
      var target = (m === hovered ? 1.35 : 1);
      m.scale.lerp(new THREE.Vector3(target, target, target), 0.15);
    });
    updateLabel();

    // Camera: gentle parallax, or fly-to on warp
    if (warping) {
      camera.position.lerp(tmpV.copy(warpTarget).multiplyScalar(0.55).setY(warpTarget.y + 1.5), 0.06);
      camera.lookAt(warpTarget);
    } else {
      var px = CAM_BASE.x + mouseNorm.x * 1.8;
      var py = CAM_BASE.y - mouseNorm.y * 1.2;
      camera.position.x += (px - camera.position.x) * 0.05;
      camera.position.y += (py - camera.position.y) * 0.05;
      camera.position.z += (CAM_BASE.z - camera.position.z) * 0.05;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  // --- Boot ----------------------------------------------------------------
  root.classList.remove("no3d");   // reveal canvas, hide fallback
  resize();
  loop();
})();
