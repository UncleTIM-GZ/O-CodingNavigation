import { describe, expect, it } from "vitest";
import { injectFsFailure } from "../helpers/fs-failure.js";

describe("injectFsFailure helper", () => {
  it("creates an Error with code ENOSPC", () => {
    const err = injectFsFailure("ENOSPC", "writeFile");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("ENOSPC");
    expect(err.syscall).toBe("writeFile");
  });

  it("creates an Error with code EACCES", () => {
    const err = injectFsFailure("EACCES");
    expect(err.code).toBe("EACCES");
  });

  it("creates an Error with code EBUSY", () => {
    const err = injectFsFailure("EBUSY");
    expect(err.code).toBe("EBUSY");
  });
});
