const ADMIN_USER = "Ciel23";
const ADMIN_PASS = "Ciel2343";
const K = { books: "libraryMythBooks", comments: "libraryMythComments", disc: "libraryMythDiscussions", chal: "libraryMythChallenges", users: "libraryMythUsers", session: "libraryMythSession" };
const STATUS = { reading: "Sedang Dibaca", want: "Ingin Dibaca", finished: "Selesai" };

const $ = id => document.getElementById(id);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uid = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
const ago = days => Date.now() - days * 86400000;
const fmtDate = t => t ? new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
const hash = s => { let h = 5381; for (const c of s) h = (h * 33) ^ c.charCodeAt(0); return String(h >>> 0); };
const escapeHtml = t => String(t ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

const cover = id => `https://covers.openlibrary.org/b/isbn/${id}-M.jpg`;
const defaultBooks = [
  { id: 1, title: "Laut Bercerita", author: "Leila S. Chudori", genre: "Fiksi", coverUrl: cover("9786024246945") },
  { id: 2, title: "Bumi", author: "Tere Liye", genre: "Fantasi", coverUrl: cover("9786020332956") },
  { id: 3, title: "Filosofi Teras", author: "Henry Manampiring", genre: "Pengembangan Diri", coverUrl: cover("9786024125188") },
  { id: 4, title: "Atomic Habits", author: "James Clear", genre: "Pengembangan Diri", coverUrl: cover("9780735211292") },
  { id: 5, title: "The Alchemist", author: "Paulo Coelho", genre: "Fiksi", coverUrl: cover("9780062315007") },
  { id: 6, title: "Negeri 5 Menara", author: "Ahmad Fuadi", genre: "Fiksi", coverUrl: cover("9789792218783") },
  { id: 7, title: "Pulang", author: "Tere Liye", genre: "Fiksi", coverUrl: cover("9786020385914") },
  { id: 8, title: "Sapiens", author: "Yuval Noah Harari", genre: "Sejarah", coverUrl: cover("9780062316097") }
];

let books = load(K.books, defaultBooks).map(({ status, ...b }) => ({ published: true, ...b }));
let comments = load(K.comments, {
  1: [{ user: "Nadia", text: "Bagian ceritanya terasa kuat dan bikin penasaran." }, { user: "Raka", text: "Aku baru mulai baca. Ada yang sudah selesai?" }],
  4: [{ user: "Dimas", text: "Penjelasannya mudah dipahami dan cocok untuk mulai membangun kebiasaan." }]
});
Object.values(comments).forEach(list => list.forEach(c => { c.id ??= uid(); }));
let discussions = load(K.disc, [
  { id: 1, title: "Buku apa yang paling mengubah cara berpikirmu?", user: "Nadia", time: ago(3), text: "Aku sedang mencari bacaan yang punya sudut pandang menarik.", replies: [{ id: 11, user: "Raka", text: "Sapiens, bikin lihat sejarah dengan cara baru.", time: ago(2) }] },
  { id: 2, title: "Review singkat Atomic Habits", user: "Raka", time: ago(2), text: "Menurutku buku ini bagus untuk membangun kebiasaan kecil.", replies: [] },
  { id: 3, title: "Rekomendasi novel fantasi Indonesia", user: "Dimas", time: ago(1), text: "Ada rekomendasi novel fantasi lokal yang seru?", replies: [] }
]);
discussions.forEach(d => { d.replies ??= []; });
let challenges = load(K.chal, [
  { id: 1, title: "30 Hari Membaca", desc: "Selesaikan 10 buku dalam sebulan.", target: 10 },
  { id: 2, title: "Weekend Reader", desc: "Habiskan 4 buku di akhir pekan.", target: 4 },
  { id: 3, title: "Eksplor Bacaan", desc: "Selesaikan 5 buku pilihanmu.", target: 5 }
]);
let users = load(K.users, []);
let currentUser = load(K.session, null);
if (!users.some(u => u.name === currentUser && !u.admin)) currentUser = null;
let isAdmin = false, libFilter = "all", authMode = "login";

const saveBooks = () => save(K.books, books);
const saveComments = () => save(K.comments, comments);
const saveDisc = () => save(K.disc, discussions);
const saveChal = () => save(K.chal, challenges);
const saveUsers = () => save(K.users, users);
[saveBooks, saveComments, saveDisc, saveChal].forEach(fn => fn());

const me = () => users.find(u => u.name === currentUser);
const myLib = () => me()?.library || {};
const published = () => books.filter(b => b.published);
const canDelete = author => isAdmin || (currentUser && author === currentUser);

function requireLogin(msg) {
  if (currentUser) return true;
  openAuth("login", msg);
  return false;
}

/* ---------- Navigasi ---------- */
function showPage(pageId) {
  if (pageId === "admin" && !isAdmin) { alert("Akses Admin hanya untuk akun admin."); return showPage("home"); }
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $(pageId).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === pageId));
  if (pageId === "library") renderLibrary(libFilter);
  if (pageId === "admin") renderAdmin();
}
document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));

