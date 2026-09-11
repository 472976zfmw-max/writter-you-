import { createClient } from "@supabase/supabase-js";

export function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export async function requireTeam(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const allowed = (process.env.TEAM_EMAILS || "").split(",").map((email) => email.trim()).filter(Boolean);
  if (!token || !allowed.length) return false;
  const { data, error } = await adminClient().auth.getUser(token);
  return !error && Boolean(data.user?.email && allowed.includes(data.user.email));
}
