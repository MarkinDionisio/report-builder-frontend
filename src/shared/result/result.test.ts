import { describe, it, expect } from "vitest";
import { ok, err, isOk, isErr, fromAsyncTry } from "./result";

describe("Result Pattern Utility", () => {
  it("should create an Ok result", () => {
    const res = ok(42);
    expect(res.ok).toBe(true);
    expect(res.value).toBe(42);
    expect(isOk(res)).toBe(true);
    expect(isErr(res)).toBe(false);
  });

  it("should create an Err result", () => {
    const res = err("Something failed");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Something failed");
    expect(isOk(res)).toBe(false);
    expect(isErr(res)).toBe(true);
  });

  it("should wrap async function success in Ok", async () => {
    const fn = async () => "success data";
    const res = await fromAsyncTry(fn);
    expect(isOk(res)).toBe(true);
    if (isOk(res)) {
      expect(res.value).toBe("success data");
    }
  });

  it("should wrap async function failure in Err", async () => {
    const fn = async () => {
      throw new Error("Network timeout");
    };
    const res = await fromAsyncTry(fn);
    expect(isErr(res)).toBe(true);
    if (isErr(res)) {
      expect(res.error.message).toBe("Network timeout");
    }
  });
});
