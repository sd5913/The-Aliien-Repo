import type { PollOption } from "../../../types/poll";

// Keep the same option letter and color across voting, results, and comments.
export const optionColors = ["#e9a9ce", "#94bae5", "#98cfb7", "#b69bdf", "#db827e"];

export function optionColor(option: PollOption | undefined, index: number) {
  return optionColors[option?.colorIndex ?? index] ?? optionColors[0];
}

export function makeOption(existing: PollOption[], source?: PollOption): PollOption {
  const used = new Set(existing.map((option, index) => option.colorIndex ?? index));
  const available = optionColors.map((_, index) => index).filter(index => !used.has(index));
  return { ...source, id: crypto.randomUUID(), name: source?.name ?? "", colorIndex: available[Math.floor(Math.random() * available.length)] };
}

export function freshOptions(source: PollOption[]): PollOption[] {
  const options: PollOption[] = [];
  for (const option of source) {
    options.push(makeOption(options, option));
  }
  return options;
}
