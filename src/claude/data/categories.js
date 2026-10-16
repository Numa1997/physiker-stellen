// The eleven categories, the two boards and their areas. The page and the
// server both read them from here, so a card can only ever sit in one of
// these. Each area belongs to one board (its third field): the Germany board
// and the Europe board (outside Germany) show the same categories, each with
// its own three areas.
export const CATEGORIES = [
  ['content', 'Content creation (not school teaching)'],
  ['ai', 'AI training on physics & maths'],
  ['data', 'Data analyst'],
  ['computational', 'Computational scientist'],
  ['numerical', 'Numerical methods'],
  ['systems', 'Systems engineer'],
  ['physiker', '“Physiker” in the job title'],
  ['pm', 'Project management'],
  ['production', 'Production supervisor'],
  ['energy', 'Energy sector'],
  ['testing', 'Device testing & measurement (test, calibrate, qualify, build test rigs)'],
];
export const BOARDS = [
  ['de', 'Germany'],
  ['eu', 'Europe'],
];
export const AREAS = [
  ['berlin', 'Berlin', 'de'],
  ['leipzig', 'Leipzig area', 'de'],
  ['de', 'Rest of Germany', 'de'],
  ['benelux', 'Benelux', 'eu'],
  ['nordics', 'Nordics', 'eu'],
  ['europe', 'Rest of Europe', 'eu'],
];
export const CATEGORY_KEYS = CATEGORIES.map(([key]) => key);
export const AREA_KEYS = AREAS.map(([key]) => key);
