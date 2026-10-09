// Stand-in for src/claude/data/added-repo.js (the live app saves postings added by hand on the server).
export async function addPosting(p) { return { item_id: 'a' + Date.now(), added_at: new Date().toISOString(), ...p }; }
export async function deleteAdded() {}
