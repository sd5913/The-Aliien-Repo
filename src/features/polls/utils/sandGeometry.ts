// The deformation has zero mean across x, so each band's area stays proportional
// to its vote count even while the device tilts. The derivative stays positive.
export function sandBoundary(fraction: number, x: number, tilt: number, phase: number) {
  return fraction + Math.sin(Math.PI * fraction) * (
    .065 * Math.sin(2 * Math.PI * x + phase) + .38 * tilt * (x - .5)
  );
}

export const sandColors = ["#bca2e8", "#efc29b", "#a4c8df", "#deacc8", "#acd1bd"];
