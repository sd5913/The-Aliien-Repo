export type Point = { x: number; y: number };
type Cell = Point & { width: number; height: number };
type Piece = { index: number; weight: number; main: boolean };

export const chartSize = 360;
const samples = 96;
const inkFraction = .76;

function layoutRandom(pollId: string) {
  let state = 2166136261;
  for (const letter of pollId) state = Math.imul(state ^ letter.charCodeAt(0), 16777619);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Fit the actual sampled outline to a common filled fraction of each cell.
// This keeps the total visible area proportional even after splitting an option.
function shape(piece: Piece, cell: Cell, random: () => number) {
  const phase = random() * 2 * Math.PI;
  const exponent = .69 + random() * .12;
  const outline = Array.from({ length: samples }, (_, i) => {
    const angle = i * 2 * Math.PI / samples;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const radius = .5 + .008 * Math.sin(3 * angle + phase);
    return {
      x: radius * Math.sign(cos) * Math.abs(cos) ** exponent,
      y: radius * Math.sign(sin) * Math.abs(sin) ** exponent,
    };
  });
  const area = outline.reduce((sum, p, i) => {
    const next = outline[(i + 1) % samples];
    return sum + (p.x * next.y - next.x * p.y) / 2;
  }, 0);
  const scale = Math.sqrt(inkFraction / area);
  const center = { x: cell.x + cell.width / 2, y: cell.y + cell.height / 2 };
  const points = outline.map(p => ({
    x: center.x + p.x * scale * cell.width,
    y: center.y + p.y * scale * cell.height,
  }));
  return { ...piece, center, points, phase, width: cell.width, height: cell.height };
}

export function resultShapes(pollId: string, counts: number[]) {
  const random = layoutRandom(pollId);
  const total = counts.reduce((a, b) => a + b, 0);
  const pieces: Piece[] = [];
  counts.forEach((weight, index) => {
    const chance = random(), second = random(), fraction = .11 + random() * .07;
    if (!weight) return;
    const share = weight / total;
    const satellites = share >= .30 && chance < .80 ? (share >= .44 && second < .55 ? 2 : 1) : 0;
    const small = weight * fraction;
    pieces.push({ index, main: true, weight: weight - satellites * small });
    for (let i = 0; i < satellites; i++) pieces.push({ index, main: false, weight: small });
  });
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  const shapes: ReturnType<typeof shape>[] = [];
  function divide(group: Piece[], weight: number, cell: Cell) {
    if (group.length === 1) {
      shapes.push(shape(group[0], cell, random));
      return;
    }
    // Split near half the votes along the longer axis to avoid narrow stripes.
    let cut = 1, subtotal = group[0].weight;
    while (cut < group.length - 1 && Math.abs(subtotal + group[cut].weight - weight / 2) < Math.abs(subtotal - weight / 2)) {
      subtotal += group[cut++].weight;
    }
    const vertical = cell.width === cell.height ? random() < .5 : cell.width > cell.height;
    const dimension = vertical ? "width" : "height";
    const axis = vertical ? "x" : "y";
    const span = cell[dimension] * subtotal / weight;
    divide(group.slice(0, cut), subtotal, { ...cell, [dimension]: span });
    divide(group.slice(cut), weight - subtotal, { ...cell, [axis]: cell[axis] + span, [dimension]: cell[dimension] - span });
  }
  if (pieces.length) divide(pieces, total, { x: 9, y: 9, width: chartSize - 18, height: chartSize - 18 });
  return shapes;
}

export type Contact = { focus: Point; origin: Point; radius: number };

// A single smooth displacement field moves both sides of a gap consistently.
// Beyond the contact radius every vertex stays at its resting position.
export function pressPoint(point: Point, contact: Contact, strength: number): Point {
  const distance = Math.hypot(point.x - contact.focus.x, point.y - contact.focus.y);
  if (distance >= contact.radius || !strength) return point;
  const dx = point.x - contact.origin.x, dy = point.y - contact.origin.y;
  const falloff = (1 - (distance / contact.radius) ** 2) ** 2;
  const scale = strength * falloff * Math.min(.23, 7 / (Math.hypot(dx, dy) || 1));
  return { x: point.x + dx * scale, y: point.y + dy * scale };
}
