/* ============================================================
   Cosmic Observatory — the 3D home scene.
   Vanilla Three.js (global THREE, r149). No modules, no bundler.
   - Drag with the mouse/finger to orbit the camera.
   - Hover a planet for its label; click/tap to warp into its section.
   Degrades gracefully: with no WebGL it leaves the accessible
   fallback (the .no3d state) in place.
   ============================================================ */
(function () {
  "use strict";

  var root = document.querySelector(".observatory");
  var canvas = document.getElementById("observatory-canvas");
  if (!root || !canvas || typeof THREE === "undefined") return;

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
      color: 0xff8c69, glow: "255,140,105", size: 0.9,  orbit: 4.6, speed: 0.16, angle: 0.4,
      detail: "moon",  url: root.getAttribute("data-gamedev") || "/gamedev/" },
    { key: "web",     name: "Web & Tools",      blurb: "Interfaces & the tools behind them",
      color: 0x2ec4b6, glow: "46,196,182",  size: 0.72, orbit: 6.8, speed: 0.11, angle: 2.4,
      detail: "wire",  url: root.getAttribute("data-web") || "/web/" },
    { key: "cs",      name: "Computer Science", blurb: "Low-level systems, rendering & AI",
      color: 0x9b8cff, glow: "155,140,255", size: 0.82, orbit: 9.0, speed: 0.08, angle: 4.5,
      detail: "ring",  url: root.getAttribute("data-cs") || "/cs/" }
  ];

  var aboutUrl = root.getAttribute("data-about") || "/about/";

  // --- Renderer / scene / camera -------------------------------------------
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x05070f, 1);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.013);

  var camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  var CAM_BASE = new THREE.Vector3(0, 4.2, 13);

  // Camera orbit (spherical) — driven by drag + slow auto-rotate
  var radius = CAM_BASE.length();
  var yaw = Math.atan2(CAM_BASE.x, CAM_BASE.z);
  var pitch = Math.atan2(CAM_BASE.y, Math.sqrt(CAM_BASE.x * CAM_BASE.x + CAM_BASE.z * CAM_BASE.z));
  var targetYaw = yaw, targetPitch = pitch;
  var AUTO_SPIN = 0.05; // rad/sec when idle

  // --- Lights --------------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x8899cc, 0.55));
  scene.add(new THREE.PointLight(0xffe4a8, 2.2, 80));

  // --- Helpers -------------------------------------------------------------
  function glowSprite(rgb, scale) {
    var cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    var ctx = cv.getContext("2d");
    var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0.0, "rgba(" + rgb + ",0.9)");
    g.addColorStop(0.25, "rgba(" + rgb + ",0.45)");
    g.addColorStop(1.0, "rgba(" + rgb + ",0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    var mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    var s = new THREE.Sprite(mat);
    s.scale.set(scale, scale, 1);
    return s;
  }

  function orbitRing(r) {
    var seg = 128, pts = [];
    for (var i = 0; i <= seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x3a4780, transparent: true, opacity: 0.4 })
    );
  }

  // --- Sun (the author) ----------------------------------------------------
  var sun = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 2),
    new THREE.MeshBasicMaterial({ color: 0xffd27d })
  );
  sun.add(glowSprite("255,210,125", 9));
  scene.add(sun);

  // --- Planets (each is a group with body + extras) ------------------------
  var planets = [];
  var bodies = [];

  PLANETS.forEach(function (p) {
    var group = new THREE.Group();

    var body = new THREE.Mesh(
      new THREE.IcosahedronGeometry(p.size, 1), // low-poly facets
      new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.15, flatShading: true, roughness: 0.8, metalness: 0.15 })
    );
    group.add(body);

    // atmosphere rim
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(p.size * 1.18, 24, 24),
      new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.12, side: THREE.BackSide })
    ));
    group.add(glowSprite(p.glow, p.size * 5));

    var pl = { cfg: p, group: group, body: body };

    if (p.detail === "moon") {
      var moonPivot = new THREE.Object3D();
      var moon = new THREE.Mesh(
        new THREE.IcosahedronGeometry(p.size * 0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0xffe9c2, flatShading: true, roughness: 0.9 })
      );
      moon.position.set(p.size * 2.0, 0, 0);
      moonPivot.add(moon); moonPivot.rotation.x = 0.5;
      group.add(moonPivot); pl.moonPivot = moonPivot;

    } else if (p.detail === "wire") {
      var wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(p.size * 1.3, 1)),
        new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.5 })
      );
      group.add(wire); pl.wire = wire;

    } else if (p.detail === "ring") {
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(p.size * 1.45, p.size * 2.2, 56),
        new THREE.MeshBasicMaterial({ color: p.color, side: THREE.DoubleSide, transparent: true, opacity: 0.42 })
      );
      ring.rotation.x = Math.PI * 0.5 - 0.32;
      group.add(ring);
      var bitPivot = new THREE.Object3D();
      for (var i = 0; i < 4; i++) {
        var a = (i / 4) * Math.PI * 2;
        var bit = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.09, 0.09),
          new THREE.MeshBasicMaterial({ color: 0xe8eaf2 })
        );
        bit.position.set(Math.cos(a) * p.size * 1.8, 0, Math.sin(a) * p.size * 1.8);
        bitPivot.add(bit);
      }
      group.add(bitPivot); pl.bitPivot = bitPivot;
    }

    body.userData = p; // raycast → config

    scene.add(group);
    scene.add(orbitRing(p.orbit));
    planets.push(pl);
    bodies.push(body);
  });

  // The sun is the author — clicking it opens the About page
  sun.userData = { name: "About", blurb: "Who I am — bio & CV", url: aboutUrl };
  bodies.push(sun);

  // --- Starfield -----------------------------------------------------------
  (function stars() {
    var N = 1700, pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var r = 40 + Math.random() * 100;
      var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.85 })));
  })();

  // --- Interaction ---------------------------------------------------------
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2(-2, -2);
  var hovered = null, warping = false;
  var dragging = false, dragged = false, lastX = 0, lastY = 0, downX = 0, downY = 0;
  var label = document.getElementById("planet-label");
  var hint = document.getElementById("observatory-hint");
  var fade = document.getElementById("warp-fade");
  var tmpV = new THREE.Vector3();
  var tmpS = new THREE.Vector3();
  var warpTarget = new THREE.Vector3();

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "pan-y"; // allow vertical page scroll, capture horizontal drag

  function setPointer(e) {
    var r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  function onDown(e) {
    dragging = true; dragged = false;
    downX = lastX = e.clientX; downY = lastY = e.clientY;
    canvas.style.cursor = "grabbing";
  }
  function onMove(e) {
    setPointer(e);
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) dragged = true;
    targetYaw -= dx * 0.005;
    targetPitch = Math.max(0.06, Math.min(1.28, targetPitch + dy * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  }
  function onUp() {
    if (dragging && !dragged && hovered) go(hovered);
    dragging = false;
    canvas.style.cursor = hovered ? "pointer" : "grab";
  }
  function onLeave() { pointer.set(-2, -2); dragging = false; canvas.style.cursor = "grab"; }

  function go(body) {
    if (warping || !body) return;
    warping = true;
    if (fade) fade.classList.add("on");
    body.getWorldPosition(warpTarget);
    setTimeout(function () { window.location.href = body.userData.url; }, 560);
  }
  function onKey(e) {
    if (e.key === "1") go(planets[0].body);
    else if (e.key === "2") go(planets[1].body);
    else if (e.key === "3") go(planets[2].body);
    else if (e.key === "0") go(sun);
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  window.addEventListener("keydown", onKey);

  // --- Resize / pause ------------------------------------------------------
  function resize() {
    var w = canvas.clientWidth || root.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || root.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  var running = true;
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) loop();
  });

  // --- Label follow --------------------------------------------------------
  function updateLabel() {
    if (!hovered || !label) { if (label) label.classList.remove("show"); return; }
    hovered.getWorldPosition(tmpV);
    tmpV.project(camera);
    var r = canvas.getBoundingClientRect();
    label.style.left = ((tmpV.x * 0.5 + 0.5) * r.width + r.left) + "px";
    label.style.top = ((-tmpV.y * 0.5 + 0.5) * r.height + r.top) + "px";
    label.innerHTML = "<b>" + hovered.userData.name + "</b><span>" + hovered.userData.blurb + "</span>";
    label.classList.add("show");
  }

  // --- Animation -----------------------------------------------------------
  var clock = new THREE.Clock();

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    // Planets: orbit, spin, satellites
    planets.forEach(function (pl) {
      var c = pl.cfg;
      if (!reduceMotion) c.angle += c.speed * dt;
      var a = c.angle;
      pl.group.position.set(Math.cos(a) * c.orbit, Math.sin(a * 1.3) * 0.35, Math.sin(a) * c.orbit);
      if (!reduceMotion) {
        pl.body.rotation.y += dt * 0.4;
        if (pl.moonPivot) pl.moonPivot.rotation.y += dt * 1.1;
        if (pl.bitPivot) pl.bitPivot.rotation.y += dt * 0.9;
        if (pl.wire) pl.wire.rotation.y -= dt * 0.15;
      }
      var target = (pl.body === hovered) ? 1.32 : 1;
      pl.group.scale.lerp(tmpS.set(target, target, target), 0.15);
    });
    if (!reduceMotion) sun.rotation.y += dt * 0.12;
    var sunPulse = reduceMotion ? 1 : (1 + Math.sin(t * 1.4) * 0.02);
    var sunHover = (hovered === sun) ? 1.12 : 1;
    sun.scale.lerp(tmpS.set(sunPulse * sunHover, sunPulse * sunHover, sunPulse * sunHover), 0.2);

    // Hover detection (not while dragging or warping)
    if (!warping && !dragging) {
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(bodies, false);
      var nh = hits.length ? hits[0].object : null;
      if (nh !== hovered) {
        hovered = nh;
        canvas.style.cursor = hovered ? "pointer" : "grab";
        if (hint) hint.style.opacity = hovered ? "0" : "";
      }
    }
    updateLabel();

    // Camera: drag-orbit + idle auto-spin, or warp fly-to
    if (warping) {
      camera.position.lerp(tmpV.copy(warpTarget).multiplyScalar(0.55).setY(warpTarget.y + 1.5), 0.06);
      camera.lookAt(warpTarget);
    } else {
      if (!dragging && !reduceMotion) targetYaw += AUTO_SPIN * dt;
      yaw += (targetYaw - yaw) * 0.08;
      pitch += (targetPitch - pitch) * 0.08;
      var cp = Math.cos(pitch);
      camera.position.set(radius * cp * Math.sin(yaw), radius * Math.sin(pitch), radius * cp * Math.cos(yaw));
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  // --- Boot ----------------------------------------------------------------
  root.classList.remove("no3d");
  resize();
  loop();
})();
