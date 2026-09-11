const statusSelect = document.querySelector(".status-select");
const orderStorageKey = "writeright-order-WR-2048";
const submissionStorageKey = "writeright-submission-WR-2048";
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
  statusSelect.value = value;
  statusSelect.className = "status-select";
  if (value === "Homework completed" || value === "Out for delivery" || value === "Delivered") {
    statusSelect.classList.add("is-complete");
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
}

statusSelect.addEventListener("change", (event) => {
  persistStatus(event.target.value);
  renderTeamStatus(event.target.value);
});

try {
  renderTeamStatus(localStorage.getItem(orderStorageKey) || "Work in progress");
} catch {
  renderTeamStatus("Work in progress");
}
renderSubmission(readSubmission());
orderChannel?.addEventListener("message", (event) => {
  if (event.data?.key === submissionStorageKey) renderSubmission(event.data.submission);
});
window.setInterval(() => renderSubmission(readSubmission()), 1000);
