const Cube = require("cubejs");
Cube.initSolver();

export const solver = (cubeState: string) => {
  const cube = Cube.fromString(cubeState);
  const solution = cube.solve();
  return notationConverter(solution);
};

const notationConverter = (notation: string) => {
  const convertedNotation = moveNegationToAfterAction(notation);
  const moveList = convertedNotation.split(" ");
  return moveList;
};

const moveNegationToAfterAction = (notation: string) =>
  notation.replace(/(\w)(\')/, "$1$2");
