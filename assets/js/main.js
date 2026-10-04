/* The Nuts Company - site behaviour
   Progressive enhancement only: every page renders and reads fine without JS.
   The catalogue is read from data-* attributes on the product tiles so there is
   one source of truth for names, prices and images. */
(function () {
  "use strict";

  var CART_KEY = "tnc.cart.v1";
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  /* ---------------------------------------------------------------- header */
  function initHeader() {
    var header = $(".header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $(".nav-toggle");
    var nav = $(".nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", function (e) {
        if (e.target.closest(".nav__link")) {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* ------------------------------------------------------------------ cart */
  var catalogue = {};
  var byId = {};

  function loadCatalogue() {
    (window.TNC_CATALOGUE || []).forEach(function (item) {
      catalogue[item.id] = item;
      byId[item.id] = item;
    });

    // Tiles rendered into the page carry the same values in data-* attributes.
    // Registering them too keeps the steppers on nuts.html working even if the
    // catalogue script is served from cache ahead of a copy change.
    $$("[data-product]").forEach(function (el) {
      var id = el.dataset.product;
      if (byId[id]) return;
      byId[id] = catalogue[id] = {
        id: id,
        kind: el.dataset.kind || "",
        name: el.dataset.name || "",
        size: el.dataset.size || "",
        note: "",
        price: Number(el.dataset.price) || 0,
        img: el.dataset.img || ""
      };
    });
  }

  function readCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY));
      if (!raw || typeof raw !== "object") return {};
      var clean = {};
      Object.keys(raw).forEach(function (id) {
        var qty = parseInt(raw[id], 10);
        if (catalogue[id] && qty > 0) clean[id] = Math.min(qty, 99);
      });
      return clean;
    } catch (e) {
      return {};
    }
  }

  function writeCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      /* private mode: the cart stays in memory for this page view */
    }
  }

  var cart = {};

  function cartCount() {
    return Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0);
  }

  function cartTotal() {
    return Object.keys(cart).reduce(function (n, id) {
      return n + cart[id] * catalogue[id].price;
    }, 0);
  }

  function renderCart() {
    // Defensive: never render a line for an id the catalogue does not know, or a
    // stale bag in localStorage takes the whole drawer down with it.
    var ids = Object.keys(cart).filter(function (id) { return catalogue[id]; });
    var list = $("#cart-lines");
    var badge = $$("[data-cart-count]");

    badge.forEach(function (b) {
      var n = cartCount();
      b.textContent = String(n);
      b.hidden = n === 0;
    });

    if (!list) return;

    if (!ids.length) {
      list.innerHTML =
        '<div class="empty"><strong>Your bag is empty</strong>' +
        "<span>Add a pack and it will show up here.</span></div>";
    } else {
      list.innerHTML = ids.map(function (id) {
        var p = catalogue[id];
        return (
          '<div class="cart-line">' +
          '<img src="' + p.img + '" alt="" width="66" height="74" loading="lazy" decoding="async">' +
          '<div><p class="cart-line__name">' + p.name + " " + p.size + "</p>" +
          '<p class="cart-line__meta">' + inr.format(p.price) + " each</p>" +
          '<div class="qty" style="margin-top:.45rem">' +
          '<button class="qty__btn" data-cart-dec="' + id + '" aria-label="Decrease quantity of ' + p.name + ' ' + p.size + '">&minus;</button>' +
          '<span class="qty__val" aria-live="polite">' + cart[id] + "</span>" +
          '<button class="qty__btn" data-cart-inc="' + id + '" aria-label="Increase quantity of ' + p.name + ' ' + p.size + '">+</button>' +
          "</div></div>" +
          '<div style="text-align:right"><p class="cart-line__price">' +
          inr.format(p.price * cart[id]) + "</p>" +
          '<button class="cart-line__remove" data-cart-rm="' + id + '">Remove</button></div>' +
          "</div>"
        );
      }).join("");
    }

    var total = $("#cart-total");
    if (total) total.textContent = inr.format(cartTotal());

    var checkout = $("#cart-checkout");
    if (checkout) checkout.disabled = ids.length === 0;
  }

  function setQty(id, delta) {
    var next = (cart[id] || 0) + delta;
    if (next <= 0) delete cart[id];
    else cart[id] = Math.min(next, 99);
    writeCart(cart);
    renderCart();
  }

  function initCart() {
    loadCatalogue();
    cart = readCart();

    // One delegated handler for the bag. The catalogue tiles carry their own
    // bare data-inc / data-dec buttons and are wired per tile below, so the
    // bag's handlers use their own namespaced attributes - otherwise a tile
    // click would also be read here, with an empty id.
    document.addEventListener("click", function (e) {
      var add = e.target.closest("[data-add]");
      if (add) {
        e.preventDefault();
        var id = add.dataset.add;
        if (!catalogue[id]) return;
        cart[id] = Math.min((cart[id] || 0) + 1, 99);
        writeCart(cart);
        renderCart();
        openPanel("cart");
        return;
      }
      var inc = e.target.closest("[data-cart-inc]");
      if (inc) { e.preventDefault(); setQty(inc.dataset.cartInc, 1); return; }
      var dec = e.target.closest("[data-cart-dec]");
      if (dec) { e.preventDefault(); setQty(dec.dataset.cartDec, -1); return; }
      var rm = e.target.closest("[data-cart-rm]");
      if (rm) {
        e.preventDefault();
        setQty(rm.dataset.cartRm, -(cart[rm.dataset.cartRm] || 0));
      }
    });

    // inline steppers on the catalogue tiles
    $$(".ptile").forEach(function (tile) {
      var id = tile.dataset.product;
      var val = $(".qty__val", tile);
      if (!val) return;
      var sync = function () { val.textContent = String(cart[id] || 0); };
      sync();
      $$("[data-inc],[data-dec]", tile).forEach(function (btn) {
        btn.addEventListener("click", function () {
          // data-inc / data-dec are valueless on the tiles, so test for the
          // attribute itself - dataset.inc is "" and would read as falsy.
          setQty(id, btn.hasAttribute("data-inc") ? 1 : -1);
          sync();
        });
      });
    });

    renderCart();
  }

  /* --------------------------------------------------------- panels (drawers) */
  var lastFocus = null;

  function openPanel(name) {
    var panel = $("#panel-" + name);
    if (!panel) return;
    lastFocus = document.activeElement;
    closePanels();
    panel.classList.add("is-open");
    panel.removeAttribute("inert");
    $("#scrim").classList.add("is-open");
    document.body.classList.add("is-locked");
    var focusable = panel.querySelector("button, input, a[href]");
    if (focusable) focusable.focus();
  }

  function closePanels() {
    $$(".drawer").forEach(function (d) {
      d.classList.remove("is-open");
      d.setAttribute("inert", "");
    });
    $("#scrim").classList.remove("is-open");
    document.body.classList.remove("is-locked");
  }

  function initPanels() {
    $$("[data-open]").forEach(function (btn) {
      btn.addEventListener("click", function () { openPanel(btn.dataset.open); });
    });
    $$("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", closePanels);
    });
    var scrim = $("#scrim");
    if (scrim) scrim.addEventListener("click", closePanels);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanels();
    });

    // keep focus inside an open drawer
    document.addEventListener("focusin", function (e) {
      var open = $(".drawer.is-open");
      if (open && !open.contains(e.target)) {
        var focusable = open.querySelector("button, input, a[href]");
        if (focusable) focusable.focus();
      }
    });
  }

  /* ----------------------------------------------------------------- search */
  function renderSearchResults() {
    var wrap = $("#search-results");
    if (!wrap) return;
    wrap.innerHTML = (window.TNC_CATALOGUE || []).map(function (item) {
      return (
        '<article class="ptile" data-product="' + item.id + '" data-kind="' + item.kind + '">' +
        '<div class="ptile__media"><img src="' + item.img + '" alt="" loading="lazy" decoding="async"></div>' +
        '<h3 class="ptile__name">' + item.name + "</h3>" +
        '<p><span class="ptile__size">' + item.size + "</span></p>" +
        '<div class="ptile__actions"><button class="btn btn--sm" data-add="' + item.id +
        '">Add <span aria-hidden="true">+</span></button></div>' +
        "</article>"
      );
    }).join("");
  }

  function initSearch() {
    var input = $("#search-input");
    var results = $("#search-results");
    if (!input || !results) return;
    renderSearchResults();

    var tiles = $$(".ptile", results);
    var render = function () {
      var q = input.value.trim().toLowerCase();
      var hits = 0;
      tiles.forEach(function (t) {
        var item = byId[t.dataset.product] || {};
        var hay = ((item.name || "") + " " + (item.size || "") + " " +
                   (item.kind || "") + " " + (item.note || "")).toLowerCase();
        var show = !q || hay.indexOf(q) !== -1;
        t.classList.toggle("is-hidden", !show);
        if (show) hits++;
      });
      var note = $("#search-count");
      if (note) {
        note.textContent = q
          ? hits + (hits === 1 ? " pack matches \u201c" + q + "\u201d"
                               : " packs match \u201c" + q + "\u201d")
          : tiles.length + " packs";
      }
    };
    input.addEventListener("input", render);
    render();

    // adding from the search results keeps the panel open on the cart view
    results.addEventListener("click", function (e) {
      if (e.target.closest("[data-add]")) render();
    });
  }

  /* ------------------------------------------------------- homepage filters */
  function initFilters() {
    var chips = $$("[data-filter]");
    var cards = $$("[data-kind-card]");
    if (!chips.length || !cards.length) return;

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var want = chip.dataset.filter;
        chips.forEach(function (c) {
          c.setAttribute("aria-pressed", String(c === chip));
        });
        cards.forEach(function (card) {
          var show = want === "all" || card.dataset.kindCard === want;
          card.classList.toggle("is-hidden", !show);
        });
      });
    });
  }

  /* ------------------------------------------------------------------ forms */
  function initForms() {
    $$("form[data-demo-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        var status = $(".form-status", form);
        if (status) {
          status.hidden = false;
          status.textContent =
            form.dataset.demoForm === "subscribe"
              ? "Thanks — you are on the list. We will be in touch."
              : "Thanks. This demo form does not send anything yet; " +
                "connect it to your inbox or CRM to go live.";
          status.focus();
        }
        form.reset();
      });
    });
  }

  /* ----------------------------------------------------------------- reveal */
  function initReveal() {
    var items = $$(".reveal");
    // Only hide-then-reveal when scripting is actually running, so the page is
    // never left with invisible copy if this script fails to run at all.
    document.documentElement.classList.add("has-js");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  function initYear() {
    $$("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initHeader();
    initPanels();
    initCart();
    initSearch();
    initFilters();
    initForms();
    initReveal();
    initYear();
  });
})();
