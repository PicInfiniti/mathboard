import assert from "node:assert/strict";
import test from "node:test";

import { coordinateLabelInterval, formatCoordinate } from "../src/mathboard/coordinates.js";
import { renderStroke, shapeLength, strokeWidth } from "../src/mathboard/drawing.js";
import {
  associateEraser,
  associateLegacyErasers,
  eraserMasksForStroke,
  strokeIntersectsEraser,
} from "../src/mathboard/object-eraser.js";
import { recognizeAssistedShape } from "../src/mathboard/shape-assist.js";
import {
  applyTransformEntry,
  findStrokeAt,
  oppositeAnchor,
  scaledPoints,
  selectionGeometry,
  strokeBounds,
  translatedPoints,
} from "../src/mathboard/selection.js";
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

test("selects, moves, and proportionally resizes stroke objects", () => {
  const line = {
    tool: "line",
    size: 4,
    points: [{ x: .1, y: .2 }, { x: .4, y: .5 }],
  };
  const circle = {
    tool: "circle",
    size: 4,
    points: [{ x: .55, y: .5 }, { x: .85, y: .5 }],
  };

  assert.equal(findStrokeAt([line, circle], { x: 25, y: 35 }, 100, 100, 1), 0);
  assert.equal(findStrokeAt([line, circle], { x: 70, y: 35 }, 100, 100, 1), 1);
  assert.equal(findStrokeAt([line, circle], { x: 5, y: 90 }, 100, 100, 1), null);

  assert.deepEqual(strokeBounds(circle, 100, 100), { left: 55, top: 35, right: 85, bottom: 65 });
  const geometry = selectionGeometry(line, 100, 100, 1);
  const anchor = oppositeAnchor(geometry.bounds, "se");
  assert.deepEqual(anchor, { x: 10, y: 20 });

  const moved = translatedPoints(line.points, 10, -5, 100, 100);
  assert.ok(Math.abs(moved[0].x - .2) < .000001 && Math.abs(moved[0].y - .15) < .000001);
  assert.ok(Math.abs(moved[1].x - .5) < .000001 && Math.abs(moved[1].y - .45) < .000001);

  const resized = scaledPoints(line.points, anchor, 2, 100, 100);
  assert.ok(Math.abs(resized[0].x - .1) < .000001 && Math.abs(resized[0].y - .2) < .000001);
  assert.ok(Math.abs(resized[1].x - .7) < .000001 && Math.abs(resized[1].y - .8) < .000001);

  const strokes = [{ ...line, points: resized }];
  const historyEntry = {
    tool: "transform",
    targetIndex: 0,
    beforePoints: line.points,
    afterPoints: resized,
  };
  assert.equal(applyTransformEntry(strokes, historyEntry, "beforePoints"), true);
  assert.deepEqual(strokes[0].points, line.points);
  assert.equal(applyTransformEntry(strokes, historyEntry, "afterPoints"), true);
  assert.deepEqual(strokes[0].points, resized);
});

test("associates erasures with affected objects so their masks can move with them", () => {
  const first = {
    tool: "pen",
    color: "#000",
    size: 4,
    points: [{ x: .1, y: .2 }, { x: .8, y: .2 }],
  };
  const second = {
    tool: "pen",
    color: "#000",
    size: 4,
    points: [{ x: .1, y: .7 }, { x: .8, y: .7 }],
  };
  const eraser = {
    tool: "eraser",
    color: "#000",
    size: 6,
    points: [{ x: .4, y: .1 }, { x: .4, y: .3 }],
  };

  assert.equal(strokeIntersectsEraser(first, eraser, 100, 100), true);
  assert.equal(strokeIntersectsEraser(second, eraser, 100, 100), false);
  assert.deepEqual(associateEraser([first, second], eraser, 100, 100), [{ targetIndex: 0 }]);

  const strokes = [first, eraser, second];
  const masks = eraserMasksForStroke(strokes, 0);
  assert.equal(masks.length, 1);
  masks[0].target.points = translatedPoints(masks[0].points, 10, 5, 100, 100);

  const moved = translatedPoints(first.points, 10, 5, 100, 100);
  const transform = {
    tool: "transform",
    targetIndex: 0,
    beforePoints: first.points,
    afterPoints: moved,
    beforeWidthScale: 1,
    afterWidthScale: 2,
    maskTransforms: [{
      eraserIndex: 1,
      beforePoints: eraser.points,
      afterPoints: masks[0].target.points,
      beforeRenderWidth: 18,
      afterRenderWidth: 36,
    }],
  };
  assert.equal(applyTransformEntry(strokes, transform, "afterPoints"), true);
  assert.deepEqual(strokes[0].points, moved);
  assert.equal(strokes[0].widthScale, 2);
  assert.equal(strokeWidth(strokes[0]), 8);
  assert.deepEqual(strokes[1].targets[0].points, transform.maskTransforms[0].afterPoints);
  assert.equal(strokes[1].targets[0].renderWidth, 36);
  assert.equal(strokeWidth({ ...eraser, renderWidth: strokes[1].targets[0].renderWidth }), 36);
  assert.equal(applyTransformEntry(strokes, transform, "beforePoints"), true);
  assert.equal(strokes[0].widthScale, 1);
  assert.deepEqual(strokes[1].targets[0].points, eraser.points);
  assert.equal(strokes[1].targets[0].renderWidth, 18);
});

test("migrates canvas-wide eraser strokes to object masks", () => {
  const stroke = { tool: "line", size: 2, points: [{ x: .1, y: .5 }, { x: .9, y: .5 }] };
  const eraser = { tool: "eraser", size: 5, points: [{ x: .5, y: .4 }, { x: .5, y: .6 }] };
  const strokes = [stroke, eraser];
  associateLegacyErasers(strokes, 100, 100);
  assert.deepEqual(eraser.targets, [{ targetIndex: 0 }]);
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
