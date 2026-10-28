/* Shared site script: loads editable prices and settings, fills them into
   the page, handles the menu, reveal on scroll, card tilt and form sending. */
(function () {
  "use strict";

  var MM = (window.MM = {});

  MM.money = function (v) {
    if (v === null || v === undefined || v === "" || isNaN(Number(v))) return null;
    return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  MM.get = function (obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  };

  function load(name) {
    return fetch("data/" + name + ".json?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(name + " " + r.status);
      return r.json();
    });
  }

  // Values worked out from the price list so pages can show "from" prices.
  MM.derive = function (p) {
    var tiers = p.fulfillmentTiers || [];
    var bundles = (p.bundleTiers || []).filter(function (b) { return b.price != null; });
    var min = function (arr, key) {
      var v = arr.map(function (x) { return Number(x[key]); }).filter(function (n) { return !isNaN(n); });
      return v.length ? Math.min.apply(null, v) : null;
    };
    return {
      twoPack: p.fnsku ? Number(p.fnsku.perItem) + Number(p.fnsku.twoPackAdd) : null,
      // standard per order rate: the first tier, not the high volume discount
      fbmFrom: tiers.length ? Number(tiers[0].firstItem) : null,
      bundleFrom: min(bundles, "price")
    };
  };

  // Variety pack price as shown to customers: base + building fee, e.g. "$2.50 + $0.90".
  MM.bundleText = function (fee) {
    var base = MM.prices && MM.prices.bundleBase ? MM.money(MM.prices.bundleBase.perPack) : null;
    var f = MM.money(fee);
    if (!f) return null;
    return base ? base + " + " + f : f;
  };

  MM.ready = Promise.all([load("prices"), load("settings")]).then(function (res) {
    MM.prices = res[0];
    MM.settings = res[1];
    MM.derived = MM.derive(MM.prices);
    return { prices: MM.prices, settings: MM.settings };
  });

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  MM.el = el;

  function fillPrices() {
    var src = { p: MM.prices, d: MM.derived };
    document.querySelectorAll("[data-price]").forEach(function (node) {
      var key = node.getAttribute("data-price");
      var v = key.indexOf("d.") === 0 ? MM.get(src.d, key.slice(2)) : MM.get(src.p, key);
      var m = MM.money(v);
      if (m) {
        node.textContent = m;
      } else {
        node.textContent = node.getAttribute("data-pending") || "Price coming soon";
        node.classList.add("pending");
      }
    });
    document.querySelectorAll("[data-bundle-from]").forEach(function (node) {
      var t = MM.bundleText(MM.derived.bundleFrom);
      if (t) node.textContent = t;
    });
    document.querySelectorAll("[data-text]").forEach(function (node) {
      var v = MM.get(MM.prices, node.getAttribute("data-text"));
      if (v) node.textContent = v; else node.hidden = true;
    });

    var fbm = document.querySelector('[data-table="fulfillment"] tbody');
    if (fbm) {
      fbm.innerHTML = "";
      MM.prices.fulfillmentTiers.forEach(function (t) {
        var tr = el("tr");
        tr.appendChild(el("td", null, t.label));
        tr.appendChild(el("td", "p", MM.money(t.firstItem) || "Quote"));
        tr.appendChild(el("td", "p", MM.money(t.extraItem) || "Quote"));
        fbm.appendChild(tr);
      });
      var last = MM.prices.fulfillmentTiers[MM.prices.fulfillmentTiers.length - 1];
      if (last && last.max) {
        var tr = el("tr");
        tr.appendChild(el("td", null, "Over " + Number(last.max).toLocaleString() + " orders a day"));
        var td = el("td", null);
        td.colSpan = 2;
        var a = el("a", null, "Custom quote");
        a.href = "quote.html";
        td.appendChild(a);
        tr.appendChild(td);
        fbm.appendChild(tr);
      }
    }

    var bt = document.querySelector('[data-table="bundles"] tbody');
    if (bt) {
      bt.innerHTML = "";
      MM.prices.bundleTiers.forEach(function (b) {
        var tr = el("tr");
        tr.appendChild(el("td", null, b.label));
        var td = el("td", "p");
        if (MM.money(b.price)) {
          td.textContent = MM.bundleText(b.price);
        } else {
          var a = el("a", null, "Custom quote");
          a.href = "quote.html";
          td.appendChild(a);
        }
        tr.appendChild(td);
        bt.appendChild(tr);
      });
    }

    var ex = document.querySelector('[data-table="extras"] tbody');
    if (ex) {
      ex.innerHTML = "";
      (MM.prices.extraServices || []).forEach(function (s) {
        var tr = el("tr");
        tr.appendChild(el("td", null, s.name));
        var m = MM.money(s.price);
        tr.appendChild(el("td", "p", m ? m + " " + (s.unit || "") : "Ask us"));
        ex.appendChild(tr);
      });
      if (!ex.children.length) ex.closest("table").hidden = true;
    }
  }

  function fillSettings() {
    var s = MM.settings || {};
    document.querySelectorAll("[data-setting]").forEach(function (node) {
      var v = s[node.getAttribute("data-setting")];
      if (v) node.textContent = v;
    });
    document.querySelectorAll("[data-setting-href]").forEach(function (node) {
      var key = node.getAttribute("data-setting-href");
      var v = s[key];
      if (!v) return;
      node.href = key === "phone" ? "tel:" + v.replace(/[^\d+]/g, "") : "mailto:" + v;
    });
    document.querySelectorAll("[data-if-setting]").forEach(function (node) {
      if (!s[node.getAttribute("data-if-setting")]) node.hidden = true;
    });
  }

  /* ---------- loading screen: first page of a visit only ---------- */
  function loader() {
    var box = document.getElementById("loader");
    if (!box) return;
    if (document.documentElement.classList.contains("no-loader")) {
      box.remove();
      return;
    }
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var minShow = still ? 500 : 3000; // long enough to see the crane set one carton down
    var hidden = false;
    function hide() {
      if (hidden) return;
      hidden = true;
      box.classList.add("done");
      try { sessionStorage.setItem("mm_seen", "1"); } catch (e) {}
      setTimeout(function () { box.remove(); }, 600);
    }
    function whenLoaded() {
      setTimeout(hide, Math.max(0, minShow - performance.now()));
    }
    if (document.readyState === "complete") whenLoaded();
    else window.addEventListener("load", whenLoaded);
    setTimeout(hide, 7000);
    box.addEventListener("click", hide);
  }

  /* ---------- warehouse video: removed if the file cannot be played ---------- */
  function video() {
    document.querySelectorAll("[data-video]").forEach(function (band) {
      var v = band.querySelector("video");
      var frame = band.querySelector(".video-frame");
      var btn = band.querySelector(".video-toggle");
      var sources = v.querySelectorAll("source");
      var userPaused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function missing() { band.remove(); }
      if (v.networkState === 3) return missing(); // no playable source
      if (sources.length) sources[sources.length - 1].addEventListener("error", missing);

      function label() { btn.textContent = v.paused ? "Play" : "Pause"; }
      v.addEventListener("play", label);
      v.addEventListener("pause", label);
      label();
      btn.addEventListener("click", function () {
        userPaused = !v.paused;
        if (userPaused) v.pause(); else v.play().catch(function () {});
      });

      // play only while on screen; the frame flattens out of its tilt as it arrives
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              frame.classList.add("in");
              if (!userPaused) v.play().catch(function () {});
            } else {
              v.pause();
            }
          });
        }, { threshold: 0.35 }).observe(band);
      } else {
        frame.classList.add("in");
      }
    });
  }

  /* ---------- menu ---------- */
  function menu() {
    var btn = document.querySelector(".menu-btn");
    var nav = document.getElementById("nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Close" : "Menu";
    });
  }

  /* ---------- reveal on scroll ---------- */
  function reveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (i) { i.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -60px 0px" });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ---------- tilt: cards lean toward the pointer ---------- */
  function tilt() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;
    document.querySelectorAll(".tilt").forEach(function (card) {
      var max = Number(card.getAttribute("data-tilt") || 4);
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "perspective(900px) rotateX(" + (-y * max) + "deg) rotateY(" + (x * max) + "deg)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ---------- forms: every submission goes to api/send.php ---------- */
  MM.send = function (formData) {
    return fetch("api/send.php", { method: "POST", body: formData }).then(function (r) {
      return r.json().catch(function () { return { ok: false }; });
    });
  };

  MM.fallbackMsg = function () {
    var mail = (MM.settings && MM.settings.contactEmail) || "";
    return "Sorry, the form could not be sent right now." + (mail ? " Please email us at " + mail + "." : "");
  };

  function forms() {
    document.querySelectorAll("form[data-form]").forEach(function (form) {
      var msg = form.querySelector(".form-msg");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = form.querySelector("[type=submit]");
        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Sending";
        msg.className = "form-msg";
        MM.send(new FormData(form))
          .then(function (res) {
            if (res.ok) {
              msg.textContent = form.getAttribute("data-success") || "Thanks. We got your request and will reply by email.";
              msg.className = "form-msg ok";
              form.reset();
            } else {
              msg.textContent = res.error || MM.fallbackMsg();
              msg.className = "form-msg err";
            }
          })
          .catch(function () {
            msg.textContent = MM.fallbackMsg();
            msg.className = "form-msg err";
          })
          .then(function () {
            btn.disabled = false;
            btn.textContent = label;
          });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loader();
    video();
    menu();
    reveal();
    tilt();
    forms();
    document.querySelectorAll("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
    MM.ready.then(function () {
      fillPrices();
      fillSettings();
    }).catch(function () {
      document.querySelectorAll("[data-price]").forEach(function (n) {
        n.textContent = "See quote";
      });
    });
  });
})();
