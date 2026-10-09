// Stand-in for the live app's src/claude/view/dom.js: the three helpers page.js imports, same behaviour.
// (The live file also holds hover(), chevron() and longDate(), which the current page does not use.)
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'href' && !String(v).startsWith('#')) {
      try { if (!['https:', 'http:'].includes(new URL(String(v)).protocol)) continue; } catch { continue; }
    }
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  return append(node, children);
}
export function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
export function fill(node, ...children) {
  node.replaceChildren();
  return append(node, children);
}
export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url ?? ''; }
}
