const STORAGE_KEY = "links";

function loadLinks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveLinks(links) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

function createShortLink(originalUrl) {
  const links = loadLinks();
  const id = generateId();
  links.push({ id, originalUrl, clicks: 0 });
  saveLinks(links);
  renderDashboard();
  return id;
}

function handleRouting() {
  const hash = window.location.hash; // e.g. "#/abc123"
  if (!hash.startsWith("#/")) return; // normal app view

  const id = hash.slice(2); // "abc123"
  const links = loadLinks();
  const link = links.find(l => l.id === id);
  if (!link) {
    alert("Short link not found");
    window.location.hash = "";
    return;
  }

  link.clicks += 1;
  saveLinks(links);
  window.location.href = link.originalUrl; // redirect
}

function renderDashboard() {
  const links = loadLinks();
  const tbody = document.getElementById("linksBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  links.forEach(link => {
    const tr = document.createElement("tr");

    const originalTd = document.createElement("td");
    originalTd.textContent = link.originalUrl;

    const shortTd = document.createElement("td");
    const shortUrl = `${window.location.origin}${window.location.pathname}#/${link.id}`;
    const a = document.createElement("a");
    a.href = shortUrl;
    a.textContent = shortUrl;
    shortTd.appendChild(a);

    const clicksTd = document.createElement("td");
    clicksTd.textContent = link.clicks;

    tr.appendChild(originalTd);
    tr.appendChild(shortTd);
    tr.appendChild(clicksTd);
    tbody.appendChild(tr);
  });
}

const form = document.getElementById("shortenForm");
const input = document.getElementById("urlInput");
const error = document.getElementById("errorMsg");

if (form) {
  form.addEventListener("submit", e => {
    e.preventDefault();
    const value = input.value.trim();
    try {
      if (!value) throw new Error("URL cannot be empty");
      new URL(value); // throws if invalid
      error.textContent = "";
      const id = createShortLink(value);
      input.value = "";
    } catch (err) {
      error.textContent = err.message || "Invalid URL";
    }
  });
}

window.addEventListener("load", () => {
  handleRouting();       // in case user opens with hash
  renderDashboard();     // show list
});

window.addEventListener("hashchange", handleRouting);
