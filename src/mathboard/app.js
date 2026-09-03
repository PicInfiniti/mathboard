import { mathboardTemplate } from "./template.js";
import { createCanvasExport } from "./canvas-export.js";
import { coordinateLabelInterval, formatCoordinate } from "./coordinates.js";
import { renderStroke, shapeLength, strokeWidth } from "./drawing.js";
import { createPdfBlob } from "./pdf.js";
import { getMathBoardElements } from "./dom.js";
import {
  isSupportedProject,
  PROJECT_FORMAT,
  sanitizeImportedStroke,
  uniqueImportedName,
} from "./project.js";
import { createProjectStorage } from "./storage.js";
import { recognizeAssistedShape } from "./shape-assist.js";
import {
  DRAWING_TOOLS,
  MAX_ZOOM,
  MIN_ZOOM,
  SHAPE_TOOLS,
  TOOLS,
  ZOOM_LEVELS,
} from "./config.js";
import {
  clampStrokeSize,
  createCanvasRecord,
  createInitialState,
  hydrateState,
  normalizeCanvasRecord,
  normalizeToolSizes,
} from "./state.js";

document.querySelector("#app").innerHTML = mathboardTemplate(import.meta.env.BASE_URL);

const projectStorage = createProjectStorage();

const {
  assistButton,
  board,
  canvas,
  toolButtons,
  colorButtons,
  gridButtons,
  panelTabButtons,
  panelSections,
  saveStatus,
  canvasTabs,
  newCanvasButton,
  duplicateCanvasButton,
  renameCanvasButton,
  deleteCanvasButton,
  renameCanvasDialog,
  renameCanvasForm,
  renameCanvasInput,
  renameCanvasCancel,
  sizeInput,
  sizeOutput,
  sizeLabel,
  smoothingButton,
  axisNumbersButton,
  axisSizeInput,
  axisSizeOutput,
  axisLabels,
  zoomSelection,
  zoomOutButton,
  zoomResetButton,
  zoomInButton,
  undoButton,
  redoButton,
  historyToggleButton,
  fullscreenUndoButton,
  fullscreenRedoButton,
  fullscreenHistoryButton,
  fullscreenClearButton,
  historyScrubber,
  historyCloseButton,
  historyStartButton,
  historyEndButton,
  historyRange,
  historyOutput,
  panelToggleButton,
  fullscreenButton,
  saveButton,
  pdfButton,
  projectMenu,
  newProjectButton,
  exportProjectButton,
  importProjectButton,
  shareProjectButton,
  projectFileInput,
  clearButton,
  status,
  eraserPreview,
} = getMathBoardElements();
const context = canvas.getContext("2d");
let state = createInitialState();
let redoStack = [];
let activeStroke = null;
let activePointerId = null;
let activePointerType = null;
let activePan = null;
let activeZoomSelection = null;
let lastPenInteraction = 0;
let clearTimer = null;
let deleteCanvasTimer = null;
let newProjectTimer = null;
let saveTimer = null;
let saveRevision = 0;
let statusTimer = null;
let axisLabelSignature = "";
let canvasTabSignature = "";
let draggedCanvasId = null;
let tabPointerReorder = null;
let tabPointerReorderTimer = null;
let suppressCanvasTabClick = false;
let historyHoldTimer = null;
let historyRepeatTimer = null;
let historyHoldCount = 0;
let suppressHistoryClick = false;

function sizeControlTool() {
  return DRAWING_TOOLS.includes(state.tool) ? state.tool : state.lastDrawingTool;
}

function toolSize(tool = sizeControlTool()) {
  return clampStrokeSize(state.toolSizes?.[tool]);
}

function isFullscreenMode() {
  const main = document.querySelector(".mathboard-main");
  return document.fullscreenElement === main || main.classList.contains("is-fullscreen-fallback");
}

function syncFullscreenMode() {
  const fullscreen = isFullscreenMode();
  const main = document.querySelector(".mathboard-main");
  if (!fullscreen) main.classList.remove("is-toolbar-hidden");
  main.classList.toggle("is-fullscreen", fullscreen);
  fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
  fullscreenButton.setAttribute("aria-label", fullscreen ? "Exit full-screen MathBoard" : "Open full-screen MathBoard");
  fullscreenButton.title = fullscreen ? "Exit full screen" : "Full screen";
  syncPanelVisibility();
  syncPanelTabs();
  document.body.classList.toggle("has-mathboard-fullscreen", fullscreen);
  window.setTimeout(renderBoard, 0);
}

function syncPanelVisibility() {
  const hidden = document.querySelector(".mathboard-main").classList.contains("is-toolbar-hidden");
  panelToggleButton.setAttribute("aria-expanded", String(!hidden));
  panelToggleButton.setAttribute("aria-label", hidden ? "Show MathBoard controls" : "Hide MathBoard controls");
  panelToggleButton.title = hidden ? "Show controls" : "Hide controls";
}

function togglePanelVisibility() {
  document.querySelector(".mathboard-main").classList.toggle("is-toolbar-hidden");
  syncPanelVisibility();
}

function setHistoryScrubberVisibility(visible) {
  const canOpen = state.strokes.length + redoStack.length > 0;
  const isVisible = Boolean(visible && canOpen);
  historyScrubber.classList.toggle("is-visible", isVisible);
  historyScrubber.setAttribute("aria-hidden", String(!isVisible));
  historyToggleButton.setAttribute("aria-expanded", String(isVisible));
  fullscreenHistoryButton.setAttribute("aria-expanded", String(isVisible));
  fullscreenHistoryButton.setAttribute("aria-label", isVisible ? "Close stroke history" : "Open stroke history");
  fullscreenHistoryButton.title = isVisible ? "Close history" : "Stroke history";
}

function toggleHistoryScrubber() {
  setHistoryScrubberVisibility(!historyScrubber.classList.contains("is-visible"));
  if (historyScrubber.classList.contains("is-visible")) historyRange.focus({ preventScroll: true });
}

function syncPanelTabs() {
  const activeTab = state.panelTab === "canvas" ? "canvas" : "draw";
  const fullscreen = isFullscreenMode();
  panelTabButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.panelTab === activeTab));
  });
  panelSections.forEach((section) => {
    section.hidden = fullscreen
      ? section.dataset.panelSection !== "draw"
      : section.dataset.panelSection !== activeTab;
  });
}

async function toggleFullscreenMode() {
  const main = document.querySelector(".mathboard-main");
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (main.classList.contains("is-fullscreen-fallback")) {
    main.classList.remove("is-fullscreen-fallback");
    syncFullscreenMode();
    return;
  }
  if (typeof main.requestFullscreen === "function") {
    try {
      await main.requestFullscreen();
      return;
    } catch {
      main.classList.add("is-fullscreen-fallback");
    }
  } else {
    main.classList.add("is-fullscreen-fallback");
  }
  syncFullscreenMode();
}

function announce(message) {
  status.textContent = message;
  status.classList.add("is-visible");
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => status.classList.remove("is-visible"), 1800);
}

function activeCanvasRecord() {
  return state.canvases.find((item) => item.id === state.activeCanvasId) || state.canvases[0];
}

function syncActiveCanvasState() {
  const activeCanvas = activeCanvasRecord();
  if (!activeCanvas) return;
  Object.assign(activeCanvas, {
    strokes: state.strokes,
    redoStrokes: redoStack,
    grid: state.grid,
    axisNumbers: state.axisNumbers,
    axisFontSize: state.axisFontSize,
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
  });
}

