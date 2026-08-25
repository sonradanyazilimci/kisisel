import {
  auth, SITE_DOC, getDoc, setDoc,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword
} from "./firebase.js";

const DEFAULT_DATA = {
  profile: {
    name: "Adın Soyadın",
    title: "Kısa unvanın (örn. Yazılım Geliştirici)",
    bio: "Kendinle ilgili 1-2 cümlelik kısa bir açıklama yaz.",
    avatar: ""
  },
  theme: { accent: "#7c5cff" },
  links: [],
  portfolio: []
};

let state = null;
let editingLinkId = null;
let editingPortfolioId = null;

/* ---------- Yardımcılar ---------- */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function uid(prefix) {
  return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3200);
}

function slugify(text) {
  const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" };
  return (text || "gorsel")
    .split("").map(ch => map[ch] || ch).join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "gorsel";
}

function downloadFile(file, filename) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Dosya seçilince: önerilen "images/..." yolunu hedef inputa yazar, dosyayı
   o adla indirir ve önizleme için geçici bir blob URL döner. */
function handleImagePick(file, slugSource, pathInputEl, previewImgEl, previewWrapEl) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const filename = `${slugify(slugSource)}-${Date.now().toString(36)}.${ext}`;
  const relPath = `images/${filename}`;

  pathInputEl.value = relPath;
  downloadFile(file, filename);

  const blobUrl = URL.createObjectURL(file);
  previewImgEl.src = blobUrl;
  previewWrapEl.hidden = false;

  toast(`"${filename}" indirildi. Bu dosyayı proje klasöründeki images/ içine taşı.`);
}

/* ---------- Giriş / Çıkış ---------- */

function showLogin() {
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("adminApp").hidden = true;
}

function showApp() {
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("adminApp").hidden = false;
}

function initAuth() {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorEl = document.getElementById("loginError");
    errorEl.hidden = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      errorEl.textContent = "Giriş başarısız: " + friendlyAuthError(err);
      errorEl.hidden = false;
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth);
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      showApp();
      initApp();
    } else {
      appInitialized = false;
      showLogin();
    }
  });
}

function friendlyAuthError(err) {
  const code = err && err.code;
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "E-posta veya şifre hatalı.";
  }
  if (code === "auth/too-many-requests") return "Çok fazla deneme yapıldı, biraz sonra tekrar dene.";
  if (code === "auth/invalid-email") return "Geçersiz e-posta adresi.";
  return err.message || "Bilinmeyen hata.";
}

/* ---------- Uygulama başlangıcı ---------- */

let appInitialized = false;

async function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  const snap = await getDoc(SITE_DOC);
  state = snap.exists() ? snap.data() : structuredClone(DEFAULT_DATA);
  if (!state.links) state.links = [];
  if (!state.portfolio) state.portfolio = [];
  if (!state.theme) state.theme = { accent: "#7c5cff" };
  if (!state.profile) state.profile = {};

  initTabs();
  fillPlatformSelect();
  renderProfileForm();
  renderLinksAdmin();
  renderPortfolioAdmin();
  bindProfileForm();
  bindLinkForm();
  bindPortfolioForm();
  bindSettings();
}

/* ---------- Sekmeler ---------- */

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

function fillPlatformSelect() {
  const sel = document.getElementById("l-platform");
  sel.innerHTML = window.PLATFORM_LIST.map(p => `<option value="${p.key}">${p.label}</option>`).join("");
}

/* ---------- Kaydet + yayınla (Firestore) ---------- */

async function persist() {
  try {
    await setDoc(SITE_DOC, state);
    toast("Kaydedildi — herkese anında yansıdı.");
  } catch (err) {
    console.error(err);
    toast("Kaydedilemedi: " + (err.message || "bilinmeyen hata"));
  }
}

/* ---------- Profil ---------- */

function renderProfileForm() {
  const p = state.profile || {};
  document.getElementById("f-name").value = p.name || "";
  document.getElementById("f-title").value = p.title || "";
  document.getElementById("f-bio").value = p.bio || "";
  document.getElementById("f-avatar-path").value = p.avatar || "";
  document.getElementById("f-accent").value = (state.theme && state.theme.accent) || "#7c5cff";

  const wrap = document.getElementById("avatarPreviewWrap");
  const img = document.getElementById("avatarPreview");
  if (p.avatar) {
    img.src = p.avatar;
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
  }
}

function bindProfileForm() {
  document.getElementById("f-avatar-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleImagePick(
      file,
      document.getElementById("f-name").value || "avatar",
      document.getElementById("f-avatar-path"),
      document.getElementById("avatarPreview"),
      document.getElementById("avatarPreviewWrap")
    );
  });

  document.getElementById("removeAvatarBtn").addEventListener("click", () => {
    document.getElementById("f-avatar-path").value = "";
    document.getElementById("avatarPreviewWrap").hidden = true;
    document.getElementById("f-avatar-file").value = "";
  });

  document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.profile = state.profile || {};
    state.profile.name = document.getElementById("f-name").value.trim();
    state.profile.title = document.getElementById("f-title").value.trim();
    state.profile.bio = document.getElementById("f-bio").value.trim();
    state.profile.avatar = document.getElementById("f-avatar-path").value.trim();
    state.theme = { accent: document.getElementById("f-accent").value };
    persist();
  });
}

