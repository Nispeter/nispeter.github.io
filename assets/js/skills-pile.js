/* ============================================================
   skills-pile.js: the About page skill chips, dropped into a heap you can
   shove around. Vanilla, no deps, loaded only by /about/.

   Each chip is a capsule (a segment with a radius), which is exactly what a
   pill-shaped chip already is. Rotation is real, so the heap settles into
   tilted layers rather than stacking like bricks.

   The solver is position based (XPBD): each substep predicts where the chips
   would go, pushes them out of each other, and only then reads the velocity
   back off how far they actually moved. Doing it in that order is what keeps
   a heap this deep quiet. Correcting positions and velocities separately, the
   usual impulse way, hands a buried chip free speed every time it is shoved
   out of its neighbour, and the pile never stops churning.

   Progressive enhancement: the markup is an ordinary wrapped chip cloud and
   stays that way with scripting off or reduced motion on. This file measures
   the chips in that layout first, then takes over positioning.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var host = document.querySelector('[data-skills-pile]');
  if (!host || root.classList.contains('reduce-motion')) return;

  var chips = Array.prototype.slice.call(host.querySelectorAll('.chip'));
  if (chips.length < 4) return;

  var GRAVITY = 2200;      // px/s^2; a chip crosses the box in about a second
  var FRICTION = 0.55;     // chip on chip
  var WALL_FRICTION = 0.7; // chip on floor, so the heap does not slump flat
  var LINEAR_DAMP = 0.995; // per frame, spread across the substeps below
  var ANGULAR_DAMP = 0.97;
  var SUBSTEPS = 8;
  var ITERATIONS = 2;
  var PARALLEL = 0.3;      // |sin| between two chips below which they count as parallel
  var DRAG_STIFF = 0.4;
  // Reading velocity back off the movement means a body shoved out of a deep
  // overlap leaves at whatever speed the shove implied, which for a chip
  // buried on spawn is a launch. Cap how fast overlap is allowed to close.
  var RECOVERY = 140;      // px/s
  // A settled heap never quite reaches zero on its own: two iterations a
  // substep leave every chip nudging its neighbours forever. Bleed off what
  // is left once a body is nearly still, so the pile stops and the loop can
  // sleep instead of creeping all afternoon. Only ever applied to a chip that
  // is resting on something: damping one in free fall pins it in mid-air.
  var REST_SPEED = 20;     // px/s
  var REST_SPIN = 1;       // rad/s
  var REST_DAMP = 0.5;
  var STEP = 1 / 60;
  var STILL = 0.25;        // px a chip may move in a frame and still count as stopped
  var SLEEP_FRAMES = 40;   // frames of a still picture before we stop

  var bodies = [];
  var W = 0, H = 0;
  var held = null;
  var pointer = { x: 0, y: 0, vx: 0, vy: 0, t: 0 };
  var raf = 0, acc = 0, last = 0, stillFor = 0, started = false;
  var linDamp = 1, angDamp = 1, maxPen = 1;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

  /* ---------------------------------------------------------
     Setup: measure in flow, then take the chips out of it.
     --------------------------------------------------------- */
  function build() {
    W = host.clientWidth;
    if (!W) return false;

    // Measured while the chips are still laid out as a normal wrapped cloud.
    var dims = chips.map(function (el) {
      var r = el.getBoundingClientRect();
      return { el: el, w: r.width, h: r.height };
    });
    if (!dims[0].w) return false;

    // Height the heap needs: total chip area over the width, plus room for the
    // fact that a pile of tilted pills never tessellates.
    var area = 0;
    dims.forEach(function (d) { area += d.w * d.h; });
    H = clamp(Math.round(area * 1.65 / W) + 30, 200, 900);

    host.style.height = H + 'px';
    host.classList.add('is-pile');

    bodies = dims.map(function (d) {
      var m = d.w * d.h * 0.0015;
      return {
        el: d.el,
        w: d.w, h: d.h,
        r: d.h / 2,
        len: Math.max(d.w - d.h, 0.01),   // capsule segment; the caps are the ends
        x: 0, y: 0, a: 0,
        px: 0, py: 0, pa: 0,              // where it was when this substep began
        vx: 0, vy: 0, va: 0,
        im: 1 / m,
        ii: 1 / (m * (d.w * d.w + d.h * d.h) / 12),
        lax: 0, lay: 0,
        minx: 0, maxx: 0, miny: 0, maxy: 0,
        touched: false,                   // met a contact during this substep
        lx: 0, ly: 0, la: 0,              // where it was on the previous frame
        tx: '', ty: '', ta: ''            // last values written to the transform
      };
    });

    linDamp = Math.pow(LINEAR_DAMP, 1 / SUBSTEPS);
    angDamp = Math.pow(ANGULAR_DAMP, 1 / SUBSTEPS);

    spawn();
    render();
    return true;
  }

  // Shelf-pack the chips into rows above the box so they rain in without
  // starting inside each other, which a random scatter would.
  function spawn() {
    var x = 0, rowH = 0;
    var rows = [[]];
    bodies.forEach(function (b) {
      if (x + b.w > W && rows[rows.length - 1].length) { rows.push([]); x = 0; }
      rows[rows.length - 1].push(b);
      b.x = x + b.w / 2;
      x += b.w + 6;
      rowH = Math.max(rowH, b.h);
    });

    rowH += 12;
    rows.reverse().forEach(function (row, i) {
      var top = -(30 + i * rowH);
      row.forEach(function (b) {
        b.y = top + rand(-5, 5);
        b.a = rand(-0.4, 0.4);
        b.vx = rand(-25, 25);
        b.vy = rand(0, 50);
        b.va = rand(-1, 1);
      });
    });
  }

  /* ---------------------------------------------------------
     Capsule geometry.
     --------------------------------------------------------- */
  var segA = { x1: 0, y1: 0, x2: 0, y2: 0 };
  var segB = { x1: 0, y1: 0, x2: 0, y2: 0 };
  var segW = { x1: 0, y1: 0, x2: 0, y2: 0 };

  function segmentOf(b, out) {
    var hl = b.len / 2, c = Math.cos(b.a), s = Math.sin(b.a);
    out.x1 = b.x - c * hl; out.y1 = b.y - s * hl;
    out.x2 = b.x + c * hl; out.y2 = b.y + s * hl;
  }

  // Broadphase runs once a frame, but the substeps then move the body for a
  // whole frame, so the box is swept along its velocity. Half the chip width
  // is used on both axes because the body also turns while it travels, and
  // that is its widest possible reach at any angle.
  function bounds(b, dt) {
    var ex = b.w / 2 + 4 + Math.abs(b.vx) * dt;
    var ey = b.w / 2 + 4 + Math.abs(b.vy) * dt;
    b.minx = b.x - ex; b.maxx = b.x + ex;
    b.miny = b.y - ey; b.maxy = b.y + ey;
  }

  // Closest points between two segments (Ericson, Real-Time Collision Detection).
  var cp = { ax: 0, ay: 0, bx: 0, by: 0 };
  function closestSegSeg(p1x, p1y, q1x, q1y, p2x, p2y, q2x, q2y) {
    var d1x = q1x - p1x, d1y = q1y - p1y;
    var d2x = q2x - p2x, d2y = q2y - p2y;
    var rx = p1x - p2x, ry = p1y - p2y;
    var a = d1x * d1x + d1y * d1y;
    var e = d2x * d2x + d2y * d2y;
    var f = d2x * rx + d2y * ry;
    var s, t, c, b, denom;

    if (a <= 1e-9 && e <= 1e-9) { s = 0; t = 0; }
    else if (a <= 1e-9) { s = 0; t = clamp01(f / e); }
    else {
      c = d1x * rx + d1y * ry;
      if (e <= 1e-9) { t = 0; s = clamp01(-c / a); }
      else {
        b = d1x * d2x + d1y * d2y;
        denom = a * e - b * b;
        s = denom !== 0 ? clamp01((b * f - c * e) / denom) : 0;
        t = (b * s + f) / e;
        if (t < 0) { t = 0; s = clamp01(-c / a); }
        else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
      }
    }
    cp.ax = p1x + d1x * s; cp.ay = p1y + d1y * s;
    cp.bx = p2x + d2x * t; cp.by = p2y + d2y * t;
  }

  /* ---------------------------------------------------------
     Position-level constraint solving.
     --------------------------------------------------------- */

  // How much a body yields to a push along (nx,ny) applied at offset (rx,ry).
  function invMassAt(b, nx, ny, rx, ry) {
    var rn = rx * ny - ry * nx;
    return b.im + rn * rn * b.ii;
  }

  function move(b, nx, ny, rx, ry, lambda) {
    b.x += lambda * b.im * nx;
    b.y += lambda * b.im * ny;
    b.a += lambda * b.ii * (rx * ny - ry * nx);
  }

  // Displacement of a point rigidly attached to b since the substep began.
  // Small angle, which is all a substep ever turns.
  function driftX(b, ry) { return (b.x - b.px) - ry * (b.a - b.pa); }
  function driftY(b, rx) { return (b.y - b.py) + rx * (b.a - b.pa); }

  /* One contact between two chips. n points from A towards B, pen is how far
     they overlap. Separating them also drags the contact patch back along
     itself, up to the friction cone, which is what stops the heap slumping
     into a flat layer. */
  function solveContact(A, B, nx, ny, pen, cx, cy) {
    if (pen <= 0) return;
    if (pen > maxPen) pen = maxPen;

    var rax = cx - A.x, ray = cy - A.y;
    var rbx = cx - B.x, rby = cy - B.y;
    var w = invMassAt(A, nx, ny, rax, ray) + invMassAt(B, nx, ny, rbx, rby);
    if (w <= 1e-12) return;

    var lambda = pen / w;
    A.touched = true; B.touched = true;
    move(A, nx, ny, rax, ray, -lambda);
    move(B, nx, ny, rbx, rby, lambda);

    // Static friction: undo how far the two surfaces slid past each other.
    var dx = (driftX(B, rby) - driftX(A, ray));
    var dy = (driftY(B, rbx) - driftY(A, rax));
    var dn = dx * nx + dy * ny;
    dx -= dn * nx; dy -= dn * ny;
    var dl = Math.sqrt(dx * dx + dy * dy);
    if (dl < 1e-6) return;

    var tx = dx / dl, ty = dy / dl;
    var wt = invMassAt(A, tx, ty, rax, ray) + invMassAt(B, tx, ty, rbx, rby);
    if (wt <= 1e-12) return;
    var lt = Math.min(dl / wt, FRICTION * lambda);
    move(A, tx, ty, rax, ray, lt);
    move(B, tx, ty, rbx, rby, -lt);
  }

  /* Contact between two chips.

     The normal and the depth always come from the closest point between the
     two segments, which is well defined for parallel chips too and so cannot
     disagree with itself between iterations. A threshold that switched
     between two different ways of measuring the same contact left the pairs
     sitting either side of it oscillating, permanently half buried.

     Two things still need care. When the segments actually cross there is no
     closest point to take a direction from, and the shortest way out of two
     overlapping pills is always across their width. And for chips lying flat
     on each other the closest point sits at one chip's end, off centre, so
     resting on it applies a small permanent torque that slowly rolls a whole
     stack over; the contact belongs in the middle of the overlap instead. */
  function collidePair(A, B) {
    segmentOf(A, segA);
    segmentOf(B, segB);

    closestSegSeg(segA.x1, segA.y1, segA.x2, segA.y2, segB.x1, segB.y1, segB.x2, segB.y2);
    var dx = cp.bx - cp.ax, dy = cp.by - cp.ay;
    var d2 = dx * dx + dy * dy;
    var rr = A.r + B.r;
    if (d2 >= rr * rr) return;

    var adx = segA.x2 - segA.x1, ady = segA.y2 - segA.y1;
    var la = Math.sqrt(adx * adx + ady * ady);
    var ux = la > 1e-6 ? adx / la : 1;
    var uy = la > 1e-6 ? ady / la : 0;

    var d = Math.sqrt(d2);
    var nx, ny;
    if (d > 0.5) {
      nx = dx / d; ny = dy / d;
    } else {
      // Crossed segments: push apart across A's width.
      nx = -uy; ny = ux;
      if ((B.x - A.x) * nx + (B.y - A.y) * ny < 0) { nx = -nx; ny = -ny; }
      d = 0;
    }

    // Where the two touch, moved to the middle of the overlap when the chips
    // lie along each other rather than meeting at a point.
    var cx = cp.ax, cy = cp.ay;
    var bdx = segB.x2 - segB.x1, bdy = segB.y2 - segB.y1;
    var lb = Math.sqrt(bdx * bdx + bdy * bdy);
    if (la > 1e-6 && lb > 1e-6 &&
        Math.abs(adx * bdy - ady * bdx) / (la * lb) < PARALLEL) {
      var t1 = (segB.x1 - A.x) * ux + (segB.y1 - A.y) * uy;
      var t2 = (segB.x2 - A.x) * ux + (segB.y2 - A.y) * uy;
      var halfA = A.len / 2;
      var lo = Math.max(-halfA, Math.min(t1, t2));
      var hi = Math.min(halfA, Math.max(t1, t2));
      if (hi >= lo) {
        var mid = (lo + hi) / 2;
        cx = A.x + ux * mid;
        cy = A.y + uy * mid;
      }
    }

    solveContact(A, B, nx, ny, rr - d, cx + nx * A.r, cy + ny * A.r);
  }

  /* A wall is the same constraint with an immovable other side. Both ends of
     the capsule are pressed, which is what lets a chip lie flat on the floor
     instead of rocking on its middle. */
  function collideWall(b, nx, ny, wx, wy) {
    segmentOf(b, segW);

    for (var k = 0; k < 2; k++) {
      var ex = k ? segW.x2 : segW.x1;
      var ey = k ? segW.y2 : segW.y1;
      var pen = b.r - ((ex - wx) * nx + (ey - wy) * ny);
      if (pen <= 0) continue;
      if (pen > maxPen) pen = maxPen;

      var cx = ex + nx * b.r, cy = ey + ny * b.r;
      var rx = cx - b.x, ry = cy - b.y;
      var w = invMassAt(b, nx, ny, rx, ry);
      if (w <= 1e-12) continue;

      var lambda = pen / w;
      b.touched = true;
      move(b, nx, ny, rx, ry, lambda);

      var dx = driftX(b, ry), dy = driftY(b, rx);
      var dn = dx * nx + dy * ny;
      dx -= dn * nx; dy -= dn * ny;
      var dl = Math.sqrt(dx * dx + dy * dy);
      if (dl < 1e-6) continue;

      var tx = dx / dl, ty = dy / dl;
      var wt = invMassAt(b, tx, ty, rx, ry);
      if (wt <= 1e-12) continue;
      move(b, tx, ty, rx, ry, -Math.min(dl / wt, WALL_FRICTION * lambda));
    }
  }

  // Floor and side walls only. There is deliberately no ceiling: if the box
  // ends up shorter than the heap needs, the overflow rests out of sight
  // instead of being crushed against a lid.
  function collideWalls(b) {
    collideWall(b, 0, -1, 0, H);   // floor
    collideWall(b, 1, 0, 0, 0);    // left
    collideWall(b, -1, 0, W, 0);   // right
  }

  // Drag is just another constraint: pull the grabbed point towards the
  // cursor. Because velocity is read back off the movement, letting go throws
  // the chip without any of this needing to know about throwing.
  function solveDrag() {
    var b = held;
    if (!b) return;
    var c = Math.cos(b.a), s = Math.sin(b.a);
    var ax = b.x + b.lax * c - b.lay * s;
    var ay = b.y + b.lax * s + b.lay * c;
    var dx = pointer.x - ax, dy = pointer.y - ay;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-6) return;

    var nx = dx / d, ny = dy / d;
    var rx = ax - b.x, ry = ay - b.y;
    var w = invMassAt(b, nx, ny, rx, ry);
    if (w <= 1e-12) return;
    move(b, nx, ny, rx, ry, d * DRAG_STIFF / w);
  }

  /* ---------------------------------------------------------
     Broadphase: candidate pairs once a frame, so the narrow phase runs many
     times over a short list instead of re-testing all of them each iteration.
     --------------------------------------------------------- */
  var pairs = [];

  function broadphase(dt) {
    pairs.length = 0;
    var i, j, A, B;
    for (i = 0; i < bodies.length; i++) bounds(bodies[i], dt);
    for (i = 0; i < bodies.length; i++) {
      A = bodies[i];
      for (j = i + 1; j < bodies.length; j++) {
        B = bodies[j];
        if (A.maxx < B.minx || B.maxx < A.minx || A.maxy < B.miny || B.maxy < A.miny) continue;
        pairs.push(A, B);
      }
    }
  }

  function solve() {
    var k;
    for (k = 0; k < pairs.length; k += 2) collidePair(pairs[k], pairs[k + 1]);
    for (k = 0; k < bodies.length; k++) collideWalls(bodies[k]);
    solveDrag();
  }

  function step(dt) {
    var i, s, b;
    var h = dt / SUBSTEPS;
    maxPen = RECOVERY * h;

    broadphase(dt);

    for (s = 0; s < SUBSTEPS; s++) {
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        b.vy += GRAVITY * h;
        b.px = b.x; b.py = b.y; b.pa = b.a;
        b.touched = false;
        b.x += b.vx * h;
        b.y += b.vy * h;
        b.a += b.va * h;
      }

      for (i = 0; i < ITERATIONS; i++) solve();

      // Velocity is whatever the body turned out to have done, constraints
      // included. Nothing can gain speed that the movement did not show.
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        b.vx = (b.x - b.px) / h * linDamp;
        b.vy = (b.y - b.py) / h * linDamp;
        b.va = (b.a - b.pa) / h * angDamp;
        if (b.touched &&
            Math.abs(b.vx) < REST_SPEED && Math.abs(b.vy) < REST_SPEED &&
            Math.abs(b.va) < REST_SPIN) {
          b.vx *= REST_DAMP; b.vy *= REST_DAMP; b.va *= REST_DAMP;
        }
      }
    }
  }

  /* Doubles as the stillness test, on two different measures.

     Whether to touch the DOM is decided by what would actually be written:
     below a tenth of a pixel there is nothing to redraw.

     Whether the heap has stopped is decided by how fast it is moving, frame
     against frame. A settled pile never reaches exactly zero, it keeps
     creeping under a pixel a second, so a test that asked whether anything
     had changed since the last redraw would keep the loop alive forever. A
     turn counts as how far it swings the chip's end, since that is what the
     eye sees. */
  function render() {
    var busy = false;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];

      var dx = b.x - b.lx, dy = b.y - b.ly, da = (b.a - b.la) * b.len / 2;
      if (dx * dx + dy * dy + da * da > STILL * STILL) busy = true;
      b.lx = b.x; b.ly = b.y; b.la = b.a;

      var tx = (b.x - b.w / 2).toFixed(1);
      var ty = (b.y - b.h / 2).toFixed(1);
      var ta = b.a.toFixed(4);
      if (tx !== b.tx || ty !== b.ty || ta !== b.ta) {
        b.tx = tx; b.ty = ty; b.ta = ta;
        b.el.style.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + ta + 'rad)';
      }
    }
    if (busy || held) stillFor = 0; else stillFor++;
  }

  /* ---------------------------------------------------------
     Loop. Sleeps once the heap settles and wakes on interaction, so a page
     left open on About is not burning a core.
     --------------------------------------------------------- */
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    acc += dt;

    var n = 0;
    while (acc >= STEP && n < 4) { step(STEP); acc -= STEP; n++; }
    if (n === 4) acc = 0;
    render();

    if (stillFor > SLEEP_FRAMES) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    stillFor = 0;
    if (raf) return;
    last = performance.now();
    acc = 0;
    raf = requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------
     Input.
     --------------------------------------------------------- */
  function localPoint(e) {
    var box = host.getBoundingClientRect();
    var nx = e.clientX - box.left;
    var ny = e.clientY - box.top;
    var now = performance.now();
    var dt = (now - pointer.t) / 1000;
    // Smoothed, so one stuttery sample cannot decide a throw on its own.
    if (dt > 0.001 && dt < 0.25) {
      pointer.vx += ((nx - pointer.x) / dt - pointer.vx) * 0.5;
      pointer.vy += ((ny - pointer.y) / dt - pointer.vy) * 0.5;
    }
    pointer.t = now;
    pointer.x = nx;
    pointer.y = ny;
  }

  function grab(e) {
    var b = null;
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].el === e.currentTarget) { b = bodies[i]; break; }
    }
    if (!b) return;

    localPoint(e);
    pointer.vx = 0; pointer.vy = 0;
    var c = Math.cos(-b.a), s = Math.sin(-b.a);
    var dx = pointer.x - b.x, dy = pointer.y - b.y;
    b.lax = dx * c - dy * s;   // the grab point, in the chip's own frame
    b.lay = dx * s + dy * c;

    held = b;
    b.el.classList.add('is-held');
    try { b.el.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    if (e.pointerType === 'mouse') e.preventDefault();
    wake();
  }

  function release() {
    if (!held) return;
    // Let it go with the speed of the gesture. The solver only ever sees the
    // last substep, by which point the chip has already caught up with the
    // cursor, so the movement it derives there reads as a drop, not a throw.
    held.vx = clamp(pointer.vx, -3000, 3000);
    held.vy = clamp(pointer.vy, -3000, 3000);
    held.el.classList.remove('is-held');
    held = null;
    wake();
  }

  function bindInput() {
    chips.forEach(function (el) {
      el.addEventListener('pointerdown', grab);
      el.addEventListener('pointermove', function (e) {
        if (held && held.el === el) { localPoint(e); wake(); }
      });
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);   // browser took over to scroll
      el.addEventListener('lostpointercapture', release);
      el.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
  }

  /* ---------------------------------------------------------
     Width changes: keep the heap inside the new box and let it resettle.
     --------------------------------------------------------- */
  function onResize() {
    var w = host.clientWidth;
    if (!w || w === W) return;
    var scale = w / W;
    W = w;
    bodies.forEach(function (b) {
      b.x = clamp(b.x * scale, b.w / 2, W - b.w / 2);
    });
    wake();
  }

  function start() {
    if (started) return;
    if (!build()) return;
    started = true;
    bindInput();

    var note = document.querySelector('.skills-note');
    if (note) {
      var hint = document.createElement('span');
      hint.className = 'skills-note__hint';
      hint.textContent = ' Grab one and throw it.';
      note.appendChild(hint);
    }

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, 180);
    });

    // Drop them in when the heap scrolls into view, not while it is off screen.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { wake(); io.disconnect(); }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.02 });
      io.observe(host);
    } else {
      wake();
    }
  }

  // Chip widths depend on the webfont, so measure only once it has landed.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start, start);
    setTimeout(start, 2500);   // never let a font that fails to load kill the pile
  } else {
    start();
  }
})();
