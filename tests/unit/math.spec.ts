import { describe, expect, it } from "vitest";
import { percentageDeviation, percentageExecution } from "../../src/common/utils/math";

describe("percentageDeviation", () => {
  it("calculates positive deviation", () => {
    expect(percentageDeviation(100, 120)).toBe(20);
  });

  it("returns 0 when both values are zero", () => {
    expect(percentageDeviation(0, 0)).toBe(0);
  });

  it("returns 100 when planned is zero and actual positive", () => {
    expect(percentageDeviation(0, 10)).toBe(100);
  });
});

describe("percentageExecution", () => {
  it("calculates execution share of budget", () => {
    expect(percentageExecution(100, 25)).toBe(25);
  });

  it("returns 0 when planned is zero", () => {
    expect(percentageExecution(0, 10)).toBe(0);
  });

  it("returns 100 when fully executed", () => {
    expect(percentageExecution(120_000, 120_000)).toBe(100);
  });
});
