import type { RunnerStep } from "slideshow-mel/src/protocol";

export const RUBICON_STEPS: RunnerStep[] = [
  {
    id: "intro",
    title: "Rubik-con",
    description: "A Rubik's cube solver and visualizer",
  },
  {
    id: "scan",
    title: "Scan",
    description: "Resetting and scanning all six faces",
  },
  {
    id: "solve",
    title: "Solve",
    description: "Solving the cube step by step",
  },
  {
    id: "reshuffle",
    title: "Reshuffle",
    description: "Returning the cube to its scrambled state",
  },
  {
    id: "solve-again",
    title: "Solve Again",
    description: "One more solve — watch closely",
  },
];
