import assert from "node:assert";
import { parseRows } from "./client";

// Happy path: dims + metrics flatten in order.
assert.deepStrictEqual(
  parseRows({
    rows: [
      {
        dimensionValues: [{ value: "20260723" }, { value: "web" }],
        metricValues: [{ value: "42" }],
      },
    ],
  }),
  [{ dims: ["20260723", "web"], metrics: [42] }],
);

// No rows → empty array (never throws).
assert.deepStrictEqual(parseRows({}), []);
assert.deepStrictEqual(parseRows(null), []);

// Missing metric value → 0, not NaN.
assert.deepStrictEqual(parseRows({ rows: [{ metricValues: [{}] }] }), [
  { dims: [], metrics: [0] },
]);

console.log("ga/client parseRows self-check passed");
