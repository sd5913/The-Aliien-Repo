import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./sandGeometry.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText;
const { sandBoundary } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

for (const fractions of [[.6, .4], [.8, 0, .2], [1], [.01, .01, .98], [.25, .25, .25, .25]]) {
  for (const tilt of [-1, 0, 1]) {
    for (const phase of [0, 1, 3, 5]) {
      let start = 0;
      for (const fraction of fractions) {
        const end = start + fraction;
        let area = 0;
        const steps = 1000;
        for (let step = 0; step <= steps; step++) {
          const x = step / steps;
          const top = sandBoundary(start, x, tilt, phase);
          const bottom = sandBoundary(end, x, tilt, phase);
          assert.ok(top >= -1e-12 && bottom <= 1 + 1e-12, "Boundaries stay inside the square");
          assert.ok(bottom >= top - 1e-12, "Regions never overlap or invert");
          area += (bottom - top) * (step === 0 || step === steps ? .5 : 1) / steps;
        }
        assert.ok(Math.abs(area - fraction) < 1e-10, `Area ${area} must equal vote share ${fraction}`);
        start = end;
      }
    }
  }
}
console.log("Sand area checks passed: exact proportions, zero votes, single winner, thin regions, and tilt extremes.");