/* ---------- Buku ---------- */
function makeCover(book) {
  return `<div class="cover">
    <img src="${escapeHtml(book.coverUrl || "")}" alt="Cover ${escapeHtml(book.title)}" onerror="this.style.display='none'; this.parentElement.classList.add('cover-fallback');">
    <span class="cover-fallback-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1v13c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1z"/><path d="M12 6.5v13"/></svg></span></div>`;
}

function bookCard(b) {
  const st = myLib()[b.id];
  return `<article class="book-card">
    <div class="clickable" onclick="bookDetail(${b.id})">${makeCover(b)}</div>
    <div class="book-info">
      <span class="book-tag">${escapeHtml(b.genre)}</span>
      <h3>${escapeHtml(b.title)}</h3>
      <p>${escapeHtml(b.author)}</p>
      <small>${st ? "Status: " + STATUS[st] : "Belum ada di perpustakaanmu"}</small>
      <div class="book-actions">
        ${st ? "" : `<button class="small-btn" onclick="setStatus(${b.id}, 'want')">+ Perpustakaan</button>`}
        <button class="small-btn discussion-link" onclick="bookDetail(${b.id})">Detail &amp; Diskusi</button>
      </div>
    </div></article>`;
}

function renderBooks(filter = "") {
  const f = filter.toLowerCase();
  const list = published().filter(b => `${b.title} ${b.author} ${b.genre}`.toLowerCase().includes(f));
  $("bookList").innerHTML = list.length ? list.map(bookCard).join("") : "<p class='span-all'>Buku tidak ditemukan.</p>";
}

function renderFeatured() {
  const list = published().slice(0, 4);
  $("featuredBooks").innerHTML = list.length ? list.map(bookCard).join("") : "<p class='span-all'>Belum ada buku yang dipublikasikan.</p>";
}

function renderLibrary(filter = "all") {
  libFilter = filter;
  if (!currentUser) {
    $("libraryList").innerHTML = `<div class="panel span-all">Masuk dulu untuk melihat dan mengelola perpustakaan pribadimu.<br><br><button class="primary-btn" onclick="openAuth()">Masuk / Daftar</button></div>`;
    return;
  }
  const lib = myLib();
  const list = published().filter(b => lib[b.id] && (filter === "all" || lib[b.id] === filter));
  $("libraryList").innerHTML = list.length ? list.map(bookCard).join("") : "<p class='span-all'>Belum ada buku di kategori ini. Buka detail buku untuk mengatur statusnya.</p>";
}

function filterLibrary(filter, el) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
  renderLibrary(filter);
}

function statusBox(id) {
  if (!currentUser) return `<p class="muted-text">Masuk untuk menyimpan buku ini ke perpustakaanmu.</p><button class="small-btn" onclick="openAuth()">Masuk / Daftar</button>`;
  const cur = myLib()[id];
  return `<div class="status-group">${Object.entries(STATUS).map(([k, l]) =>
    `<button class="status-btn ${cur === k ? "active" : ""}" onclick="setStatus(${id}, '${k}')">${l}</button>`).join("")}</div>
    ${cur ? `<button class="link-btn" onclick="setStatus(${id}, null)">Hapus dari perpustakaan</button>` : ""}`;
}

function setStatus(id, status) {
  if (!requireLogin("Masuk untuk mengatur status bacaanmu.")) return;
  const lib = me().library;
  status ? (lib[id] = status) : delete lib[id];
  saveUsers();
  renderAll();
  if ($("statusBox")) $("statusBox").innerHTML = statusBox(id);
}

