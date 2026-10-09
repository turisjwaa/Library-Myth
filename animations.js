/* =========================================================
   Library Myth — animasi & interaksi
   Dimuat SETELAH script.js. Hanya menambah efek visual,
   tidak mengubah data atau logika aplikasi.
   ========================================================= */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => reduceMq.matches;
  const make = (tag, cls) => Object.assign(document.createElement(tag), { className: cls });

  /* ---------- 1. Muncul saat di-scroll ----------
     Kartu & judul fade-in berurutan. Daftar yang dirender ulang
     (mis. setelah klik status) tidak dianimasikan ulang. */
  const REVEAL = ".book-card, .discussion, .challenge, .stats > div, .admin-card, .panel, .home-head";

  const revealIO = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          en.target.classList.add("rv-in");
          if (en.target.parentElement) en.target.parentElement.dataset.seen = "1";
          revealIO.unobserve(en.target);
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" })
    : null;

  const isShown = el => el.getClientRects().length > 0;

  function prepare(root) {
    if (!revealIO || reduced() || root.nodeType !== 1) return;
    const found = [];
    if (root.matches(REVEAL)) found.push(root);
    root.querySelectorAll(REVEAL).forEach(n => found.push(n));

    const toMark = new Set();
    found.forEach(el => {
      if (el.classList.contains("rv")) return;
      const parent = el.parentElement;
      if (!parent || parent.dataset.seen === "1") return;
      if (!el.matches(".home-head")) {
        const idx = Array.prototype.indexOf.call(parent.children, el);
        el.style.setProperty("--d", (idx % 4) * 90 + "ms");
      }
      el.classList.add("rv");
      revealIO.observe(el);
      toMark.add(parent);
    });
    toMark.forEach(p => { if (isShown(p)) p.dataset.seen = "1"; });
  }

  // Pencarian & tab perpustakaan: animasikan ulang hasil baru
  document.addEventListener("input", e => {
    if (e.target.id === "searchBook" && $("bookList")) delete $("bookList").dataset.seen;
  }, true);
  document.addEventListener("click", e => {
    if (e.target.closest?.(".library-tabs .tab") && $("libraryList")) delete $("libraryList").dataset.seen;
  }, true);

  /* ---------- 2. Cover buku: kerangka berkilau saat loading ---------- */
  function watchCovers(root) {
    if (root.nodeType !== 1) return;
    const imgs = root.matches(".cover img") ? [root] : root.querySelectorAll(".cover img");
    imgs.forEach(img => {
      if (img.complete) return;
      img.classList.add("cover-pending");
      const done = () => img.classList.remove("cover-pending");
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      setTimeout(done, 8000); // pengaman
    });
  }

  // Pantau semua elemen baru yang dirender script.js
  new MutationObserver(records => {
    records.forEach(r => r.addedNodes.forEach(n => { prepare(n); watchCovers(n); }));
  }).observe(document.body, { childList: true, subtree: true });

  prepare(document.body);
  watchCovers(document.body);

  /* ---------- 3. Angka statistik menghitung naik ---------- */
  const OBS = { childList: true, characterData: true, subtree: true };
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function setText(el, v) {
    el._mo.disconnect();
    el.textContent = v;
    el._mo.observe(el, OBS);
  }

  function countRun(el, from, to) {
    cancelAnimationFrame(el._raf);
    if (reduced() || from === to) { setText(el, to); el._cur = to; return; }
    const t0 = performance.now(), dur = 900;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const v = Math.round(from + (to - from) * easeOut(p));
      setText(el, v);
      el._cur = v;
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  const countIO = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          const el = en.target;
          countIO.unobserve(el);
          el._seen = true;
          if (reduced()) return;
          setText(el, 0);
          el._cur = 0;
          countRun(el, 0, el._val);
        });
      }, { threshold: 0.4 })
    : null;

  ["statMembers", "statBooks", "statDiscussions", "statChallenges",
   "adminBooks", "adminDiscussion", "adminChallenges", "adminMembers"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el._val = parseInt(el.textContent, 10) || 0;
    el._cur = el._val;
    el._seen = false;
    el._mo = new MutationObserver(() => {
      const t = parseInt(el.textContent, 10);
      if (isNaN(t)) return;
      el._val = t;
      if (el._seen) { setText(el, el._cur); countRun(el, el._cur, t); }
    });
    el._mo.observe(el, OBS);
    if (countIO) countIO.observe(el);
  });

  /* ---------- 4. Indikator menu yang bergeser ---------- */
  const nav = document.querySelector("header nav");
  const ind = make("span", "nav-ind");
  nav.appendChild(ind);

  function moveIndicator() {
    const active = nav.querySelector(".nav-btn.active");
    if (!active || !active.offsetWidth) return;
    ind.style.width = Math.max(0, active.offsetWidth - 28) + "px";
    ind.style.transform = `translateX(${active.offsetLeft + 14}px)`;
    ind.classList.add("ready");
  }
  new MutationObserver(() => requestAnimationFrame(moveIndicator))
    .observe(nav, { attributes: true, attributeFilter: ["class"], subtree: true });
  addEventListener("resize", moveIndicator);
  addEventListener("load", moveIndicator);
  moveIndicator();

  /* ---------- 5. Progres scroll, navbar, tombol ke atas ---------- */
  const bar = make("div", "scroll-progress");
  const topBtn = make("button", "to-top");
  topBtn.type = "button";
  topBtn.setAttribute("aria-label", "Kembali ke atas");
  topBtn.textContent = "↑";
  document.body.append(bar, topBtn);

  const navbar = document.querySelector(".navbar");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const y = window.scrollY;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      navbar.classList.toggle("scrolled", y > 8);
      topBtn.classList.toggle("show", y > 500);
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();
  topBtn.addEventListener("click", () =>
    scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }));

  /* ---------- 6. Ganti halaman → scroll mulus ke atas ---------- */
  if (typeof window.showPage === "function") {
    const origShow = window.showPage;
    window.showPage = function () {
      const before = document.querySelector(".page.active");
      const result = origShow.apply(this, arguments);
      if (document.querySelector(".page.active") !== before) {
        scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
      }
      onScroll();
      return result;
    };
  }

  /* ---------- 7. Modal: animasi buka & tutup, tombol Esc ---------- */
  const modal = $("modal");
  if (modal && typeof window.openModal === "function" && typeof window.closeModal === "function") {
    const origOpen = window.openModal, origClose = window.closeModal;
    let closeTimer = 0;
    window.openModal = function () {
      clearTimeout(closeTimer);
      modal.classList.remove("closing");
      return origOpen.apply(this, arguments);
    };
    window.closeModal = function () {
      if (!modal.classList.contains("show") || modal.classList.contains("closing")) return;
      if (reduced()) return origClose();
      modal.classList.add("closing");
      closeTimer = setTimeout(() => { modal.classList.remove("closing"); origClose(); }, 200);
    };
    addEventListener("keydown", e => {
      if (e.key === "Escape" && modal.classList.contains("show")) window.closeModal();
    });
  }

  /* ---------- 8. Ripple di tombol ---------- */
  document.addEventListener("pointerdown", e => {
    if (reduced()) return;
    const btn = e.target.closest?.(".primary-btn, .small-btn, .status-btn, .tab, .nav-btn");
    if (!btn || btn.disabled) return;
    btn.classList.add("rp-host");
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2;
    const s = make("span", "ripple");
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    btn.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  });

  /* ---------- 9. Kartu buku miring 3D mengikuti kursor ---------- */
  let tiltEl = null, tiltRaf = 0;
  const resetTilt = el => {
    el.classList.remove("tilting");
    ["--rx", "--ry", "--gx", "--gy"].forEach(p => el.style.removeProperty(p));
  };
  document.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse" || reduced()) return;
    const card = e.target.closest?.(".book-card") || null;
    if (tiltEl && tiltEl !== card) resetTilt(tiltEl);
    tiltEl = card;
    if (!card) return;
    cancelAnimationFrame(tiltRaf);
    tiltRaf = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.classList.add("tilting");
      card.style.setProperty("--rx", ((0.5 - y) * 10).toFixed(2) + "deg");
      card.style.setProperty("--ry", ((x - 0.5) * 12).toFixed(2) + "deg");
      card.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
      card.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
    });
  });
  document.documentElement.addEventListener("pointerleave", () => {
    if (tiltEl) { resetTilt(tiltEl); tiltEl = null; }
  });

  /* ---------- 10. Konfeti ---------- */
  let cv, cx, parts = [], cRaf = 0;
  const COLORS = ["#b88932", "#d9a93f", "#87631e", "#f0d9a0", "#5b7a5a", "#2f4b6e", "#c9a45c"];

  function sizeCanvas() {
    const d = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * d;
    cv.height = innerHeight * d;
    cx.setTransform(d, 0, 0, d, 0, 0);
  }
  function ensureCanvas() {
    if (cv) return;
    cv = make("canvas", "confetti");
    document.body.appendChild(cv);
    cx = cv.getContext("2d");
    sizeCanvas();
    addEventListener("resize", sizeCanvas);
  }
  function tick() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += 0.28; p.vx *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.006;
      cx.save();
      cx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      cx.translate(p.x, p.y);
      cx.rotate(p.r);
      cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cx.restore();
    }
    cRaf = parts.length ? requestAnimationFrame(tick) : 0;
  }
  function confetti(x, y, n = 80) {
    if (reduced()) return;
    ensureCanvas();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 8;
      parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 5,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 5,
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: COLORS[i % COLORS.length], life: 1
      });
    }
    if (!cRaf) cRaf = requestAnimationFrame(tick);
  }

  // Konfeti saat buku ditandai "Selesai"
  document.addEventListener("click", e => {
    const b = e.target.closest?.(".status-btn");
    if (!b || b.classList.contains("active")) return;
    if (!/'finished'/.test(b.getAttribute("onclick") || "")) return;
    const r = b.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2);
  });

  /* ---------- 11. Hero interaktif ---------- */
  const hero = document.querySelector(".hero");
  const heroBook = document.querySelector(".hero-book");
  if (hero) {
    hero.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse" || reduced()) return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      hero.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      hero.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      hero.style.setProperty("--px", ((x - 0.5) * -28).toFixed(1) + "px");
      hero.style.setProperty("--py", ((y - 0.5) * -28).toFixed(1) + "px");
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--px", "0px");
      hero.style.setProperty("--py", "0px");
    });
  }
  if (heroBook) {
    heroBook.setAttribute("role", "button");
    heroBook.setAttribute("tabindex", "0");
    heroBook.setAttribute("aria-label", "Putar buku");
    const spin = () => {
      if (heroBook.classList.contains("spin")) return;
      heroBook.classList.add("spin");
      heroBook.addEventListener("animationend", function end(ev) {
        if (ev.animationName !== "flip") return;
        heroBook.classList.remove("spin");
        heroBook.removeEventListener("animationend", end);
      });
      const r = heroBook.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2, 50);
    };
    heroBook.addEventListener("click", spin);
    heroBook.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin(); }
    });
  }
})();
