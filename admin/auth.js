import { isSupabaseConfigured } from "../cms.js";

const config = window.__PORTFOLIO_CONFIG__ || {};
const invalidLink = "This link is invalid or expired. Request a new invitation or password reset.";

async function request(path, { token, method = "GET", body } = {}) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const response = await fetch(`${config.supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token || config.supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return response;
}

export function consumeAuthLink(location = window.location, history = window.history) {
  const params = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  if (!params.has("access_token") && !params.has("error") && !params.has("error_description") && !params.has("type") && !query.has("code") && !query.has("error")) return null;
  // Remove credentials before any asynchronous request; keep tokens only in memory.
  history.replaceState(null, "", location.pathname);
  const type = params.get("type");
  if (params.has("error") || params.has("error_description") || !["invite", "recovery"].includes(type) || !params.get("access_token")) {
    throw new Error(invalidLink);
  }
  return { type, token: params.get("access_token") };
}

export async function verifyAdminToken(token) {
  const response = await request("/auth/v1/user", { token });
  if (!response.ok) throw new Error(invalidLink);
  const user = await response.json();
  if (!user.id || !user.email || !user.email_confirmed_at) throw new Error(invalidLink);
  const check = await request(`/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`, { token });
  if (!check.ok) throw new Error("Unable to verify administrator access. Contact the seller.");
  const rows = await check.json();
  if (!Array.isArray(rows) || !rows.some((row) => row.user_id === user.id)) {
    throw new Error("Administrator access has not been granted. Contact the seller, then reopen your link.");
  }
  return user;
}

export async function setAccountPassword(token, password) {
  if (password.length < 12) throw new Error("Use at least 12 characters for your password.");
  await verifyAdminToken(token);
  const response = await request("/auth/v1/user", { method: "PUT", token, body: { password } });
  if (!response.ok) throw new Error("Password could not be saved. Follow the password requirements or request a new link.");
  // Revoke refresh sessions after recovery. Existing access JWTs expire normally.
  try { await request("/auth/v1/logout?scope=global", { method: "POST", token }); } catch { /* Password was saved; do not prompt a duplicate update. */ }
}

export async function requestPasswordReset(email) {
  const redirect = new URL("./", window.location.href);
  redirect.hash = "";
  redirect.search = "";
  const response = await request(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirect.href)}`, {
    method: "POST", body: { email: email.trim() },
  });
  // Do not expose whether an email is registered, including provider error details.
  if (response.status === 429) throw new Error("Too many requests. Please try again later.");
  if (response.status >= 500) throw new Error("Email service is unavailable. Please try again later.");
}
