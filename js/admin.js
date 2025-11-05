
const ADMIN_PASS = "yourSecret123";  // change this
const SHEET_API_URL = "https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec"; // replace with your Apps Script URL

const loginSection = document.querySelector('#login-section');
const panel = document.querySelector('#panel');
const loginBtn = document.querySelector('#login-btn');
const passInput = document.querySelector('#admin-pass');
const addForm = document.querySelector('#add-kit-form');
const kitList = document.querySelector('#kit-list');
const refreshBtn = document.querySelector('#refresh-btn');

// ---- LOGIN ----
function showPanel() {
  loginSection.style.display = 'none';
  panel.classList.remove('hidden');
  localStorage.setItem('isAdmin', 'true');
  loadKits();
}

if (localStorage.getItem('isAdmin') === 'true') showPanel();

loginBtn.addEventListener('click', () => {
  if (passInput.value === ADMIN_PASS) showPanel();
  else alert('Incorrect password');
});

// ---- LOAD KITS ----
async function loadKits() {
  kitList.innerHTML = '<p>Loading kits...</p>';
  try {
    const res = await fetch('../data/kits.json', { cache: 'no-store' });
    const kits = await res.json();
    renderKits(kits);
  } catch (e) {
    kitList.innerHTML = '<p style="color:red;">Failed to load kits.</p>';
  }
}

function renderKits(kits) {
  kitList.innerHTML = kits.map(k => `
    <article>
      <b>${k.kit_id}</b> – ${k.name}  
      <br><small>${k.category || '—'}, Qty: ${k.total_qty}</small>
    </article>
  `).join('');
}

refreshBtn.addEventListener('click', loadKits);

// ---- ADD / UPDATE ----
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(addForm).entries());
  data.total_qty = +data.total_qty || 0;

  if (!data.kit_id || !data.name) {
    alert('Kit ID and Name required.');
    return;
  }

  try {
    const res = await fetch(SHEET_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      alert('Kit added or updated successfully!');
      addForm.reset();
      loadKits();
    } else {
      alert('Failed to submit to sheet.');
    }
  } catch (err) {
    console.error(err);
    alert('Network error.');
  }
});
