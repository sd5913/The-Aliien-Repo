export type Point = { x: number; y: number };

type Piece = { index: number; weight: number };

export const chartSize = 360;

const inkFraction = .71;

function layoutRandom(pollId: string) {
  let state = 2166136261;
  for (const letter of pollId) state = Math.imul(state ^ letter.charCodeAt(0), 16777619);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function area(points: Point[]) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.y - p.y * q.x;
  }, 0) / 2;
}

function mix(a: Point, b: Point, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function clip(points: Point[], normal: Point, offset: number, side: number) {
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = side * (a.x * normal.x + a.y * normal.y - offset);
    const db = side * (b.x * normal.x + b.y * normal.y - offset);
    if (da <= 0) result.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) result.push(mix(a, b, da / (da - db)));
  }
  return result;
}

function bounds(points: Point[]) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

function makeShape(piece: Piece, cell: Point[], random: () => number) {
  const phase = random() * 2 * Math.PI;
  const middle = cell.reduce((c, p) => ({ x: c.x + p.x / cell.length, y: c.y + p.y / cell.length }), { x: 0, y: 0 });
  const controls = cell.flatMap((p, i) => {
    const edge = mix(p, cell[(i + 1) % cell.length], .28 + .44 * random());
    return [p, mix(edge, middle, .02 + .28 * random())];
  });
  // A periodic cubic B-spline keeps the tangent and curvature continuous at every join.
  const outline = controls.flatMap((a, i) => Array.from({ length: 20 }, (_, j) => {
    const b = controls[(i + 1) % controls.length], c = controls[(i + 2) % controls.length], d = controls[(i + 3) % controls.length];
    const t = j / 20, u = 1 - t;
    const wa = u ** 3 / 6, wb = (4 - 6 * t * t + 3 * t ** 3) / 6;
    const wd = t ** 3 / 6, wc = 1 - wa - wb - wd;
    return { x: wa * a.x + wb * b.x + wc * c.x + wd * d.x, y: wa * a.y + wb * b.y + wc * c.y + wd * d.y };
  }));
  // Use the polygon centroid so the label stays inside asymmetric contours.
  const signedArea = area(outline);
  const center = outline.reduce((c, p, i) => {
    const q = outline[(i + 1) % outline.length];
    const k = (p.x * q.y - q.x * p.y) / (6 * signedArea);
    return { x: c.x + (p.x + q.x) * k, y: c.y + (p.y + q.y) * k };
  }, { x: 0, y: 0 });
  const scale = Math.sqrt(inkFraction * area(cell) / signedArea);
  const points = outline.map(p => mix(center, p, scale));
  const box = bounds(points);
  return { ...piece, center, points, phase, box, outlineArea: area(points), width: box.right - box.left, height: box.bottom - box.top };
}

export function flowingOutline(shape: ReturnType<typeof makeShape>, time: number) {
  const { center, width, height, phase } = shape;
  const clock = time / 2300;
  const amplitude = Math.min(2.7, Math.min(width, height) * .023);
  const points = shape.points.map(p => {
    const u = (p.x - center.x) / width, v = (p.y - center.y) / height;
    return {
      x: p.x + amplitude * (Math.sin(v * 6 + clock + phase) - Math.sin(clock + phase)),
      y: p.y + amplitude * (Math.sin(u * 5 - clock * .76 + phase) - Math.sin(phase - clock * .76)),
    };
  });
  const scale = Math.sqrt(shape.outlineArea / area(points));
  return points.map(p => mix(center, p, scale));
}
export function resultShapes(pollId: string, counts: number[]) {
  const random = layoutRandom(pollId);
  const total = counts.reduce((a, b) => a + b, 0);
  const pieces = counts.map((weight, index) => ({ index, weight })).filter(piece => piece.weight > 0);
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  const shapes: ReturnType<typeof makeShape>[] = [];
  function divide(group: Piece[], weight: number, cell: Point[]) {
    if (group.length === 1) {
      shapes.push(makeShape(group[0], cell, random));
      return;
    }
    // Split near half the votes along the longer axis to avoid narrow stripes.
    let cut = 1, subtotal = group[0].weight;
    while (cut < group.length - 1 && Math.abs(subtotal + group[cut].weight - weight / 2) < Math.abs(subtotal - weight / 2)) {
      subtotal += group[cut++].weight;
    }
    const box = bounds(cell);
    const width = box.right - box.left, height = box.bottom - box.top;
    const vertical = Math.abs(width - height) < 1 ? random() < .5 : width > height;
    const angle = (vertical ? 0 : Math.PI / 2) + (random() - .5) * 1.18;
    const normal = { x: Math.cos(angle), y: Math.sin(angle) };
    const projections = cell.map(p => p.x * normal.x + p.y * normal.y);
    let low = Math.min(...projections), high = Math.max(...projections);
    const target = area(cell) * subtotal / weight;
    for (let i = 0; i < 48; i++) {
      const offset = (low + high) / 2;
      if (area(clip(cell, normal, offset, 1)) < target) low = offset;
      else high = offset;
    }
    const offset = (low + high) / 2;
    divide(group.slice(0, cut), subtotal, clip(cell, normal, offset, 1));
    divide(group.slice(cut), weight - subtotal, clip(cell, normal, offset, -1));
  }
  const low = 10, high = chartSize - low;
  if (pieces.length) divide(pieces, total, [{ x: low, y: low }, { x: high, y: low }, { x: high, y: high }, { x: low, y: high }]);
  return shapes;
}

