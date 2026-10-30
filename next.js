// Renders one board's "Next meeting" strip from data/meetings.json. The board comes from <html data-board>
// (SchoolBlocks strips query strings from iframe URLs, so each board has its own path: /b/<board>/).
(async () => {
  const slug = document.documentElement.dataset.board;
  const el = document.getElementById('next');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const link = (url, text, cls) => `<a href="${esc(url)}" target="_blank" rel="noopener"${cls ? ` class="${cls}"` : ''}>${esc(text)}</a>`;
  const longDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 17)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  };
  try {
    const r = await fetch('../../data/meetings.json', { cache: 'no-cache' });
    const b = (await r.json()).boards[slug];
    const m = b.meetings.find((x) => x.date >= today);
    if (!m) {
      el.innerHTML = `<div class="eyebrow">Next meeting</div><div class="when">Not scheduled yet</div><div class="links">${link(b.allUrl, 'All agendas & minutes')}</div>`;
      return;
    }
    const label = m.label && m.label !== 'Meeting' ? ` <span class="muted">· ${esc(m.label)}</span>` : '';
    el.innerHTML =
      `<div class="eyebrow">${m.date === today ? 'Meeting today' : 'Next meeting'}</div>` +
      `<div class="when"><strong>${esc(longDate(m.date))}</strong>${label}</div>` +
      `<div class="links">${m.agendaUrl
        ? link(m.agendaUrl, 'Agenda', 'btn') + link(m.folderUrl, 'Full packet')
        : `<span class="muted">Agenda not posted yet</span>${link(m.folderUrl, 'Meeting folder')}`}</div>`;
  } catch (err) {
    el.innerHTML = '<div class="eyebrow">Next meeting</div><div class="when">See School Boards Meetings on this page</div>';
  }
})();
