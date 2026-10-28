/* Cost calculator. Every rate comes from data/prices.json (edited in admin). */
(function () {
  "use strict";

  var form, out, box, boxWorld, readout, last;

  function num(name) {
    var v = parseFloat(form.elements.namedItem(name).value);
    return isNaN(v) || v < 0 ? 0 : v;
  }

  function tierFor(tiers, daily) {
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      if (daily <= (t.max == null ? Infinity : t.max)) return { tier: t, over: false };
    }
    return { tier: tiers[tiers.length - 1], over: true };
  }

  function bundleFor(tiers, n) {
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      if (n >= t.min && (t.max == null || n <= t.max)) return t;
    }
    return null;
  }

  function line(label, amount) {
    return { label: label, amount: amount };
  }

  // Prep cost per finished unit for FBA and WFS.
  function prepCost(base, baseLabel, n, p) {
    var lines = [];
    if (base == null) return { total: null, lines: [line(baseLabel, null)] };
    lines.push(line(baseLabel, base));
    if (n === 2) {
      lines.push(line("Two pack", Number(p.fnsku.twoPackAdd)));
    } else if (n > 2) {
      var b = bundleFor(p.bundleTiers, n);
      if (!b || b.price == null) return { total: null, lines: lines.concat(line("Bundle of " + n, null)) };
      var base = p.bundleBase && p.bundleBase.perPack != null ? Number(p.bundleBase.perPack) : 0;
      if (base) lines.push(line("Pack base", base));
      lines.push(line("Bundle of " + n, Number(b.price)));
    }
    return { total: lines.reduce(function (s, l) { return s + l.amount; }, 0), lines: lines };
  }

  function compute() {
    var p = MM.prices;
    var c = p.calculator || {};
    var inp = {
      weight: num("weight"),
      length: num("length"),
      width: num("width"),
      height: num("height"),
      perPack: Math.max(1, Math.round(num("perPack")) || 1),
      daily: Math.round(num("daily")),
      monthly: Math.round(num("monthly"))
    };
    var n = inp.perPack;
    var fnsku = Number(p.fnsku.perItem);
    var wfs = p.wfsPrep && p.wfsPrep.perItem != null ? Number(p.wfsPrep.perItem) : null;

    var t = tierFor(p.fulfillmentTiers, inp.daily);
    var handling = Number(t.tier.firstItem) + (n - 1) * Number(t.tier.extraItem);
    var handLines = [line("First item", Number(t.tier.firstItem))];
    if (n > 1) handLines.push(line((n - 1) + " extra item" + (n > 2 ? "s" : ""), (n - 1) * Number(t.tier.extraItem)));
    handLines.push(line("Postage", "at cost"));

    var fba = prepCost(fnsku, "FNSKU label", n, p);
    var wfsC = prepCost(wfs, "WFS prep", n, p);
    var ordersMonth = inp.daily * 30;

    var res = [
      { key: "fba", ch: "Amazon", name: "FBA", per: fba.total, lines: fba.lines, qty: inp.monthly, qtyLabel: "units" },
      { key: "wfs", ch: "Walmart", name: "WFS", per: wfsC.total, lines: wfsC.lines, qty: inp.monthly, qtyLabel: "units" },
      { key: "fbm", ch: "Merchant", name: "FBM", per: handling, lines: handLines, qty: ordersMonth, qtyLabel: "orders" },
      { key: "two", ch: "Dropship", name: "2 step", per: handling, lines: handLines, qty: ordersMonth, qtyLabel: "orders", start: true }
    ];

    // storage estimate from size and weight
    var vol = inp.length * inp.width * inp.height;
    var byVol = vol > 0 ? Math.floor((c.palletUsableCubicInches || 96000) / vol) : 0;
    var byWt = inp.weight > 0 ? Math.floor((c.palletMaxWeightLb || 1500) / inp.weight) : Infinity;
    var perPallet = Math.min(byVol, byWt);
    var longest = Math.max(inp.length, inp.width, inp.height);
    var oversize = inp.weight > (c.oversizeWeightLb || 50) || longest > (c.oversizeLongestSideIn || 25);

    return { inp: inp, res: res, over: t.over, tier: t.tier, perPallet: perPallet, oversize: oversize };
  }

  function render(r) {
    var M = MM.money, el = MM.el;
    out.innerHTML = "";
    var priced = r.res.filter(function (x) { return x.per != null; });
    var low = priced.length ? Math.min.apply(null, priced.map(function (x) { return x.per; })) : null;

    r.res.forEach(function (x) {
      var col = el("div", "col" + (x.per != null && x.per === low ? " low" : ""));
      col.appendChild(el("div", "ch", x.ch));
      col.appendChild(el("h3", null, x.name));
      col.appendChild(el("div", "start", x.start ? "Starting at" : ""));
      var per = el("div", "per");
      if (x.per == null) {
        per.textContent = "Quote";
      } else {
        per.textContent = M(x.per);
        per.appendChild(el("small", null, "/ unit"));
      }
      col.appendChild(per);
      var ul = el("ul");
      x.lines.forEach(function (l) {
        var li = el("li");
        li.appendChild(el("span", null, l.label));
        li.appendChild(el("span", null, typeof l.amount === "number" ? M(l.amount) : (l.amount || "quote")));
        ul.appendChild(li);
      });
      col.appendChild(ul);
      var m = el("div", "month");
      if (x.per != null && x.qty > 0) {
        m.appendChild(document.createTextNode(x.qty.toLocaleString() + " " + x.qtyLabel + " a month: "));
        m.appendChild(el("b", null, M(x.per * x.qty)));
      } else if (x.per == null) {
        var a = el("a", null, "Ask for this rate");
        a.href = "quote.html";
        m.appendChild(a);
      }
      col.appendChild(m);
      out.appendChild(col);
    });

    var extra = document.getElementById("calc-extra");
    extra.innerHTML = "";
    var p = MM.prices;
    var parts = [];
    if (r.perPallet > 0 && isFinite(r.perPallet)) {
      parts.push("About " + r.perPallet.toLocaleString() + " units fit on one pallet.");
      var pp = p.palletStorage && p.palletStorage.perPalletMonth;
      if (pp != null && pp !== "") {
        parts.push("Storage is free for the first month, then about " + M(Number(pp) / r.perPallet) + " per unit per month.");
      } else {
        parts.push("Storage is free for the first month.");
      }
    } else {
      parts.push("Storage is free for the first month.");
    }
    extra.appendChild(el("p", null, parts.join(" ")));
    if (r.over) {
      extra.appendChild(el("p", "flag", "Over " + Number(r.tier.max).toLocaleString() + " orders a day gets a custom rate. The numbers above use our top published tier."));
    }
    if (r.oversize) {
      extra.appendChild(el("p", "flag", "This item is heavy or oversized, so handling may be priced by quote."));
    }
  }

  function drawBox(inp) {
    if (!boxWorld) return;
    boxWorld.innerHTML = "";
    var L = inp.length || 10, W = inp.width || 8, H = inp.height || 6;
    var k = 140 / Math.max(L, W, H);
    var w = Math.max(14, L * k), d = Math.max(14, W * k), h = Math.max(10, H * k);
    MM3D.cuboid(boxWorld, { x: -w / 2, y: -d / 2, z: 0, w: w, d: d, h: h, cls: "carton" });
    readout.textContent = (inp.length || 0) + " x " + (inp.width || 0) + " x " + (inp.height || 0) + " in, " + (inp.weight || 0) + " lb";
  }

  function update() {
    last = compute();
    render(last);
    drawBox(last.inp);
  }

  function setupQuote() {
    var q = document.getElementById("exact-quote");
    var msg = q.querySelector(".form-msg");
    q.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(q);
      var i = last.inp;
      fd.append("weight", i.weight + " lb");
      fd.append("size", i.length + " x " + i.width + " x " + i.height + " in");
      fd.append("items_per_pack", i.perPack);
      fd.append("daily_orders", i.daily);
      fd.append("monthly_units", i.monthly);
      fd.append("estimate", last.res.map(function (x) {
        return x.name + ": " + (x.per == null ? "quote" : (x.start ? "starting at " : "") + MM.money(x.per) + " per unit");
      }).join("; "));
      var btn = q.querySelector("[type=submit]");
      btn.disabled = true;
      msg.className = "form-msg";
      MM.send(fd).then(function (res) {
        if (res.ok) {
          msg.textContent = "Sent. We will email you an exact quote for these numbers.";
          msg.className = "form-msg ok";
        } else {
          msg.textContent = res.error || MM.fallbackMsg();
          msg.className = "form-msg err";
        }
      }).catch(function () {
        msg.textContent = MM.fallbackMsg();
        msg.className = "form-msg err";
      }).then(function () { btn.disabled = false; });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    form = document.getElementById("calc-form");
    out = document.getElementById("calc-results");
    box = document.querySelector(".box-preview");
    boxWorld = box && box.querySelector(".world");
    readout = box && box.querySelector(".readout");
    if (box && window.MM3D) MM3D.follow(box, boxWorld, 62, -36, 260);
    MM.ready.then(function () {
      update();
      form.addEventListener("input", update);
      setupQuote();
    }).catch(function () {
      out.innerHTML = "<p class='pending' style='padding:20px'>Prices could not be loaded. Please refresh the page or contact us for a quote.</p>";
    });
  });
})();