/* ---------- Komentar (dipakai buku & diskusi) ---------- */
function commentHtml(c, delCall) {
  return `<div class="comment-item">
    <div class="avatar">${escapeHtml(c.user.charAt(0).toUpperCase())}</div>
    <div class="grow"><b>${escapeHtml(c.user)}</b> <small class="muted-text">${fmtDate(c.time)}</small><p>${escapeHtml(c.text)}</p></div>
    ${canDelete(c.user) ? `<button class="link-btn" onclick="${delCall}${c.id})">Hapus</button>` : ""}</div>`;
}

function commentForm(submitCall) {
  if (!currentUser) return `<div class="login-hint"><span>Masuk untuk ikut berkomentar.</span><button class="small-btn" onclick="openAuth()">Masuk / Daftar</button></div>`;
  return `<div class="comment-form">
    <textarea id="commentText" rows="3" placeholder="Tulis komentar sebagai ${escapeHtml(currentUser)}..."></textarea>
    <button class="primary-btn" onclick="${submitCall}">Kirim Komentar</button></div>`;
}

function readComment() {
  const text = $("commentText").value.trim();
  if (!text) { alert("Komentar belum diisi."); return null; }
  return { id: uid(), user: currentUser, text, time: Date.now() };
}

function bookDetail(id) {
  const b = books.find(x => x.id === id);
  if (!b) return;
  const list = comments[id] || [];
  openModal(`
    <div class="book-detail">
      <div class="detail-cover">${makeCover(b)}</div>
      <div class="detail-info">
        <span class="badge">DETAIL BUKU</span>
        <h2>${escapeHtml(b.title)}</h2>
        <p><b>Penulis:</b> ${escapeHtml(b.author)}</p>
        <p><b>Genre:</b> ${escapeHtml(b.genre)}</p>
        <div class="status-box"><b>Status bacaanmu</b><div id="statusBox">${statusBox(id)}</div></div>
      </div>
    </div>
    <div class="book-discussion">
      <div class="discussion-heading">
        <div><span class="badge">DISKUSI BUKU</span><h2>Komentar Pembaca</h2></div>
        <span class="comment-count">${list.length} komentar</span>
      </div>
      <div class="comments-list">
        ${list.length ? list.map(c => commentHtml(c, `delBookComment(${id}, `)).join("") : "<p class='empty-comment'>Belum ada komentar. Jadilah yang pertama berdiskusi.</p>"}
      </div>
      ${commentForm(`addBookComment(${id})`)}
    </div>`);
}

function addBookComment(id) {
  const c = readComment();
  if (!c) return;
  (comments[id] ||= []).push(c);
  saveComments();
  bookDetail(id);
}

function delBookComment(bookId, cid) {
  comments[bookId] = (comments[bookId] || []).filter(c => c.id !== cid);
  saveComments();
  bookDetail(bookId);
}

/* ---------- Diskusi ---------- */
const discCard = d => `
  <article class="discussion clickable" onclick="discussionDetail(${d.id})">
    <h3>${escapeHtml(d.title)}</h3>
    <p>${escapeHtml(d.text)}</p>
    <small>Oleh ${escapeHtml(d.user)} · ${fmtDate(d.time)} · ${d.replies.length} komentar</small>
  </article>`;

function renderDiscussions() {
  $("discussionList").innerHTML = discussions.length ? discussions.map(discCard).join("") : "<p>Belum ada diskusi.</p>";
  $("homeDiscussions").innerHTML = discussions.length ? discussions.slice(0, 3).map(discCard).join("") : "<p>Belum ada diskusi.</p>";
}

function openDiscussion() {
  if (!requireLogin("Masuk untuk membuat diskusi.")) return;
  openModal(`
    <h2>Buat Diskusi Umum</h2>
    <div class="form-group"><label>Judul Diskusi</label><input id="discussionTitle" placeholder="Contoh: Rekomendasi buku untuk pemula"></div>
    <div class="form-group"><label>Isi Diskusi</label><textarea id="discussionText" rows="5" placeholder="Tulis topik diskusimu..."></textarea></div>
    <button class="primary-btn" onclick="createDiscussion()">Publikasikan</button>`);
}

function createDiscussion() {
  const title = $("discussionTitle").value.trim();
  const text = $("discussionText").value.trim();
  if (!title || !text) return alert("Lengkapi judul dan isi diskusi.");
  discussions.unshift({ id: uid(), title, text, user: currentUser, time: Date.now(), replies: [] });
  saveDisc();
  renderAll();
  closeModal();
}

function discussionDetail(id) {
  const d = discussions.find(x => x.id === id);
  if (!d) return;
  openModal(`
    <span class="badge">DISKUSI</span>
    <h2>${escapeHtml(d.title)}</h2>
    <small class="muted-text">Oleh ${escapeHtml(d.user)} · ${fmtDate(d.time)}</small>
    <p class="disc-body">${escapeHtml(d.text)}</p>
    <div class="book-discussion">
      <div class="discussion-heading"><h2>Komentar</h2><span class="comment-count">${d.replies.length} komentar</span></div>
      <div class="comments-list">
        ${d.replies.length ? d.replies.map(c => commentHtml(c, `delReply(${id}, `)).join("") : "<p class='empty-comment'>Belum ada komentar. Mulai percakapan!</p>"}
      </div>
      ${commentForm(`addReply(${id})`)}
    </div>`);
}

function addReply(id) {
  const c = readComment();
  if (!c) return;
  discussions.find(d => d.id === id).replies.push(c);
  saveDisc();
  renderAll();
  discussionDetail(id);
}

function delReply(did, cid) {
  const d = discussions.find(x => x.id === did);
  d.replies = d.replies.filter(c => c.id !== cid);
  saveDisc();
  renderAll();
  discussionDetail(did);
}

function deleteDiscussion(id) {
  if (!isAdmin || !confirm("Hapus diskusi ini?")) return;
  discussions = discussions.filter(d => d.id !== id);
  saveDisc();
  renderAll();
}

/* ---------- Tantangan ---------- */
function challengeCard(c) {
  const joined = me()?.joined?.includes(c.id);
  const done = Object.values(myLib()).filter(s => s === "finished").length;
  const pct = Math.min(100, Math.round(done / c.target * 100));
  return `<article class="challenge">
    <span class="badge">TANTANGAN</span>
    <h2>${escapeHtml(c.title)}</h2>
    <p>${escapeHtml(c.desc)}</p>
    <p><b>Target:</b> ${c.target} buku selesai</p>
    ${joined ? `<div class="progress"><div style="width:${pct}%"></div></div><small>${Math.min(done, c.target)}/${c.target} buku · ${pct}% selesai</small>` : "<small class='muted-text'>Ikuti untuk mulai melacak progresmu.</small>"}
    <br><br>
    <div class="c-actions">
      <button class="primary-btn" onclick="joinChallenge(${c.id})">${joined ? "Keluar dari Tantangan" : "Ikuti Tantangan"}</button>
      ${isAdmin ? `<button class="small-btn" onclick="deleteChallenge(${c.id})">Hapus</button>` : ""}
    </div></article>`;
}

function renderChallenges() {
  const empty = "<p class='span-all'>Belum ada tantangan.</p>";
  $("challengeList").innerHTML = challenges.length ? challenges.map(challengeCard).join("") : empty;
  $("homeChallenges").innerHTML = challenges.length ? challenges.slice(0, 3).map(challengeCard).join("") : empty;
}

function joinChallenge(id) {
  if (!requireLogin("Masuk untuk mengikuti tantangan.")) return;
  const u = me();
  u.joined = u.joined.includes(id) ? u.joined.filter(x => x !== id) : [...u.joined, id];
  saveUsers();
  renderChallenges();
}

function openChallengeForm() {
  if (!isAdmin) return;
  openModal(`
    <h2>Tambah Tantangan</h2>
    <div class="form-group"><label>Judul</label><input id="chTitle" placeholder="Contoh: Baca 12 Buku Setahun"></div>
    <div class="form-group"><label>Deskripsi</label><textarea id="chDesc" rows="3" placeholder="Jelaskan tantangannya..."></textarea></div>
    <div class="form-group"><label>Target (jumlah buku selesai)</label><input id="chTarget" type="number" min="1" value="5"></div>
    <button class="primary-btn" onclick="saveChallengeForm()">Simpan Tantangan</button>`);
}

function saveChallengeForm() {
  if (!isAdmin) return;
  const title = $("chTitle").value.trim(), desc = $("chDesc").value.trim(), target = parseInt($("chTarget").value, 10);
  if (!title || !desc || !(target > 0)) return alert("Lengkapi judul, deskripsi, dan target (minimal 1).");
  challenges.push({ id: uid(), title, desc, target });
  saveChal();
  renderAll();
  closeModal();
}

function deleteChallenge(id) {
  if (!isAdmin || !confirm("Hapus tantangan ini?")) return;
  challenges = challenges.filter(c => c.id !== id);
  users.forEach(u => { u.joined = (u.joined || []).filter(x => x !== id); });
  saveChal();
  saveUsers();
  renderAll();
}

/* ---------- Admin ---------- */
function renderAdmin() {
  if (!isAdmin) return;
  $("adminBooks").textContent = books.length;
  $("adminDiscussion").textContent = discussions.length;
  $("adminChallenges").textContent = challenges.length;
  $("adminMembers").textContent = users.filter(u => !u.admin).length;

  $("adminBookTable").innerHTML = `<table class="admin-table">
    <thead><tr><th>Cover</th><th>Judul</th><th>Penulis</th><th>Genre</th><th>Publikasi</th><th>Aksi</th></tr></thead>
    <tbody>${books.map(b => `<tr>
      <td><img class="table-cover" src="${escapeHtml(b.coverUrl)}" alt="Cover" onerror="this.style.display='none';"></td>
      <td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.author)}</td><td>${escapeHtml(b.genre)}</td>
      <td><button class="small-btn" onclick="togglePublish(${b.id})">${b.published ? "Terbit" : "<span class='tag-off'>Disembunyikan</span>"}</button></td>
      <td><button class="small-btn" onclick="openBookForm(${b.id})">Edit</button> <button class="small-btn" onclick="deleteBook(${b.id})">Hapus</button></td>
    </tr>`).join("")}</tbody></table>`;

  $("adminChallengeTable").innerHTML = challenges.length ? `<table class="admin-table">
    <thead><tr><th>Judul</th><th>Deskripsi</th><th>Target</th><th>Aksi</th></tr></thead>
    <tbody>${challenges.map(c => `<tr>
      <td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.desc)}</td><td>${c.target} buku</td>
      <td><button class="small-btn" onclick="deleteChallenge(${c.id})">Hapus</button></td></tr>`).join("")}</tbody></table>` : "<p class='muted-text'>Belum ada tantangan.</p>";

  $("moderationList").innerHTML = discussions.map(d => `<div class="discussion">
    <b>${escapeHtml(d.title)}</b><p>${escapeHtml(d.text)}</p>
    <button class="small-btn" onclick="deleteDiscussion(${d.id})">Hapus Diskusi</button></div>`).join("") || "<p class='muted-text'>Tidak ada diskusi.</p>";
}