function applyCanvasState(canvasRecord) {
  state.strokes = canvasRecord.strokes;
  state.grid = canvasRecord.grid;
  state.axisNumbers = canvasRecord.axisNumbers;
  state.axisFontSize = canvasRecord.axisFontSize;
  state.zoom = canvasRecord.zoom;
  state.panX = canvasRecord.panX;
  state.panY = canvasRecord.panY;
  redoStack = Array.isArray(canvasRecord.redoStrokes) ? canvasRecord.redoStrokes : [];
  activeStroke = null;
  activePan = null;
  activeZoomSelection = null;
  activePointerId = null;
  activePointerType = null;
  axisLabelSignature = "";
  zoomSelection.classList.remove("is-visible");
  eraserPreview.classList.remove("is-visible");
  resetClearConfirmation();
}

function resetClearConfirmation() {
  window.clearTimeout(clearTimer);
  clearTimer = null;
  clearButton.classList.remove("is-confirming");
  clearButton.setAttribute("aria-label", "Clear board");
  clearButton.dataset.tooltip = "Remove every stroke from this canvas";
  fullscreenClearButton.classList.remove("is-confirming");
  fullscreenClearButton.setAttribute("aria-label", "Clear board");
  fullscreenClearButton.title = "Clear board";
}

function requestClearBoard() {
  if (!clearButton.classList.contains("is-confirming")) {
    clearButton.classList.add("is-confirming");
    clearButton.setAttribute("aria-label", "Confirm clearing the board");
    clearButton.dataset.tooltip = "Press again to clear every stroke";
    fullscreenClearButton.classList.add("is-confirming");
    fullscreenClearButton.setAttribute("aria-label", "Confirm clearing the board");
    fullscreenClearButton.title = "Click again to clear";
    announce("Press clear again to erase the whole board.");
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(resetClearConfirmation, 3000);
    return;
  }
  state.strokes = [];
  redoStack = [];
  resetClearConfirmation();
  saveState();
  renderBoard();
  announce("MathBoard cleared.");
}

function syncCanvasTabs() {
  const signature = `${state.activeCanvasId}:${state.canvases.map((item) => `${item.id}:${item.name}`).join("|")}`;
  if (signature !== canvasTabSignature) {
    canvasTabSignature = signature;
    canvasTabs.replaceChildren();
    state.canvases.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `mathboard-tab-${item.id}`;
      button.dataset.canvasId = item.id;
      button.role = "tab";
      button.setAttribute("aria-selected", String(item.id === state.activeCanvasId));
      button.tabIndex = item.id === state.activeCanvasId ? 0 : -1;
      button.draggable = true;
      button.title = `${item.name} · drag to reorder`;
      button.textContent = item.name;
      canvasTabs.append(button);
    });
  }
  deleteCanvasButton.disabled = state.canvases.length <= 1;
  const activeCanvas = activeCanvasRecord();
  board.setAttribute("aria-label", `${activeCanvas?.name || "Canvas"} drawing area`);
}

function activateCanvas(canvasId, { announceChange = true } = {}) {
  if (activePointerId !== null) {
    announce("Finish the current gesture before changing canvases.");
    return;
  }
  const nextCanvas = state.canvases.find((item) => item.id === canvasId);
  if (!nextCanvas || nextCanvas.id === state.activeCanvasId) return;
  syncActiveCanvasState();
  state.activeCanvasId = nextCanvas.id;
  applyCanvasState(nextCanvas);
  canvasTabSignature = "";
  syncCanvasTabs();
  saveState();
  renderBoard();
  if (announceChange) announce(`${nextCanvas.name} opened.`);
}

