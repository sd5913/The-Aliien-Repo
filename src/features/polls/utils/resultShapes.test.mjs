import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./resultShapes.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
const { resultShapes, pressPoint } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function area(points) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + (p.x * q.y - q.x * p.y) / 2;
  }, 0);
}

const splitSizes = new Set();
for (let seed = 0; seed < 80; seed++) {
  for (const counts of [[1, 1, 1, 1, 1], [999, 1, 0], [1, 0], [31, 44, 25], [0, 0]]) {
    const shapes = resultShapes(String(seed), counts);
    const areas = counts.map(() => 0);
    for (const shape of shapes) areas[shape.index] += area(shape.points);
    const votes = counts.reduce((a, b) => a + b, 0);
    const ink = areas.reduce((a, b) => a + b, 0);
    counts.forEach((count, index) => {
      const pieces = shapes.filter(shape => shape.index === index);
      assert.equal(pieces.filter(p => p.main).length, Number(count > 0));
      if (votes) assert.ok(Math.abs(areas[index] / ink - count / votes) < 1e-10);
      if (count === 999) splitSizes.add(pieces.length);
      if (pieces.length > 1) {
        assert.ok(pieces.length <= 3);
        assert.ok(pieces.find(p => p.main).weight > count / 2);
      }
    });
  }
}
assert.deepEqual([...splitSizes].sort(), [1, 2, 3]);
const gap = { focus: { x: 50, y: 50 }, origin: { x: 50, y: 50 }, radius: 78 };
assert.ok(pressPoint({ x: 45, y: 50 }, gap, 1).x < 45);
assert.ok(pressPoint({ x: 55, y: 50 }, gap, 1).x > 55);
const far = { x: 0, y: 210 };
assert.deepEqual(pressPoint(far, gap, 1), far);
const shape = resultShapes("tap", [6, 4])[0];
const block = { focus: shape.center, origin: shape.center, radius: 200 };
assert.ok(area(shape.points.map(p => pressPoint(p, block, 1))) > area(shape.points));
console.log("Verified visible area shares, split sizes, local expansion and unaffected distant points.");
