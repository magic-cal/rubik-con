export const FALSE_SHUFFLE = [
  "R",
  "U",
  "R'",
  "U'",
  "R'",
  "F",
  "R2",
  "U'",
  "R'",
  "U'",
  "R",
  "U",
  "R'",
  "F'",
  "R",
  "U",
  "R'",
  "U'",
  "R'",
  "F",
  "R2",
  "U'",
  "R'",
  "U'",
  "R",
  "U",
  "R'",
  "F'",
];
export const RUBICON_SOLVE = ["B'", "L'", "F'", "R'", "B'", "L'", "F'"];
export const RUBICON_SETUP = ["F", "L", "B", "R", "F", "L", "B"];

export const EXTENDED_RUBICON_SOLVE = [
  ...RUBICON_SOLVE.slice(0, 3),
  ...FALSE_SHUFFLE,
  ...RUBICON_SOLVE.slice(3),
];

export const RUBICON_SETUP_AND_SOLVE = [...RUBICON_SETUP, ...RUBICON_SOLVE];
