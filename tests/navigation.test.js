import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTabAction } from "../src/navigation.js";

describe("resolveTabAction", () => {
  it("opens background tab when disposition is newBackgroundTab", () => {
    assert.deepEqual(resolveTabAction("newBackgroundTab", false), {
      method: "create",
      active: false,
    });
    assert.deepEqual(resolveTabAction("newBackgroundTab", true), {
      method: "create",
      active: false,
    });
  });

  it("opens foreground tab when disposition is newForegroundTab", () => {
    assert.deepEqual(resolveTabAction("newForegroundTab", false), {
      method: "create",
      active: true,
    });
  });

  it("honors preferNewTab on plain currentTab disposition", () => {
    assert.deepEqual(resolveTabAction("currentTab", true), {
      method: "create",
      active: true,
    });
    assert.deepEqual(resolveTabAction("currentTab", false), {
      method: "update",
    });
  });
});
