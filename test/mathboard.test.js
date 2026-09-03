import assert from "node:assert/strict";
import test from "node:test";

import { coordinateLabelInterval, formatCoordinate } from "../src/mathboard/coordinates.js";
import { renderStroke, shapeLength } from "../src/mathboard/drawing.js";
import { fitAssistedShape } from "../src/mathboard/shape-assist.js";
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

test("restores a valid draw assist setting", () => {
  const currentState = createInitialState();
  const restored = hydrateState({ ...currentState, assistTool: "circle" }, currentState);
  const invalid = hydrateState({ ...currentState, assistTool: "triangle" }, currentState);

  assert.equal(restored.state.assistTool, "circle");
  assert.equal(invalid.state.assistTool, null);
});

test("fits rough freehand gestures into assisted shapes", () => {
  const line = fitAssistedShape("line", [
    { x: .1, y: .2 },
    { x: .3, y: .31 },
    { x: .5, y: .39 },
    { x: .8, y: .56 },
  ], 100, 100);
  assert.equal(line.length, 2);
  assert.ok(Math.hypot((line[1].x - line[0].x) * 100, (line[1].y - line[0].y) * 100) > 75);

  const circlePoints = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { x: .5 + (.2 * Math.cos(angle)), y: .45 + (.2 * Math.sin(angle)) };
  });
  const circle = fitAssistedShape("circle", circlePoints, 200, 200);
  assert.equal(circle.length, 2);
  assert.ok(Math.abs(((circle[0].x + circle[1].x) / 2) - .5) < .001);
  assert.ok(Math.abs(circle[0].y - .45) < .001);
  assert.ok(Math.abs((circle[1].x - circle[0].x) - .4) < .001);
  assert.equal(fitAssistedShape("circle", circlePoints.slice(0, 2), 200, 200), null);
});

test("renders assisted lines and circles as exact geometry", () => {
  const calls = [];
  const context = {
    arc: (...args) => calls.push(["arc", ...args]),
    beginPath: () => calls.push(["beginPath"]),
    lineTo: (...args) => calls.push(["lineTo", ...args]),
    moveTo: (...args) => calls.push(["moveTo", ...args]),
    restore: () => calls.push(["restore"]),
    save: () => calls.push(["save"]),
    stroke: () => calls.push(["stroke"]),
  };
  const points = [{ x: .1, y: .1 }, { x: .4, y: .3 }];

  assert.equal(shapeLength({ points }, 100, 200), 50);
  renderStroke(context, { tool: "line", color: "#000", size: 4, points }, 100, 200);
  assert.deepEqual(calls.find(([name]) => name === "moveTo"), ["moveTo", 10, 20]);
  assert.deepEqual(calls.find(([name]) => name === "lineTo"), ["lineTo", 40, 60]);

  calls.length = 0;
  renderStroke(context, { tool: "circle", color: "#000", size: 4, points }, 100, 200);
  assert.deepEqual(calls.find(([name]) => name === "arc"), ["arc", 25, 40, 25, 0, Math.PI * 2]);
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

  const circle = sanitizeImportedStroke({
    tool: "circle",
    points: [{ x: .1, y: .2 }, { x: .5, y: .6 }],
  }, { remaining: 2 });
  assert.equal(circle.tool, "circle");
  assert.equal(circle.points.length, 2);
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
