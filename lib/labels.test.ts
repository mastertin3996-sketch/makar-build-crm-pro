import { describe, it, expect } from "vitest";
import {
  SHIPMENT_FLOW,
  formatDuration,
  monthKey,
  monthLabel,
} from "@/lib/labels";

// SHIPMENT_FLOW is not just a label dictionary: app/(app)/logistics/actions.ts
// walks it with `indexOf` to auto-advance a shipment to the next status, so
// its order and terminal boundaries are load-bearing logic worth locking down.
describe("SHIPMENT_FLOW", () => {
  it("defines the expected auto-advance sequence, in order", () => {
    expect(SHIPMENT_FLOW).toEqual([
      "CREATED",
      "ACCEPTED",
      "IN_TRANSIT",
      "ARRIVED",
      "DELIVERED",
    ]);
  });

  it("has DELIVERED as the final (terminal) step", () => {
    expect(SHIPMENT_FLOW[SHIPMENT_FLOW.length - 1]).toBe("DELIVERED");
  });

  it("contains no duplicate statuses (each step reachable exactly once via indexOf)", () => {
    const unique = new Set(SHIPMENT_FLOW);
    expect(unique.size).toBe(SHIPMENT_FLOW.length);
  });
});

describe("formatDuration", () => {
  it("formats whole minutes with zero-padded seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(125)).toBe("2:05");
  });
});

describe("monthKey / monthLabel", () => {
  it("builds a YYYY-MM key from a date, zero-padding the month", () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe("2026-01");
    expect(monthKey(new Date(2026, 10, 1))).toBe("2026-11");
  });

  it("accepts a date string as well as a Date object", () => {
    expect(monthKey("2026-08-01")).toBe("2026-08");
  });

  it("round-trips a monthKey into a non-empty localized label", () => {
    const label = monthLabel("2026-08");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });
});