function togglePublish(id) {
  if (!isAdmin) return;
  const b = books.find(x => x.id === id);
  b.published = !b.published;
  saveBooks();
  renderAll();
}

function openBookForm(id = null) {
  if (!isAdmin) return;
  const b = id ? books.find(x => x.id === id) : null;
  openModal(`
    <h2>${b ? "Edit Buku" : "Tambah Buku"}</h2>
    <div class="form-group"><label>Judul</label><input id="bookTitle" value="${escapeHtml(b?.title)}"></div>
    <div class="form-group"><label>Penulis</label><input id="bookAuthor" value="${escapeHtml(b?.author)}"></div>
    <div class="form-group"><label>Genre</label><input id="bookGenre" value="${escapeHtml(b?.genre)}"></div>
    <div class="form-group"><label>Link Gambar Cover Buku</label>
      <input id="bookCover" value="${escapeHtml(b?.coverUrl)}" placeholder="https://...jpg">
      <small class="helper-text">Masukkan link gambar cover buku (JPG/PNG).</small></div>
    <div class="form-group"><label><input id="bookPublished" type="checkbox" style="width:auto" ${!b || b.published ? "checked" : ""}> Publikasikan (tampil di Beranda &amp; daftar buku)</label></div>
    <button class="primary-btn" onclick="saveBook(${id || "null"})">Simpan Buku</button>`);
}

