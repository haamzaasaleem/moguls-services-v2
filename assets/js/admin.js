/* Admin editor for data/prices.json and data/settings.json. */
(function () {
  "use strict";

  var password = "";
  var data = null;
  var editor;

  function api(body) {
    body.password = password;
    return fetch("api/admin.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: "The server did not answer. Is PHP running?" }; });
    });
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  function input(obj, key, type, ph) {
    var i = el("input", { type: type || "text" });
    if (type === "number") i.step = "0.01";
    if (ph) i.placeholder = ph;
    i.value = obj[key] == null ? "" : obj[key];
    i.addEventListener("input", function () {
      obj[key] = type === "number" ? (i.value === "" ? null : Number(i.value)) : i.value;
    });
    return i;
  }

  function field(label, obj, key, type, hint) {
    var f = el("div", { class: "field" });
    f.appendChild(el("label", null, label));
    f.appendChild(input(obj, key, type, hint));
    return f;
  }

  function fieldset(title, hint) {
    var fs = el("fieldset");
    fs.appendChild(el("legend", null, title));
    if (hint) fs.appendChild(el("p", { class: "hint" }, hint));
    editor.appendChild(fs);
    return fs;
  }

  // Editable table for a list of rows (tiers, extra services).
  function rows(fs, list, cols, blank) {
    var table = el("table");
    var head = el("tr");
    cols.forEach(function (c) { head.appendChild(el("th", null, c[1])); });
    head.appendChild(el("th"));
    table.appendChild(head);
    var body = el("tbody");
    table.appendChild(body);
    function draw() {
      body.innerHTML = "";
      list.forEach(function (row, idx) {
        var tr = el("tr");
        cols.forEach(function (c) {
          var td = el("td");
          td.appendChild(input(row, c[0], c[2], c[3]));
          tr.appendChild(td);
        });
        var td = el("td");
        var x = el("button", { type: "button", class: "x", title: "Remove row" }, "Remove");
        x.addEventListener("click", function () { list.splice(idx, 1); draw(); });
        td.appendChild(x);
        tr.appendChild(td);
        body.appendChild(tr);
      });
    }
    draw();
    var wrap = el("div", { class: "table-scroll" });
    wrap.appendChild(table);
    fs.appendChild(wrap);
    var add = el("button", { type: "button", class: "add" }, "Add row");
    add.addEventListener("click", function () { list.push(JSON.parse(JSON.stringify(blank))); draw(); });
    fs.appendChild(add);
  }

  function build() {
    var p = data.prices, s = data.settings;
    editor.innerHTML = "";
    var g;

    g = fieldset("FBA prep", "FNSKU labeling price and the extra charge for a two pack.");
    var two = el("div", { class: "grid2" });
    two.appendChild(field("FNSKU label per item ($)", p.fnsku, "perItem", "number"));
    two.appendChild(field("Two pack adds ($)", p.fnsku, "twoPackAdd", "number"));
    g.appendChild(two);

    g = fieldset("WFS prep", "Leave the price empty to show \"Price coming soon\" on the site.");
    two = el("div", { class: "grid2" });
    two.appendChild(field("Price ($)", p.wfsPrep, "perItem", "number"));
    two.appendChild(field("Unit", p.wfsPrep, "unit"));
    g.appendChild(two);
    g.appendChild(field("Note shown under the price", p.wfsPrep, "note"));

    g = fieldset("Pallet storage", "First month is always shown as free. Leave the price empty to show \"Price coming soon\".");
    two = el("div", { class: "grid2" });
    two.appendChild(field("Price ($)", p.palletStorage, "perPalletMonth", "number"));
    two.appendChild(field("Unit", p.palletStorage, "unit"));
    g.appendChild(two);
    g.appendChild(field("Note shown under the price", p.palletStorage, "note"));

    g = fieldset("FBM and 2 step handling per order", "Min and max are daily order counts the calculator uses to pick a tier. Leave max empty on the last row for no limit.");
    rows(g, p.fulfillmentTiers, [
      ["label", "Label shown", "text"],
      ["min", "Min orders", "number"],
      ["max", "Max orders", "number"],
      ["firstItem", "First item ($)", "number"],
      ["extraItem", "Each extra ($)", "number"]
    ], { label: "", min: 0, max: null, firstItem: null, extraItem: null });

    if (!p.bundleBase) p.bundleBase = { perPack: null, note: "" };
    g = fieldset("Variety pack base price", "Added to every variety pack, so a 2 item pack shows as base + building fee. Leave empty to show the building fee alone.");
    two = el("div", { class: "grid2" });
    two.appendChild(field("Base price per pack ($)", p.bundleBase, "perPack", "number"));
    two.appendChild(field("Note shown under the bundle table", p.bundleBase, "note"));
    g.appendChild(two);

    g = fieldset("Variety pack building fee", "Fee per finished pack by number of items, added to the base price. Leave price empty to show \"Custom quote\".");
    rows(g, p.bundleTiers, [
      ["label", "Label shown", "text"],
      ["min", "Min items", "number"],
      ["max", "Max items", "number"],
      ["price", "Price ($)", "number"]
    ], { label: "", min: 0, max: null, price: null });

    g = fieldset("Other services", "Shown in the courier drop off section of the pricing page. Leave price empty to show \"Ask us\".");
    rows(g, p.extraServices, [
      ["name", "Service", "text"],
      ["price", "Price ($)", "number"],
      ["unit", "Unit", "text", "per drop off"]
    ], { name: "", price: null, unit: "" });

    g = fieldset("Calculator assumptions", "Used to estimate units per pallet and to flag heavy or oversized items.");
    two = el("div", { class: "grid2" });
    two.appendChild(field("Usable cubic inches per pallet", p.calculator, "palletUsableCubicInches", "number"));
    two.appendChild(field("Max weight per pallet (lb)", p.calculator, "palletMaxWeightLb", "number"));
    two.appendChild(field("Oversize above weight (lb)", p.calculator, "oversizeWeightLb", "number"));
    two.appendChild(field("Oversize above longest side (in)", p.calculator, "oversizeLongestSideIn", "number"));
    g.appendChild(two);

    g = fieldset("Business details", "Shown in the footer and on the contact page. Form submissions go to the quote inbox.");
    two = el("div", { class: "grid2" });
    two.appendChild(field("Business name", s, "businessName"));
    two.appendChild(field("Public email", s, "contactEmail", "email"));
    two.appendChild(field("Send form submissions to", s, "quoteRecipient", "email"));
    two.appendChild(field("Phone", s, "phone", "text"));
    g.appendChild(two);
    g.appendChild(field("Address", s, "address"));
    g.appendChild(field("Hours (leave empty to hide)", s, "hours"));

    var bar = el("div", { class: "savebar" });
    var save = el("button", { type: "submit", class: "btn orange" }, "Save changes");
    var dl = el("button", { type: "button", class: "btn ghost" }, "Download backup");
    var msg = el("div", { class: "form-msg", role: "status", style: "margin:0" });
    bar.appendChild(save);
    bar.appendChild(dl);
    bar.appendChild(msg);
    editor.appendChild(bar);

    dl.addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = el("a", { href: URL.createObjectURL(blob), download: "moguls_prices_backup.json" });
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    editor.onsubmit = function (e) {
      e.preventDefault();
      save.disabled = true;
      msg.className = "form-msg";
      api({ action: "save", prices: p, settings: s }).then(function (res) {
        msg.textContent = res.ok ? "Saved. The site now shows these prices." : res.error || "Could not save.";
        msg.className = "form-msg " + (res.ok ? "ok" : "err");
      }).catch(function () {
        msg.textContent = "Could not reach the server.";
        msg.className = "form-msg err";
      }).then(function () { save.disabled = false; });
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    editor = document.getElementById("editor");
    var login = document.getElementById("login");
    var msg = login.querySelector(".form-msg");
    login.addEventListener("submit", function (e) {
      e.preventDefault();
      password = document.getElementById("pw").value;
      msg.className = "form-msg";
      Promise.all([api({ action: "verify" }), MM.ready]).then(function (res) {
        if (!res[0].ok) {
          msg.textContent = res[0].error || "Wrong password.";
          msg.className = "form-msg err";
          return;
        }
        data = JSON.parse(JSON.stringify({ prices: MM.prices, settings: MM.settings }));
        login.hidden = true;
        editor.hidden = false;
        build();
      }).catch(function () {
        msg.textContent = "Could not reach the server.";
        msg.className = "form-msg err";
      });
    });
  });
})();
