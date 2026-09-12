(() => {
  const forms = document.querySelector("#auth-forms");
  const dashboard = document.querySelector("#account-dashboard");
  const message = document.querySelector("#auth-message");
  const accountLink = document.querySelector("#account-link");
  let client;
  let currentUser;

  function showMessage(text, error = false) {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle("is-error", error);
  }

  async function setup() {
    try {
      const response = await fetch("/api/auth/config");
      if (!response.ok) throw new Error("Account sign-in is not configured yet.");
      const config = await response.json();
      client = window.supabase.createClient(config.url, config.anonKey);
      client.auth.onAuthStateChange((event, session) => {
        renderUser(session?.user || null);
        if (event === "PASSWORD_RECOVERY") document.querySelector("#recovery-form").hidden = false;
      });
      const { data } = await client.auth.getSession();
      renderUser(data.session?.user || null);
    } catch (error) {
      showMessage(error.message, true);
    }
  }

  function renderUser(user) {
    currentUser = user;
    if (!user) {
      forms.hidden = false;
      dashboard.hidden = true;
      accountLink.textContent = "Sign in";
      return;
    }
    forms.hidden = true;
    dashboard.hidden = false;
    accountLink.textContent = "My account";
    document.querySelector("#account-name").textContent = user.user_metadata?.full_name || "Your account";
    document.querySelector("#account-email").textContent = user.email || "";
    loadHistory();
  }

  async function loadHistory() {
    const token = await getAccessToken();
    const response = await fetch("/api/customer/orders", { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("We could not load your order history.");
    const { orders } = await response.json();
    const history = document.querySelector("#order-history");
    document.querySelector("#history-count").textContent = `${orders.length} ${orders.length === 1 ? "order" : "orders"}`;
    history.innerHTML = "";
    if (!orders.length) {
      history.innerHTML = '<p class="empty-history">Your completed and current orders will appear here.</p>';
      return;
    }
    orders.forEach((order) => {
      const card = document.createElement("article");
      card.className = "history-card";
      const identity = document.createElement("div");
      const number = document.createElement("strong");
      number.textContent = order.order_number;
      const date = document.createElement("small");
      date.textContent = new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" });
      identity.append(number, date);
      const details = document.createElement("div");
      const status = document.createElement("span");
      status.className = "history-status";
      status.textContent = order.status.replaceAll("_", " ");
      const subject = document.createElement("small");
      subject.textContent = `${order.subject || "Homework"} · ${order.pages || "Pages"} pages`;
      details.append(status, subject);
      const total = document.createElement("strong");
      total.textContent = `₹${Number(order.total).toFixed(0)}`;
      card.append(identity, details, total);
      history.appendChild(card);
    });
  }

  async function getAccessToken() {
    const { data } = await client.auth.getSession();
    return data.session?.access_token || "";
  }

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach((item) => item.classList.toggle("active", item === tab));
      document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.authPanel !== tab.dataset.authView;
      });
      showMessage("");
    });
  });

  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const { error } = await client.auth.signInWithPassword({ email: data.get("email"), password: data.get("password") });
    showMessage(error ? error.message : "Welcome back.");
    if (error) showMessage(error.message, true);
  });

  document.querySelector("#signup-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const { data: result, error } = await client.auth.signUp({
      email: data.get("email"),
      password: data.get("password"),
      options: { data: { full_name: data.get("name") } }
    });
    if (error) return showMessage(error.message, true);
    showMessage(result.session ? "Account created. You are signed in." : "Account created. Check your email to confirm it.");
  });

  document.querySelector("#reset-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const { error } = await client.auth.resetPasswordForEmail(data.get("email"), { redirectTo: `${window.location.origin}/#account` });
    showMessage(error ? error.message : "If that email exists, a password reset link is on its way.", Boolean(error));
  });

  document.querySelector("#sign-out").addEventListener("click", async () => {
    await client.auth.signOut();
    showMessage("You have been signed out.");
  });

  document.querySelector("#recovery-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    const { error } = await client.auth.updateUser({ password });
    showMessage(error ? error.message : "Your password has been updated.", Boolean(error));
    if (!error) event.currentTarget.hidden = true;
  });

  window.writerightAuth = { getAccessToken, getUser: () => currentUser };
  setup();
})();
