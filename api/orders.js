import { adminClient, json, readJson } from "./_lib/supabase.js";

function orderNumber() {
  return `WR-${Date.now().toString().slice(-6)}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  try {
    const body = await readJson(req);
    const required = ["name", "phone", "address", "area", "pincode"];
    const missing = required.filter((key) => !String(body[key] || "").trim());
    if (missing.length) return json(res, 400, { error: `Missing fields: ${missing.join(", ")}.` });

    const pages = Number.isFinite(Number(body.pages)) ? Number(body.pages) : null;
    const supabase = adminClient();
    const { data: settings, error: settingsError } = await supabase.from("site_settings").select("page_price,delivery_charge").eq("id", 1).single();
    if (settingsError) throw settingsError;
    const writingCharge = pages ? pages * Number(settings.page_price) : 0;
    const deliveryCharge = Number(settings.delivery_charge);
    const total = writingCharge + deliveryCharge;
    const { data, error } = await supabase.from("orders").insert({
      order_number: orderNumber(),
      customer_name: body.name.trim(),
      mobile: body.phone.trim(),
      email: body.email?.trim() || null,
      address: body.address.trim(),
      area: body.area.trim(),
      pincode: body.pincode.trim(),
      homework_text: body.text?.trim() || null,
      subject: body.subject?.trim() || null,
      grade: body.grade?.trim() || null,
      pages,
      colour: body.colour || "Blue",
      handwriting_style: body.style || "Neat & clear",
      instructions: body.instructions?.trim() || null,
      writing_charge: writingCharge,
      delivery_charge: deliveryCharge,
      total
    }).select("id,order_number,status,total,payment_status,created_at").single();
    if (error) throw error;
    await supabase.from("order_history").insert({ order_id: data.id, status: "order_placed", note: "Order submitted by customer." });
    return json(res, 201, { order: data });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
