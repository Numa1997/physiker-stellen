// The daily log and the audit trail, markup as in the template. A run
// still in flight shows a status pill and whatever note it has so far.

import { el } from './dom.js';

const MONO = "font-family:'IBM Plex Mono',monospace";
const SERIF = "font-family:'Instrument Serif',serif";

export function dailyLog(v) {
  const wrap = el('section', { 'data-journal': '1', style: 'margin-top:40px' },
    el('div', { style: 'display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 14px;border-bottom:1px solid #1c1518;padding-bottom:10px' },
      el('h3', { style: `margin:0;${SERIF};font-size:24px;font-weight:400;color:#1c1518` }, 'Daily log'),
      el('span', { style: `${MONO};font-size:11px;color:#8b8079` }, `${v.nJournal} days · ${v.nRuns} runs · list updated ${v.updatedLabel}`)));

  if (v.noJournal) {
    wrap.append(el('p', { style: 'margin:14px 0;font-size:13.5px;line-height:1.6;color:#5a504b' },
      'No daily runs logged yet. Each 06:30 check adds one entry: postings added, postings removed, and the reason for each.'));
    return wrap;
  }

  for (const d of v.journal) {
    const details = el('details', { 'data-jday': '1', style: 'border:1px solid #d9d0c2;border-radius:6px;background:#fff;margin-top:12px' });
    if (d.isLatest) details.setAttribute('open', '');

    details.append(el('summary', { 'data-jsum': '1', style: 'cursor:pointer;padding:13px 18px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px' },
      el('span', { style: `${MONO};font-size:13.5px;font-weight:500;color:#1c1518;min-width:150px` }, d.dateLabel),
      el('span', { 'data-jpill': 'in', style: `${MONO};font-size:11px;padding:2px 9px;border-radius:999px;background:#e6efe8;color:#33543f` }, `+${d.nIn} added`),
      el('span', { 'data-jpill': 'out', style: `${MONO};font-size:11px;padding:2px 9px;border-radius:999px;background:#f3dcdc;color:#7a1f2b` }, `−${d.nOut} removed`),
      d.hasStatus && el('span', { style: `${MONO};font-size:11px;padding:2px 9px;border-radius:999px;color:#fff;background:${d.statusBg}` }, d.status),
      el('span', { style: `${MONO};font-size:11px;color:#8b8079;margin-left:auto` }, d.stats)));

    const body = el('div', { style: 'padding:2px 18px 16px;border-top:1px solid #efe9df' });
    for (const g of d.groups) {
      body.append(el('div', { style: 'margin-top:14px' },
        el('div', { style: `${MONO};font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#8b8079;border-bottom:1px solid #efe9df;padding-bottom:4px` }, `${g.label} · ${g.n}`),
        ...g.items.map((x) => el('div', { style: 'display:grid;grid-template-columns:14px 1fr;gap:0 6px;margin-top:8px;font-size:13.5px;line-height:1.45;color:#1c1518' },
          el('span', { style: `${MONO};color:#33543f;font-weight:500` }, '+'),
          el('div', {},
            x.hasUrl ? el('a', { href: x.url, target: '_blank', rel: 'noopener' }, x.title) : x.title,
            el('span', { style: 'color:#8b8079' }, ` · ${x.company}`),
            x.hasLoc && el('span', { style: 'color:#8b8079' }, ` · ${x.loc}`),
            x.hasEmp && el('span', { style: `${MONO};font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#7a4b12;border:1px solid #e3d2b0;padding:0 5px;border-radius:3px;margin-left:6px` }, x.emp),
            el('span', { style: `display:block;${MONO};font-size:11.5px;color:#5a504b` }, x.why))))));
    }
    if (d.hasOut) {
      body.append(el('div', { style: 'margin-top:14px' },
        el('div', { style: `${MONO};font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7a1f2b;border-bottom:1px solid #efe9df;padding-bottom:4px` }, `Removed · ${d.nOut}`),
        ...d.outList.map((x) => el('div', { style: 'display:grid;grid-template-columns:14px 1fr;gap:0 6px;margin-top:8px;font-size:13.5px;line-height:1.45;color:#1c1518' },
          el('span', { style: `${MONO};color:#7a1f2b;font-weight:500` }, '−'),
          el('div', {}, `${x.title} `, el('span', { style: 'color:#8b8079' }, `· ${x.company}`),
            el('span', { style: `display:block;${MONO};font-size:11.5px;color:#5a504b` }, x.why))))));
    }
    if (d.noChanges) {
      body.append(el('p', { style: 'margin:14px 0 0;font-size:13.5px;color:#5a504b' }, 'No postings added or removed. Every listed posting was re-checked and is still live.'));
    } else if (d.unfinished) {
      body.append(el('p', { style: 'margin:14px 0 0;font-size:13.5px;color:#7a1f2b;font-weight:500' }, 'This run did not finish, so the list was not fully re-checked. Postings may have died without being struck off.'));
    }

    const runDetails = el('details', { style: 'margin-top:14px' },
      el('summary', { 'data-jsum': '1', style: `cursor:pointer;${MONO};font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8b8079` }, 'Run details'),
      ...d.widenedList.map((w) => el('p', { style: `margin:8px 0 0;${MONO};font-size:11.5px;line-height:1.55;color:#7a4b12` }, `Widened beyond Berlin/Leipzig — ${w}`)),
      d.hasCats && el('p', { style: `margin:8px 0 0;${MONO};font-size:11px;line-height:1.6;color:#8b8079` }, `Live per category: ${d.catText}`),
      d.hasEval && el('p', { style: `margin:4px 0 0;${MONO};font-size:11px;line-height:1.6;color:#8b8079` }, `Ads evaluated: ${d.evalText}`),
      ...d.notes.map((nt) => el('p', { style: 'margin:8px 0 0;font-size:13px;line-height:1.6;color:#3a322e' }, nt)));
    body.append(runDetails);
    details.append(body);
    wrap.append(details);
  }
  return wrap;
}

