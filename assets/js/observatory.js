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
      color: 0xff8c69, glow: "255,140,105", size: 0.9,  orbit: 4.6, speed: 0.08, angle: 0.4,
      detail: "moon",  url: root.getAttribute("data-gamedev") || "/gamedev/", count: root.getAttribute("data-count-gamedev") },
    { key: "web",     name: "Web & Tools",      blurb: "Interfaces & the tools behind them",
      color: 0x2ec4b6, glow: "46,196,182",  size: 0.72, orbit: 6.8, speed: 0.055, angle: 2.4,
      detail: "wire",  url: root.getAttribute("data-web") || "/web/", count: root.getAttribute("data-count-web") },
    { key: "cs",      name: "Computer Science", blurb: "Low-level systems, rendering & AI",
      color: 0x9b8cff, glow: "155,140,255", size: 0.82, orbit: 9.0, speed: 0.04, angle: 4.5,
      detail: "ring",  url: root.getAttribute("data-cs") || "/cs/", count: root.getAttribute("data-count-cs") }
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

  // Zoom (a little): wheel on desktop, two-finger pinch on touch — clamped near the base distance
  var RADIUS_BASE = radius;
  var RADIUS_MIN = RADIUS_BASE * 0.6;    // closest (zoom in)
  var RADIUS_MAX = RADIUS_BASE * 1.12;   // farthest (slight zoom out)
  var targetRadius = radius;
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

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

  // Procedural star surface: warm gradient (limb darkening) + granulation
  function sunTexture() {
    var S = 256, cv = document.createElement("canvas"); cv.width = cv.height = S;
    var ctx = cv.getContext("2d");
    var g = ctx.createRadialGradient(S * 0.42, S * 0.4, S * 0.04, S * 0.5, S * 0.5, S * 0.62);
    g.addColorStop(0.0, "#fff7df");
    g.addColorStop(0.35, "#ffe6a6");
    g.addColorStop(0.7, "#ffb653");
    g.addColorStop(1.0, "#e2731c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    for (var i = 0; i < 240; i++) {
      var x = Math.random() * S, y = Math.random() * S, r = 2 + Math.random() * 11;
      ctx.globalAlpha = 0.04 + Math.random() * 0.12;
      ctx.fillStyle = Math.random() > 0.5 ? "#fff2c4" : "#d8641a";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return new THREE.CanvasTexture(cv);
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
    new THREE.SphereGeometry(1.5, 48, 48),
    new THREE.MeshBasicMaterial({ map: sunTexture() })
  );
  scene.add(sun);
  // corona shell (soft additive halo hugging the limb)
  var corona = new THREE.Mesh(
    new THREE.SphereGeometry(1.78, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sun.add(corona);
  // layered glow: a tight bright core + a big soft bloom
  sun.add(glowSprite("255,228,150", 6.5));
  var sunBloom = glowSprite("255,176,84", 12);
  sun.add(sunBloom);

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

  // --- Asteroid belt (a ring of low-poly rocks past the CS planet) ---------
  var belt = new THREE.Group();
  (function asteroids() {
    var mat = new THREE.MeshStandardMaterial({ color: 0x7a819c, flatShading: true, roughness: 1 });
    for (var i = 0; i < 70; i++) {
      var rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05 + Math.random() * 0.1, 0), mat);
      var a = Math.random() * Math.PI * 2, r = 11.6 + (Math.random() - 0.5) * 1.4;
      rock.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.7, Math.sin(a) * r);
      rock.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      belt.add(rock);
    }
    scene.add(belt);
  })();

  // Invisible but raycastable collider covering the whole belt zone, so a click
  // anywhere in the ring counts (the rocks themselves are tiny to hit).
  var beltZone = new THREE.Mesh(
    new THREE.RingGeometry(9.4, 13.8, 48),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false, side: THREE.DoubleSide })
  );
  beltZone.rotation.x = -Math.PI / 2;
  scene.add(beltZone);

  // --- Shooting stars ------------------------------------------------------
  var meteors = [];
  var meteorTimer = 2 + Math.random() * 3;
  var METEOR_DIR = new THREE.Vector3();
  function spawnMeteor() {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    line.userData = {
      pos: new THREE.Vector3((Math.random() * 2 - 1) * 45, 15 + Math.random() * 22, -25 - Math.random() * 25),
      vel: new THREE.Vector3(-1 - Math.random() * 1.2, -0.5 - Math.random() * 0.5, 0.2 + Math.random() * 0.4).normalize().multiplyScalar(34 + Math.random() * 26),
      life: 0, ttl: 1.1 + Math.random() * 0.9, len: 2.4 + Math.random() * 3
    };
    scene.add(line);
    meteors.push(line);
  }
  function updateMeteors(dt) {
    meteorTimer -= dt;
    if (meteorTimer <= 0 && !reduceMotion) { spawnMeteor(); meteorTimer = 2.5 + Math.random() * 4; }
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i], u = m.userData;
      u.life += dt;
      u.pos.addScaledVector(u.vel, dt);
      METEOR_DIR.copy(u.vel).normalize();
      var arr = m.geometry.attributes.position.array;
      arr[0] = u.pos.x; arr[1] = u.pos.y; arr[2] = u.pos.z;
      arr[3] = u.pos.x - METEOR_DIR.x * u.len; arr[4] = u.pos.y - METEOR_DIR.y * u.len; arr[5] = u.pos.z - METEOR_DIR.z * u.len;
      m.geometry.attributes.position.needsUpdate = true;
      m.material.opacity = Math.max(0, 0.9 * (1 - u.life / u.ttl));
      if (u.life >= u.ttl) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); meteors.splice(i, 1); }
    }
  }

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
  var frameCbs = [], asteroidCbs = [];

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "pan-y"; // allow vertical page scroll, capture horizontal drag

  function setPointer(e) {
    var r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  // Track every active pointer so touch (Android) works: 1 = orbit/tap, 2 = pinch-zoom.
  var activePointers = {}; // pointerId -> {x, y}
  var pinching = false, pinchStartDist = 0, pinchStartRadius = 0;

  function pointerList() {
    var a = [];
    for (var k in activePointers) if (activePointers.hasOwnProperty(k)) a.push(activePointers[k]);
    return a;
  }
  function pinchDist() {
    var a = pointerList();
    if (a.length < 2) return 0;
    var dx = a[0].x - a[1].x, dy = a[0].y - a[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onDown(e) {
    activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
    var n = pointerList().length;
    if (n === 1) {
      setPointer(e);
      dragging = true; dragged = false;
      downX = lastX = e.clientX; downY = lastY = e.clientY;
      canvas.style.cursor = "grabbing";
    } else if (n === 2) {
      // second finger down → pinch-zoom; cancel the in-progress orbit/tap
      dragging = false; dragged = true;
      pinching = true;
      pinchStartDist = pinchDist();
      pinchStartRadius = targetRadius;
    }
  }
  function onMove(e) {
    var p = activePointers[e.pointerId];
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (pinching) {
      var d = pinchDist();
      if (d > 0 && pinchStartDist > 0) {
        targetRadius = clamp(pinchStartRadius * (pinchStartDist / d), RADIUS_MIN, RADIUS_MAX);
      }
      return;
    }
    setPointer(e);
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) dragged = true;
    targetYaw -= dx * 0.005;
    targetPitch = Math.max(0.06, Math.min(1.28, targetPitch + dy * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  }
  // Tap/click: raycast at the released point (works on touch, where there is no hover).
  function handleTap() {
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(bodies, false);
    if (hits.length) { go(hits[0].object); return; }
    if (asteroidCbs.length) {
      var ah = raycaster.intersectObjects([beltZone], false);
      if (ah.length) {
        var pt = ah[0].point, near = null, best = Infinity, wp = new THREE.Vector3();
        for (var r = 0; r < belt.children.length; r++) {
          belt.children[r].getWorldPosition(wp);
          var d = wp.distanceToSquared(pt);
          if (d < best) { best = d; near = belt.children[r]; }
        }
        for (var k = 0; k < asteroidCbs.length; k++) asteroidCbs[k](near, pt);
      }
    }
  }
  function onUp(e) {
    var wasTap = dragging && !dragged;
    delete activePointers[e.pointerId];
    if (canvas.releasePointerCapture) { try { canvas.releasePointerCapture(e.pointerId); } catch (err) {} }
    var n = pointerList().length;
    if (pinching) {
      if (n < 2) pinching = false;
      if (n === 1) { // one finger remains → resume orbit from it, no accidental tap
        var rem = pointerList()[0];
        dragging = true; dragged = true;
        downX = lastX = rem.x; downY = lastY = rem.y;
      }
      canvas.style.cursor = hovered ? "pointer" : "grab";
      return;
    }
    if (n === 0) {
      if (wasTap) handleTap();
      dragging = false;
      canvas.style.cursor = hovered ? "pointer" : "grab";
    }
  }
  function onLeave(e) {
    if (e && e.pointerType && e.pointerType !== "mouse") return; // keep touch/pinch state intact
    pointer.set(-2, -2);
    if (!dragging) canvas.style.cursor = "grab";
  }
  function onWheel(e) {
    e.preventDefault();
    targetRadius = clamp(targetRadius + e.deltaY * 0.01, RADIUS_MIN, RADIUS_MAX);
  }

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
  window.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
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
    var meta = hovered.userData.blurb;
    if (hovered.userData.count) meta += " · " + hovered.userData.count + " projects";
    label.innerHTML = "<b>" + hovered.userData.name + "</b><span>" + meta + "</span>";
    label.classList.add("show");
  }

  // --- Animation -----------------------------------------------------------
  var clock = new THREE.Clock();

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    if (!reduceMotion) belt.rotation.y += dt * 0.02;
    updateMeteors(dt);
    for (var fci = 0; fci < frameCbs.length; fci++) frameCbs[fci](dt);

    // Planets: orbit, spin, satellites
    planets.forEach(function (pl) {
      var c = pl.cfg;
      if (!reduceMotion) c.angle += c.speed * dt;
      var a = c.angle;
      pl.group.position.set(Math.cos(a) * c.orbit, Math.sin(a * 1.3) * 0.35, Math.sin(a) * c.orbit);
      if (!reduceMotion) {
        pl.body.rotation.y += dt * 0.25;
        if (pl.moonPivot) pl.moonPivot.rotation.y += dt * 1.1;
        if (pl.bitPivot) pl.bitPivot.rotation.y += dt * 0.9;
        if (pl.wire) pl.wire.rotation.y -= dt * 0.15;
      }
      var target = (pl.body === hovered) ? 1.32 : 1;
      pl.group.scale.lerp(tmpS.set(target, target, target), 0.15);
    });
    if (!reduceMotion) {
      sun.rotation.y += dt * 0.12;
      var pb = 12 * (1 + Math.sin(t * 1.1) * 0.06);
      sunBloom.scale.set(pb, pb, 1);
      corona.material.opacity = 0.2 + Math.sin(t * 0.9) * 0.06;
    }
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
      radius += (targetRadius - radius) * 0.1;
      var cp = Math.cos(pitch);
      camera.position.set(radius * cp * Math.sin(yaw), radius * Math.sin(pitch), radius * cp * Math.cos(yaw));
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  // --- Boot ----------------------------------------------------------------
  root.classList.remove("no3d");
  resize();
  window.OBS = {
    THREE: THREE, scene: scene, camera: camera, canvas: canvas, planets: planets, belt: belt,
    onFrame: function (fn) { frameCbs.push(fn); },
    onAsteroidClick: function (fn) { asteroidCbs.push(fn); }
  };
  loop();
})();
