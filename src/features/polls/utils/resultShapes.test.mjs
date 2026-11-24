import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./resultShapes.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
const { resultShapes, pressPoint, flowingOutline, jellyPose } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function area(points) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + (p.x * q.y - q.x * p.y) / 2;
  }, 0);
}

for (let seed = 0; seed < 80; seed++) {
  for (const counts of [[1, 1, 1, 1, 1], [999, 1, 0], [1, 0], [31, 44, 25], [0, 0]]) {
    const shapes = resultShapes(String(seed), counts);
    const areas = counts.map(() => 0);
    for (const shape of shapes) areas[shape.index] += area(shape.points);
    const votes = counts.reduce((a, b) => a + b, 0);
    const ink = areas.reduce((a, b) => a + b, 0);
    counts.forEach((count, index) => {
      const pieces = shapes.filter(shape => shape.index === index);
      assert.equal(pieces.length, Number(count > 0));
      if (votes) assert.ok(Math.abs(areas[index] / ink - count / votes) < 1e-10);
    });
  }
}
for (const shape of resultShapes("bounce", [51, 29, 15, 4, 1])) {
  const restArea = area(shape.points);
  for (let time = 0; time < 14000; time += 32) {
    const pose = jellyPose(time, shape.height);
    const flowing = flowingOutline(shape, time);
    assert.ok(flowing.every((p, i) => Math.hypot(p.x - shape.points[i].x, p.y - shape.points[i].y) < 12));
    const points = flowing.map(p => ({
      x: (p.x - shape.center.x) * pose.scaleX,
      y: (p.y - shape.center.y) * pose.scaleY + pose.dy,
    }));
    assert.ok(Math.abs(area(points) / restArea - 1) < 1e-10);
    assert.ok(points.every(p => p.x + shape.center.x > 0 && p.x + shape.center.x < 360 && p.y + shape.center.y > 0 && p.y + shape.center.y < 360));
  }
}
const gap = { focus: { x: 50, y: 50 }, origin: { x: 50, y: 50 }, radius: 78 };
assert.ok(pressPoint({ x: 45, y: 50 }, gap, 1).x < 45);
assert.ok(pressPoint({ x: 55, y: 50 }, gap, 1).x > 55);
const far = { x: 0, y: 210 };
assert.deepEqual(pressPoint(far, gap, 1), far);
const shape = resultShapes("tap", [6, 4])[0];
const block = { focus: shape.center, origin: shape.center, radius: 200 };
assert.ok(area(shape.points.map(p => pressPoint(p, block, 1))) > area(shape.points));
console.log("Verified proportional outlines, bounce bounds and local pressure.");
