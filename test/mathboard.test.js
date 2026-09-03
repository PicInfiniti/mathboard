import assert from "node:assert/strict";
import test from "node:test";

import { coordinateLabelInterval, formatCoordinate } from "../src/mathboard/coordinates.js";
import {
  isSupportedProject,
  PROJECT_FORMAT,
  sanitizeImportedStroke,
  uniqueImportedName,
} from "../src/mathboard/project.js";
import {
  createCanvasRecord,
  createInitialState,
  hydrateState,
  normalizeToolSizes,
} from "../src/mathboard/state.js";
import { createProjectStorage } from "../src/mathboard/storage.js";

test("creates an independent initial canvas state", () => {
  const state = createInitialState();

  assert.equal(state.canvases.length, 1);
  assert.equal(state.activeCanvasId, state.canvases[0].id);
  assert.equal(state.toolSizes.pen, 5);
});

test("normalizes tool sizes and persisted canvas settings", () => {
  assert.deepEqual(normalizeToolSizes({ pen: 99, eraser: 0 }, 7), {
    pen: 30,
    highlighter: 7,
    eraser: 1,
  });

  const currentState = createInitialState();
  const savedCanvas = createCanvasRecord("Notes", { zoom: 99, axisFontSize: 4 });
  const restored = hydrateState({ canvases: [savedCanvas], activeCanvasId: savedCanvas.id }, currentState);

  assert.equal(restored.state.zoom, 8);
  assert.equal(restored.state.axisFontSize, 12);
  assert.equal(restored.state.canvases[0].name, "Notes");
});

test("formats coordinate labels at readable intervals", () => {
  assert.equal(coordinateLabelInterval(1, 13), 2);
  assert.equal(coordinateLabelInterval(.25, 13), 8);
  assert.equal(formatCoordinate(-0.00001), "0");
  assert.equal(formatCoordinate(1.234), "1.23");
});

test("validates and sanitizes imported projects", () => {
  assert.equal(isSupportedProject({ format: PROJECT_FORMAT, version: 1, canvases: [{}] }), true);
  assert.equal(isSupportedProject({ format: PROJECT_FORMAT, version: 2, canvases: [{}] }), false);

  const budget = { remaining: 1 };
  const stroke = sanitizeImportedStroke({
    tool: "pen",
    color: "#123456",
    size: 100,
    points: [{ x: 200, y: -200, pressure: 2 }, { x: 1, y: 1 }],
  }, budget);

  assert.deepEqual(stroke.points, [{ x: 100, y: -100, pressure: 1 }]);
  assert.equal(stroke.size, 30);
  assert.equal(budget.remaining, 0);
});

test("generates unique imported canvas names", () => {
  const usedNames = new Set(["canvas"]);

  assert.equal(uniqueImportedName("Canvas", usedNames), "Canvas 2");
  assert.equal(uniqueImportedName("Canvas", usedNames), "Canvas 3");
});

test("migrates legacy local storage into MathBoard storage", async () => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalLocalStorage = globalThis.localStorage;
  const values = new Map([["math-1280-whiteboard-v1", JSON.stringify({ canvases: [{ name: "Saved" }] })]]);
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
  delete globalThis.indexedDB;

  try {
    const storage = createProjectStorage();
    const loaded = await storage.load();
    assert.equal(loaded.needsMigration, true);
    assert.equal(loaded.saved.canvases[0].name, "Saved");
    assert.equal(await storage.save(loaded.saved), "local-storage");
    assert.equal(JSON.parse(values.get("mathboard-v1")).canvases[0].name, "Saved");
  } finally {
    if (originalIndexedDb === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = originalIndexedDb;
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  }
});