function nextCanvasName() {
  const highestNumber = state.canvases.reduce((highest, item) => {
    const match = item.name.match(/^Canvas (\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `Canvas ${highestNumber + 1}`;
}

function addCanvas() {
  syncActiveCanvasState();
  const newCanvas = createCanvasRecord(nextCanvasName());
  state.canvases.push(newCanvas);
  canvasTabSignature = "";
  activateCanvas(newCanvas.id, { announceChange: false });
  announce(`${newCanvas.name} created.`);
}

function duplicateActiveCanvas() {
  syncActiveCanvasState();
  const activeCanvas = activeCanvasRecord();
  const usedNames = new Set(state.canvases.map((item) => item.name.toLowerCase()));
  const duplicateName = uniqueImportedName(`${activeCanvas.name} copy`, usedNames);
  const duplicate = createCanvasRecord(duplicateName, {
    ...activeCanvas,
    strokes: JSON.parse(JSON.stringify(activeCanvas.strokes)),
    redoStrokes: JSON.parse(JSON.stringify(activeCanvas.redoStrokes)),
  });
  const activeIndex = state.canvases.findIndex((item) => item.id === activeCanvas.id);
  state.canvases.splice(activeIndex + 1, 0, duplicate);
  canvasTabSignature = "";
  activateCanvas(duplicate.id, { announceChange: false });
  announce(`${activeCanvas.name} duplicated.`);
}

function clearCanvasDropMarkers() {
  canvasTabs.querySelectorAll(".is-drop-before, .is-drop-after, .is-dragging").forEach((tab) => {
    tab.classList.remove("is-drop-before", "is-drop-after", "is-dragging");
  });
}

function updateCanvasDropTarget(clientX, clientY) {
  if (!tabPointerReorder?.active) return;
  const tab = document.elementFromPoint(clientX, clientY)?.closest("[data-canvas-id]");
  clearCanvasDropMarkers();
  canvasTabs.querySelector(`[data-canvas-id="${CSS.escape(tabPointerReorder.sourceId)}"]`)?.classList.add("is-dragging");
  if (!tab || tab.dataset.canvasId === tabPointerReorder.sourceId) {
    tabPointerReorder.targetId = null;
    return;
  }
  const bounds = tab.getBoundingClientRect();
  tabPointerReorder.targetId = tab.dataset.canvasId;
  tabPointerReorder.placeAfter = clientX > bounds.left + (bounds.width / 2);
  tab.classList.add(tabPointerReorder.placeAfter ? "is-drop-after" : "is-drop-before");
}

function resetPointerTabReorder() {
  window.clearTimeout(tabPointerReorderTimer);
  tabPointerReorderTimer = null;
  tabPointerReorder = null;
  draggedCanvasId = null;
  clearCanvasDropMarkers();
}

function reorderCanvas(sourceId, targetId, placeAfter = false) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const sourceIndex = state.canvases.findIndex((item) => item.id === sourceId);
  if (sourceIndex < 0) return;
  const [movedCanvas] = state.canvases.splice(sourceIndex, 1);
  const targetIndex = state.canvases.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) {
    state.canvases.splice(sourceIndex, 0, movedCanvas);
    return;
  }
  state.canvases.splice(targetIndex + (placeAfter ? 1 : 0), 0, movedCanvas);
  canvasTabSignature = "";
  syncCanvasTabs();
  saveState();
  announce(`${movedCanvas.name} moved.`);
}

function openRenameCanvas() {
  const activeCanvas = activeCanvasRecord();
  if (!activeCanvas) return;
  resetDeleteCanvasConfirmation();
  renameCanvasInput.value = activeCanvas.name;
  renameCanvasInput.setCustomValidity("");
  renameCanvasDialog.showModal();
  window.requestAnimationFrame(() => renameCanvasInput.select());
}

function renameActiveCanvas(event) {
  event.preventDefault();
  const activeCanvas = activeCanvasRecord();
  const nextName = renameCanvasInput.value.trim();
  if (!nextName) {
    renameCanvasInput.setCustomValidity("Enter a canvas name.");
    renameCanvasInput.reportValidity();
    return;
  }
  const duplicate = state.canvases.some((item) => item.id !== activeCanvas.id && item.name.toLowerCase() === nextName.toLowerCase());
  if (duplicate) {
    renameCanvasInput.setCustomValidity("Use a different canvas name.");
    renameCanvasInput.reportValidity();
    return;
  }
  renameCanvasInput.setCustomValidity("");
  activeCanvas.name = nextName.slice(0, 32);
  canvasTabSignature = "";
  syncCanvasTabs();
  saveState();
  renameCanvasDialog.close();
  announce(`Canvas renamed to ${activeCanvas.name}.`);
}

function resetDeleteCanvasConfirmation() {
  window.clearTimeout(deleteCanvasTimer);
  deleteCanvasButton.classList.remove("is-confirming");
  deleteCanvasButton.setAttribute("aria-label", "Delete the current canvas");
  deleteCanvasButton.title = "Delete canvas";
  deleteCanvasButton.querySelector("span:last-child").textContent = "Delete";
}

function deleteActiveCanvas() {
  if (state.canvases.length <= 1) return;
  const activeIndex = state.canvases.findIndex((item) => item.id === state.activeCanvasId);
  const activeCanvas = state.canvases[activeIndex];
  if (!deleteCanvasButton.classList.contains("is-confirming")) {
    deleteCanvasButton.classList.add("is-confirming");
    deleteCanvasButton.setAttribute("aria-label", `Confirm deletion of ${activeCanvas.name}`);
    deleteCanvasButton.title = `Delete ${activeCanvas.name}`;
    deleteCanvasButton.querySelector("span:last-child").textContent = "Confirm";
    announce(`Select Delete again to remove ${activeCanvas.name}.`);
    deleteCanvasTimer = window.setTimeout(resetDeleteCanvasConfirmation, 3000);
    return;
  }
  const nextCanvas = state.canvases[activeIndex + 1] || state.canvases[activeIndex - 1];
  state.canvases.splice(activeIndex, 1);
  state.activeCanvasId = nextCanvas.id;
  applyCanvasState(nextCanvas);
  resetDeleteCanvasConfirmation();
  canvasTabSignature = "";
  saveState();
  renderBoard();
  announce(`${activeCanvas.name} deleted.`);
}

function setSaveStatus(statusName, message) {
  saveStatus.dataset.state = statusName;
  saveStatus.querySelector("strong").textContent = message;
}

function stateSnapshot() {
  syncActiveCanvasState();
  return JSON.parse(JSON.stringify(state));
}

async function flushStateSave() {
  window.clearTimeout(saveTimer);
  saveTimer = null;
  const revision = saveRevision;
  try {
    const storageType = await projectStorage.save(stateSnapshot());
    if (revision === saveRevision) {
      setSaveStatus("saved", storageType === "local-storage" ? "Saved with limited storage" : "Saved in this browser");
    }
  } catch {
    setSaveStatus("error", "Save failed · export a backup");
    announce("Autosave failed. Export a project backup to protect your work.");
  }
}

function saveState() {
  syncActiveCanvasState();
  saveRevision += 1;
  setSaveStatus("saving", "Saving…");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushStateSave, 180);
}

async function loadState() {
  const { saved, needsMigration } = await projectStorage.load();
  let restored = null;
  try {
    restored = hydrateState(saved, state);
    if (restored) {
      state = restored.state;
      redoStack = restored.redoStack;
    }
  } catch {
    state = createInitialState();
    setSaveStatus("error", "Saved project could not be read");
    announce("The saved MathBoard project could not be read. A clean canvas has been opened.");
    return;
  }
  if (restored && needsMigration && !projectStorage.isFallback) {
    await projectStorage.save(stateSnapshot());
  }
  setSaveStatus("saved", projectStorage.isFallback ? "Saved with limited storage" : "Saved in this browser");
}

function syncHistoryControls() {
  const current = state.strokes.length;
  const total = current + redoStack.length;
  const hasHistory = total > 0;
  historyRange.max = total;
  historyRange.value = current;
  historyRange.disabled = !hasHistory;
  historyRange.setAttribute("aria-valuetext", hasHistory ? `${current} of ${total} strokes visible` : "No strokes");
  historyOutput.value = hasHistory ? `${current} of ${total} ${total === 1 ? "stroke" : "strokes"}` : "No strokes yet";
  historyStartButton.disabled = current === 0;
  historyEndButton.disabled = redoStack.length === 0;
  historyToggleButton.disabled = !hasHistory;
  fullscreenHistoryButton.disabled = !hasHistory;
  undoButton.disabled = current === 0;
  redoButton.disabled = redoStack.length === 0;
  fullscreenUndoButton.disabled = current === 0;
  fullscreenRedoButton.disabled = redoStack.length === 0;
  if (!hasHistory) setHistoryScrubberVisibility(false);
}

function syncControls() {
  syncPanelTabs();
  syncCanvasTabs();
  toolButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tool === state.tool)));
  colorButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.color === state.color)));
  gridButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.grid === state.grid)));
  assistButton.setAttribute("aria-pressed", String(state.drawAssist));
  const activeSizeTool = sizeControlTool();
  const activeToolSize = toolSize(activeSizeTool);
  sizeInput.value = activeToolSize;
  sizeOutput.value = activeToolSize;
  sizeLabel.textContent = `${activeSizeTool === "highlighter" ? "Highlighter" : activeSizeTool[0].toUpperCase() + activeSizeTool.slice(1)} size`;
  smoothingButton.setAttribute("aria-pressed", String(state.smooth));
  axisNumbersButton.setAttribute("aria-pressed", String(state.axisNumbers));
  axisNumbersButton.disabled = state.grid !== "coordinate";
  axisSizeInput.value = state.axisFontSize;
  axisSizeOutput.value = state.axisFontSize;
  axisSizeInput.disabled = state.grid !== "coordinate" || !state.axisNumbers;
  canvas.classList.toggle("is-erasing", state.tool === "eraser" || activeStroke?.tool === "eraser");
  canvas.classList.toggle("is-panning", state.tool === "hand");
  canvas.classList.toggle("is-panning-active", Boolean(activePan));
  canvas.classList.toggle("is-zooming", state.tool === "zoom");
  if (state.tool !== "eraser" && activeStroke?.tool !== "eraser") eraserPreview.classList.remove("is-visible");
  board.style.setProperty("--board-pan-x", `${state.panX}px`);
  board.style.setProperty("--board-pan-y", `${state.panY}px`);
  board.style.setProperty("--board-grid-size", `${32 * state.zoom}px`);
  board.style.setProperty("--board-grid-half", `${16 * state.zoom}px`);
  board.style.setProperty("--board-minor-grid-size", `${8 * state.zoom}px`);
  board.style.setProperty("--board-minor-grid-half", `${4 * state.zoom}px`);
  board.style.setProperty("--axis-label-size", `${state.axisFontSize}px`);
  board.classList.toggle("is-grid-square", state.grid === "square");
  board.classList.toggle("is-grid-coordinate", state.grid === "coordinate");
  board.classList.toggle("is-zoomed-precision", state.zoom >= 1.5);
  syncAxisLabels();
  board.classList.toggle("has-ink", state.strokes.length > 0);
  zoomOutButton.disabled = state.zoom <= MIN_ZOOM;
  zoomInButton.disabled = state.zoom >= MAX_ZOOM;
  zoomResetButton.setAttribute("aria-label", `Reset zoom and center canvas. Current zoom ${Math.round(state.zoom * 100)}%.`);
  syncHistoryControls();
}

