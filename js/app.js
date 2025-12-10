// ====== CONFIG ======
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1lqo329RPwuBE9E39ImGlcL0d9zmXP8Clf_rgOAOMrGo/export?format=csv";

const POST_CHECKOUT_REFRESH_MS = 2500;

// ====== DOM REFS ======
const listEl = document.querySelector('#kit-list');
const searchEl = document.querySelector('#search');
const categoryEl = document.querySelector('#category');
const countEl = document.querySelector('#count');

const modal = document.querySelector('#modal');
const modalClose = document.querySelector('#modal-close');

const mThumb = document.querySelector('#m-thumb');
const mQR = document.querySelector('#m-qr');
const mTitle = document.querySelector('#modal-title');
const mCat = document.querySelector('#m-cat');
const mLoc = document.querySelector('#m-loc');
const mAvail = document.querySelector('#m-availability');
const mBadges = document.querySelector('#m-badges');
const mDesc = document.querySelector('#m-desc');

const form = document.querySelector('#checkout-form');
const btnCheckout = document.querySelector('#checkout-btn');
const msg = document.querySelector('#checkout-msg');

const tyModal = document.querySelector('#thankyou');
const tyMsg = document.querySelector('#ty-msg');
const tyOk = document.querySelector('#ty-ok');

// ====== APP STATE ======
let KITS = [];
let CURRENT = null;
let LOANS_SHEET = [];

// ====== CSV PARSER ======
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }

    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { pushField(); i++; continue; }
    if (c === '\n') { pushField(); pushRow(); i++; continue; }
    if (c === '\r') { i++; continue; }

    field += c;
    i++;
  }

  if (field.length || row.length) { pushField(); pushRow(); }
  return rows;
}

// ====== SHEET FETCH ======
async function fetchLoansFromSheet() {
  const res = await fetch(SHEET_CSV_URL, { cache:'no-store' });
  const text = await res.text();
  const rows = parseCSV(text);

  if (!rows.length) return [];

  const headers = rows[0].map(h => (h || '').trim().toLowerCase());
  const idx = {
    ts: headers.indexOf('timestamp'),
    kit_id: headers.indexOf('kit id'),
    name: headers.indexOf('name'),
    email: headers.indexOf('email'),
    kit: headers.indexOf('kit'),
  };

  const out = [];
  for (let r=1; r<rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length < 2) continue;

    const kitId = (cols[idx.kit_id] || '').trim();
    const kitNm = (cols[idx.kit] || '').trim();
    const user  = (cols[idx.name] || '').trim();
    const mail  = (cols[idx.email] || '').trim();
    const ts    = (cols[idx.ts] || '').trim();

    if (!kitId && !user && !mail) continue;

    out.push({ timestamp:ts, kit_id:kitId, kit_name:kitNm, name:user, email:mail });
  }
  return out;
}

async function refreshLoansFromSheet() {
  try {
    LOANS_SHEET = await fetchLoansFromSheet();
  } catch {
    LOANS_SHEET = [];
  }
}

// ====== AVAILABILITY ======
function loansCountForKit(id){
  return LOANS_SHEET.filter(l => String(l.kit_id) === String(id)).length;
}
function availabilityFor(k){
  return Math.max(0, Number(k.total_qty) - loansCountForKit(k.kit_id));
}
function availabilityBadge(k){
  const a = availabilityFor(k);
  if (a<=0) return `<span class="badge out">Out</span>`;
  if (a<=1) return `<span class="badge warn">Low</span>`;
  return `<span class="badge ok">In stock</span>`;
}

// ====== CARDS ======
function cardThumb(k){
  if (k.image_url){
    return `<div class="thumb"><img src="${k.image_url}"></div>`;
  }
  const letter = (k.name || '?')[0].toUpperCase();
  return `<div class="thumb">${letter}</div>`;
}

function card(k){
  const tags = (k.tags || '')
    .split(',')
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join('');

  return `
    <article class="card">
      <div class="card-inner" data-id="${k.kit_id}">
        ${cardThumb(k)}
        <div class="meta">
          <div class="row">
            <h3 class="title">${k.name}</h3>
            ${availabilityBadge(k)}
          </div>
          <p class="muted"><strong>Category:</strong> ${k.category}</p>
          <p class="muted"><strong>Location:</strong> ${k.location}</p>
          <p class="muted"><strong>Available:</strong> <b>${availabilityFor(k)}</b> / ${k.total_qty}</p>
          <div class="tags">${tags}</div>

          <button class="open-btn" data-id="${k.kit_id}">View Details</button>
        </div>
      </div>
    </article>`;
}

// ====== LIST ======
function renderList(){
  const q = searchEl.value.toLowerCase().trim();
  const cat = categoryEl.value.toLowerCase();

  const filtered = KITS.filter(k => {
    const hay = [k.name,k.category,k.description,k.tags,k.location].join(' ').toLowerCase();
    const active = k.active === true || String(k.active).toLowerCase() === "true";
    const catOk = !cat || k.category.toLowerCase() === cat;
    return active && (!q || hay.includes(q)) && catOk;
  });

  countEl.textContent = `${filtered.length} kit${filtered.length===1?'':'s'}`;
  listEl.innerHTML = filtered.map(card).join('');
}

