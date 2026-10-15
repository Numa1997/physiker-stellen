// The static copy has no accounts. These keep page.js unchanged; the
// "Sign out" button is hidden by static.css.
export const signedIn = () => false;
export async function ensureSignedIn() {}
export async function signOut() { location.reload(); }
