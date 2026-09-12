import { adminClient, json, requireCustomer } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });
  try {
    const user = await requireCustomer(req);
    if (!user) return json(res, 401, { error: "Please sign in to view your orders." });
    const { data, error } = await adminClient()
      .from("orders")
      .select("id,order_number,subject,grade,pages,handwriting_style,colour,status,total,payment_status,created_at,updated_at,order_history(status,note,created_at)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return json(res, 200, { orders: data });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