function populateCategory(){
  const cats = [...new Set(KITS.map(k => (k.category || '').toLowerCase()))].filter(Boolean);
  categoryEl.innerHTML =
    `<option value="">All categories</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ====== CHECKOUT STATE ======
function updateCheckoutState(){
  const avail = availabilityFor(CURRENT);
  mAvail.textContent = `${avail} / ${CURRENT.total_qty}`;
  const disabled = avail <= 0;
  btnCheckout.disabled = disabled;
  form.querySelectorAll("input").forEach(i => i.disabled = disabled);
  msg.textContent = disabled ? "Out of stock." : "";
}

// ====== OPEN MODAL ======
function openModalById(id){
  const k = KITS.find(x => x.kit_id === id);
  if (!k) return;
  CURRENT = k;

  mThumb.innerHTML = k.image_url
    ? `<img src="${k.image_url}">`
    : `<div class="thumb"><div style="font-size:2rem">${k.name[0]}</div></div>`;

  if (k.instructions_url){
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(k.instructions_url)}`;
    mQR.innerHTML = `<img src="${qrSrc}">`;
  } else {
    mQR.innerHTML = "";
  }

  mTitle.textContent = k.name;
  mCat.textContent = k.category;
  mLoc.textContent = k.location;
  mDesc.textContent = k.description || "";

  mBadges.innerHTML = (k.tags || '')
    .split(',')
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join('');

  form.reset();
  msg.textContent = "";
  modal.classList.remove("hidden");
  updateCheckoutState();
}

function closeModal(){
  modal.classList.add("hidden");
}

// ====== WIRING ======
function wireUI(){

  modalClose.addEventListener('click', closeModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // ⭐ FIX 1 — prevent card interaction when modal is open
  listEl.addEventListener("touchstart", e => {
    if (!modal.classList.contains("hidden")) return;

    const c = e.target.closest(".card-inner");
    if (c) {
      openModalById(c.dataset.id);
      e.preventDefault();
    }
  });

  // ⭐ FIX 2 — prevent button tap-through when modal is open
  document.addEventListener("touchstart", e => {
    if (!modal.classList.contains("hidden")) return;

    const btn = e.target.closest(".open-btn");
    if (btn) {
      openModalById(btn.dataset.id);
      e.preventDefault();
    }
  });

  // Desktop click on card
  listEl.addEventListener("click", e => {
    if (!modal.classList.contains("hidden")) return;

    const c = e.target.closest(".card-inner");
    if (c) openModalById(c.dataset.id);
  });

  // Desktop click on button
  document.addEventListener("click", e => {
    if (!modal.classList.contains("hidden")) return;

    const btn = e.target.closest(".open-btn");
    if (btn) openModalById(btn.dataset.id);
  });

  searchEl.addEventListener('input', renderList);
  categoryEl.addEventListener('change', renderList);

  tyOk.addEventListener('click', () => tyModal.classList.add("hidden"));

  // Form submit
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!CURRENT) return;
    if (availabilityFor(CURRENT) <= 0) return;

    const fd = new FormData(form);
    const name = fd.get("name").trim();
    const email = fd.get("email").trim();
    if (!name || !email) return;

    document.querySelector('#gf_kit_id').value = CURRENT.kit_id;
    document.querySelector('#gf_kit_name').value = CURRENT.name;
    document.querySelector('#gf_user_name').value = name;
    document.querySelector('#gf_user_email').value = email;

    document.querySelector('#gform').submit();

    tyMsg.innerHTML = `You checked out <b>${CURRENT.name}</b>.`;

    tyModal.classList.remove("hidden");
    closeModal();

    const oldCount = loansCountForKit(CURRENT.kit_id);
    setTimeout(() => refreshUntilUpdated(CURRENT.kit_id, oldCount), POST_CHECKOUT_REFRESH_MS);
  });
}

async function refreshUntilUpdated(id, oldCount, tries=0){
  await refreshLoansFromSheet();
  const newCount = loansCountForKit(id);

  if (newCount > oldCount || tries >= 5){
    renderList();
    if (!modal.classList.contains("hidden")) updateCheckoutState();
    return;
  }

  setTimeout(() => refreshUntilUpdated(id, oldCount, tries+1), 2000);
}

async function loadKits(){
  try {
    const res = await fetch('./data/kits.json', { cache:'no-store' });
    const data = await res.json();
    KITS = data.map(k => ({ ...k, total_qty:+k.total_qty || 0 }));
  } catch {
    KITS = [
      { kit_id:'KIT-001', name:'Sample Kit', category:'misc', total_qty:1, location:'Studio', description:'Example only', tags:'sample,test', active:true }
    ];
  }
}

async function startup(){
  wireUI();
  await loadKits();
  populateCategory();
  await refreshLoansFromSheet();
  renderList();
}

startup();
