import { adminClient, json, readJson, requireTeam } from "./_lib/supabase.js";

export default async function handler(req, res) {
  try {
    const supabase = adminClient();
    if (req.method === "GET") {
      const { data, error } = await supabase.from("site_settings").select("page_price,delivery_charge,delivery_estimate").eq("id", 1).single();
      if (error) throw error;
      return json(res, 200, { settings: data });
    }
    if (req.method !== "PATCH" || !(await requireTeam(req))) return json(res, 401, { error: "Team authentication required." });
    const body = await readJson(req);
    const pagePrice = Number(body.pagePrice);
    const deliveryCharge = Number(body.deliveryCharge);
    const deliveryEstimate = String(body.deliveryEstimate || "").trim();
    if (!Number.isFinite(pagePrice) || pagePrice < 0 || !Number.isFinite(deliveryCharge) || deliveryCharge < 0 || !deliveryEstimate) {
      return json(res, 400, { error: "Enter valid prices and a delivery estimate." });
    }
    const { data, error } = await supabase.from("site_settings").update({ page_price: pagePrice, delivery_charge: deliveryCharge, delivery_estimate: deliveryEstimate }).eq("id", 1).select("page_price,delivery_charge,delivery_estimate").single();
    if (error) throw error;
    return json(res, 200, { settings: data });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