/* ---------- Linkler ---------- */

function renderLinksAdmin() {
  const list = document.getElementById("linksListAdmin");
  list.innerHTML = "";
  if (!state.links.length) {
    list.innerHTML = '<li class="empty-list">Henüz link eklenmedi.</li>';
    return;
  }
  state.links.forEach((link, idx) => {
    const li = document.createElement("li");
    li.className = "item-row";
    li.innerHTML = `
      <span class="item-icon">${window.getPlatformIcon(link.platform)}</span>
      <span class="item-info">
        <p class="item-title">${escapeHtml(link.title)}</p>
        <p class="item-sub">${escapeHtml(link.url)}</p>
      </span>
      <span class="item-actions">
        <button type="button" class="icon-btn" data-action="up" title="Yukarı taşı" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="icon-btn" data-action="down" title="Aşağı taşı" ${idx === state.links.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="icon-btn" data-action="edit" title="Düzenle">✎</button>
        <button type="button" class="icon-btn" data-action="delete" title="Sil">✕</button>
      </span>
    `;
    li.querySelector('[data-action="up"]').addEventListener("click", () => moveLink(link.id, -1));
    li.querySelector('[data-action="down"]').addEventListener("click", () => moveLink(link.id, 1));
    li.querySelector('[data-action="edit"]').addEventListener("click", () => startEditLink(link));
    li.querySelector('[data-action="delete"]').addEventListener("click", () => deleteLink(link.id));
    list.appendChild(li);
  });
}

function moveLink(id, dir) {
  const idx = state.links.findIndex(l => l.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.links.length) return;
  const [item] = state.links.splice(idx, 1);
  state.links.splice(newIdx, 0, item);
  renderLinksAdmin();
  persist();
}

function startEditLink(link) {
  editingLinkId = link.id;
  document.getElementById("linkFormTitle").textContent = "Linki Düzenle";
  document.getElementById("l-id").value = link.id;
  document.getElementById("l-platform").value = link.platform || "link";
  document.getElementById("l-title").value = link.title || "";
  document.getElementById("l-url").value = link.url || "";
  document.getElementById("linkCancelEdit").hidden = false;
  document.querySelector('#linkForm button[type="submit"]').textContent = "Güncelle";
  document.getElementById("tab-links").scrollIntoView({ behavior: "smooth", block: "end" });
}

function resetLinkForm() {
  editingLinkId = null;
  document.getElementById("linkForm").reset();
  document.getElementById("linkFormTitle").textContent = "Yeni Link Ekle";
  document.getElementById("linkCancelEdit").hidden = true;
  document.querySelector('#linkForm button[type="submit"]').textContent = "Ekle";
}

function deleteLink(id) {
  if (!confirm("Bu linki silmek istediğine emin misin?")) return;
  state.links = state.links.filter(l => l.id !== id);
  renderLinksAdmin();
  persist();
}

function bindLinkForm() {
  document.getElementById("linkForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const platform = document.getElementById("l-platform").value;
    const title = document.getElementById("l-title").value.trim();
    const url = document.getElementById("l-url").value.trim();
    if (!title || !url) return;

    if (editingLinkId) {
      const link = state.links.find(l => l.id === editingLinkId);
      link.platform = platform;
      link.title = title;
      link.url = url;
      link.type = platform === "link" ? "link" : "social";
    } else {
      state.links.push({
        id: uid("l"),
        type: platform === "link" ? "link" : "social",
        platform,
        title,
        url
      });
    }

    resetLinkForm();
    renderLinksAdmin();
    persist();
  });

  document.getElementById("linkCancelEdit").addEventListener("click", resetLinkForm);
}

/* ---------- Portföy ---------- */

function renderPortfolioAdmin() {
  const list = document.getElementById("portfolioListAdmin");
  list.innerHTML = "";
  if (!state.portfolio.length) {
    list.innerHTML = '<li class="empty-list">Henüz proje eklenmedi.</li>';
    return;
  }
  state.portfolio.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "item-row";
    const thumb = item.image
      ? `<span class="item-thumb" style="background-image:url('${item.image}')"></span>`
      : `<span class="item-thumb"></span>`;
    li.innerHTML = `
      ${thumb}
      <span class="item-info">
        <p class="item-title">${escapeHtml(item.title)}</p>
        <p class="item-sub">${escapeHtml(item.description || item.url || "")}</p>
      </span>
      <span class="item-actions">
        <button type="button" class="icon-btn" data-action="up" title="Yukarı taşı" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="icon-btn" data-action="down" title="Aşağı taşı" ${idx === state.portfolio.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="icon-btn" data-action="edit" title="Düzenle">✎</button>
        <button type="button" class="icon-btn" data-action="delete" title="Sil">✕</button>
      </span>
    `;
    li.querySelector('[data-action="up"]').addEventListener("click", () => movePortfolio(item.id, -1));
    li.querySelector('[data-action="down"]').addEventListener("click", () => movePortfolio(item.id, 1));
    li.querySelector('[data-action="edit"]').addEventListener("click", () => startEditPortfolio(item));
    li.querySelector('[data-action="delete"]').addEventListener("click", () => deletePortfolio(item.id));
    list.appendChild(li);
  });
}

