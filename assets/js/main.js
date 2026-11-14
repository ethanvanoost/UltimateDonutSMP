/* ==========================================================================
   UltimateDonutSMP – shared JavaScript (vanilla, no libraries)
   --------------------------------------------------------------------------
   Every page loads this file. Each feature only runs if its HTML exists on
   the current page, so it's safe everywhere.

   Contents
   1.  Settings (IPs, status API)
   2.  Helpers (toast, copy to clipboard)
   3.  Mobile navigation
   4.  Copy buttons + "Play now"
   5.  Scroll reveal
   6.  Sprinkles canvas (home hero)
   7.  Live server status (home)
   8.  Features page side menu (scrollspy)
   9.  Gacha wheel demo (crates page)
   10. Advent calendar + countdown (events page)
   11. Command search + filters (commands page)
   12. FAQ smooth open (join page)
   ========================================================================== */
(function () {
  "use strict";

  /* 1. SETTINGS ----------------------------------------------------------- */
  var SERVER_IP = "play.ultimatedonutsmp.com"; // one IP for Java and Bedrock
  var STATUS_API = "https://api.mcsrvstat.us/3/" + SERVER_IP;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* 2. HELPERS ------------------------------------------------------------ */
  // Small popup message at the bottom of the screen
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    // force reflow so the animation restarts
    void toastEl.offsetWidth;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-show"); }, 2200);
  }

  // Select the text inside an element (fallback when clipboard isn't available)
  function selectText(el) {
    if (!el) return;
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Old-school copy using a hidden textarea
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // Copy text, returns a Promise<boolean>
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  /* 3. MOBILE NAVIGATION -------------------------------------------------- */
  var navToggle = $(".nav-toggle");
  var nav = $("#site-nav");
  if (navToggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    navToggle.addEventListener("click", function () {
      setNav(navToggle.getAttribute("aria-expanded") !== "true");
    });
    // Close with Escape, or when a link is clicked, or when resizing to desktop
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setNav(false); navToggle.focus(); }
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1100) setNav(false); });
  }

  /* 4. COPY BUTTONS ------------------------------------------------------- */
  // Any element with data-copy="text" copies that text.
  // Optional data-copy-target="#id" = element to select if copying fails.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    e.preventDefault();
    var text = btn.getAttribute("data-copy");
    var target = btn.getAttribute("data-copy-target");
    var labelEl = btn.querySelector("[data-copy-label]");
    copyText(text).then(function (ok) {
      if (ok) {
        toast(btn.getAttribute("data-copy-toast") || "Copied: " + text);
        btn.classList.add("is-copied");
        if (labelEl) {
          var old = labelEl.getAttribute("data-original") || labelEl.textContent;
          labelEl.setAttribute("data-original", old);
          labelEl.textContent = "Copied!";
          setTimeout(function () { labelEl.textContent = old; btn.classList.remove("is-copied"); }, 1800);
        } else {
          setTimeout(function () { btn.classList.remove("is-copied"); }, 1800);
        }
      } else {
        // Fallback: select the text so the player can press Ctrl+C
        selectText(target ? $(target) : btn);
        toast("Press Ctrl+C (or long-press) to copy");
      }
    });
  });

  /* 5. SCROLL REVEAL ------------------------------------------------------ */
  var revealEls = $$(".reveal");
  if (revealEls.length) {
    if (!("IntersectionObserver" in window) || reduceMotion) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* 6. SPRINKLES CANVAS --------------------------------------------------- */
  var canvas = $("#sprinkles");
  if (canvas && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var COLORS = ["#4FD36B", "#E2B47A", "#FF7EB9", "#37BFF9", "#FFD84A"]; // green, tan, pink, blue, yellow
    var sprinkles = [];
    var w = 0, h = 0, dpr = 1, running = true;

    var resize = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.round(Math.min(70, w / 18));
      while (sprinkles.length < target) sprinkles.push(makeSprinkle(true));
      sprinkles.length = target;
    };
    var makeSprinkle = function (anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -20,
        len: 10 + Math.random() * 8,
        speed: 0.4 + Math.random() * 1.1,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.04,
        drift: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
    };
    var draw = function () {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < sprinkles.length; i++) {
        var s = sprinkles[i];
        s.y += s.speed; s.x += s.drift; s.rot += s.spin;
        if (s.y > h + 20) { sprinkles[i] = makeSprinkle(false); continue; }
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "#000";
        ctx.fillRect(-s.len / 2 - 1.5, -4, s.len + 3, 8); // dark outline
        ctx.fillStyle = s.color;
        ctx.fillRect(-s.len / 2, -2.5, s.len, 5);
        ctx.restore();
      }
      requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    // Pause when the hero is off-screen to save battery
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var vis = entries[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(draw); }
        else if (!vis) running = false;
      }).observe(canvas);
    }
    requestAnimationFrame(draw);
  }

  /* 7. LIVE SERVER STATUS ------------------------------------------------- */
  // Updates the big status box on the home page (#server-status) and the
  // small badge in the header on every page ([data-status-badge]).
  // Checks again every STATUS_REFRESH ms, and pauses while the tab is hidden.
  // Note: mcsrvstat.us caches results for about a minute, so checking more
  // often than every 60 seconds won't give fresher numbers.
  var STATUS_REFRESH = 60000;
  var statusEl = $("#server-status");
  var badges = $$("[data-status-badge]");

  if (statusEl || badges.length) {
    var statusText = statusEl ? $(".status__text", statusEl) : null;
    var statusTimer = null, statusBusy = false, lastCheck = 0;

    var render = function (state, online, max) {
      // Home page box
      if (statusEl) {
        statusEl.setAttribute("data-state", state);
        if (state === "online") {
          statusText.innerHTML = '<span class="status__count"><b>' + online + "</b> / " + max + "</span> players online";
        } else if (state === "offline") {
          statusText.textContent = "Server is offline right now";
        } else if (statusEl.getAttribute("data-has-data") !== "1") {
          // only show the error if we never got a good result
          statusText.textContent = "Server status unavailable";
        }
        if (state !== "error") statusEl.setAttribute("data-has-data", "1");
      }
      // Header badges
      badges.forEach(function (b) {
        var txt = $(".header-status__text", b);
        if (state === "error" && b.getAttribute("data-has-data") === "1") return; // keep last good value
        b.hidden = false;
        b.setAttribute("data-state", state);
        if (state === "online") {
          txt.innerHTML = "<b>" + online + "</b><span class=\"header-status__word\"> online</span>";
          b.setAttribute("aria-label", online + " of " + max + " players online. Server status");
          b.title = online + " / " + max + " players online";
        } else if (state === "offline") {
          txt.textContent = "Offline";
          b.setAttribute("aria-label", "Server is offline. Server status");
          b.title = "Server is offline";
        } else {
          txt.textContent = "Status ?";
          b.setAttribute("aria-label", "Server status unavailable");
          b.title = "Server status unavailable";
        }
        if (state !== "error") b.setAttribute("data-has-data", "1");
      });
    };

    var checkStatus = function () {
      if (statusBusy) return;
      statusBusy = true;
      lastCheck = Date.now();
      var controller = window.AbortController ? new AbortController() : null;
      var timeout = setTimeout(function () { if (controller) controller.abort(); }, 8000);
      fetch(STATUS_API, controller ? { signal: controller.signal, cache: "no-store" } : { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (data) {
          if (data && data.online) {
            var online = Number(data.players && data.players.online) || 0;
            var max = Number(data.players && data.players.max) || "?";
            render("online", online, max);
          } else {
            render("offline");
          }
        })
        .catch(function () { render("error"); })
        .then(function () { clearTimeout(timeout); statusBusy = false; });
    };

    var startStatus = function () {
      clearInterval(statusTimer);
      statusTimer = setInterval(checkStatus, STATUS_REFRESH);
    };

    checkStatus();
    startStatus();

    // Pause while the tab is in the background, catch up when it's back
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        clearInterval(statusTimer);
      } else {
        if (Date.now() - lastCheck >= STATUS_REFRESH) checkStatus();
        startStatus();
      }
    });
  }

  /* 8. FEATURES SIDE MENU (SCROLLSPY) ------------------------------------- */
  var sideLinks = $$(".side-nav a[href^='#']");
  if (sideLinks.length && "IntersectionObserver" in window) {
    var map = {};
    sideLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var setActive = function (id) {
      sideLinks.forEach(function (a) { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
      var link = map[id];
      if (!link) return;
      link.classList.add("is-active");
      link.setAttribute("aria-current", "true");
      // keep the active tab visible in the horizontal mobile bar
      var bar = link.closest("ul");
      if (bar && bar.scrollWidth > bar.clientWidth) {
        bar.scrollTo({ left: link.offsetLeft - 20, behavior: reduceMotion ? "auto" : "smooth" });
      }
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: "-30% 0px -60% 0px" });
    Object.keys(map).forEach(function (id) { var sec = document.getElementById(id); if (sec) spy.observe(sec); });
  }

  /* 9. GACHA WHEEL DEMO --------------------------------------------------- */
  var gacha = $("#gacha");
  if (gacha) {
    var track = $(".gacha__track", gacha);
    var rollBtn = $("#gacha-roll");
    var result = $("#gacha-result");

    // Demo rewards – JUST FOR FUN, edit freely. rarity sets the border color.
    var RARITY = { common: "#B9F27C", rare: "#3FE0E0", epic: "#A44BF5", legendary: "#F5C431" };
    var REWARDS = [
      { name: "Iron Ingots",     icon: "ingot", color: "#D8D8D8", rarity: "common", weight: 18 },
      { name: "Golden Apple",    icon: "apple", color: "#F5C431", rarity: "common", weight: 15 },
      { name: "Shards",          icon: "shard", color: "#A303F9", rarity: "common", weight: 15 },
      { name: "Diamonds",        icon: "gem",   color: "#5CE1E6", rarity: "rare",   weight: 11 },
      { name: "Money Voucher",   icon: "paper", color: "#7FE08E", rarity: "rare",   weight: 11 },
      { name: "Enchanted Book",  icon: "book",  color: "#C46BFF", rarity: "rare",   weight: 10 },
      { name: "Crate Key",       icon: "key",   color: "#E2B47A", rarity: "epic",   weight: 8 },
      { name: "Netherite Ingot", icon: "ingot", color: "#5A4A55", rarity: "epic",   weight: 6 },
      { name: "Amethyst Pickaxe",icon: "pick",  color: "#B07CF7", rarity: "epic",   weight: 4 },
      { name: "Spawner",         icon: "cage",  color: "#3B4A5A", rarity: "legendary", weight: 2 }
    ];

    // Simple flat SVG icons (no game textures)
    var ICONS = {
      ingot: function (c) { return '<polygon points="8,34 16,20 40,20 48,34" fill="' + c + '" stroke="#000" stroke-width="3"/><polygon points="16,20 40,20 36,26 20,26" fill="#fff" opacity=".35"/>'; },
      apple: function (c) { return '<circle cx="28" cy="32" r="14" fill="' + c + '" stroke="#000" stroke-width="3"/><rect x="26" y="10" width="4" height="10" fill="#6B4A2B" stroke="#000" stroke-width="2"/><rect x="31" y="12" width="10" height="6" fill="#4FD36B" stroke="#000" stroke-width="2"/>'; },
      shard: function (c) { return '<polygon points="28,6 42,26 28,50 14,26" fill="' + c + '" stroke="#000" stroke-width="3"/><polygon points="28,6 34,26 28,50" fill="#fff" opacity=".25"/>'; },
      gem:   function (c) { return '<polygon points="14,20 22,10 34,10 42,20 28,46" fill="' + c + '" stroke="#000" stroke-width="3"/><polyline points="14,20 42,20" stroke="#000" stroke-width="2" fill="none"/><polygon points="22,10 28,20 34,10" fill="#fff" opacity=".4"/>'; },
      paper: function (c) { return '<rect x="8" y="16" width="40" height="24" fill="' + c + '" stroke="#000" stroke-width="3"/><circle cx="28" cy="28" r="6" fill="none" stroke="#0B3A17" stroke-width="3"/><rect x="12" y="20" width="5" height="5" fill="#0B3A17"/><rect x="39" y="31" width="5" height="5" fill="#0B3A17"/>'; },
      book:  function (c) { return '<rect x="12" y="10" width="32" height="36" fill="' + c + '" stroke="#000" stroke-width="3"/><rect x="12" y="10" width="7" height="36" fill="#000" opacity=".3"/><rect x="24" y="18" width="14" height="4" fill="#fff" opacity=".7"/>'; },
      key:   function (c) { return '<circle cx="18" cy="28" r="9" fill="none" stroke="#000" stroke-width="8"/><circle cx="18" cy="28" r="9" fill="none" stroke="' + c + '" stroke-width="4"/><rect x="26" y="25" width="22" height="6" fill="' + c + '" stroke="#000" stroke-width="2"/><rect x="40" y="31" width="5" height="7" fill="' + c + '" stroke="#000" stroke-width="2"/>'; },
      pick:  function (c) { return '<rect x="25" y="18" width="6" height="32" fill="#8A5E2A" stroke="#000" stroke-width="2" transform="rotate(35 28 34)"/><path d="M8 18 Q28 2 48 18 L44 22 Q28 10 12 22 Z" fill="' + c + '" stroke="#000" stroke-width="3"/>'; },
      cage:  function (c) { return '<rect x="8" y="8" width="40" height="40" fill="' + c + '" stroke="#000" stroke-width="3"/><path d="M18 8v40M28 8v40M38 8v40M8 18h40M8 28h40M8 38h40" stroke="#111" stroke-width="2"/><circle cx="28" cy="28" r="6" fill="#FF7EB9"/>'; }
    };

    var totalWeight = REWARDS.reduce(function (s, r) { return s + r.weight; }, 0);
    var pick = function () {
      var n = Math.random() * totalWeight;
      for (var i = 0; i < REWARDS.length; i++) { n -= REWARDS[i].weight; if (n <= 0) return REWARDS[i]; }
      return REWARDS[0];
    };
    var slotHTML = function (r) {
      return '<div class="slot" style="--r:' + RARITY[r.rarity] + '">' +
        '<svg viewBox="0 0 56 56" aria-hidden="true">' + ICONS[r.icon](r.color) + "</svg>" +
        "<span>" + r.name + "</span></div>";
    };

    var SLOTS = 60, WIN_INDEX = 52, spinning = false;
    var build = function (winner) {
      var html = "";
      for (var i = 0; i < SLOTS; i++) html += slotHTML(i === WIN_INDEX ? winner : pick());
      track.style.transition = "none";
      track.style.transform = "translateX(0)";
      track.innerHTML = html;
    };
    build(pick()); // show a starting row

    rollBtn.addEventListener("click", function () {
      if (spinning) return;
      spinning = true;
      rollBtn.disabled = true;
      result.textContent = "Rolling...";
      var winner = pick();
      build(winner);

      var slot = track.children[WIN_INDEX];
      var windowW = track.parentElement.clientWidth;
      // land somewhere random inside the winning slot, so it feels less robotic
      var jitter = (Math.random() - 0.5) * (slot.offsetWidth * 0.6);
      var target = slot.offsetLeft + slot.offsetWidth / 2 - windowW / 2 + jitter;
      var duration = reduceMotion ? 0 : 5200;

      void track.offsetWidth; // reflow before starting the transition
      track.style.transition = duration ? "transform " + duration + "ms cubic-bezier(.08,.6,.12,1)" : "none";
      track.style.transform = "translateX(" + (-target) + "px)";

      setTimeout(function () {
        slot.classList.add("is-winner");
        result.innerHTML = "You rolled: <b>" + winner.name + "</b> (" + winner.rarity + ") – just for fun!";
        spinning = false;
        rollBtn.disabled = false;
      }, duration + 60);
    });
  }

  /* 10. ADVENT CALENDAR + COUNTDOWN --------------------------------------- */
  var advent = $("#advent");
  if (advent) {
    var now = new Date();
    var isDecember = now.getMonth() === 11;
    var today = now.getDate();
    var lockSVG = '<svg class="door__state" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="8" fill="#F5E6CC" stroke="#000"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="#F5E6CC" stroke-width="2"/></svg>';
    var checkSVG = '<svg class="door__state" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8l4 4 8-9" fill="none" stroke="#4FD36B" stroke-width="3"/></svg>';

    var html = "";
    for (var d = 1; d <= 24; d++) {
      var cls = "door", label, extra = "";
      if (isDecember && d < today) { cls += " door--open"; label = "Day " + d + ": opened"; extra = checkSVG; }
      else if (isDecember && d === today) { cls += " door--today"; label = "Day " + d + ": today's reward, claim it with /advent"; }
      else { cls += " door--locked"; label = "Day " + d + ": locked"; extra = lockSVG; }
      html += '<li class="' + cls + '" aria-label="' + label + '">' + d + extra + "</li>";
    }
    advent.innerHTML = html;

    // Countdown (only shown outside December)
    var cd = $("#advent-countdown");
    var cdLive = $("#advent-live");
    if (isDecember) {
      if (cd) cd.hidden = true;
      if (cdLive) {
        cdLive.hidden = false;
        cdLive.textContent = today <= 24
          ? "The advent calendar is live! Today is day " + today + ". Type /advent in game."
          : "This year's calendar is over. You can still claim missed days with /advent while it's available.";
      }
    } else if (cd) {
      cd.hidden = false;
      var year = now.getFullYear();
      var target = new Date(year, 11, 1, 0, 0, 0); // December 1, local time
      var els = { d: $("[data-cd='d']", cd), h: $("[data-cd='h']", cd), m: $("[data-cd='m']", cd), s: $("[data-cd='s']", cd) };
      var pad = function (n) { return n < 10 ? "0" + n : String(n); };
      var tick = function () {
        var diff = Math.max(0, target - new Date());
        var s = Math.floor(diff / 1000);
        els.d.textContent = Math.floor(s / 86400);
        els.h.textContent = pad(Math.floor(s / 3600) % 24);
        els.m.textContent = pad(Math.floor(s / 60) % 60);
        els.s.textContent = pad(s % 60);
      };
      tick();
      setInterval(tick, 1000);
    }
  }

  /* 11. COMMAND SEARCH + FILTERS ------------------------------------------ */
  var cmdSearch = $("#cmd-search");
  if (cmdSearch) {
    var rows = $$(".cmd-row");
    var groups = $$(".cmd-group");
    var filterBtns = $$(".filter");
    var empty = $("#cmd-empty");
    var count = $("#cmd-count");
    var activeCat = "all";

    // Store lowercase searchable text once
    rows.forEach(function (r) { r._text = r.textContent.toLowerCase().replace(/\s+/g, " "); });

    var apply = function () {
      var q = cmdSearch.value.trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (r) {
        var catOk = activeCat === "all" || r.closest(".cmd-group").getAttribute("data-cat") === activeCat;
        var textOk = !q || r._text.indexOf(q) !== -1 || r._text.indexOf(q.replace(/^\//, "")) !== -1;
        var show = catOk && textOk;
        r.hidden = !show;
        if (show) shown++;
      });
      groups.forEach(function (g) { g.hidden = !$$(".cmd-row", g).some(function (r) { return !r.hidden; }); });
      empty.hidden = shown !== 0;
      count.textContent = shown + (shown === 1 ? " command" : " commands");
    };

    cmdSearch.addEventListener("input", apply);
    filterBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        activeCat = b.getAttribute("data-filter");
        filterBtns.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        apply();
      });
    });
    apply();
  }

  /* 12. FAQ SMOOTH OPEN --------------------------------------------------- */
  // <details> works without JS; this just animates the height when opening/closing.
  if (!reduceMotion) {
    $$(".faq details").forEach(function (det) {
      var summary = $("summary", det);
      var body = $(".faq__body", det);
      if (!summary || !body || !body.animate) return;
      summary.addEventListener("click", function (e) {
        e.preventDefault();
        if (det.open) {
          var anim = body.animate([{ height: body.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 220, easing: "ease" });
          anim.onfinish = function () { det.open = false; };
        } else {
          det.open = true;
          var hgt = body.offsetHeight;
          body.animate([{ height: "0px", opacity: 0 }, { height: hgt + "px", opacity: 1 }], { duration: 260, easing: "ease" });
        }
      });
    });
  }
})();
