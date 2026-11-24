import type { PollOption } from "../../../types/poll";

// Keep the same option letter and color across voting, results, and comments.
export const optionColors = ["#FADCFE", "#C7F3F6", "#A4C6E9", "#838BCC", "#FFC8DD"];

export function optionColor(option: PollOption | undefined, index: number) {
  return optionColors[option?.colorIndex ?? index] ?? optionColors[0];
}

// Every backend stores the UUID, including versions that omit color_index.
function colorFromId(id: string) {
  return parseInt(id.slice(0, 8), 16) % optionColors.length;
}

export function resolveOptionColors(options: PollOption[]): PollOption[] {
  const used = new Set(options.map(option => option.colorIndex));
  return options.map(option => {
    if (option.colorIndex !== undefined) return option;
    const preferred = colorFromId(option.id);
    const available = optionColors.map((_, offset) => (preferred + offset) % optionColors.length);
    const colorIndex = available.find(index => !used.has(index)) ?? preferred;
    used.add(colorIndex);
    return { ...option, colorIndex };
  });
}

export function makeOption(existing: PollOption[], source?: PollOption): PollOption {
  const used = new Set(existing.map(option => option.colorIndex));
  let id = crypto.randomUUID();
  while (used.has(colorFromId(id))) id = crypto.randomUUID();
  return { ...source, id, name: source?.name ?? "", colorIndex: colorFromId(id) };
}

export function freshOptions(source: PollOption[]): PollOption[] {
  const options: PollOption[] = [];
  for (const option of source) {
    options.push(makeOption(options, option));
  }
  return options;
}