function movePortfolio(id, dir) {
  const idx = state.portfolio.findIndex(p => p.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.portfolio.length) return;
  const [item] = state.portfolio.splice(idx, 1);
  state.portfolio.splice(newIdx, 0, item);
  renderPortfolioAdmin();
  persist();
}

function startEditPortfolio(item) {
  editingPortfolioId = item.id;
  document.getElementById("portfolioFormTitle").textContent = "Projeyi Düzenle";
  document.getElementById("p-id").value = item.id;
  document.getElementById("p-title").value = item.title || "";
  document.getElementById("p-description").value = item.description || "";
  document.getElementById("p-url").value = item.url || "";
  document.getElementById("p-image-path").value = item.image || "";

  const wrap = document.getElementById("portfolioImagePreviewWrap");
  const img = document.getElementById("portfolioImagePreview");
  if (item.image) {
    img.src = item.image;
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
  }

  document.getElementById("portfolioCancelEdit").hidden = false;
  document.querySelector('#portfolioForm button[type="submit"]').textContent = "Güncelle";
  document.getElementById("tab-portfolio").scrollIntoView({ behavior: "smooth", block: "end" });
}

function resetPortfolioForm() {
  editingPortfolioId = null;
  document.getElementById("portfolioForm").reset();
  document.getElementById("portfolioFormTitle").textContent = "Yeni Proje Ekle";
  document.getElementById("portfolioImagePreviewWrap").hidden = true;
  document.getElementById("portfolioCancelEdit").hidden = true;
  document.querySelector('#portfolioForm button[type="submit"]').textContent = "Ekle";
}

function deletePortfolio(id) {
  if (!confirm("Bu projeyi silmek istediğine emin misin?")) return;
  state.portfolio = state.portfolio.filter(p => p.id !== id);
  renderPortfolioAdmin();
  persist();
}

function bindPortfolioForm() {
  document.getElementById("p-image-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleImagePick(
      file,
      document.getElementById("p-title").value || "proje",
      document.getElementById("p-image-path"),
      document.getElementById("portfolioImagePreview"),
      document.getElementById("portfolioImagePreviewWrap")
    );
  });

  document.getElementById("removePortfolioImageBtn").addEventListener("click", () => {
    document.getElementById("p-image-path").value = "";
    document.getElementById("portfolioImagePreviewWrap").hidden = true;
    document.getElementById("p-image-file").value = "";
  });

  document.getElementById("portfolioForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("p-title").value.trim();
    const description = document.getElementById("p-description").value.trim();
    const url = document.getElementById("p-url").value.trim();
    const image = document.getElementById("p-image-path").value.trim();
    if (!title) return;

    if (editingPortfolioId) {
      const item = state.portfolio.find(p => p.id === editingPortfolioId);
      item.title = title;
      item.description = description;
      item.url = url;
      item.image = image;
    } else {
      state.portfolio.push({ id: uid("p"), title, description, url, image });
    }

    resetPortfolioForm();
    renderPortfolioAdmin();
    persist();
  });

  document.getElementById("portfolioCancelEdit").addEventListener("click", resetPortfolioForm);
}

/* ---------- Ayarlar ---------- */

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bindSettings() {
  document.getElementById("exportJsonBtn").addEventListener("click", () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`linksite-yedek-${stamp}.json`, state);
    toast("Yedek indirildi.");
  });

  document.getElementById("importJsonInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.profile || !Array.isArray(parsed.links)) {
        throw new Error("Geçersiz dosya biçimi");
      }
      state = parsed;
      state.portfolio = state.portfolio || [];
      state.theme = state.theme || { accent: "#7c5cff" };
      renderProfileForm();
      renderLinksAdmin();
      renderPortfolioAdmin();
      await persist();
      toast("Veriler içe aktarıldı.");
    } catch (err) {
      alert("Dosya okunamadı: " + err.message);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPass = document.getElementById("newPassword").value;
    if (!newPass || newPass.length < 6) return;
    try {
      await updatePassword(auth.currentUser, newPass);
      document.getElementById("passwordForm").reset();
      toast("Şifre güncellendi.");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        alert("Güvenlik nedeniyle şifre değiştirmeden önce çıkış yapıp tekrar giriş yapman gerekiyor.");
      } else {
        alert("Şifre güncellenemedi: " + err.message);
      }
    }
  });

  document.getElementById("resetDataBtn").addEventListener("click", async () => {
    if (!confirm("Profil, linkler ve portföy boş bir şablona döndürülecek. Bu herkese anında yansır. Emin misin?")) return;
    state = structuredClone(DEFAULT_DATA);
    renderProfileForm();
    renderLinksAdmin();
    renderPortfolioAdmin();
    await persist();
    toast("Boş şablona sıfırlandı.");
  });
}

/* ---------- Başlat ---------- */

initAuth();
