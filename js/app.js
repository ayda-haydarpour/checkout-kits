// ====== CONFIG ======
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1lqo329RPwuBE9E39ImGlcL0d9zmXP8Clf_rgOAOMrGo/export?format=csv";

// How long after checkout to re-pull the sheet (ms)
const POST_CHECKOUT_REFRESH_MS = 2500;

// ====== DOM REFS ======
const listEl = document.querySelector('#kit-list');
const searchEl = document.querySelector('#search');
const suggestionsEl = document.querySelector('#suggestions');
const categoryEl = document.querySelector('#category');
const countEl = document.querySelector('#count');

const modal = document.querySelector('#modal');
const modalClose = document.querySelector('#modal-close');
const mThumb = document.querySelector('#m-thumb');
const mTitle = document.querySelector('#modal-title');
const mCat = document.querySelector('#m-cat');
const mLoc = document.querySelector('#m-loc');
const mAvail = document.querySelector('#m-availability');
const mBadges = document.querySelector('#m-badges');
const mDesc = document.querySelector('#m-desc');
const form = document.querySelector('#checkout-form');
const btnCheckout = document.querySelector('#checkout-btn');
const msg = document.querySelector('#checkout-msg');

// Thank-you popup
const tyModal = document.querySelector('#thankyou');
const tyMsg   = document.querySelector('#ty-msg');
const tyOk    = document.querySelector('#ty-ok');

// ====== APP STATE ======
let KITS = [];
let CURRENT = null;
// Live global “loans” array from the Google Sheet CSV
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
      } else { field += c; i++; continue; }
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { pushField(); i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { pushField(); pushRow(); i++; continue; }
      field += c; i++; continue;
    }
  }
  if (field.length || row.length) { pushField(); pushRow(); }
  return rows;
}

// ====== SHEET FETCH ======
async function fetchLoansFromSheet() {
  const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch loans CSV');
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
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length < 2) continue;
    const kitId = (cols[idx.kit_id] || '').trim();
    const kitNm = (cols[idx.kit] || '').trim();
    const user = (cols[idx.name] || '').trim();
    const mail = (cols[idx.email] || '').trim();
    const ts = (cols[idx.ts] || '').trim();
    if (!kitId && !kitNm && !user && !mail) continue;

    out.push({
      timestamp: ts,
      kit_id: kitId,
      kit_name: kitNm,
      name: user,
      email: mail,
    });
  }
  return out;
}

async function refreshLoansFromSheet() {
  try {
    LOANS_SHEET = await fetchLoansFromSheet();
  } catch (e) {
    console.warn('Could not refresh loans from sheet:', e);
    LOANS_SHEET = [];
  }
}

// ====== AVAILABILITY ======
function loansCountForKit(kitId) {
  return LOANS_SHEET.filter(l => String(l.kit_id) === String(kitId)).length;
}

function availabilityFor(k) {
  const out = loansCountForKit(k.kit_id);
  const total = Number(k.total_qty || 0);
  return Math.max(0, total - out);
}

function availabilityBadge(k) {
  const a = availabilityFor(k);
  if (a <= 0) return '<span class="badge out">Out</span>';
  if (a <= 1) return '<span class="badge warn">Low</span>';
  return '<span class="badge ok">In stock</span>';
}

// ====== THUMBNAILS / CARDS ======
function cardThumb(k) {
  if (k.image_url && k.image_url.trim()) {
    return `
      <div class="thumb">
        <img src="${k.image_url}" alt="${k.name}" />
      </div>`;
  }
  const letter = (k.name || '?')[0].toUpperCase();
  return `<div class="thumb"><div style="font-size:2.5rem">${letter}</div></div>`;
}

function card(k) {
  const tags = (k.tags || '')
    .split(',')
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join('');
  return `
    <article class="card" data-id="${k.kit_id}" tabindex="0" role="button" aria-label="Open details for ${k.name}">
      ${cardThumb(k)}
      <div class="meta">
        <div class="row">
          <h3 class="title">${k.name}</h3>
          ${availabilityBadge(k)}
        </div>
        <p class="muted"><strong>Category:</strong> ${k.category || '—'}</p>
        <p class="muted"><strong>Location:</strong> ${k.location || '—'}</p>
        <p class="muted"><strong>Available:</strong> <b>${availabilityFor(k)}</b> / ${k.total_qty}</p>
        <div class="tags">${tags}</div>
      </div>
    </article>`;
}

