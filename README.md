# wsesu-board-next

The "Next meeting" strip on each board card on the wsesu.net School Boards page (SchoolBlocks), served
by GitHub Pages and embedded as one iframe per board:

```html
<iframe src="https://hepennypacker22.github.io/wsesu-board-next/b/hartland/" ...></iframe>
```

Boards: `wsesu`, `hartland`, `mount-ascutney`, `weathersfield`. Use the path form; SchoolBlocks strips
query strings from iframe URLs. SchoolBlocks also styles block iframes `position:absolute`, so the
embed's inline style needs `position:static`.

## How it works
- `scripts/fetch-meetings.mjs` reads each board's public Drive meetings folder (Drive's
  `embeddedfolderview` page, no login or API key) and writes `data/meetings.json`.
  The Action in `.github/workflows/sync.yml` runs it every 30 minutes and commits changes.
- Clerks keep one subfolder per meeting named `YYYY-MM-DD ...`. The agenda is a file in it with
  "Agenda" in the name and no "DRAFT".
- Time, place and Google Meet link come only from the posted agenda PDF (`pdftotext`), and only when
  the Date printed on it matches the folder date. Before an agenda is posted, none are shown.
- `next.js` shows the first meeting dated today or later (Vermont time), so the strip moves on the
  morning after a meeting without waiting for a sync.
- A cancelled or moved meeting: rename or delete its folder.

## Commands
- `node scripts/fetch-meetings.mjs` — refresh `data/meetings.json` locally
- `gh workflow run sync.yml` — run the sync now