function saveBook(id) {
  if (!isAdmin) return;
  const data = {
    title: $("bookTitle").value.trim(), author: $("bookAuthor").value.trim(), genre: $("bookGenre").value.trim(),
    coverUrl: $("bookCover").value.trim(), published: $("bookPublished").checked
  };
  if (!data.title || !data.author || !data.genre || !data.coverUrl) return alert("Semua data buku harus diisi, termasuk link gambar cover.");
  if (id) Object.assign(books.find(b => b.id === id), data);
  else books.push({ id: uid(), ...data });
  saveBooks();
  renderAll();
  closeModal();
}

function deleteBook(id) {
  if (!isAdmin || !confirm("Hapus buku ini?")) return;
  books = books.filter(b => b.id !== id);
  delete comments[id];
  users.forEach(u => delete u.library[id]);
  saveBooks(); saveComments(); saveUsers();
  renderAll();
}

/* ---------- Login / Daftar (semua orang) ---------- */
function openAuth(mode = "login", hint = "") {
  authMode = mode;
  const reg = mode === "register";
  openModal(`<form class="login-box" onsubmit="event.preventDefault(); submitAuth()">
    <span class="badge">${reg ? "DAFTAR" : "MASUK"}</span>
    <h2>${reg ? "Buat Akun Baru" : "Selamat Datang"}</h2>
    <p class="muted-text">${escapeHtml(hint) || "Masuk untuk berkomentar, berdiskusi, dan mengatur perpustakaanmu."}</p>
    <div class="form-group"><label>Username</label><input id="authUser" autocomplete="username" placeholder="Username" required></div>
    <div class="form-group"><label>Password</label><input id="authPass" type="password" autocomplete="${reg ? "new-password" : "current-password"}" placeholder="Password" required></div>
    ${reg ? `<div class="form-group"><label>Ulangi Password</label><input id="authPass2" type="password" autocomplete="new-password" placeholder="Ulangi password" required></div>` : ""}
    <button class="primary-btn full-btn" type="submit">${reg ? "Daftar" : "Masuk"}</button>
    <p class="auth-switch muted-text">${reg ? "Sudah punya akun?" : "Belum punya akun?"}
      <button type="button" class="link-btn" onclick="openAuth('${reg ? "login" : "register"}')">${reg ? "Masuk" : "Daftar"}</button></p>
  </form>`);
  $("authUser").focus();
}