// ====== LIST RENDER ======
function renderList() {
  const q = (searchEl.value || '').toLowerCase().trim();
  const cat = (categoryEl.value || '').toLowerCase().trim();
  const filtered = KITS.filter(k => {
    const hay = [k.name, k.category, k.description, k.tags, k.location].join(' ').toLowerCase();
    const catOk = !cat || String(k.category || '').toLowerCase() === cat;
    const active = String(k.active).toLowerCase() === 'true' || k.active === true;
    return active && (!q || hay.includes(q)) && catOk;
  });
  countEl.textContent = `${filtered.length} kit${filtered.length === 1 ? '' : 's'}`;
  listEl.innerHTML = filtered.map(card).join('');
}

function populateCategory() {
  const cats = Array.from(new Set(KITS.map(k => String(k.category || '').toLowerCase()).filter(Boolean)));
  categoryEl.innerHTML =
    '<option value="">All categories</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ====== CHECKOUT STATE ======
function updateCheckoutState() {
  if (!CURRENT) return;
  const avail = availabilityFor(CURRENT);
  mAvail.textContent = `${avail} / ${CURRENT.total_qty}`;
  const disabled = avail <= 0;
  btnCheckout.disabled = disabled;
  form.querySelectorAll('input').forEach(i => (i.disabled = disabled));
  msg.textContent = disabled ? 'Out of stock.' : '';
}

// ====== MODAL ======
function openModalById(id) {
  const k = KITS.find(x => x.kit_id === id);
  if (!k) return;
  CURRENT = k;

  mThumb.innerHTML = k.image_url && k.image_url.trim()
    ? `<img src="${k.image_url}" alt="${k.name}">`
    : `<div class="thumb"><div style="font-size:2.5rem">${(k.name || '?')[0].toUpperCase()}</div></div>`;

  mTitle.textContent = k.name;
  mCat.textContent = k.category || '—';
  mLoc.textContent = k.location || '—';
  mBadges.innerHTML = (k.tags || '')
    .split(',')
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join('');
  mDesc.textContent = k.description || '';
  form.reset();
  msg.textContent = '';
  modal.classList.remove('hidden');

  updateCheckoutState();
  setTimeout(() => modalClose.focus(), 0);
}

function closeModal() { modal.classList.add('hidden'); }

// ====== SUGGESTIONS ======
let activeIndex = -1;
function buildSuggestions(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    suggestionsEl.classList.remove('show');
    suggestionsEl.innerHTML = '';
    activeIndex = -1;
    return;
  }

  const catSet = new Set(KITS.map(k => (k.category || '').toLowerCase()).filter(Boolean));
  const catHits = Array.from(catSet).filter(c => c.startsWith(q)).slice(0, 3);
  const kitHits = KITS.filter(k =>
    (k.name || '').toLowerCase().includes(q) || (k.tags || '').toLowerCase().includes(q)
  ).slice(0, 7);

  const items = [
    ...catHits.map(c => ({ type: 'category', value: c, label: `Category: ${c}` })),
    ...kitHits.map(k => ({ type: 'kit', value: k.kit_id, label: k.name })),
  ];

  if (!items.length) {
    suggestionsEl.classList.remove('show');
    suggestionsEl.innerHTML = '';
    activeIndex = -1;
    return;
  }

  suggestionsEl.innerHTML = items
    .map((it, i) => `
      <div class="suggestion" data-type="${it.type}" data-value="${it.value}" role="option" aria-selected="${i === activeIndex}">
        <div>${it.label} ${it.type === 'category' ? '<span class="chip">category</span>' : ''}</div>
        ${it.type === 'kit' ? '<span class="hint">open</span>' : '<span class="hint">filter</span>'}
      </div>`)
    .join('');
  suggestionsEl.classList.add('show');
  activeIndex = -1;
}

function hideSuggestions() {
  suggestionsEl.classList.remove('show');
  suggestionsEl.innerHTML = '';
  activeIndex = -1;
}

function pickSuggestion(el) {
  const type = el.getAttribute('data-type');
  const val = el.getAttribute('data-value');
  if (type === 'category') {
    categoryEl.value = val;
    renderList();
    hideSuggestions();
    searchEl.value = '';
    searchEl.blur();
  } else if (type === 'kit') {
    hideSuggestions();
    openModalById(val);
  }
}

