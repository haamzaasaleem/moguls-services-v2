/* CSS 3D warehouse scenes. No WebGL, no libraries: every box is six divs
   (five here, the bottom is never seen) placed with 3D transforms. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Build a box on the floor plane. x/y are floor coordinates, z is height.
  function cuboid(parent, o) {
    var c = document.createElement("div");
    c.className = "cub " + (o.cls || "");
    c.style.left = o.x + "px";
    c.style.top = o.y + "px";
    c.style.width = o.w + "px";
    c.style.height = o.d + "px";
    c.style.transform = "translateZ(" + (o.z || 0) + "px)";
    var w = o.w, d = o.d, h = o.h;
    var faces = [
      ["t", w, d, 0, 0, "50% 50%", "translateZ(" + h + "px)"],
      ["f", w, h, 0, d - h, "50% 100%", "rotateX(-90deg)"],
      ["b", w, h, 0, 0, "50% 0", "rotateX(90deg)"],
      ["r", h, d, w - h, 0, "100% 50%", "rotateY(90deg)"],
      ["l", h, d, 0, 0, "0 50%", "rotateY(-90deg)"]
    ];
    faces.forEach(function (f) {
      var i = document.createElement("i");
      i.className = f[0];
      i.style.width = f[1] + "px";
      i.style.height = f[2] + "px";
      i.style.left = f[3] + "px";
      i.style.top = f[4] + "px";
      i.style.transformOrigin = f[5];
      i.style.transform = f[6];
      c.appendChild(i);
    });
    parent.appendChild(c);
    return c;
  }

  function group(parent, cls) {
    var g = document.createElement("div");
    g.className = cls || "";
    g.style.position = "absolute";
    g.style.transformStyle = "preserve-3d";
    parent.appendChild(g);
    return g;
  }

  // Lean the scene toward the pointer, scale it to fit the stage.
  function follow(stage, world, baseX, baseZ, sceneWidth) {
    var tx = 0, ty = 0;
    function apply() {
      var s = Math.min(1.5, stage.clientWidth / sceneWidth);
      world.style.transform =
        "scale3d(" + s + "," + s + "," + s + ") rotateX(" + (baseX + ty * 8) + "deg) rotateZ(" + (baseZ + tx * 14) + "deg)";
    }
    apply();
    window.addEventListener("resize", apply);
    if (reduced) return;
    stage.addEventListener("mousemove", function (e) {
      var r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      apply();
    });
    stage.addEventListener("mouseleave", function () {
      tx = 0; ty = 0; apply();
    });
  }

  /* ---------- home hero: rack, pallets, conveyor ---------- */
  function hero(stage) {
    var world = stage.querySelector(".world");

    var floor = document.createElement("div");
    floor.className = "floor";
    floor.style.cssText = "left:-270px;top:-190px;width:540px;height:380px;";
    var lane = document.createElement("div");
    lane.className = "lane";
    lane.style.cssText = "left:420px;top:250px;width:110px;height:120px;";
    floor.appendChild(lane);
    world.appendChild(floor);

    // pallet rack along the back wall: two bays, two beam levels
    var rx = -250, ry = -175, rd = 78, bay = 170, levels = [0, 82, 164], top = 236;
    [0, 1, 2].forEach(function (n) {
      var x = rx + n * bay;
      cuboid(world, { x: x, y: ry, z: 0, w: 8, d: 8, h: top, cls: "steel" });
      cuboid(world, { x: x, y: ry + rd - 8, z: 0, w: 8, d: 8, h: top, cls: "steel" });
    });
    levels.slice(1).forEach(function (z) {
      cuboid(world, { x: rx, y: ry + rd - 6, z: z - 10, w: bay * 2 + 8, d: 6, h: 10, cls: "beam" });
      cuboid(world, { x: rx, y: ry, z: z - 10, w: bay * 2 + 8, d: 6, h: 10, cls: "beam" });
    });
    // pallets with cartons on each level
    levels.forEach(function (z, li) {
      [0, 1].forEach(function (b) {
        var px = rx + b * bay + 18, py = ry + 8;
        cuboid(world, { x: px, y: py, z: z, w: 136, d: 62, h: 8, cls: "wood" });
        var rows = li === 2 && b === 1 ? 1 : 2;
        for (var k = 0; k < rows; k++) {
          for (var j = 0; j < 3; j++) {
            cuboid(world, {
              x: px + 4 + j * 44, y: py + 6, z: z + 8 + k * 30,
              w: 40, d: 50, h: 28,
              cls: "carton" + (li === 1 && b === 0 && j === 2 && k === 1 ? " orange" : "")
            });
          }
        }
      });
    });

    // conveyor running to the dock lane
    var cy = 70, cx = -240, len = 470;
    [0, 1, 2, 3].forEach(function (n) {
      cuboid(world, { x: cx + 20 + n * 140, y: cy + 4, z: 0, w: 8, d: 8, h: 34, cls: "steel" });
      cuboid(world, { x: cx + 20 + n * 140, y: cy + 36, z: 0, w: 8, d: 8, h: 34, cls: "steel" });
    });
    cuboid(world, { x: cx, y: cy, z: 34, w: len, d: 48, h: 8, cls: "belt" });

    var movers = reduced ? 3 : 4;
    for (var m = 0; m < movers; m++) {
      var g = group(world, reduced ? "" : "mover");
      g.style.setProperty("--dist", (len - 50) + "px");
      if (reduced) g.style.transform = "translateX(" + (m * 140) + "px)";
      else g.style.animationDelay = (-m * 7 / movers) + "s";
      g.style.transformOrigin = (cx + 26) + "px " + (cy + 24) + "px";
      cuboid(g, { x: cx + 6, y: cy + 6, z: 42, w: 40, d: 36, h: 30, cls: "carton" + (m === 1 ? " orange" : "") });
    }

    // outbound pallet waiting at the dock
    var ox = 160, oy = 160;
    cuboid(world, { x: ox, y: oy, z: 0, w: 96, d: 80, h: 9, cls: "wood" });
    for (var a = 0; a < 2; a++)
      for (var bb = 0; bb < 2; bb++)
        for (var c = 0; c < (a === 1 && bb === 1 ? 1 : 2); c++)
          cuboid(world, { x: ox + 4 + a * 46, y: oy + 4 + bb * 37, z: 9 + c * 30, w: 44, d: 35, h: 28, cls: "carton" });

    follow(stage, world, 58, -38, 640);
  }

  /* ---------- variety pack page: items come together into one pack ---------- */
  function bundle(stage) {
    var world = stage.querySelector(".world");
    var floor = document.createElement("div");
    floor.className = "floor";
    floor.style.cssText = "left:-170px;top:-120px;width:340px;height:240px;";
    world.appendChild(floor);

    var spread = [
      { cls: "prod-a", w: 46, d: 46, h: 92, at: [-74, -23], from: [-150, -70, 40] },
      { cls: "prod-b", w: 46, d: 46, h: 76, at: [-23, -23], from: [0, -120, 70] },
      { cls: "prod-c", w: 46, d: 46, h: 84, at: [28, -23], from: [140, -40, 30] }
    ];
    var items = spread.map(function (s) {
      var g = group(world, "item");
      cuboid(g, { x: s.at[0], y: s.at[1], z: 4, w: s.w, d: s.d, h: s.h, cls: s.cls });
      g._from = "translate3d(" + s.from[0] + "px," + s.from[1] + "px," + s.from[2] + "px)";
      return g;
    });
    cuboid(world, { x: -78, y: -27, z: 2, w: 156, d: 54, h: 98, cls: "wrapfilm" });
    cuboid(world, { x: -95, y: -40, z: 0, w: 190, d: 80, h: 4, cls: "wood" });

    var packed = false;
    var btn = stage.querySelector(".bundle-toggle");
    function set(p) {
      packed = p;
      stage.classList.toggle("packed", p);
      items.forEach(function (g) { g.style.transform = p ? "translate3d(0,0,0)" : g._from; });
      if (btn) btn.textContent = p ? "Show single items" : "Build the pack";
    }
    set(false);
    if (btn) btn.addEventListener("click", function () { set(!packed); });
    if (!reduced) {
      setTimeout(function () { set(true); }, 900);
      setInterval(function () { set(!packed); }, 4200);
    } else {
      set(true);
    }
    follow(stage, world, 60, -40, 380);
  }

  window.MM3D = { cuboid: cuboid, follow: follow };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('[data-scene="hero"]').forEach(hero);
    document.querySelectorAll('[data-scene="bundle"]').forEach(bundle);
  });
})();