function syncAxisLabels() {
  const bounds = board.getBoundingClientRect();
  const visible = state.grid === "coordinate" && state.axisNumbers;
  const spacing = 32 * state.zoom;
  const labelEvery = coordinateLabelInterval(state.zoom, state.axisFontSize);
  const step = spacing * labelEvery;
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  const minXOffset = Math.floor((-centerX - state.panX) / step) - 2;
  const maxXOffset = Math.ceil((bounds.width - centerX - state.panX) / step) + 2;
  const minYOffset = Math.floor((-centerY - state.panY) / step) - 2;
  const maxYOffset = Math.ceil((bounds.height - centerY - state.panY) / step) + 2;
  const signature = visible
    ? `${Math.round(bounds.width)}:${Math.round(bounds.height)}:${state.zoom.toFixed(3)}:${state.axisFontSize}:${minXOffset}:${maxXOffset}:${minYOffset}:${maxYOffset}`
    : "hidden";
  axisLabels.classList.toggle("is-visible", visible);
  if (signature !== axisLabelSignature) {
    axisLabelSignature = signature;
    axisLabels.replaceChildren();
    if (visible) {
      const layer = document.createElement("div");
      layer.className = "mathboard-axis-labels__layer";

      for (let offset = minXOffset; offset <= maxXOffset; offset += 1) {
        const label = document.createElement("span");
        label.className = "mathboard-axis-label mathboard-axis-label--x";
        label.textContent = formatCoordinate(offset * labelEvery);
        label.style.left = `${centerX + (offset * step)}px`;
        label.style.top = `${centerY + 7}px`;
        layer.append(label);
      }

      for (let offset = minYOffset; offset <= maxYOffset; offset += 1) {
        if (offset === 0) continue;
        const label = document.createElement("span");
        label.className = "mathboard-axis-label mathboard-axis-label--y";
        label.textContent = formatCoordinate(-offset * labelEvery);
        label.style.left = `${centerX + 8}px`;
        label.style.top = `${centerY + (offset * step)}px`;
        layer.append(label);
      }

      axisLabels.append(layer);
    }
  }

  const layer = axisLabels.firstElementChild;
  if (layer) layer.style.transform = `translate(${state.panX}px, ${state.panY}px)`;
}

function normalizedPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  const screenX = event.clientX - bounds.left;
  const screenY = event.clientY - bounds.top;
  const worldX = (bounds.width / 2) + ((screenX - (bounds.width / 2) - state.panX) / state.zoom);
  const worldY = (bounds.height / 2) + ((screenY - (bounds.height / 2) - state.panY) / state.zoom);
  const pressure = event.pointerType === "pen"
    ? Math.min(1, Math.max(0.08, event.pressure || 0.5))
    : 0.5;
  return {
    x: worldX / bounds.width,
    y: worldY / bounds.height,
    pressure,
  };
}

function renderBoard() {
  const bounds = canvas.getBoundingClientRect();
  state.panX = clampPan(state.panX, bounds.width * state.zoom);
  state.panY = clampPan(state.panY, bounds.height * state.zoom);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.round(bounds.width * ratio));
  const pixelHeight = Math.max(1, Math.round(bounds.height * ratio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.save();
  context.translate((bounds.width / 2) + state.panX, (bounds.height / 2) + state.panY);
  context.scale(state.zoom, state.zoom);
  context.translate(-(bounds.width / 2), -(bounds.height / 2));
  state.strokes.forEach((stroke) => renderStroke(context, stroke, bounds.width, bounds.height));
  if (activeStroke) renderStroke(context, activeStroke, bounds.width, bounds.height);
  context.restore();
  syncControls();
}

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isPenEraser(event) {
  return event.pointerType === "pen" && (event.button === 5 || (event.buttons & 32) === 32);
}

function isLikelyPalm(event) {
  if (event.pointerType !== "touch") return false;
  const penWasJustUsed = performance.now() - lastPenInteraction < 1200;
  const broadContact = event.width > 45 || event.height > 45;
  return penWasJustUsed || broadContact;
}

function updateEraserPreview(event) {
  if (event.pointerType === "pen") lastPenInteraction = performance.now();
  const previewTool = activeStroke?.tool || (isPenEraser(event) ? "eraser" : state.tool);
  if (previewTool !== "eraser" || (event.pointerType === "touch" && !activeStroke)) {
    eraserPreview.classList.remove("is-visible");
    return;
  }
  const bounds = board.getBoundingClientRect();
  const diameter = strokeWidth(activeStroke || { tool: "eraser", size: toolSize("eraser") }) * state.zoom;
  eraserPreview.style.setProperty("--eraser-diameter", `${diameter}px`);
  eraserPreview.style.left = `${event.clientX - bounds.left}px`;
  eraserPreview.style.top = `${event.clientY - bounds.top}px`;
  eraserPreview.classList.add("is-visible");
}

function hideEraserPreview() {
  if (!activeStroke) eraserPreview.classList.remove("is-visible");
}

function clampPan(value, limit) {
  return Math.max(-limit, Math.min(limit, value));
}

function moveCanvasBy(deltaX, deltaY) {
  const bounds = canvas.getBoundingClientRect();
  state.panX = clampPan(state.panX + deltaX, bounds.width * state.zoom);
  state.panY = clampPan(state.panY + deltaY, bounds.height * state.zoom);
  saveState();
  renderBoard();
}

function updateZoomSelection(event) {
  if (!activeZoomSelection) return;
  const bounds = canvas.getBoundingClientRect();
  activeZoomSelection.endX = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
  activeZoomSelection.endY = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
  const left = Math.min(activeZoomSelection.startX, activeZoomSelection.endX);
  const top = Math.min(activeZoomSelection.startY, activeZoomSelection.endY);
  const width = Math.abs(activeZoomSelection.endX - activeZoomSelection.startX);
  const height = Math.abs(activeZoomSelection.endY - activeZoomSelection.startY);
  zoomSelection.style.left = `${left}px`;
  zoomSelection.style.top = `${top}px`;
  zoomSelection.style.width = `${width}px`;
  zoomSelection.style.height = `${height}px`;
  zoomSelection.classList.add("is-visible");
}

function applyZoomSelection(selection) {
  const bounds = canvas.getBoundingClientRect();
  const left = Math.min(selection.startX, selection.endX);
  const top = Math.min(selection.startY, selection.endY);
  const width = Math.abs(selection.endX - selection.startX);
  const height = Math.abs(selection.endY - selection.startY);
  if (width < 24 || height < 24) {
    announce("Drag a larger rectangle to zoom into an area.");
    return;
  }

  const centerX = left + (width / 2);
  const centerY = top + (height / 2);
  const worldOffsetX = (centerX - (bounds.width / 2) - state.panX) / state.zoom;
  const worldOffsetY = (centerY - (bounds.height / 2) - state.panY) / state.zoom;
  const fitFactor = Math.min(bounds.width / width, bounds.height / height) * 0.9;
  const nextZoom = Math.min(MAX_ZOOM, Math.max(state.zoom, state.zoom * fitFactor));
  state.zoom = nextZoom;
  state.panX = -worldOffsetX * nextZoom;
  state.panY = -worldOffsetY * nextZoom;
  axisLabelSignature = "";
  saveState();
  renderBoard();
  announce(`${Math.round(state.zoom * 100)}% zoom`);
}

function zoomOut() {
  if (state.zoom <= MIN_ZOOM) return;
  const previousZoom = state.zoom;
  let nextZoom = MIN_ZOOM;
  for (let index = ZOOM_LEVELS.length - 1; index >= 0; index -= 1) {
    if (ZOOM_LEVELS[index] < previousZoom - .001) {
      nextZoom = ZOOM_LEVELS[index];
      break;
    }
  }
  const ratio = nextZoom / previousZoom;
  state.zoom = nextZoom;
  state.panX *= ratio;
  state.panY *= ratio;
  axisLabelSignature = "";
  saveState();
  renderBoard();
  announce(`${Math.round(state.zoom * 100)}% zoom`);
}

function zoomIn() {
  if (state.zoom >= MAX_ZOOM) return;
  const previousZoom = state.zoom;
  let nextZoom = MAX_ZOOM;
  for (const level of ZOOM_LEVELS) {
    if (level > previousZoom + .001) {
      nextZoom = level;
      break;
    }
  }
  const ratio = nextZoom / previousZoom;
  state.zoom = nextZoom;
  state.panX *= ratio;
  state.panY *= ratio;
  axisLabelSignature = "";
  saveState();
  renderBoard();
  announce(`${Math.round(state.zoom * 100)}% zoom`);
}

function resetView() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  axisLabelSignature = "";
  saveState();
  renderBoard();
  announce("100% zoom · canvas centered");
}

