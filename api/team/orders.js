import { adminClient, json, readJson, requireTeam } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (!(await requireTeam(req))) return json(res, 401, { error: "Team authentication required." });
  try {
    const supabase = adminClient();
    if (req.method === "GET") {
      const { data, error } = await supabase.from("orders").select("*, order_files(*), order_history(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return json(res, 200, { orders: data });
    }
    if (req.method === "PATCH") {
      const body = await readJson(req);
      const allowed = ["order_placed", "work_in_progress", "homework_completed", "out_for_delivery", "delivered"];
      if (!allowed.includes(body.status)) return json(res, 400, { error: "Invalid order status." });
      const { data, error } = await supabase.from("orders").update({ status: body.status, internal_notes: body.internalNotes || null }).eq("order_number", body.orderNumber).select().single();
      if (error) throw error;
      await supabase.from("order_history").insert({ order_id: data.id, status: body.status, note: body.note || "Status updated by team." });
      return json(res, 200, { order: data });
    }
    return json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