// ====== AUTO REFRESH HELPER ======
async function refreshUntilUpdated(kitId, oldCount, tries = 0) {
  await refreshLoansFromSheet();
  const newCount = loansCountForKit(kitId);
  if (newCount > oldCount || tries >= 5) {
    renderList();
    if (!modal.classList.contains('hidden')) updateCheckoutState();
    return;
  }
  setTimeout(() => refreshUntilUpdated(kitId, oldCount, tries + 1), 2000);
}

// ====== WIRING ======
function wireUI() {
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

  listEl.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) openModalById(card.getAttribute('data-id'));
  });

  listEl.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) {
      e.preventDefault();
      openModalById(e.target.getAttribute('data-id'));
    }
  });

  searchEl.addEventListener('input', () => { renderList(); buildSuggestions(searchEl.value); });
  searchEl.addEventListener('focus', () => buildSuggestions(searchEl.value));
  searchEl.addEventListener('blur', () => setTimeout(hideSuggestions, 120));
  categoryEl.addEventListener('change', renderList);

  suggestionsEl.addEventListener('click', e => {
    const item = e.target.closest('.suggestion');
    if (item) pickSuggestion(item);
  });

  searchEl.addEventListener('keydown', e => {
    const items = Array.from(suggestionsEl.querySelectorAll('.suggestion'));
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = (activeIndex + 1) % items.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = (activeIndex - 1 + items.length) % items.length; }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0) pickSuggestion(items[activeIndex]); return; }
    else { return; }
    items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
  });

  tyOk.addEventListener('click', () => tyModal.classList.add('hidden'));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!CURRENT) return;
    if (availabilityFor(CURRENT) <= 0) { updateCheckoutState(); return; }

    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    if (!name || !email) return;

    btnCheckout.disabled = true;
    setTimeout(() => { btnCheckout.disabled = false; }, 1200);

    try {
      document.querySelector('#gf_kit_id').value = CURRENT.kit_id;
      document.querySelector('#gf_kit_name').value = CURRENT.name;
      document.querySelector('#gf_user_name').value = name;
      document.querySelector('#gf_user_email').value = email;
      document.querySelector('#gform').submit();
    } catch (_) { }

    if (tyModal) {
      tyMsg.innerHTML = `You checked out <b>${CURRENT.name}</b>. Please return the <b>box itself</b> after you’re done.`;
      tyModal.classList.remove('hidden');
    } else {
      alert(`Thanks for checking out ${CURRENT.name}!`);
    }

    closeModal();

    // Improved auto-refresh loop
    const oldCount = loansCountForKit(CURRENT.kit_id);
    setTimeout(() => refreshUntilUpdated(CURRENT.kit_id, oldCount), POST_CHECKOUT_REFRESH_MS);
  });
}

// ====== DATA LOAD ======
async function loadKits() {
  const SAMPLE = [
    { kit_id: 'KIT-00001', name: 'Woodburning Kit', category: 'woodworking', total_qty: 2, image_url: '', location: 'Take and Create Stand', description: 'Learn burning techniques and finish with an art piece.', tags: 'wood,art,crafts', active: true },
    { kit_id: 'KIT-00002', name: 'Vacuum Forming Pot', category: 'fabrication', total_qty: 3, image_url: '', location: 'Take and Create Stand', description: 'Form a plastic plant pot with a custom buck.', tags: 'plastic,forming,pot', active: true },
    { kit_id: 'KIT-00003', name: 'Mancala Board', category: 'dremel', total_qty: 2, image_url: '', location: 'Take and Create Stand', description: 'Use the Dremel to finish a wooden mancala board.', tags: 'dremel,game,wood', active: true },
    { kit_id: 'KIT-00004', name: 'Pencil Pouch', category: 'sewing', total_qty: 4, image_url: '', location: 'Take and Create Stand', description: 'Learn basic setup and stitching on the sewing machine by making a pencil pouch.', tags: 'sewing,fabric,crafts', active: true },
    { kit_id: 'KIT-00005', name: 'Leather Keychain', category: 'leatherwork', total_qty: 3, image_url: '', location: 'Take and Create Stand', description: 'Practice leather crafting with a hole punch and rivet setter to create a keychain.', tags: 'leather,keychain,crafts', active: true }
  ];
  try {
    const res = await fetch('./data/kits.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('kits.json not found');
    const data = await res.json();
    KITS = data.map(k => ({ ...k, total_qty: +k.total_qty || 0 }));
  } catch {
    KITS = SAMPLE;
  }
}

// ====== STARTUP ======
async function wireStartup() {
  wireUI();
  await loadKits();
  populateCategory();
  await refreshLoansFromSheet();
  renderList();
}

wireStartup();
