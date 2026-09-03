import { DRAWING_TOOLS, MAX_ZOOM, MIN_ZOOM, SHAPE_TOOLS, TOOLS } from "./config.js";

export function clampStrokeSize(value, fallback = 5) {
  return Number.isFinite(Number(value)) ? Math.min(30, Math.max(1, Number(value))) : fallback;
}

export function normalizeToolSizes(savedSizes, legacySize = 5) {
  const fallback = clampStrokeSize(legacySize);
  return Object.fromEntries(DRAWING_TOOLS.map((tool) => [tool, clampStrokeSize(savedSizes?.[tool], fallback)]));
}

export function createCanvasRecord(name, source = {}) {
  const id = typeof globalThis.crypto?.randomUUID === "function"
    ? `canvas-${globalThis.crypto.randomUUID()}`
    : `canvas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    name,
    strokes: Array.isArray(source.strokes) ? source.strokes : [],
    redoStrokes: Array.isArray(source.redoStrokes) ? source.redoStrokes : [],
    grid: ["blank", "square", "coordinate"].includes(source.grid) ? source.grid : "square",
    axisNumbers: source.axisNumbers !== false,
    axisFontSize: Number.isFinite(Number(source.axisFontSize)) ? Math.min(30, Math.max(12, Number(source.axisFontSize))) : 13,
    zoom: Number.isFinite(Number(source.zoom)) ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(source.zoom))) : 1,
    panX: Number.isFinite(Number(source.panX)) ? Number(source.panX) : 0,
    panY: Number.isFinite(Number(source.panY)) ? Number(source.panY) : 0,
  };
}

export function createInitialState() {
  const firstCanvas = createCanvasRecord("Canvas 1");
  return {
    tool: "pen",
    assistTool: null,
    color: "#071d33",
    toolSizes: normalizeToolSizes(),
    lastDrawingTool: "pen",
    smooth: true,
    grid: "square",
    axisNumbers: true,
    axisFontSize: 13,
    panelTab: "draw",
    zoom: 1,
    panX: 0,
    panY: 0,
    strokes: [],
    canvases: [firstCanvas],
    activeCanvasId: firstCanvas.id,
  };
}

export function hydrateState(saved, currentState) {
  if (!saved || (!Array.isArray(saved.strokes) && !Array.isArray(saved.canvases))) return null;
  const savedCanvases = Array.isArray(saved.canvases) && saved.canvases.length
    ? saved.canvases.map(normalizeCanvasRecord)
    : [createCanvasRecord("Canvas 1", saved)];
  const activeCanvas = savedCanvases.find((item) => item.id === saved.activeCanvasId) || savedCanvases[0];
  const restoredTool = TOOLS.includes(saved.tool) ? saved.tool : currentState.tool;
  const lastDrawingTool = DRAWING_TOOLS.includes(saved.lastDrawingTool)
    ? saved.lastDrawingTool
    : (DRAWING_TOOLS.includes(restoredTool) ? restoredTool : "pen");
  return {
    redoStack: activeCanvas.redoStrokes,
    state: {
      tool: restoredTool,
      assistTool: SHAPE_TOOLS.includes(saved.assistTool) ? saved.assistTool : null,
      color: typeof saved.color === "string" ? saved.color : currentState.color,
      toolSizes: normalizeToolSizes(saved.toolSizes, saved.size),
      lastDrawingTool,
      smooth: saved.smooth !== false,
      grid: activeCanvas.grid,
      axisNumbers: activeCanvas.axisNumbers,
      axisFontSize: activeCanvas.axisFontSize,
      panelTab: saved.panelTab === "canvas" ? "canvas" : "draw",
      zoom: activeCanvas.zoom,
      panX: activeCanvas.panX,
      panY: activeCanvas.panY,
      strokes: activeCanvas.strokes,
      canvases: savedCanvases,
      activeCanvasId: activeCanvas.id,
    },
  };
}

export function normalizeCanvasRecord(record, index) {
  const normalized = createCanvasRecord(
    typeof record?.name === "string" && record.name.trim() ? record.name.trim().slice(0, 32) : `Canvas ${index + 1}`,
    record,
  );
  if (typeof record?.id === "string" && record.id) normalized.id = record.id;
  return normalized;
}
