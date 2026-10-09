// Stand-in for src/claude/data/marks-repo.js (the live app saves Applied / Not relevant on the server).
export async function saveMark(key, patch) { return { item_id: key, ...patch }; }
export async function loadMarks() { return new Map(); }