export type Contact = { focus: Point; origin: Point; radius: number };

// Move both edges of the grabbed shape. The leading edge yields first near
// a wall; neighboring contours share the same continuous compression field.
function dragAxis(value: number, from: number, to: number, delta: number) {
  const reach = Math.abs(delta) + 52;
  const low = Math.min(from, Math.max(8, from - reach));
  const high = Math.max(to, Math.min(chartSize - 8, to + reach));
  if (value <= low || value >= high || !delta) return value;
  const shift = (edge: number) => Math.max((low - edge) * .84, Math.min((high - edge) * .84, delta));
  const a = shift(from), b = shift(to);
  const blend = Math.min(10, (from - low) / 2, (high - to) / 2, (to - from) / 3);
  const innerSlope = (b - a) / (to - from);
  // Round the change in compression across each edge of the dragged region.
  if (blend > 0 && (Math.abs(value - from) < blend || Math.abs(value - to) < blend)) {
    const first = Math.abs(value - from) < blend;
    const offset = value - (first ? from : to);
    const before = first ? a / (from - low) : innerSlope;
    const after = first ? innerSlope : -b / (high - to);
    return value + (first ? a : b) + before * offset + (after - before) * (offset + blend) ** 2 / (4 * blend);
  }
  if (value < from) return value + a * (value - low) / (from - low);
  if (value > to) return value + b * (high - value) / (high - to);
  return value + a + (b - a) * (value - from) / (to - from);
}

function proximity(value: number, low: number, high: number) {
  const t = Math.max(0, 1 - Math.max(0, low - value, value - high) / 52);
  return t * t * (3 - 2 * t);
}

export function dragPoint(point: Point, box: ReturnType<typeof bounds>, delta: Point): Point {
  const x = dragAxis(point.x, box.left, box.right, delta.x * proximity(point.y, box.top, box.bottom));
  const left = dragAxis(box.left, box.left, box.right, delta.x);
  const right = dragAxis(box.right, box.left, box.right, delta.x);
  return { x, y: dragAxis(point.y, box.top, box.bottom, delta.y * proximity(x, left, right)) };
}

// A short hop ends in a squash and a damped rebound. Reciprocal axis
// scales preserve the outline's area throughout the animation.
export function jellyPose(time: number, height: number) {
  const cycle = time / 1000;
  const flight = .46;
  const landing = Math.max(0, cycle - flight);
  const arc = cycle < flight ? Math.sin(Math.PI * cycle / flight) : 0;
  const rebound = Math.exp(-6 * landing) * Math.sin(19 * landing);
  const scaleY = 1 + .032 * arc - .085 * rebound;
  const dy = -Math.min(5, height * .012) * arc + Math.max(0, 1 - scaleY) * height * .33;
  return { scaleY, scaleX: 1 / scaleY, dy };
}

// A single smooth displacement field moves both sides of a gap consistently.
// Beyond the contact radius every vertex stays at its resting position.
export function pressPoint(point: Point, contact: Contact, strength: number): Point {
  const distance = Math.hypot(point.x - contact.focus.x, point.y - contact.focus.y);
  if (distance >= contact.radius || !strength) return point;
  const dx = point.x - contact.origin.x, dy = point.y - contact.origin.y;
  const falloff = (1 - (distance / contact.radius) ** 2) ** 2;
  const scale = strength * falloff * Math.min(.30, 10 / (Math.hypot(dx, dy) || 1));
  return { x: point.x + dx * scale, y: point.y + dy * scale };
}
