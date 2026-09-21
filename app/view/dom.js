// A 30-line element builder, so the view files read as structure rather
// than as a pile of createElement calls. This is the whole "framework".

/**
 * el('div', {class: 'x', onclick: fn}, child, 'text', …)
 *
 * Properties starting with `on` become listeners; everything else is set
 * as an attribute. Null and undefined children are skipped, so callers can
 * write `cond && el(…)` inline.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2), v);
    } else {
      node.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Replaces a node's contents in one go. */
export function fill(node, ...children) {
  node.replaceChildren();
  return append(node, children);
}

/** The hostname of a URL, for the "↗ example.com" affordances. */
export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

/** 2026-09-21 → "Monday, 21 September 2026" */
export function longDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'UTC',
  });
}