export function auditTrail(v) {
  return el('details', { style: 'margin-top:40px;border:1px solid #d9d0c2;border-radius:6px;background:#fff' },
    el('summary', { style: `cursor:pointer;padding:14px 18px;${SERIF};font-size:19px;color:#5a504b` }, "Audit trail — postings removed for requiring a Master's or PhD"),
    el('div', { style: 'padding:0 18px 18px;border-top:1px solid #e3dccf' },
      el('h4', { style: `margin:16px 0 6px;${MONO};font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#7a1f2b;font-weight:500` }, "Master's required"),
      el('p', { style: 'margin:0;font-size:13.5px;line-height:1.65;color:#3a322e' }, v.removedMasters),
      el('h4', { style: `margin:16px 0 6px;${MONO};font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#7a1f2b;font-weight:500` }, 'PhD required'),
      el('p', { style: 'margin:0;font-size:13.5px;line-height:1.65;color:#3a322e' }, v.removedPhd)));
}

export function footer(v, a) {
  return el('footer', { style: `margin-top:44px;padding-top:16px;border-top:1px solid #d9d0c2;display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;${MONO};font-size:11px;color:#8b8079;line-height:1.7` },
    el('span', {}, `Source: ${v.sourceFile} · ${v.nUrls} unique URLs, unmodified · list updated ${v.updatedLabel}`),
    el('span', { 'data-print-hide': '1', style: 'display:flex;gap:14px' },
      el('button', { onclick: a.clearMarks, style: `${MONO};font-size:11px;background:none;border:none;color:#8b8079;cursor:pointer;text-decoration:underline;padding:0` }, 'Clear all marks (applied · removed · notes)'),
      el('button', { onclick: a.signOut, style: `${MONO};font-size:11px;background:none;border:none;color:#8b8079;cursor:pointer;text-decoration:underline;padding:0` }, 'Sign out')));
}
