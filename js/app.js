function card(k) {
  const tags = (k.tags || '')
    .split(',')
    .filter(Boolean)
    .map(t => `<span>${t.trim()}</span>`)
    .join('');

  const qrURL = k.instructions_url
    ? `https://chart.googleapis.com/chart?cht=qr&chs=140x140&chl=${encodeURIComponent(k.instructions_url)}`
    : '';

  return `
    <article class="card" data-id="${k.kit_id}" tabindex="0" role="button" aria-label="Open details for ${k.name}">
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

        <!-- QR code on the card -->
        ${
          qrURL
            ? `<div class="qr-wrap"><img src="${qrURL}" alt="QR code for ${k.name} instructions"></div>`
            : ''
        }
      </div>
    </article>`;
}
