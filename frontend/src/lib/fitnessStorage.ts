import { CUSTOM_FITNESS_TEMPLATE } from "../examples/problems";

const KEY = "ge-visualizer.fitness";

/**
 * The custom fitness function is kept on this machine only. It is deliberately
 * kept out of the shareable URL: a link carrying Python would otherwise run
 * someone else's code in your browser.
 */
export function readFitnessSource(): string {
  try {
    return window.localStorage.getItem(KEY) ?? CUSTOM_FITNESS_TEMPLATE;
  } catch {
    return CUSTOM_FITNESS_TEMPLATE;
  }
}

export function writeFitnessSource(source: string): void {
  try {
    window.localStorage.setItem(KEY, source);
  } catch {
    // localStorage can be unavailable (private mode); the editor still works.
  }
}
