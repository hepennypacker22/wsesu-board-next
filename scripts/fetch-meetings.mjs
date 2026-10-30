// Reads each board's public Drive meetings folder and writes data/meetings.json: the board's upcoming
// meetings, each with its agenda link once one is posted. No Google login or API key: Drive's
// embeddedfolderview page lists any folder shared "anyone with the link".
//
// Clerks keep one subfolder per meeting, named "YYYY-MM-DD ..." (e.g. "2026-11-02 Meeting @ Windsor School").
// The agenda is a file in that folder with "Agenda" in its name and no "DRAFT".
// The page (next.js) picks the first meeting dated today or later, so the card moves on at midnight
// even between runs of this script.
import { readFileSync, writeFileSync } from 'node:fs';

const BOARDS = {
  wsesu: '1dJq4eCztlJAaDPrj7cxAwZrdbaNZoEEn',
  hartland: '1fODyUf3poSDOD80mh6FbR-_TxpDsMKCJ',
  'mount-ascutney': '1dDNGUGvJ406_huug0WaYWuCHuGtObVhq',
  weathersfield: '1dK4fMBFj2hPc0cRXENDCkOYL8Dw9vENw',
};
const KEEP = 4; // upcoming meetings kept per board
const OUT = new URL('../data/meetings.json', import.meta.url);

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function list(folderId) {
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`, { headers: { 'User-Agent': 'wsesu-board-next' } });
  if (!r.ok) throw new Error(`folder ${folderId}: HTTP ${r.status}`);
  const html = await r.text();
  const out = [];
  const re = /<div class="flip-entry" id="entry-([\w-]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]*)<\/div>/g;
  for (const m of html.matchAll(re)) out.push({ id: m[1], url: decode(m[2]), name: decode(m[3]).trim() });
  return out;
}

export function meetingLabel(rest) {
  // "Meeting @ ABS" -> "Meeting at ABS"; "BudgetAdvisoryCommitteeMeeting" -> "Budget Advisory Committee Meeting";
  // "REORGANIZATION Meeting" -> "Reorganization Meeting". Short capitals (ABS, MASD, WSESU) stay as they are.
  return rest
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/@/g, ' at ')
    .replace(/\b[A-Z]{6,}\b/g, (w) => w[0] + w.slice(1).toLowerCase())
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

function nyDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d); // YYYY-MM-DD
}

async function board(folderId) {
  const yesterday = nyDate(new Date(Date.now() - 86400000)); // margin for a late run; the page filters to today
  const meetings = (await list(folderId))
    .filter((e) => e.url.includes('/folders/'))
    .map((e) => ({ e, m: /^(\d{4}-\d{2}-\d{2})[\s_-]*(.*)$/.exec(e.name) }))
    .filter(({ m }) => m && m[1] >= yesterday)
    .sort((a, b) => a.m[1].localeCompare(b.m[1]))
    .slice(0, KEEP);
  const result = [];
  for (const { e, m } of meetings) {
    const files = await list(e.id);
    const agendas = files.filter((f) => /agenda/i.test(f.name) && !/draft/i.test(f.name));
    const agenda = agendas.find((f) => /\.pdf$/i.test(f.name)) ?? agendas[0];
    result.push({ date: m[1], label: meetingLabel(m[2]), folderUrl: e.url, agendaUrl: agenda ? agenda.url : '' });
  }
  return { allUrl: `https://drive.google.com/drive/folders/${folderId}`, meetings: result };
}

let previous = { boards: {} };
try { previous = JSON.parse(readFileSync(OUT, 'utf8')); } catch {}

const boards = {};
const failures = [];
for (const [slug, folderId] of Object.entries(BOARDS)) {
  try {
    boards[slug] = await board(folderId);
    console.log(slug, boards[slug].meetings.map((m) => `${m.date}${m.agendaUrl ? ' (agenda)' : ''}`).join(', ') || 'no upcoming meetings');
  } catch (err) {
    failures.push(`${slug}: ${err.message}`);
    if (previous.boards[slug]) boards[slug] = previous.boards[slug]; // keep serving the last good data
  }
}

// Only the meetings count as a change, so a run with nothing new doesn't make a commit.
if (JSON.stringify(boards) !== JSON.stringify(previous.boards)) {
  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), boards }, null, 2) + '\n');
}
if (failures.length) {
  console.error(`::error::Could not read: ${failures.join('; ')}. Is the folder still shared "anyone with the link"?`);
  process.exit(1);
}
