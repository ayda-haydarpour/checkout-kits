// === Admin Panel Script ===
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbx4q2itQ2IdX6LvvXUoGidQeViNd846hzq-Eit55E31EWKxrrZHZrsitRuN48YJvaeE/exec"; // replace with your web app URL
const ADMIN_KEY = "admin-2025-ayda"; // same as backend

const loginSection = document.querySelector("#login-section");
const panel = document.querySelector("#panel");
const passInput = document.querySelector("#admin-pass");
const loginBtn = document.querySelector("#login-btn");
const logoutBtn = document.querySelector("#logout-btn");
const form = document.querySelector("#add-kit-form");
const kitList = document.querySelector("#kit-list");
const refreshBtn = document.querySelector("#refresh-btn");

function showPanel() {
  loginSection.classList.add("hidden");
  panel.classList.remove("hidden");
  localStorage.setItem("isAdmin", "true");
  loadKits();
}
if (localStorage.getItem("isAdmin") === "true") showPanel();

loginBtn.addEventListener("click", () => {
  if (passInput.value === ADMIN_KEY) showPanel();
  else alert("Incorrect password.");
});
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("isAdmin");
  location.reload();
});

async function loadKits() {
  kitList.innerHTML = "<p>Loading...</p>";
  try {
    const res = await fetch(`${BACKEND_URL}?route=kits`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    renderKits(json.data);
  } catch (err) {
    kitList.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}
function renderKits(kits) {
  kitList.innerHTML = kits
    .map(
      (k) => `
      <article>
        <b>${k.kit_id}</b> – ${k.name}<br>
        <small>${k.category || "—"}, Qty: ${k.total_qty}</small>
      </article>`
    )
    .join("");
}
refreshBtn.addEventListener("click", loadKits);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const body = Object.fromEntries(fd.entries());
  body.route = "admin/addkit";
  body.key = ADMIN_KEY;
  body.active = body.active === "on" ? "true" : "false";
  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    alert(`Kit saved! (ID: ${json.data.id})`);
    form.reset();
    loadKits();
  } catch (err) {
    alert("Failed: " + err.message);
  }
});
