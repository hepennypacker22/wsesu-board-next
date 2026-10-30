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
    // Time, place and Meet link are exactly as printed on the posted agenda (see agendaDetails); before
    // an agenda is posted only the folder's label shows. "Meeting at X" from a folder name is dropped
    // once the agenda's own Place is known.
    const d = m.details;
    const showLabel = m.label && !/^Meeting( at .*)?$/i.test(m.label) ? m.label : !d && m.label !== 'Meeting' ? m.label : '';
    const extra = [d ? d.time : '', showLabel].filter(Boolean).map(esc).join(' · ');
    el.innerHTML =
      `<div class="eyebrow">${m.date === today ? 'Meeting today' : 'Next meeting'}</div>` +
      `<div class="when"><strong>${esc(longDate(m.date))}</strong>${extra ? ` <span class="muted">· ${extra}</span>` : ''}</div>` +
      (d ? `<div class="place">${esc(d.place)}</div>` : '') +
      `<div class="links">${m.agendaUrl
        ? link(m.agendaUrl, 'Agenda', 'btn') + link(m.folderUrl, 'Full packet') + (d && d.meetUrl ? link(d.meetUrl, 'Join online') : '')
        : `<span class="muted">Agenda not posted yet</span>${link(m.folderUrl, 'Meeting folder')}`}</div>`;
  } catch (err) {
    el.innerHTML = '<div class="eyebrow">Next meeting</div><div class="when">See Upcoming Meetings on this page</div>';
  }
})();
