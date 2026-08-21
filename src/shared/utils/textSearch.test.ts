import { describe, expect, it } from "vitest";
import { matchesTextSearch } from "./textSearch";

describe("matchesTextSearch", () => {
  it("ignores case and searches partial text by default", () => expect(matchesTextSearch("SalesOrders", "sales", { matchCase: false, exactMatch: false })).toBe(true));
  it("can differentiate uppercase and lowercase letters", () => expect(matchesTextSearch("SalesOrders", "sales", { matchCase: true, exactMatch: false })).toBe(false));
  it("can require an exact expression", () => {
    expect(matchesTextSearch("SalesOrders", "Sales", { matchCase: true, exactMatch: true })).toBe(false);
    expect(matchesTextSearch("SalesOrders", "SalesOrders", { matchCase: true, exactMatch: true })).toBe(true);
  });
});
