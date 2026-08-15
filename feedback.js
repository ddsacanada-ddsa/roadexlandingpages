const FEEDBACK_API = "https://voqihvndfluffzhyjlgp.supabase.co/functions/v1/feedback";
const TOKEN_KEY = "roadex_feedback_token";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function api(payload) {
  const response = await fetch(FEEDBACK_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Roadex feedback is temporarily unavailable.");
  return data;
}

function setStatus(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle("is-error", error);
}

function extractToken(value) {
  const match = String(value || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return match ? match[0] : "";
}

function showTab(name) {
  $$('[data-feedback-view]').forEach((view) => { view.hidden = view.dataset.feedbackView !== name; });
  $$('[data-feedback-tab]').forEach((tab) => { const active = tab.dataset.feedbackTab === name; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", String(active)); });
}

function trackingUrl(token) { return `${location.origin}/feedback?ticket=${encodeURIComponent(token)}`; }

async function openThread(token) {
  const normalized = extractToken(token);
  const lookupStatus = $('[data-lookup-status]');
  if (!normalized) return setStatus(lookupStatus, "Paste a valid private feedback code or link.", true);
  setStatus(lookupStatus, "Loading your conversation…");
  try {
    const data = await api({ action: "read", token: normalized });
    localStorage.setItem(TOKEN_KEY, normalized);
    $('[data-lookup-form] input[name="token"]').value = normalized;
    renderThread(data);
    setStatus(lookupStatus, "");
    history.replaceState({}, "", `/feedback?ticket=${encodeURIComponent(normalized)}`);
  } catch (error) { setStatus(lookupStatus, error.message, true); }
}

function renderThread(data) {
  const thread = data.thread;
  $('[data-feedback-thread]').hidden = false;
  $('[data-thread-reference]').textContent = `#${thread.reference}`;
  const status = $('[data-thread-status]');
  status.textContent = thread.status;
  status.dataset.status = thread.status;
  $('[data-message-list]').innerHTML = data.messages.map((message) => `<div class="thread-message ${message.author === "roadex" ? "is-roadex" : "is-tester"}"><div><strong>${message.author === "roadex" ? "ROADEX TEAM" : "YOU"}</strong><time>${new Date(message.created_at).toLocaleString()}</time></div><p>${escapeHtml(message.body)}</p></div>`).join("");
  $('[data-feedback-thread]').scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

$$('[data-feedback-tab]').forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.feedbackTab)));

$('[data-feedback-form]').addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);
  const status = $('[data-form-status]');
  button.disabled = true; setStatus(status, "Sending securely…");
  const fields = new FormData(form);
  try {
    const data = await api({ action: "create", displayName: fields.get("displayName"), email: fields.get("email"), category: fields.get("category"), message: fields.get("message"), website: fields.get("website") });
    if (!data.token) throw new Error("Please retry your submission.");
    localStorage.setItem(TOKEN_KEY, data.token);
    $('[data-feedback-reference]').textContent = `#${data.reference}`;
    $('[data-feedback-success]').dataset.token = data.token;
    form.hidden = true; $('[data-feedback-success]').hidden = false;
  } catch (error) { setStatus(status, error.message, true); button.disabled = false; }
});

$('[data-copy-link]').addEventListener("click", async () => {
  const token = $('[data-feedback-success]').dataset.token;
  await navigator.clipboard.writeText(trackingUrl(token));
  $('[data-copy-link] span').textContent = "Tracking link copied";
});

$('[data-open-thread]').addEventListener("click", () => { const token = $('[data-feedback-success]').dataset.token; showTab("track"); void openThread(token); });
$('[data-lookup-form]').addEventListener("submit", (event) => { event.preventDefault(); void openThread(new FormData(event.currentTarget).get("token")); });
$('[data-follow-up-form]').addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget; const status = $('[data-follow-up-status]'); const token = localStorage.getItem(TOKEN_KEY); const message = new FormData(form).get("message");
  setStatus(status, "Sending…");
  try { const data = await api({ action: "follow-up", token, message }); form.reset(); renderThread(data); setStatus(status, "Sent."); } catch (error) { setStatus(status, error.message, true); }
});

const initialToken = extractToken(new URLSearchParams(location.search).get("ticket")) || localStorage.getItem(TOKEN_KEY);
if (initialToken) { showTab("track"); void openThread(initialToken); }