function startStroke(event) {
  if (activePointerId !== null || (!["hand", "zoom"].includes(state.tool) && isLikelyPalm(event))) return;
  const usingPenEraser = isPenEraser(event);
  if (event.button !== undefined && event.button !== 0 && !usingPenEraser) return;
  if (event.pointerType === "pen") lastPenInteraction = performance.now();
  activePointerId = event.pointerId;
  activePointerType = event.pointerType || "mouse";
  if (state.tool === "zoom" && !usingPenEraser) {
    const bounds = canvas.getBoundingClientRect();
    activeZoomSelection = {
      startX: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      startY: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
      endX: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      endY: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
    };
    canvas.setPointerCapture(event.pointerId);
    updateZoomSelection(event);
    event.preventDefault();
    return;
  }
  if (state.tool === "hand" && !usingPenEraser) {
    activePan = {
      startX: event.clientX,
      startY: event.clientY,
      originX: state.panX,
      originY: state.panY,
    };
    canvas.setPointerCapture(event.pointerId);
    syncControls();
    event.preventDefault();
    return;
  }
  const strokeTool = usingPenEraser ? "eraser" : state.tool;
  const startPoint = normalizedPoint(event);
  activeStroke = {
    tool: strokeTool,
    drawAssist: strokeTool === "pen" && state.drawAssist,
    color: state.color,
    size: toolSize(strokeTool),
    smooth: state.smooth,
    pointerType: activePointerType,
    points: [startPoint],
  };
  canvas.setPointerCapture(event.pointerId);
  updateEraserPreview(event);
  renderBoard();
  event.preventDefault();
}

function continueStroke(event) {
  if (activeZoomSelection && event.pointerId === activePointerId) {
    updateZoomSelection(event);
    event.preventDefault();
    return;
  }
  if (activePan && event.pointerId === activePointerId) {
    const bounds = canvas.getBoundingClientRect();
    state.panX = clampPan(activePan.originX + event.clientX - activePan.startX, bounds.width * state.zoom);
    state.panY = clampPan(activePan.originY + event.clientY - activePan.startY, bounds.height * state.zoom);
    renderBoard();
    event.preventDefault();
    return;
  }
  if (!activeStroke || event.pointerId !== activePointerId) return;
  if (event.pointerType === "pen") lastPenInteraction = performance.now();
  const coalesced = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
  coalesced.forEach((sample) => {
    const point = normalizedPoint(sample);
    const previous = activeStroke.points.at(-1);
    if (!previous || distanceBetween(point, previous) > 0.0012) activeStroke.points.push(point);
  });
  renderBoard();
  event.preventDefault();
}

function finishStroke(event) {
  if (activeZoomSelection && event.pointerId === activePointerId) {
    const selection = activeZoomSelection;
    updateZoomSelection(event);
    activeZoomSelection = null;
    activePointerId = null;
    activePointerType = null;
    zoomSelection.classList.remove("is-visible");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    applyZoomSelection(selection);
    return;
  }
  if (activePan && event.pointerId === activePointerId) {
    activePan = null;
    activePointerId = null;
    activePointerType = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    saveState();
    renderBoard();
    announce("Canvas moved.");
    return;
  }
  if (!activeStroke || event.pointerId !== activePointerId) return;
  const finishedPointerType = activePointerType;
  const usedTemporaryEraser = activeStroke.tool === "eraser" && state.tool !== "eraser";
  const bounds = canvas.getBoundingClientRect();
  if (activeStroke.drawAssist) {
    if (event.type === "pointerup") {
      const point = normalizedPoint(event);
      const previous = activeStroke.points.at(-1);
      if (!previous || distanceBetween(point, previous) > 0.0012) activeStroke.points.push(point);
    }
    const recognized = recognizeAssistedShape(activeStroke.points, bounds.width, bounds.height);
    if (recognized) {
      activeStroke.tool = recognized.tool;
      activeStroke.points = recognized.points;
    }
    delete activeStroke.drawAssist;
  }
  const shouldCommit = !SHAPE_TOOLS.includes(activeStroke.tool) || shapeLength(activeStroke, bounds.width, bounds.height) >= 2;
  if (shouldCommit) state.strokes.push(activeStroke);
  activeStroke = null;
  activePointerId = null;
  activePointerType = null;
  if (shouldCommit) redoStack = [];
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (shouldCommit) saveState();
  renderBoard();
  if (finishedPointerType === "touch" || usedTemporaryEraser) eraserPreview.classList.remove("is-visible");
}

function setPressed(buttons, activeButton) {
  buttons.forEach((button) => button.setAttribute("aria-pressed", String(button === activeButton)));
}

function setHistoryPosition(requestedPosition, shouldAnnounce = true) {
  const total = state.strokes.length + redoStack.length;
  const numericPosition = Number(requestedPosition);
  if (!Number.isFinite(numericPosition)) return false;
  const target = Math.min(total, Math.max(0, Math.round(numericPosition)));
  if (target === state.strokes.length) return false;
  while (state.strokes.length > target) redoStack.push(state.strokes.pop());
  while (state.strokes.length < target && redoStack.length) state.strokes.push(redoStack.pop());
  saveState();
  renderBoard();
  if (shouldAnnounce) announce(`History ${state.strokes.length} of ${total}.`);
  return true;
}

