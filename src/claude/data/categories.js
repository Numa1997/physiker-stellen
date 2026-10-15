// The eleven categories and three areas. The page and the server both read
// them from here, so a card can only ever sit in one of these.
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
export const AREAS = [
  ['berlin', 'Berlin'],
  ['leipzig', 'Leipzig area'],
  ['de', 'Rest of Germany'],
];
export const CATEGORY_KEYS = CATEGORIES.map(([key]) => key);
export const AREA_KEYS = AREAS.map(([key]) => key);
