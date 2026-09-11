const fileInput = document.querySelector("#file-upload");
const fileList = document.querySelector("#file-list");
const orderStorageKey = "writeright-order-WR-2048";
const submissionStorageKey = "writeright-submission-WR-2048";
const orderStatuses = ["Order placed", "Work in progress", "Homework completed", "Out for delivery", "Delivered"];
const orderChannel = "BroadcastChannel" in window ? new BroadcastChannel("writeright-orders") : null;

function readOrderStatus() {
  try {
    const saved = localStorage.getItem(orderStorageKey);
    return orderStatuses.includes(saved) ? saved : "Work in progress";
  } catch {
    return "Work in progress";
  }
}

function renderCustomerStatus(value) {
  const currentIndex = orderStatuses.indexOf(value);
  const status = document.querySelector("#customer-status");
  const pill = document.querySelector(".status-pill");
  const statusNodes = document.querySelectorAll(".status-node");
  const connectors = document.querySelectorAll(".status-connector");
  if (!status || !pill) return;

  status.textContent = value === "Homework completed" ? "Your homework writing is completed." : `Your homework is ${value.toLowerCase()}.`;
  pill.textContent = value.toUpperCase();
  statusNodes.forEach((node, index) => {
    node.classList.toggle("done", index < currentIndex);
    node.classList.toggle("current", index === currentIndex);
    const marker = node.querySelector("span");
    if (marker) marker.textContent = index < currentIndex ? "✓" : String(index + 1);
  });
  connectors.forEach((connector, index) => connector.classList.toggle("done", index < currentIndex));
}

function saveOrderStatus(value) {
  try {
    localStorage.setItem(orderStorageKey, value);
  } catch {
    // The UI still updates for this tab if storage is unavailable.
  }

  function saveSubmission() {
    const selectedStyle = document.querySelector(".style-card.selected strong")?.textContent || "Neat & clear";
    const submission = {
      name: document.querySelector('[name="name"]')?.value.trim() || "New customer",
      phone: document.querySelector('[name="phone"]')?.value.trim() || "Not provided",
      text: document.querySelector("#homework-text")?.value.trim() || "",
      subject: document.querySelector("#subject")?.value.trim() || "Homework",
      grade: document.querySelector("#grade")?.value.trim() || "Grade not provided",
      pages: document.querySelector("#pages")?.value.trim() || "Page count unknown",
      colour: document.querySelector("#colour")?.value || "Blue",
      style: selectedStyle,
      instructions: document.querySelector("#instructions")?.value.trim() || "No special instructions.",
      files: [...(fileInput?.files || [])].map((file) => file.name),
    };
    try {
      localStorage.setItem(submissionStorageKey, JSON.stringify(submission));
    } catch {
      // The submission remains visible in the customer tab if storage is unavailable.
    }
    orderChannel?.postMessage({ key: submissionStorageKey, submission });
    return submission;
  }

  async function createLiveOrder(submission) {
    const form = document.querySelector("#customer-form");
    const payload = {
      ...submission,
      email: form.querySelector('[name="email"]')?.value || "",
      address: form.querySelector('[name="address"]')?.value || "",
      area: form.querySelector('[name="area"]')?.value || "",
      pincode: form.querySelector('[name="pincode"]')?.value || ""
    };
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("The order could not be saved.");
    return response.json();
  }
}

function renderFiles(files) {
  fileList.innerHTML = "";
  [...files].forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "file-row";
    const extension = file.name.split(".").pop().toUpperCase().slice(0, 4);
    row.innerHTML = `<span class="file-type">${extension}</span><span>${file.name}</span><small>${Math.max(1, Math.round(file.size / 1024))} KB</small><button type="button" aria-label="Remove ${file.name}" data-index="${index}">×</button>`;
    fileList.appendChild(row);
  });
}

fileInput.addEventListener("change", (event) => renderFiles(event.target.files));
fileList.addEventListener("click", (event) => {
  if (!event.target.matches("button")) return;
  const files = [...fileInput.files].filter((_, index) => index !== Number(event.target.dataset.index));
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  fileInput.files = transfer.files;
  renderFiles(fileInput.files);
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab, .tab-panel").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}-panel`).classList.add("active");
  });
});

document.querySelectorAll(".style-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".style-card").forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    card.querySelector("input").checked = true;
  });
});

document.querySelector("#continue-order").addEventListener("click", async () => {
  const form = document.querySelector("#customer-form");
  if (!form.reportValidity()) return;
  const submission = saveSubmission();
  const button = document.querySelector("#continue-order");
  button.disabled = true;
  button.innerHTML = "Saving your order…";
  try {
    const result = await createLiveOrder(submission);
    if (result.order?.order_number) {
      localStorage.setItem(orderStorageKey, "Order placed");
      document.querySelector("#track-form input").value = result.order.order_number;
    }
  } catch {
    // Static preview mode continues to work when the API is not configured.
  } finally {
    button.disabled = false;
    button.innerHTML = "Continue to homework <span>→</span>";
  }
  document.querySelector("#submission").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#track-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const orderNumber = event.currentTarget.querySelector("input").value.trim();
  const mobile = event.currentTarget.querySelectorAll("input")[1].value.trim();
  const message = document.querySelector("#track-message");
  message.textContent = "Order found. Showing the latest update below.";
  document.querySelector("#status-card").scrollIntoView({ behavior: "smooth", block: "center" });
  fetch(`/api/orders/${encodeURIComponent(orderNumber)}?mobile=${encodeURIComponent(mobile)}`)
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Order not found.")))
    .then(({ order }) => {
      const statusMap = { order_placed: "Order placed", work_in_progress: "Work in progress", homework_completed: "Homework completed", out_for_delivery: "Out for delivery", delivered: "Delivered" };
      renderCustomerStatus(statusMap[order.status] || "Order placed");
      message.textContent = `Order ${order.order_number} found.`;
    })
    .catch(() => {
      message.textContent = "Showing the saved demo order. Connect Supabase to enable live tracking.";
    });
});

renderCustomerStatus(readOrderStatus());
window.addEventListener("storage", (event) => {
  if (event.key === orderStorageKey) renderCustomerStatus(readOrderStatus());
});
orderChannel?.addEventListener("message", (event) => {
  if (event.data?.key === orderStorageKey) renderCustomerStatus(event.data.status);
});
window.setInterval(() => renderCustomerStatus(readOrderStatus()), 1000);
