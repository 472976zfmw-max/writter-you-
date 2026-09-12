import { json } from "../_lib/supabase.js";

export default function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return json(res, 500, { error: "Supabase Auth is not configured." });
  return json(res, 200, { url, anonKey });
}
