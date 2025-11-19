// =====================
// DOM ELEMENTS
// =====================
const listEl = document.querySelector('#kit-list');
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
const mQR = document.querySelector('#m-qr');

let KITS = [];
let CURRENT = null;

// =====================
// LOAD KITS.JSON
// =====================
async function loadKits() {
  const res = await fetch('./data/kits.json', { cache: "no-store" });
  KITS = await res.json();
}

// =====================
// CARD RENDER
// =====================
function card(k) {
  const tags = (k.tags || "")
    .split(",")
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join("");

  return `
    <article class="card" data-id="${k.kit_id}">
      <div class="thumb">
        <img src="${k.image_url}" alt="${k.name}">
      </div>
      <div class="meta">
        <h3 class="title">${k.name}</h3>
        <p><strong>Category:</strong> ${k.category}</p>
        <p><strong>Location:</strong> ${k.location}</p>
        <p><strong>Available:</strong> ${k.total_qty}/${k.total_qty}</p>
        <div class="tags">${tags}</div>
      </div>
    </article>
  `;
}

function renderList() {
  listEl.innerHTML = KITS.map(card).join('');
  countEl.textContent = `${KITS.length} kits`;
}

// =====================
// OPEN MODAL
// =====================
function openModalById(id) {
  const k = KITS.find(x => x.kit_id === id);
  CURRENT = k;

  mThumb.innerHTML = `<img src="${k.image_url}" alt="${k.name}">`;
  mTitle.textContent = k.name;
  mCat.textContent = k.category;
  mLoc.textContent = k.location;
  mAvail.textContent = `${k.total_qty}/${k.total_qty}`;

  mBadges.innerHTML = (k.tags || "")
    .split(",")
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join("");

  mDesc.textContent = k.description;

  // ⭐⭐⭐ REAL QR CODE ⭐⭐⭐
  if (k.instructions_url) {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(k.instructions_url)}`;
    mQR.innerHTML = `
      <a href="${k.instructions_url}" target="_blank">
        <img src="${qr}" alt="QR code for instructions">
      </a>
    `;
  } else {
    mQR.innerHTML = "";
  }

  modal.classList.remove("hidden");
}

// =====================
// EVENTS
// =====================
modalClose.addEventListener("click", () => modal.classList.add("hidden"));

listEl.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (card) openModalById(card.dataset.id);
});

// =====================
// STARTUP
// =====================
async function startup() {
  await loadKits();
  renderList();
}
startup();
