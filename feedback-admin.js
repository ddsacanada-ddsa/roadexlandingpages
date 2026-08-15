const FEEDBACK_API = "https://voqihvndfluffzhyjlgp.supabase.co/functions/v1/feedback";
const ADMIN_KEY = "roadex_feedback_admin";
const $ = (selector, root = document) => root.querySelector(selector);

async function adminApi(payload) {
  const key = sessionStorage.getItem(ADMIN_KEY) || "";
  const response = await fetch(FEEDBACK_API, { method: "POST", headers: { "Content-Type": "application/json", "x-roadex-feedback-key": key }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Feedback desk is unavailable.");
  return data;
}

function setStatus(element, message, error = false) { element.textContent = message; element.classList.toggle("is-error", error); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }

async function loadDesk() {
  const status = $('[data-desk-status]'); setStatus(status, "Loading feedback…");
  try {
    const data = await adminApi({ action: "admin-list" });
    $('[data-admin-login]').hidden = true; $('[data-admin-desk]').hidden = false;
    const list = $('[data-admin-thread-list]');
    if (!data.threads.length) list.innerHTML = '<div class="empty-feedback"><strong>Inbox clear.</strong><span>New tester feedback will appear here.</span></div>';
    else list.innerHTML = data.threads.map(renderAdminThread).join("");
    setStatus(status, `${data.threads.length} feedback thread${data.threads.length === 1 ? "" : "s"}`);
  } catch (error) {
    sessionStorage.removeItem(ADMIN_KEY); $('[data-admin-login]').hidden = false; $('[data-admin-desk]').hidden = true;
    setStatus($('[data-admin-status]'), error.message, true);
  }
}

function renderAdminThread(thread) {
  const messages = (thread.roadex_feedback_messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return `<article class="admin-thread" data-token="${thread.public_token}"><header><div><span class="category">${escapeHtml(thread.category)}</span><h3>${escapeHtml(thread.display_name)} <small>#${thread.public_token.slice(0, 8).toUpperCase()}</small></h3><p>${escapeHtml(thread.email || "No email supplied")}</p></div><span class="thread-status" data-status="${thread.status}">${thread.status}</span></header><div class="message-list">${messages.map((message) => `<div class="thread-message ${message.author === "roadex" ? "is-roadex" : "is-tester"}"><div><strong>${message.author === "roadex" ? "ROADEX" : "TESTER"}</strong><time>${new Date(message.created_at).toLocaleString()}</time></div><p>${escapeHtml(message.body)}</p></div>`).join("")}</div><form class="admin-reply-form"><textarea name="message" minlength="2" maxlength="3000" required placeholder="Write a Roadex reply…"></textarea><div><select name="status"><option value="replied">Reply and mark replied</option><option value="closed">Reply and close</option></select><button class="feedback-submit" type="submit"><span>Send reply</span><b>↗</b></button></div><p class="form-status"></p></form></article>`;
}

$('[data-admin-key-form]').addEventListener("submit", (event) => { event.preventDefault(); sessionStorage.setItem(ADMIN_KEY, new FormData(event.currentTarget).get("key")); void loadDesk(); });
$('[data-refresh]').addEventListener("click", () => void loadDesk());
$('[data-lock]').addEventListener("click", () => { sessionStorage.removeItem(ADMIN_KEY); $('[data-admin-desk]').hidden = true; $('[data-admin-login]').hidden = false; $('[data-admin-key-form]').reset(); });
$('[data-admin-thread-list]').addEventListener("submit", async (event) => {
  if (!event.target.matches('.admin-reply-form')) return;
  event.preventDefault(); const form = event.target; const article = form.closest('[data-token]'); const fields = new FormData(form); const status = $('.form-status', form); const button = $('button', form);
  button.disabled = true; setStatus(status, "Sending reply…");
  try { await adminApi({ action: "admin-reply", token: article.dataset.token, message: fields.get("message") }); if (fields.get("status") === "closed") await adminApi({ action: "admin-status", token: article.dataset.token, status: "closed" }); await loadDesk(); } catch (error) { setStatus(status, error.message, true); button.disabled = false; }
});

if (sessionStorage.getItem(ADMIN_KEY)) void loadDesk();