function undo(shouldAnnounce = true) {
  return setHistoryPosition(state.strokes.length - 1, shouldAnnounce);
}

function redo(shouldAnnounce = true) {
  return setHistoryPosition(state.strokes.length + 1, shouldAnnounce);
}

function stopHistoryHold(shouldAnnounce = true) {
  window.clearTimeout(historyHoldTimer);
  window.clearTimeout(historyRepeatTimer);
  historyHoldTimer = null;
  historyRepeatTimer = null;
  const repeatedSteps = historyHoldCount;
  historyHoldCount = 0;
  if (shouldAnnounce && repeatedSteps > 0) announce(`History ${state.strokes.length} of ${state.strokes.length + redoStack.length}.`);
}

function startHistoryHold(event, direction) {
  if (event.button !== 0 || event.currentTarget.disabled) return;
  if (typeof event.currentTarget.setPointerCapture === "function") event.currentTarget.setPointerCapture(event.pointerId);
  stopHistoryHold(false);
  suppressHistoryClick = false;
  const repeat = () => {
    const moved = direction < 0 ? undo(false) : redo(false);
    if (!moved) {
      stopHistoryHold();
      return;
    }
    historyHoldCount += 1;
    suppressHistoryClick = true;
    const delay = Math.max(55, 165 - (historyHoldCount * 12));
    historyRepeatTimer = window.setTimeout(repeat, delay);
  };
  historyHoldTimer = window.setTimeout(repeat, 420);
}

function finishHistoryHold() {
  stopHistoryHold();
  if (suppressHistoryClick) {
    window.setTimeout(() => {
      suppressHistoryClick = false;
    }, 0);
  }
}

function bindHistoryStepButton(button, direction) {
  button.addEventListener("pointerdown", (event) => startHistoryHold(event, direction));
  button.addEventListener("pointerup", finishHistoryHold);
  button.addEventListener("pointercancel", finishHistoryHold);
  button.addEventListener("lostpointercapture", finishHistoryHold);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  button.addEventListener("click", (event) => {
    if (suppressHistoryClick) {
      suppressHistoryClick = false;
      event.preventDefault();
      return;
    }
    if (direction < 0) undo();
    else redo();
  });
}

function activeCanvasFileName() {
  return (activeCanvasRecord()?.name || "canvas").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "canvas";
}

function downloadBoard() {
  const exportCanvas = createCanvasExport(canvas, state);
  const link = document.createElement("a");
  link.download = `mathboard-${activeCanvasFileName()}-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
  announce("MathBoard downloaded as a PNG.");
}

function downloadPdf() {
  const pdf = createPdfBlob(createCanvasExport(canvas, state));
  const link = document.createElement("a");
  link.download = `mathboard-${activeCanvasFileName()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  link.href = URL.createObjectURL(pdf);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  announce("MathBoard downloaded as a PDF.");
}

function projectPayload() {
  syncActiveCanvasState();
  return {
    format: PROJECT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    activeCanvasId: state.activeCanvasId,
    settings: {
      tool: state.tool,
      drawAssist: state.drawAssist,
      color: state.color,
      size: toolSize(),
      toolSizes: state.toolSizes,
      lastDrawingTool: state.lastDrawingTool,
      smooth: state.smooth,
      panelTab: state.panelTab,
    },
    canvases: state.canvases,
  };
}

function createProjectFile() {
  const date = new Date().toISOString().slice(0, 10);
  return new File([JSON.stringify(projectPayload(), null, 2)], `mathboard-project-${date}.mathboard`, { type: "application/json" });
}

function downloadProjectFile(file = createProjectFile()) {
  const link = document.createElement("a");
  link.download = file.name;
  link.href = URL.createObjectURL(file);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function downloadProject() {
  downloadProjectFile();
  projectMenu.open = false;
  announce("Project exported · ready to share");
}

async function shareProject() {
  resetNewProjectConfirmation();
  const file = createProjectFile();
  const canShareFile = typeof navigator.share === "function"
    && (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));
  if (!canShareFile) {
    downloadProjectFile(file);
    projectMenu.open = false;
    announce("Sharing is unavailable here · project downloaded instead");
    return;
  }
  try {
    await navigator.share({
      title: "MathBoard project",
      text: "Open this project in MathBoard.",
      files: [file],
    });
    projectMenu.open = false;
    announce("Project shared");
  } catch (error) {
    if (error?.name !== "AbortError") announce("The project could not be shared.");
  }
}

function resetNewProjectConfirmation() {
  window.clearTimeout(newProjectTimer);
  newProjectButton.classList.remove("is-confirming");
  newProjectButton.innerHTML = '<span aria-hidden="true">＋</span>New clean project';
}

async function startNewProject() {
  if (!newProjectButton.classList.contains("is-confirming")) {
    newProjectButton.classList.add("is-confirming");
    newProjectButton.innerHTML = '<span aria-hidden="true">!</span>Confirm new project';
    announce("Select New project again to clear all MathBoard canvases.");
    newProjectTimer = window.setTimeout(resetNewProjectConfirmation, 3500);
    return;
  }
  state = createInitialState();
  redoStack = [];
  activeStroke = null;
  activePan = null;
  activeZoomSelection = null;
  activePointerId = null;
  activePointerType = null;
  axisLabelSignature = "";
  canvasTabSignature = "";
  resetNewProjectConfirmation();
  projectMenu.open = false;
  renderBoard();
  setSaveStatus("saving", "Clearing saved project…");
  try {
    window.clearTimeout(saveTimer);
    saveTimer = null;
    await projectStorage.clear();
    setSaveStatus("saved", projectStorage.isFallback ? "Clean project · limited storage" : "Clean project · autosave ready");
    announce("New clean project started");
  } catch {
    setSaveStatus("error", "Could not clear saved project");
    announce("The canvas was reset, but its previous saved copy could not be removed.");
  }
}

async function importProject(file) {
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) {
    announce("That project is larger than the 25 MB import limit.");
    return;
  }
  try {
    const project = JSON.parse(await file.text());
    if (!isSupportedProject(project)) {
      throw new Error("Invalid MathBoard project");
    }
    const currentCanvas = activeCanvasRecord();
    const currentIsEmpty = state.canvases.length === 1
      && currentCanvas.name === "Canvas 1"
      && state.strokes.length === 0
      && redoStack.length === 0
      && state.grid === "square"
      && state.zoom === 1
      && state.panX === 0
      && state.panY === 0;
    const usedNames = new Set(currentIsEmpty ? [] : state.canvases.map((item) => item.name.toLowerCase()));
    const pointBudget = { remaining: 500000 };
    const importedIdMap = new Map();
    const importedCanvases = project.canvases.slice(0, 50).map((source, index) => {
      const strokes = Array.isArray(source?.strokes)
        ? source.strokes.slice(0, 50000).map((stroke) => sanitizeImportedStroke(stroke, pointBudget)).filter(Boolean)
        : [];
      const redoStrokes = Array.isArray(source?.redoStrokes)
        ? source.redoStrokes.slice(0, 50000).map((stroke) => sanitizeImportedStroke(stroke, pointBudget)).filter(Boolean)
        : [];
      const canvasRecord = normalizeCanvasRecord({ ...source, strokes, redoStrokes }, index);
      const originalId = canvasRecord.id;
      canvasRecord.id = createCanvasRecord(canvasRecord.name).id;
      canvasRecord.name = uniqueImportedName(canvasRecord.name, usedNames);
      importedIdMap.set(originalId, canvasRecord.id);
      return canvasRecord;
    });
    syncActiveCanvasState();
    state.canvases = currentIsEmpty ? importedCanvases : [...state.canvases, ...importedCanvases];
    const importedActiveId = importedIdMap.get(project.activeCanvasId) || importedCanvases[0].id;
    state.activeCanvasId = importedActiveId;
    const importedSettings = project.settings || {};
    if (TOOLS.includes(importedSettings.tool)) state.tool = importedSettings.tool;
    state.drawAssist = importedSettings.drawAssist === true || SHAPE_TOOLS.includes(importedSettings.assistTool);
    if (typeof importedSettings.color === "string") state.color = importedSettings.color.slice(0, 64);
    if (importedSettings.toolSizes || Number.isFinite(Number(importedSettings.size))) {
      state.toolSizes = normalizeToolSizes(importedSettings.toolSizes, importedSettings.size);
    }
    state.lastDrawingTool = DRAWING_TOOLS.includes(importedSettings.lastDrawingTool)
      ? importedSettings.lastDrawingTool
      : (DRAWING_TOOLS.includes(state.tool) ? state.tool : state.lastDrawingTool);
    state.smooth = importedSettings.smooth !== false;
    if (["draw", "canvas"].includes(importedSettings.panelTab)) state.panelTab = importedSettings.panelTab;
    applyCanvasState(state.canvases.find((item) => item.id === importedActiveId));
    canvasTabSignature = "";
    saveState();
    renderBoard();
    projectMenu.open = false;
    announce(`${importedCanvases.length} ${importedCanvases.length === 1 ? "canvas" : "canvases"} imported`);
  } catch {
    announce("This file is not a valid MathBoard project.");
  } finally {
    projectFileInput.value = "";
  }
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.tool = button.dataset.tool;
    if (DRAWING_TOOLS.includes(state.tool)) state.lastDrawingTool = state.tool;
    syncControls();
    saveState();
    announce(`${button.textContent.trim()} selected.`);
  });
});