function submitAuth() {
  const name = $("authUser").value.trim(), pass = $("authPass").value;
  const key = name.toLowerCase();

  if (authMode === "register") {
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(name)) return alert("Username 3–20 karakter: huruf, angka, titik, atau underscore.");
    if (pass.length < 6) return alert("Password minimal 6 karakter.");
    if (pass !== $("authPass2").value) return alert("Konfirmasi password tidak sama.");
    if (key === ADMIN_USER.toLowerCase() || users.some(u => u.name.toLowerCase() === key)) return alert("Username sudah dipakai.");
    users.push({ name, pass: hash(key + ":" + pass), library: {}, joined: [] });
    saveUsers();
    return loginAs(name);
  }

  if (name === ADMIN_USER && pass === ADMIN_PASS) {
    if (!users.some(u => u.name === ADMIN_USER)) { users.push({ name: ADMIN_USER, pass: null, admin: true, library: {}, joined: [] }); saveUsers(); }
    isAdmin = true;
    loginAs(ADMIN_USER, false);
    return showPage("admin");
  }
  const u = users.find(x => x.name.toLowerCase() === key);
  if (!u || u.pass !== hash(key + ":" + pass)) return alert("Username atau password salah.");
  loginAs(u.name);
}

function loginAs(name, persist = true) {
  currentUser = name;
  persist ? save(K.session, name) : localStorage.removeItem(K.session);
  closeModal();
  renderAll();
}

function logout() {
  currentUser = null;
  isAdmin = false;
  localStorage.removeItem(K.session);
  renderAll();
  showPage("home");
}

function updateAuthUI() {
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));
  const chip = $("userChip");
  chip.classList.toggle("hidden", !currentUser);
  chip.textContent = currentUser ? `${currentUser}${isAdmin ? " · Admin" : ""}` : "";
  $("loginBtn").textContent = currentUser ? "Logout" : "Masuk / Daftar";
}

$("loginBtn").addEventListener("click", () => currentUser ? logout() : openAuth());

/* ---------- Modal & render ---------- */
function openModal(content) { $("modalContent").innerHTML = content; $("modal").classList.add("show"); }
function closeModal() { $("modal").classList.remove("show"); }
$("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
$("searchBook").addEventListener("input", e => renderBooks(e.target.value));

function renderAll() {
  updateAuthUI();
  renderFeatured();
  renderBooks($("searchBook").value);
  renderDiscussions();
  renderChallenges();
  renderLibrary(libFilter);
  $("statMembers").textContent = users.filter(u => !u.admin).length;
  $("statBooks").textContent = published().length;
  $("statDiscussions").textContent = discussions.length;
  $("statChallenges").textContent = challenges.length;
  if (isAdmin) renderAdmin();
}

renderAll();
