import { adminClient, json, requireCustomer } from "../_lib/supabase.js";

export default async function handler(req, res) {
  const orderNumber = req.query.orderId;
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });
  try {
    const customer = await requireCustomer(req);
    if (!customer) return json(res, 401, { error: "Please sign in to view this order." });
    const supabase = adminClient();
    let query = supabase.from("orders").select("*, order_files(*), order_history(*)").eq("order_number", orderNumber).eq("customer_id", customer.id).single();
    const { data, error } = await query;
    if (error || !data) return json(res, 404, { error: "Order not found." });
    return json(res, 200, { order: data });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