assistButton.addEventListener("click", () => {
  state.drawAssist = !state.drawAssist;
  if (state.drawAssist) state.tool = "pen";
  syncControls();
  saveState();
  announce(`Draw assist ${state.drawAssist ? "enabled" : "disabled"}.`);
});

colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.color = button.dataset.color;
    state.tool = ["eraser", "hand", "zoom"].includes(state.tool) ? "pen" : state.tool;
    if (DRAWING_TOOLS.includes(state.tool)) state.lastDrawingTool = state.tool;
    setPressed(colorButtons, button);
    syncControls();
    saveState();
    announce(`${button.getAttribute("aria-label")} selected.`);
  });
});

gridButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.grid = button.dataset.grid;
    setPressed(gridButtons, button);
    syncControls();
    saveState();
    announce(`${button.textContent.trim()} background selected.`);
  });
});

panelTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.panelTab = button.dataset.panelTab === "canvas" ? "canvas" : "draw";
    syncPanelTabs();
    saveState();
  });
});

canvasTabs.addEventListener("click", (event) => {
  if (suppressCanvasTabClick) {
    event.preventDefault();
    return;
  }
  const tab = event.target.closest("[data-canvas-id]");
  if (!tab) return;
  resetDeleteCanvasConfirmation();
  activateCanvas(tab.dataset.canvasId);
});

canvasTabs.addEventListener("pointerdown", (event) => {
  const tab = event.target.closest("[data-canvas-id]");
  if (!tab || !event.isPrimary || !["touch", "pen"].includes(event.pointerType)) return;
  tabPointerReorder = {
    sourceId: tab.dataset.canvasId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    active: false,
    targetId: null,
    placeAfter: false,
    scrolling: false,
    startScrollLeft: canvasTabs.scrollLeft,
  };
  tabPointerReorderTimer = window.setTimeout(() => {
    if (!tabPointerReorder) return;
    tabPointerReorder.active = true;
    draggedCanvasId = tabPointerReorder.sourceId;
    try {
      tab.setPointerCapture(tabPointerReorder.pointerId);
    } catch {
      resetPointerTabReorder();
      return;
    }
    tab.classList.add("is-dragging");
    announce("Drag the tab to its new position.");
  }, event.pointerType === "pen" ? 180 : 360);
});

canvasTabs.addEventListener("pointermove", (event) => {
  if (!tabPointerReorder || event.pointerId !== tabPointerReorder.pointerId) return;
  if (tabPointerReorder.scrolling) {
    event.preventDefault();
    canvasTabs.scrollLeft = tabPointerReorder.startScrollLeft - (event.clientX - tabPointerReorder.startX);
    return;
  }
  if (!tabPointerReorder.active) {
    const deltaX = event.clientX - tabPointerReorder.startX;
    const deltaY = event.clientY - tabPointerReorder.startY;
    if (Math.hypot(deltaX, deltaY) > 9) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        window.clearTimeout(tabPointerReorderTimer);
        tabPointerReorderTimer = null;
        tabPointerReorder.scrolling = true;
        try {
          event.target.closest("[data-canvas-id]")?.setPointerCapture(event.pointerId);
        } catch {
          resetPointerTabReorder();
          return;
        }
        event.preventDefault();
        canvasTabs.scrollLeft = tabPointerReorder.startScrollLeft - deltaX;
      } else {
        resetPointerTabReorder();
      }
    }
    return;
  }
  event.preventDefault();
  updateCanvasDropTarget(event.clientX, event.clientY);
});

canvasTabs.addEventListener("pointerup", (event) => {
  if (!tabPointerReorder || event.pointerId !== tabPointerReorder.pointerId) return;
  const { active, scrolling, sourceId, targetId, placeAfter } = tabPointerReorder;
  if (active && targetId) {
    event.preventDefault();
    reorderCanvas(sourceId, targetId, placeAfter);
    suppressCanvasTabClick = true;
    window.setTimeout(() => { suppressCanvasTabClick = false; }, 0);
  } else if (scrolling) {
    event.preventDefault();
    suppressCanvasTabClick = true;
    window.setTimeout(() => { suppressCanvasTabClick = false; }, 0);
  }
  resetPointerTabReorder();
});

canvasTabs.addEventListener("pointercancel", resetPointerTabReorder);
canvasTabs.addEventListener("contextmenu", (event) => {
  if (event.target.closest("[data-canvas-id]")) event.preventDefault();
});

canvasTabs.addEventListener("dragstart", (event) => {
  const tab = event.target.closest("[data-canvas-id]");
  if (!tab) return;
  draggedCanvasId = tab.dataset.canvasId;
  tab.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedCanvasId);
});

canvasTabs.addEventListener("dragover", (event) => {
  const tab = event.target.closest("[data-canvas-id]");
  if (!tab || !draggedCanvasId || tab.dataset.canvasId === draggedCanvasId) return;
  event.preventDefault();
  clearCanvasDropMarkers();
  canvasTabs.querySelector(`[data-canvas-id="${CSS.escape(draggedCanvasId)}"]`)?.classList.add("is-dragging");
  const bounds = tab.getBoundingClientRect();
  tab.classList.add(event.clientX > bounds.left + (bounds.width / 2) ? "is-drop-after" : "is-drop-before");
});

