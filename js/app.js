// ====== DOM ELEMENTS ======
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
const mQR = document.querySelector('#m-qr'); // ⭐ NEW

const form = document.querySelector('#checkout-form');
const btnCheckout = document.querySelector('#checkout-btn');
const msg = document.querySelector('#checkout-msg');

// THANK YOU
const tyModal = document.querySelector('#thankyou');
const tyMsg = document.querySelector('#ty-msg');
const tyOk = document.querySelector('#ty-ok');

// ===== STATE =====
let KITS = [];
let CURRENT = null;
let LOANS_SHEET = [];

// =====================================
//              LOAD KITS
// =====================================
async function loadKits() {
  try {
    const res = await fetch('./data/kits.json', { cache: "no-store" });
    KITS = await res.json();
  } catch (e) {
    console.error("Failed to load kits.json", e);
  }
}

// =====================================
//              RENDER CARD
// =====================================
function cardThumb(k) {
  if (k.image_url) {
    return `<div class="thumb"><img src="${k.image_url}" alt="${k.name}"></div>`;
  }
  return `<div class="thumb"><div>${k.name[0]}</div></div>`;
}

function availabilityBadge(k) {
  const a = availabilityFor(k);
  if (a <= 0) return '<span class="badge out">Out</span>';
  if (a <= 1) return '<span class="badge warn">Low</span>';
  return '<span class="badge ok">In stock</span>';
}

function card(k) {
  const tags = (k.tags || "")
    .split(",")
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join("");

  return `
    <article class="card" data-id="${k.kit_id}" tabindex="0">
      ${cardThumb(k)}
      <div class="meta">
        <div class="row">
          <h3 class="title">${k.name}</h3>
          ${availabilityBadge(k)}
        </div>

        <p class="muted"><strong>Category:</strong> ${k.category}</p>
        <p class="muted"><strong>Location:</strong> ${k.location}</p>
        <p class="muted"><strong>Available:</strong>
          <b>${availabilityFor(k)}</b> / ${k.total_qty}
        </p>

        <div class="tags">${tags}</div>
      </div>
    </article>
  `;
}

// =====================================
//           AVAILABILITY
// =====================================
function availabilityFor(k) {
  return Number(k.total_qty);
}

// =====================================
//           RENDER LIST
// =====================================
function renderList() {
  listEl.innerHTML = KITS.map(card).join('');
  countEl.textContent = `${KITS.length} kits`;
}

// =====================================
//           OPEN MODAL
// =====================================
function openModalById(id) {
  const k = KITS.find(x => x.kit_id === id);
  if (!k) return;

  CURRENT = k;

  mThumb.innerHTML = `<img src="${k.image_url}" alt="${k.name}">`;
  mTitle.textContent = k.name;
  mCat.textContent = k.category;
  mLoc.textContent = k.location;
  mAvail.textContent = `${k.total_qty} / ${k.total_qty}`;

  mBadges.innerHTML = (k.tags || "")
    .split(",")
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join("");

  mDesc.textContent = k.description;

  // ⭐ QR CODE — CLICKABLE + SCANNABLE
  if (k.instructions_url) {
    const qrSrc = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(k.instructions_url)}`;
    mQR.innerHTML = `
      <a href="${k.instructions_url}" target="_blank">
        <img src="${qrSrc}" alt="QR code for instructions">
      </a>
    `;
  } else {
    mQR.innerHTML = "";
  }

  modal.classList.remove("hidden");
}

// =====================================
//           EVENT LISTENERS
// =====================================
modalClose.addEventListener("click", () => modal.classList.add("hidden"));

listEl.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (card) openModalById(card.dataset.id);
});

tyOk.addEventListener("click", () => tyModal.classList.add("hidden"));

// =====================================
//              STARTUP
// =====================================
async function startup() {
  await loadKits();
  renderList();
}

startup();
