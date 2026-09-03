import assert from "node:assert/strict";
import test from "node:test";

import { coordinateLabelInterval, formatCoordinate } from "../src/mathboard/coordinates.js";
import { renderStroke, shapeLength } from "../src/mathboard/drawing.js";
import { recognizeAssistedShape } from "../src/mathboard/shape-assist.js";
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

test("restores current and legacy draw assist settings", () => {
  const currentState = createInitialState();
  const restored = hydrateState({ ...currentState, drawAssist: true }, currentState);
  const migrated = hydrateState({ ...currentState, assistTool: "circle" }, currentState);
  const disabled = hydrateState({ ...currentState, assistTool: "triangle" }, currentState);

  assert.equal(restored.state.drawAssist, true);
  assert.equal(migrated.state.drawAssist, true);
  assert.equal(disabled.state.drawAssist, false);
});

test("automatically recognizes confident line and circle gestures", () => {
  const line = recognizeAssistedShape([
    { x: .1, y: .2 },
    { x: .3, y: .31 },
    { x: .5, y: .39 },
    { x: .8, y: .56 },
  ], 100, 100);
  assert.equal(line.tool, "line");
  assert.equal(line.points.length, 2);
  assert.ok(Math.hypot((line.points[1].x - line.points[0].x) * 100, (line.points[1].y - line.points[0].y) * 100) > 75);

  const circlePoints = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return {
      x: .5 + (.2 * Math.cos(angle)) + (index % 2 ? .01 : -.01),
      y: .45 + (.2 * Math.sin(angle)),
    };
  });
  const circle = recognizeAssistedShape(circlePoints, 200, 200);
  assert.equal(circle.tool, "circle");
  assert.equal(circle.points.length, 2);
  assert.ok(Math.abs(((circle.points[0].x + circle.points[1].x) / 2) - .5) < .015);
  assert.ok(Math.abs(circle.points[0].y - .45) < .015);
  assert.ok(Math.abs((circle.points[1].x - circle.points[0].x) - .4) < .015);

  const wideOval = Array.from({ length: 25 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2.12;
    return {
      x: .5 + (.3 * Math.cos(angle)) + (index % 3 === 0 ? .006 : 0),
      y: .5 + (.13 * Math.sin(angle)) + (index % 4 === 0 ? -.004 : 0),
    };
  });
  const ovalAsCircle = recognizeAssistedShape(wideOval, 400, 400);
  assert.equal(ovalAsCircle.tool, "circle");
  assert.equal(ovalAsCircle.points.length, 2);
});

test("leaves handwritten zeroes, ones, and ambiguous strokes freehand", () => {
  const zero = Array.from({ length: 17 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { x: .25 + (.07 * Math.cos(angle)), y: .3 + (.15 * Math.sin(angle)) };
  });
  const one = [
    { x: .18, y: .22 },
    { x: .22, y: .17 },
    { x: .22, y: .42 },
    { x: .18, y: .45 },
    { x: .27, y: .45 },
  ];
  const compactRoundZero = Array.from({ length: 17 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { x: .55 + (.08 * Math.cos(angle)), y: .3 + (.08 * Math.sin(angle)) };
  });
  const simpleOne = [
    { x: .7, y: .2 },
    { x: .7, y: .27 },
    { x: .7, y: .34 },
    { x: .7, y: .4 },
  ];

  assert.equal(recognizeAssistedShape(zero, 200, 200), null);
  assert.equal(recognizeAssistedShape(compactRoundZero, 200, 200), null);
  assert.equal(recognizeAssistedShape(one, 200, 200), null);
  assert.equal(recognizeAssistedShape(simpleOne, 200, 200), null);
  assert.equal(recognizeAssistedShape([{ x: .1, y: .1 }, { x: .2, y: .2 }], 200, 200), null);
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
