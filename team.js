const statusSelect = document.querySelector(".status-select");
const orderStorageKey = "writeright-order-WR-2048";
const submissionStorageKey = "writeright-submission-WR-2048";
const pricingStorageKey = "writeright-pricing";
const orderChannel = "BroadcastChannel" in window ? new BroadcastChannel("writeright-orders") : null;

function persistStatus(value) {
  try {
    localStorage.setItem(orderStorageKey, value);
  } catch {
    // The dashboard remains usable if browser storage is unavailable.
  }
  orderChannel?.postMessage({ key: orderStorageKey, status: value });
}

function renderTeamStatus(value) {
  if (!statusSelect) return;
  statusSelect.value = value;
  statusSelect.className = "status-select";
  if (["Homework completed", "Out for delivery", "Delivered"].includes(value)) {
    statusSelect.classList.add("is-complete");
  }
}

function renderSubmission(submission) {
  if (!submission) return;
  document.querySelector("#team-customer-name").textContent = submission.name;
  document.querySelector("#team-customer-phone").textContent = submission.phone;
  document.querySelector("#team-homework-summary").textContent = `${submission.subject} · ${submission.grade}`;
  document.querySelector("#team-file-summary").textContent = `${submission.pages} · ${submission.files.length} file${submission.files.length === 1 ? "" : "s"}`;
  document.querySelector("#team-detail-title").textContent = `${submission.subject} homework · ${submission.grade}`;
  document.querySelector("#team-homework-text").textContent = submission.text || "No pasted text. Review the uploaded files below.";
  document.querySelector("#team-files").textContent = `${submission.files.length} file${submission.files.length === 1 ? "" : "s"} · ${submission.colour} ink · ${submission.style} handwriting`;
  document.querySelector("#team-instructions").textContent = submission.instructions;
}

function readSubmission() {
  try {
    const saved = localStorage.getItem(submissionStorageKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

async function loadPricing() {
  try {
    const response = await fetch("/api/settings");
    if (!response.ok) throw new Error("Unable to load pricing.");
    const { settings } = await response.json();
    document.querySelector("#delivery-charge").value = settings.delivery_charge;
    document.querySelector("#delivery-estimate").value = settings.delivery_estimate;
  } catch {
    // Keep the editable default visible in local preview mode.
  }
}

statusSelect?.addEventListener("change", (event) => {
  persistStatus(event.target.value);
  renderTeamStatus(event.target.value);
});

document.querySelector("#save-pricing")?.addEventListener("click", async () => {
  const message = document.querySelector("#pricing-message");
  const deliveryCharge = Number(document.querySelector("#delivery-charge").value);
  const deliveryEstimate = document.querySelector("#delivery-estimate").value.trim();
  if (!Number.isFinite(deliveryCharge) || deliveryCharge < 0 || !deliveryEstimate) {
    message.textContent = "Enter a valid charge and delivery estimate.";
    message.focus();
    return;
  }
  message.textContent = "Saving…";
  try {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagePrice: 20, deliveryCharge, deliveryEstimate })
    });
    if (!response.ok) throw new Error("Unable to save pricing.");
    message.textContent = "Delivery charge updated.";
    const pricing = { pagePrice: 20, deliveryCharge, deliveryEstimate };
    localStorage.setItem(pricingStorageKey, JSON.stringify(pricing));
    orderChannel?.postMessage({ key: "writeright-pricing-updated", pricing });
  } catch {
    const pricing = { pagePrice: 20, deliveryCharge, deliveryEstimate };
    localStorage.setItem(pricingStorageKey, JSON.stringify(pricing));
    orderChannel?.postMessage({ key: "writeright-pricing-updated", pricing });
    message.textContent = "Saved for this browser. Connect team authentication for shared production pricing.";
  }
});

try {
  renderTeamStatus(localStorage.getItem(orderStorageKey) || "Work in progress");
} catch {
  renderTeamStatus("Work in progress");
}
loadPricing();
renderSubmission(readSubmission());
orderChannel?.addEventListener("message", (event) => {
  if (event.data?.key === submissionStorageKey) renderSubmission(event.data.submission);
});
window.setInterval(() => renderSubmission(readSubmission()), 1000);
