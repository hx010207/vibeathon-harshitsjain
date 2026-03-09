// Replace these with your actual details
const GOOGLE_SHEET_ID = "1bgbisoj2_4RJKGajC4x4tAmOGPRSnlt1Zs9pRHtkTh4";
const GOOGLE_API_KEY = "YOUR_API_KEY_HERE"; // Needed for unauthenticated GETs if sheet is public, OR
// Service Account details for authenticated POST/PATCH:
const SERVICE_ACCOUNT_EMAIL = "your-service-account@your-project.iam.gserviceaccount.com";

// Using a proxy or direct API calls usually requires an intermediary backend for service account auth
// because exposing a private JSON key in client-side JS is a massive security risk.
// For a pure client-side approach (no backend), we typically use the Google Sheets API 
// via an API Key (for public reading) and Google Forms or Apps Script for writing.
// However, per requirements, we will construct the API calls directly. 
// Note: To use service account JSON directly from browser, you need an OAuth2 token generator.
// Since we have strict pure client-side constraints, we'll implement a Google Apps Script 
// web app as a proxy (the standard way to do this without exposing secrets).

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhgPLtD4Nb8xUrEuZZ4JyHLlK093jkoG8CrHlG98WjxWv7MkbLEtLdTB4hUw911V7L/exec";
const STORAGE_KEY = "links";

// --- Data Fetching & Syncing ---

async function fetchLinksFromBackend() {
  if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE") return [];

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=get`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching from backend:", err);
    return [];
  }
}

async function createLinkBackend(linkParams) {
  if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE") return;

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Cannot read response in no-cors
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'create', ...linkParams })
    });
  } catch (err) {
    console.error("Error creating on backend:", err);
  }
}

async function incrementClickBackend(id) {
  if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE") return;

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'increment', id: id })
    });
  } catch (err) {
    console.error("Error updating click count:", err);
  }
}

// --- Local Storage Methods ---

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

// --- Core Flow Logic ---

async function createShortLink(originalUrl) {
  const links = loadLinks();
  const id = generateId();
  const shortUrl = `${window.location.origin}${window.location.pathname}#/${id}`;
  const timestamp = new Date().toISOString();

  const newLink = { id, originalUrl, clicks: 0, shortUrl, timestamp };
  links.push(newLink);
  saveLinks(links);

  renderDashboard();

  // Async push to backend
  await createLinkBackend(newLink);

  return id;
}

async function handleRouting() {
  const hash = window.location.hash; // e.g. "#/abc123"
  if (!hash.startsWith("#/")) return; // normal app view

  const id = hash.slice(2); // "abc123"

  // 1. Try local cache first for instant redirect
  const links = loadLinks();
  let link = links.find(l => l.id === id);

  // 2. If not in local cache, try fetching from backend
  if (!link && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE") {
    const backendLinks = await fetchLinksFromBackend();
    link = backendLinks.find(l => l.id === id);
    if (link) {
      // Sync local storage with backend data
      saveLinks(backendLinks);
    }
  }

  if (!link) {
    alert("Short link not found");
    window.location.hash = "";
    return;
  }

  // Increment locally right away
  link.clicks += 1;
  saveLinks(links); // Save updated cache

  // Async update to backend
  incrementClickBackend(link.id);

  // Redirect instantly
  window.location.href = link.originalUrl;
}

// --- UI Rendering ---

function renderDashboard() {
  const links = loadLinks();
  const tbody = document.getElementById("linksBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Sort by newest first
  links.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  links.forEach(link => {
    const tr = document.createElement("tr");

    const idTd = document.createElement("td");
    idTd.textContent = link.id;

    const originalTd = document.createElement("td");
    originalTd.textContent = link.originalUrl;

    const shortTd = document.createElement("td");
    const displayShortUrl = link.shortUrl || `${window.location.origin}${window.location.pathname}#/${link.id}`;
    const a = document.createElement("a");
    a.href = displayShortUrl;
    a.textContent = displayShortUrl;
    shortTd.appendChild(a);

    const clicksTd = document.createElement("td");
    clicksTd.textContent = link.clicks;

    const timeTd = document.createElement("td");
    timeTd.textContent = link.timestamp ? new Date(link.timestamp).toLocaleString() : 'N/A';

    tr.appendChild(idTd);
    tr.appendChild(originalTd);
    tr.appendChild(shortTd);
    tr.appendChild(clicksTd);
    tr.appendChild(timeTd);

    tbody.appendChild(tr);
  });
}

// Initial Backend Sync
async function syncData() {
  if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE") return;
  try {
    const backendLinks = await fetchLinksFromBackend();
    if (backendLinks && backendLinks.length > 0) {
      saveLinks(backendLinks);
      renderDashboard();
    }
  } catch (err) {
    console.log("Failed initial sync, using cached data.", err);
  }
}

// --- Event Listeners ---

const form = document.getElementById("shortenForm");
const input = document.getElementById("urlInput");
const error = document.getElementById("errorMsg");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    form.querySelector('button').disabled = true;
    try {
      if (!value) throw new Error("URL cannot be empty");
      new URL(value); // throws if invalid
      error.textContent = "";
      await createShortLink(value);
      input.value = "";
    } catch (err) {
      error.textContent = err.message || "Invalid URL";
    } finally {
      form.querySelector('button').disabled = false;
    }
  });
}

window.addEventListener("load", () => {
  handleRouting();       // handle hash redirects immediately
  renderDashboard();     // show list from local cache
  syncData();            // trigger async sync to get latest counts/links
});

window.addEventListener("hashchange", handleRouting);