canvasTabs.addEventListener("drop", (event) => {
  const tab = event.target.closest("[data-canvas-id]");
  if (!tab || !draggedCanvasId) return;
  event.preventDefault();
  const bounds = tab.getBoundingClientRect();
  reorderCanvas(draggedCanvasId, tab.dataset.canvasId, event.clientX > bounds.left + (bounds.width / 2));
  draggedCanvasId = null;
  clearCanvasDropMarkers();
});

canvasTabs.addEventListener("dragend", () => {
  draggedCanvasId = null;
  clearCanvasDropMarkers();
});

canvasTabs.addEventListener("keydown", (event) => {
  const tabs = [...canvasTabs.querySelectorAll("[data-canvas-id]")];
  const currentIndex = tabs.findIndex((tab) => tab === event.target);
  if (currentIndex < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;
    const currentId = tabs[currentIndex].dataset.canvasId;
    reorderCanvas(currentId, tabs[targetIndex].dataset.canvasId, direction > 0);
    window.requestAnimationFrame(() => canvasTabs.querySelector(`[data-canvas-id="${CSS.escape(currentId)}"]`)?.focus());
    return;
  }
  let nextIndex = currentIndex;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  const nextId = tabs[nextIndex].dataset.canvasId;
  resetDeleteCanvasConfirmation();
  activateCanvas(nextId);
  window.requestAnimationFrame(() => canvasTabs.querySelector(`[data-canvas-id="${CSS.escape(nextId)}"]`)?.focus());
});

newCanvasButton.addEventListener("click", addCanvas);
duplicateCanvasButton.addEventListener("click", duplicateActiveCanvas);
renameCanvasButton.addEventListener("click", openRenameCanvas);
deleteCanvasButton.addEventListener("click", deleteActiveCanvas);
renameCanvasForm.addEventListener("submit", renameActiveCanvas);
renameCanvasCancel.addEventListener("click", () => renameCanvasDialog.close());
renameCanvasInput.addEventListener("input", () => renameCanvasInput.setCustomValidity(""));

axisNumbersButton.addEventListener("click", () => {
  state.axisNumbers = !state.axisNumbers;
  axisLabelSignature = "";
  syncControls();
  saveState();
  announce(`Axis numbers ${state.axisNumbers ? "shown" : "hidden"}.`);
});

axisSizeInput.addEventListener("input", () => {
  state.axisFontSize = Number(axisSizeInput.value);
  syncControls();
  saveState();
});

sizeInput.addEventListener("input", () => {
  const activeSizeTool = sizeControlTool();
  state.toolSizes[activeSizeTool] = Number(sizeInput.value);
  sizeOutput.value = state.toolSizes[activeSizeTool];
  eraserPreview.style.setProperty("--eraser-diameter", `${strokeWidth({ tool: "eraser", size: toolSize("eraser") }) * state.zoom}px`);
  saveState();
});

smoothingButton.addEventListener("click", () => {
  state.smooth = !state.smooth;
  smoothingButton.setAttribute("aria-pressed", String(state.smooth));
  saveState();
  announce(`Smooth curves ${state.smooth ? "enabled" : "disabled"}.`);
});

bindHistoryStepButton(undoButton, -1);
bindHistoryStepButton(redoButton, 1);
bindHistoryStepButton(fullscreenUndoButton, -1);
bindHistoryStepButton(fullscreenRedoButton, 1);
historyToggleButton.addEventListener("click", toggleHistoryScrubber);
fullscreenHistoryButton.addEventListener("click", toggleHistoryScrubber);
historyCloseButton.addEventListener("click", () => setHistoryScrubberVisibility(false));
historyStartButton.addEventListener("click", () => setHistoryPosition(0));
historyEndButton.addEventListener("click", () => setHistoryPosition(state.strokes.length + redoStack.length));
historyRange.addEventListener("input", () => setHistoryPosition(historyRange.value, false));
historyRange.addEventListener("change", () => announce(`History ${state.strokes.length} of ${state.strokes.length + redoStack.length}.`));
fullscreenClearButton.addEventListener("click", requestClearBoard);
fullscreenButton.addEventListener("click", toggleFullscreenMode);
panelToggleButton.addEventListener("click", togglePanelVisibility);
zoomOutButton.addEventListener("click", zoomOut);
zoomResetButton.addEventListener("click", resetView);
zoomInButton.addEventListener("click", zoomIn);
saveButton.addEventListener("click", downloadBoard);
pdfButton.addEventListener("click", downloadPdf);
exportProjectButton.addEventListener("click", downloadProject);
shareProjectButton.addEventListener("click", shareProject);
newProjectButton.addEventListener("click", startNewProject);
importProjectButton.addEventListener("click", () => {
  resetNewProjectConfirmation();
  projectFileInput.click();
});
projectFileInput.addEventListener("change", () => importProject(projectFileInput.files?.[0]));
clearButton.addEventListener("click", requestClearBoard);

canvas.addEventListener("pointerdown", startStroke);
canvas.addEventListener("pointerenter", updateEraserPreview);
canvas.addEventListener("pointermove", (event) => {
  updateEraserPreview(event);
  continueStroke(event);
});
canvas.addEventListener("pointerleave", hideEraserPreview);
canvas.addEventListener("pointerup", finishStroke);
canvas.addEventListener("pointercancel", finishStroke);
canvas.addEventListener("lostpointercapture", (event) => {
  if ((activeStroke || activePan || activeZoomSelection) && event.pointerId === activePointerId) finishStroke(event);
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("keydown", (event) => {
  if (event.key === "Home") {
    event.preventDefault();
    resetView();
    return;
  }
  if (state.tool !== "hand") return;
  const step = event.shiftKey ? 64 : 32;
  const movement = {
    ArrowLeft: [step, 0],
    ArrowRight: [-step, 0],
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
  }[event.key];
  if (movement) {
    event.preventDefault();
    moveCanvasBy(...movement);
    announce("Canvas moved.");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeZoomSelection) {
    const pointerId = activePointerId;
    activeZoomSelection = null;
    activePointerId = null;
    activePointerType = null;
    zoomSelection.classList.remove("is-visible");
    if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    announce("Zoom selection cancelled.");
    return;
  }
  if (event.key === "Escape" && historyScrubber.classList.contains("is-visible")) {
    setHistoryScrubberVisibility(false);
    (isFullscreenMode() ? fullscreenHistoryButton : historyToggleButton).focus({ preventScroll: true });
    return;
  }
  if (event.key === "Escape" && document.querySelector(".mathboard-main").classList.contains("is-fullscreen-fallback")) {
    document.querySelector(".mathboard-main").classList.remove("is-fullscreen-fallback");
    syncFullscreenMode();
    return;
  }
  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier || event.key.toLowerCase() !== "z") return;
  event.preventDefault();
  if (event.shiftKey) redo();
  else undo();
});

document.addEventListener("fullscreenchange", syncFullscreenMode);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && saveTimer) flushStateSave();
});
window.addEventListener("pagehide", () => {
  if (saveTimer) flushStateSave();
});

const resizeObserver = new ResizeObserver(renderBoard);
resizeObserver.observe(board);

async function initializeMathBoard() {
  await loadState();
  syncCanvasTabs();
  syncControls();
  renderBoard();
}

initializeMathBoard();
