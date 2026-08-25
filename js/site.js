import { SITE_DOC, onSnapshot } from "./firebase.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]).join("").toUpperCase();
}

function renderProfile(profile) {
  document.title = (profile.name || "Kişisel Link Sayfam") + (profile.title ? " — " + profile.title : "");
  document.getElementById("profileName").textContent = profile.name || "";
  document.getElementById("profileTitle").textContent = profile.title || "";
  document.getElementById("profileBio").textContent = profile.bio || "";

  const avatarEl = document.getElementById("avatar");
  if (profile.avatar) {
    avatarEl.style.backgroundImage = `url("${profile.avatar}")`;
    avatarEl.textContent = "";
  } else {
    avatarEl.style.backgroundImage = "";
    avatarEl.textContent = initials(profile.name);
  }
}

function applyTheme(theme) {
  const accent = (theme && theme.accent) || "#7c5cff";
  document.documentElement.style.setProperty("--accent", accent);
}

function renderLinks(links) {
  const container = document.getElementById("linksList");
  container.innerHTML = "";
  if (!links || links.length === 0) {
    container.innerHTML = '<p class="empty-hint">Henüz link eklenmedi.</p>';
    return;
  }
  links.forEach(link => {
    const a = document.createElement("a");
    a.className = "link-btn";
    a.href = link.url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `
      <span class="link-icon">${window.getPlatformIcon(link.platform)}</span>
      <span class="link-title">${escapeHtml(link.title)}</span>
    `;
    container.appendChild(a);
  });
}

function renderPortfolio(items) {
  const section = document.getElementById("portfolioSection");
  const grid = document.getElementById("portfolioGrid");
  grid.innerHTML = "";
  if (!items || items.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";
  items.forEach(item => {
    const card = document.createElement(item.url ? "a" : "div");
    card.className = "portfolio-card";
    if (item.url) {
      card.href = item.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    }
    const imgHtml = item.image
      ? `<div class="portfolio-image" style="background-image:url('${item.image}')"></div>`
      : `<div class="portfolio-image portfolio-image--placeholder">🖼️</div>`;
    card.innerHTML = `
      ${imgHtml}
      <div class="portfolio-body">
        <h3 class="portfolio-title">${escapeHtml(item.title)}</h3>
        <p class="portfolio-desc">${escapeHtml(item.description)}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderEmptyState() {
  document.getElementById("profileName").textContent = "Site henüz hazırlanıyor";
  document.getElementById("profileTitle").textContent = "";
  document.getElementById("profileBio").textContent = "Yönetici panelinden içerik eklendiğinde burası güncellenecek.";
  document.getElementById("linksList").innerHTML = "";
  document.getElementById("portfolioSection").style.display = "none";
}

onSnapshot(
  SITE_DOC,
  (snap) => {
    if (!snap.exists()) {
      renderEmptyState();
      return;
    }
    const data = snap.data();
    applyTheme(data.theme);
    renderProfile(data.profile || {});
    renderLinks(data.links || []);
    renderPortfolio(data.portfolio || []);
  },
  (err) => {
    console.error(err);
    document.getElementById("profileName").textContent = "Veri yüklenemedi";
    document.getElementById("profileBio").textContent = err.message || "";
  }
);
