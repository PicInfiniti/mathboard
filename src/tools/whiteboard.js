import "../assets/sass/whiteboard.sass";
import { sitePath } from "../sections/shared.js";

const root = document.querySelector("#app");

root.innerHTML = `
  <div class="whiteboard-shell">
    <header class="whiteboard-header">
      <a class="whiteboard-brand" href="${sitePath()}" aria-label="Back to the MATH 1280 course home">
        <span class="whiteboard-brand__mark" aria-hidden="true">ƒ</span>
        <span><strong>Precalculus</strong><small>MATH 1280</small></span>
      </a>
      <div class="whiteboard-header__title">
        <strong>Math whiteboard</strong>
        <span>Sketch · test · explain</span>
      </div>
      <a class="whiteboard-header__home" href="${sitePath()}">Course map <span aria-hidden="true">↗</span></a>
    </header>

    <main class="whiteboard-main">
      <aside class="whiteboard-toolbar" id="whiteboard-toolbar" aria-label="Whiteboard tools">
        <div class="whiteboard-panel-tabs" aria-label="Control panel mode">
          <button type="button" data-panel-tab="draw" aria-pressed="true">
            <span class="whiteboard-panel-tab__icon" aria-hidden="true">✎</span>
            <span><strong>Draw</strong><small>Tools & ink</small></span>
          </button>
          <button type="button" data-panel-tab="canvas" aria-pressed="false">
            <span class="whiteboard-panel-tab__icon" aria-hidden="true">⌗</span>
            <span><strong>Canvas</strong><small>Grid & axes</small></span>
          </button>
        </div>

        <fieldset class="whiteboard-tool-group whiteboard-tool-group--drawing" data-panel-section="draw">
          <legend>Drawing tool</legend>
          <div class="whiteboard-tool-grid">
            <button class="whiteboard-tool" type="button" data-tool="pen" aria-pressed="true"><span aria-hidden="true">✎</span><span>Pen</span></button>
            <button class="whiteboard-tool" type="button" data-tool="highlighter" aria-pressed="false"><span aria-hidden="true">▰</span><span>Highlight</span></button>
            <button class="whiteboard-tool" type="button" data-tool="eraser" aria-pressed="false"><span aria-hidden="true">◇</span><span>Eraser</span></button>
            <button class="whiteboard-tool" type="button" data-tool="hand" aria-pressed="false"><span aria-hidden="true">✋</span><span>Move</span></button>
            <button class="whiteboard-tool" type="button" data-tool="zoom" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="5" /><path d="m14 14 5 5M7.5 10h5" /></svg></span><span>Zoom</span></button>
          </div>
        </fieldset>

        <fieldset class="whiteboard-tool-group whiteboard-tool-group--colors" data-panel-section="draw">
          <legend>Ink color</legend>
          <div class="whiteboard-colors">
            <button class="whiteboard-color" style="--swatch: #071d33" type="button" data-color="#071d33" aria-label="Navy ink" aria-pressed="true"></button>
            <button class="whiteboard-color" style="--swatch: #ff6b48" type="button" data-color="#ff6b48" aria-label="Coral ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #d99f18" type="button" data-color="#d99f18" aria-label="Gold ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #168ca8" type="button" data-color="#168ca8" aria-label="Blue ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #765fc0" type="button" data-color="#765fc0" aria-label="Violet ink" aria-pressed="false"></button>
          </div>
        </fieldset>

        <div class="whiteboard-tool-group whiteboard-tool-group--stroke" data-panel-section="draw">
          <label for="whiteboard-size">Stroke size</label>
          <div class="whiteboard-size-row">
            <input class="whiteboard-size" id="whiteboard-size" type="range" min="1" max="30" value="5" />
            <output for="whiteboard-size" id="whiteboard-size-output">5</output>
          </div>
          <button class="whiteboard-smoothing" id="whiteboard-smoothing" type="button" aria-pressed="true">
            <span><strong>Smooth curves</strong><small>Round out pen movement</small></span>
            <span class="whiteboard-smoothing__switch" aria-hidden="true"><i></i></span>
          </button>
        </div>

        <fieldset class="whiteboard-tool-group whiteboard-tool-group--background" data-panel-section="canvas">
          <legend>Background</legend>
          <div class="whiteboard-grid-options">
            <button class="whiteboard-grid-button" type="button" data-grid="blank" aria-pressed="false">Blank</button>
            <button class="whiteboard-grid-button" type="button" data-grid="square" aria-pressed="true">Grid</button>
            <button class="whiteboard-grid-button" type="button" data-grid="coordinate" aria-pressed="false">Axes</button>
          </div>
          <button class="whiteboard-axis-numbers" id="whiteboard-axis-numbers" type="button" aria-pressed="true" disabled>
            <span><strong>Axis numbers</strong><small>Label coordinate values</small></span>
            <span class="whiteboard-axis-numbers__switch" aria-hidden="true"><i></i></span>
          </button>
          <label class="whiteboard-axis-size" for="whiteboard-axis-size">
            <span>Number size</span>
            <span class="whiteboard-axis-size__control">
              <input id="whiteboard-axis-size" type="range" min="8" max="30" value="9" disabled />
              <output id="whiteboard-axis-size-output" for="whiteboard-axis-size">9</output>
            </span>
          </label>
        </fieldset>

        <div class="whiteboard-history" aria-label="Board actions">
          <p class="whiteboard-history__title">Board actions</p>
          <button class="whiteboard-action" id="whiteboard-undo" type="button" disabled>Undo</button>
          <button class="whiteboard-action" id="whiteboard-redo" type="button" disabled>Redo</button>
          <button class="whiteboard-action whiteboard-action--save" id="whiteboard-save" type="button">Download PNG</button>
          <button class="whiteboard-action whiteboard-action--clear" id="whiteboard-clear" type="button">Clear board</button>
        </div>

        <details class="whiteboard-help">
          <summary>Quick help</summary>
          <p>Use Move to pan and Zoom to frame a precise area. Use − or + to change scale, or select the percentage to reset. Pen pressure and stylus eraser tips are supported. Press <strong>Ctrl/⌘ + Z</strong> to undo.</p>
        </details>
      </aside>

      <section class="whiteboard-board" id="whiteboard-board" aria-label="Drawing area">
        <div class="whiteboard-canvas-tabs" aria-label="Canvas tabs">
          <div class="whiteboard-canvas-tabs__list" id="whiteboard-canvas-tabs" role="tablist" aria-label="Open canvases"></div>
          <div class="whiteboard-canvas-tabs__actions">
            <button id="whiteboard-canvas-new" type="button" aria-label="Create a new canvas" title="New canvas"><span aria-hidden="true">+</span><span>New</span></button>
            <button id="whiteboard-canvas-rename" type="button" aria-label="Rename the current canvas" title="Rename canvas"><span aria-hidden="true">✎</span><span>Rename</span></button>
            <button id="whiteboard-canvas-delete" type="button" aria-label="Delete the current canvas" title="Delete canvas"><span aria-hidden="true">×</span><span>Delete</span></button>
          </div>
        </div>
        <dialog class="whiteboard-rename-dialog" id="whiteboard-rename-dialog">
          <form id="whiteboard-rename-form">
            <p>Canvas name</p>
            <label for="whiteboard-canvas-name">Rename the current canvas</label>
            <input id="whiteboard-canvas-name" name="canvasName" type="text" maxlength="32" autocomplete="off" required />
            <div>
              <button id="whiteboard-rename-cancel" type="button">Cancel</button>
              <button type="submit">Save name</button>
            </div>
          </form>
        </dialog>
        <div class="whiteboard-axis-labels" id="whiteboard-axis-labels" aria-hidden="true"></div>
        <div class="whiteboard-zoom-selection" id="whiteboard-zoom-selection" aria-hidden="true"></div>
        <canvas
          class="whiteboard-canvas"
          id="whiteboard-canvas"
          tabindex="0"
          aria-label="Whiteboard canvas. Draw with a mouse, finger, or stylus. Use the toolbar to change tools."
        ></canvas>
        <span class="whiteboard-eraser-preview" id="whiteboard-eraser-preview" aria-hidden="true"></span>
        <p class="whiteboard-board__hint" aria-hidden="true">Draw anywhere to begin</p>
        <p class="whiteboard-status" id="whiteboard-status" role="status" aria-live="polite"></p>
        <div class="whiteboard-zoom-controls" aria-label="Zoom controls">
          <button id="whiteboard-zoom-out" type="button" aria-label="Zoom out" title="Zoom out">−</button>
          <button id="whiteboard-zoom-reset" type="button" aria-label="Reset zoom and center canvas" title="Reset view"><span aria-hidden="true">↺</span></button>
          <button id="whiteboard-zoom-in" type="button" aria-label="Zoom in" title="Zoom in">+</button>
        </div>
        <button class="whiteboard-panel-toggle" id="whiteboard-panel-toggle" type="button" aria-expanded="true" aria-controls="whiteboard-toolbar" aria-label="Hide settings panel" title="Hide settings">
          <span aria-hidden="true">✎</span>
        </button>
        <button class="whiteboard-fullscreen-toggle" id="whiteboard-fullscreen" type="button" aria-pressed="false" aria-label="Open full-screen whiteboard" title="Full screen">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path class="whiteboard-fullscreen-toggle__expand" d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
            <path class="whiteboard-fullscreen-toggle__collapse" d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />
          </svg>
        </button>
      </section>
    </main>
  </div>
`;

const STORAGE_KEY = "math-1280-whiteboard-v1";
const board = document.querySelector("#whiteboard-board");
const canvas = document.querySelector("#whiteboard-canvas");
const context = canvas.getContext("2d");
const toolButtons = [...document.querySelectorAll("[data-tool]")];
const colorButtons = [...document.querySelectorAll("[data-color]")];
const gridButtons = [...document.querySelectorAll("[data-grid]")];
const panelTabButtons = [...document.querySelectorAll("[data-panel-tab]")];
const panelSections = [...document.querySelectorAll("[data-panel-section]")];
const canvasTabs = document.querySelector("#whiteboard-canvas-tabs");
const newCanvasButton = document.querySelector("#whiteboard-canvas-new");
const renameCanvasButton = document.querySelector("#whiteboard-canvas-rename");
const deleteCanvasButton = document.querySelector("#whiteboard-canvas-delete");
const renameCanvasDialog = document.querySelector("#whiteboard-rename-dialog");
const renameCanvasForm = document.querySelector("#whiteboard-rename-form");
const renameCanvasInput = document.querySelector("#whiteboard-canvas-name");
const renameCanvasCancel = document.querySelector("#whiteboard-rename-cancel");
const sizeInput = document.querySelector("#whiteboard-size");
const sizeOutput = document.querySelector("#whiteboard-size-output");
const smoothingButton = document.querySelector("#whiteboard-smoothing");
const axisNumbersButton = document.querySelector("#whiteboard-axis-numbers");
const axisSizeInput = document.querySelector("#whiteboard-axis-size");
const axisSizeOutput = document.querySelector("#whiteboard-axis-size-output");
const axisLabels = document.querySelector("#whiteboard-axis-labels");
const zoomSelection = document.querySelector("#whiteboard-zoom-selection");
const zoomOutButton = document.querySelector("#whiteboard-zoom-out");
const zoomResetButton = document.querySelector("#whiteboard-zoom-reset");
const zoomInButton = document.querySelector("#whiteboard-zoom-in");
const undoButton = document.querySelector("#whiteboard-undo");
const redoButton = document.querySelector("#whiteboard-redo");
const panelToggleButton = document.querySelector("#whiteboard-panel-toggle");
const fullscreenButton = document.querySelector("#whiteboard-fullscreen");
const saveButton = document.querySelector("#whiteboard-save");
const clearButton = document.querySelector("#whiteboard-clear");
const status = document.querySelector("#whiteboard-status");
const eraserPreview = document.querySelector("#whiteboard-eraser-preview");

const firstCanvas = createCanvasRecord("Canvas 1");
let state = {
  tool: "pen",
  color: "#071d33",
  size: 5,
  smooth: true,
  grid: "square",
  axisNumbers: true,
  axisFontSize: 9,
  panelTab: "draw",
  zoom: 1,
  panX: 0,
  panY: 0,
  strokes: [],
  canvases: [firstCanvas],
  activeCanvasId: firstCanvas.id,
};
let redoStack = [];
let activeStroke = null;
let activePointerId = null;
let activePointerType = null;
let activePan = null;
let activeZoomSelection = null;
let lastPenInteraction = 0;
let clearTimer = null;
let deleteCanvasTimer = null;
let statusTimer = null;
let axisLabelSignature = "";
let canvasTabSignature = "";

function isFullscreenMode() {
  const main = document.querySelector(".whiteboard-main");
  return document.fullscreenElement === main || main.classList.contains("is-fullscreen-fallback");
}

function syncFullscreenMode() {
  const fullscreen = isFullscreenMode();
  const main = document.querySelector(".whiteboard-main");
  if (!fullscreen) main.classList.remove("is-toolbar-hidden");
  main.classList.toggle("is-fullscreen", fullscreen);
  fullscreenButton.setAttribute("aria-pressed", String(fullscreen));
  fullscreenButton.setAttribute("aria-label", fullscreen ? "Exit full-screen whiteboard" : "Open full-screen whiteboard");
  fullscreenButton.title = fullscreen ? "Exit full screen" : "Full screen";
  syncPanelVisibility();
  syncPanelTabs();
  document.body.classList.toggle("has-whiteboard-fullscreen", fullscreen);
  window.setTimeout(renderBoard, 0);
}

function syncPanelVisibility() {
  const hidden = document.querySelector(".whiteboard-main").classList.contains("is-toolbar-hidden");
  panelToggleButton.setAttribute("aria-expanded", String(!hidden));
  panelToggleButton.setAttribute("aria-label", hidden ? "Show settings panel" : "Hide settings panel");
  panelToggleButton.title = hidden ? "Show settings" : "Hide settings";
}

function togglePanelVisibility() {
  document.querySelector(".whiteboard-main").classList.toggle("is-toolbar-hidden");
  syncPanelVisibility();
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
  const main = document.querySelector(".whiteboard-main");
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

function createCanvasRecord(name, source = {}) {
  const id = typeof globalThis.crypto?.randomUUID === "function"
    ? `canvas-${globalThis.crypto.randomUUID()}`
    : `canvas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    name,
    strokes: Array.isArray(source.strokes) ? source.strokes : [],
    grid: ["blank", "square", "coordinate"].includes(source.grid) ? source.grid : "square",
    axisNumbers: source.axisNumbers !== false,
    axisFontSize: Number.isFinite(Number(source.axisFontSize)) ? Math.min(30, Math.max(8, Number(source.axisFontSize))) : 9,
    zoom: Number.isFinite(Number(source.zoom)) ? Math.min(8, Math.max(1, Number(source.zoom))) : 1,
    panX: Number.isFinite(Number(source.panX)) ? Number(source.panX) : 0,
    panY: Number.isFinite(Number(source.panY)) ? Number(source.panY) : 0,
  };
}

function normalizeCanvasRecord(record, index) {
  const normalized = createCanvasRecord(
    typeof record?.name === "string" && record.name.trim() ? record.name.trim().slice(0, 32) : `Canvas ${index + 1}`,
    record,
  );
  if (typeof record?.id === "string" && record.id) normalized.id = record.id;
  return normalized;
}

function activeCanvasRecord() {
  return state.canvases.find((item) => item.id === state.activeCanvasId) || state.canvases[0];
}

function syncActiveCanvasState() {
  const activeCanvas = activeCanvasRecord();
  if (!activeCanvas) return;
  Object.assign(activeCanvas, {
    strokes: state.strokes,
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
  redoStack = [];
  activeStroke = null;
  activePan = null;
  activeZoomSelection = null;
  activePointerId = null;
  activePointerType = null;
  axisLabelSignature = "";
  zoomSelection.classList.remove("is-visible");
  eraserPreview.classList.remove("is-visible");
  clearButton.classList.remove("is-confirming");
  clearButton.textContent = "Clear board";
}

function syncCanvasTabs() {
  const signature = `${state.activeCanvasId}:${state.canvases.map((item) => `${item.id}:${item.name}`).join("|")}`;
  if (signature !== canvasTabSignature) {
    canvasTabSignature = signature;
    canvasTabs.replaceChildren();
    state.canvases.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `whiteboard-tab-${item.id}`;
      button.dataset.canvasId = item.id;
      button.role = "tab";
      button.setAttribute("aria-selected", String(item.id === state.activeCanvasId));
      button.tabIndex = item.id === state.activeCanvasId ? 0 : -1;
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

function saveState() {
  try {
    syncActiveCanvasState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    announce("This board could not be saved in the browser.");
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || (!Array.isArray(saved.strokes) && !Array.isArray(saved.canvases))) return;
    const savedCanvases = Array.isArray(saved.canvases) && saved.canvases.length
      ? saved.canvases.map(normalizeCanvasRecord)
      : [createCanvasRecord("Canvas 1", saved)];
    const activeCanvas = savedCanvases.find((item) => item.id === saved.activeCanvasId) || savedCanvases[0];
    state = {
      tool: ["pen", "highlighter", "eraser", "hand", "zoom"].includes(saved.tool) ? saved.tool : state.tool,
      color: typeof saved.color === "string" ? saved.color : state.color,
      size: Number.isFinite(Number(saved.size)) ? Math.min(30, Math.max(1, Number(saved.size))) : state.size,
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
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function syncControls() {
  syncPanelTabs();
  syncCanvasTabs();
  toolButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tool === state.tool)));
  colorButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.color === state.color)));
  gridButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.grid === state.grid)));
  sizeInput.value = state.size;
  sizeOutput.value = state.size;
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
  zoomOutButton.disabled = state.zoom <= 1;
  zoomInButton.disabled = state.zoom >= 8;
  zoomResetButton.setAttribute("aria-label", `Reset zoom and center canvas. Current zoom ${Math.round(state.zoom * 100)}%.`);
  undoButton.disabled = state.strokes.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function coordinateLabelInterval(zoom = state.zoom) {
  let interval = 2;
  if (zoom >= 4) interval = 0.25;
  else if (zoom >= 2.5) interval = 0.5;
  else if (zoom >= 1.5) interval = 1;
  while ((32 * zoom * interval) < (state.axisFontSize * 3.2) && interval < 2) interval *= 2;
  return interval;
}

function formatCoordinate(value) {
  const rounded = Math.abs(value) < 0.0001 ? 0 : Number(value.toFixed(2));
  return String(rounded);
}

function syncAxisLabels() {
  const bounds = board.getBoundingClientRect();
  const visible = state.grid === "coordinate" && state.axisNumbers;
  const signature = visible ? `${Math.round(bounds.width)}:${Math.round(bounds.height)}:${state.zoom.toFixed(3)}:${state.axisFontSize}` : "hidden";
  axisLabels.classList.toggle("is-visible", visible);
  if (signature !== axisLabelSignature) {
    axisLabelSignature = signature;
    axisLabels.replaceChildren();
    if (visible) {
      const spacing = 32 * state.zoom;
      const labelEvery = coordinateLabelInterval();
      const step = spacing * labelEvery;
      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;
      const xRange = Math.ceil((bounds.width * 1.75) / step) + 2;
      const yRange = Math.ceil((bounds.height * 1.75) / step) + 2;
      const layer = document.createElement("div");
      layer.className = "whiteboard-axis-labels__layer";

      for (let offset = -xRange; offset <= xRange; offset += 1) {
        const label = document.createElement("span");
        label.className = "whiteboard-axis-label whiteboard-axis-label--x";
        label.textContent = formatCoordinate(offset * labelEvery);
        label.style.left = `${centerX + (offset * step)}px`;
        label.style.top = `${centerY + 7}px`;
        layer.append(label);
      }

      for (let offset = -yRange; offset <= yRange; offset += 1) {
        if (offset === 0) continue;
        const label = document.createElement("span");
        label.className = "whiteboard-axis-label whiteboard-axis-label--y";
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

function strokeWidth(stroke) {
  if (stroke.tool === "eraser") return Math.max(18, stroke.size * 3);
  if (stroke.tool === "highlighter") return stroke.size * 3;
  return stroke.size;
}

function pressureAdjustedWidth(stroke, point) {
  if (stroke.tool !== "pen" || stroke.pointerType !== "pen") return strokeWidth(stroke);
  const pressure = Number.isFinite(point?.pressure) ? point.pressure : 0.5;
  return stroke.size * (0.35 + (pressure * 1.3));
}

function midpoint(first, second) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function renderStroke(targetContext, stroke, width, height) {
  if (!stroke.points?.length) return;
  targetContext.save();
  targetContext.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  targetContext.globalAlpha = stroke.tool === "highlighter" ? 0.28 : 1;
  targetContext.strokeStyle = stroke.color;
  targetContext.fillStyle = stroke.color;
  targetContext.lineWidth = strokeWidth(stroke);
  targetContext.lineCap = "round";
  targetContext.lineJoin = "round";

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    targetContext.beginPath();
    targetContext.arc(point.x * width, point.y * height, pressureAdjustedWidth(stroke, point) / 2, 0, Math.PI * 2);
    targetContext.fill();
  } else if (stroke.tool === "pen" && stroke.pointerType === "pen") {
    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1];
      const point = stroke.points[index];
      const start = stroke.smooth === false || index === 1
        ? previous
        : midpoint(previous, point);
      const end = stroke.smooth === false || index === stroke.points.length - 1
        ? point
        : midpoint(point, stroke.points[index + 1]);
      targetContext.beginPath();
      targetContext.moveTo(start.x * width, start.y * height);
      if (stroke.smooth === false) {
        targetContext.lineTo(end.x * width, end.y * height);
      } else {
        targetContext.quadraticCurveTo(point.x * width, point.y * height, end.x * width, end.y * height);
      }
      targetContext.lineWidth = pressureAdjustedWidth(stroke, {
        pressure: ((previous.pressure ?? 0.5) + (point.pressure ?? 0.5)) / 2,
      });
      targetContext.stroke();
    }
  } else {
    targetContext.beginPath();
    targetContext.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    if (stroke.smooth !== false && stroke.points.length > 2) {
      for (let index = 1; index < stroke.points.length - 1; index += 1) {
        const point = stroke.points[index];
        const end = midpoint(point, stroke.points[index + 1]);
        targetContext.quadraticCurveTo(point.x * width, point.y * height, end.x * width, end.y * height);
      }
      const last = stroke.points.at(-1);
      targetContext.lineTo(last.x * width, last.y * height);
    } else {
      for (let index = 1; index < stroke.points.length; index += 1) {
        const point = stroke.points[index];
        targetContext.lineTo(point.x * width, point.y * height);
      }
    }
    targetContext.stroke();
  }
  targetContext.restore();
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
  const diameter = strokeWidth(activeStroke || { tool: "eraser", size: state.size }) * state.zoom;
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
  const nextZoom = Math.min(8, Math.max(state.zoom, state.zoom * fitFactor));
  state.zoom = nextZoom;
  state.panX = -worldOffsetX * nextZoom;
  state.panY = -worldOffsetY * nextZoom;
  axisLabelSignature = "";
  saveState();
  renderBoard();
  announce(`${Math.round(state.zoom * 100)}% zoom`);
}

function zoomOut() {
  if (state.zoom <= 1) return;
  const previousZoom = state.zoom;
  const nextZoom = Math.max(1, previousZoom / 1.5);
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
  if (state.zoom >= 8) return;
  const previousZoom = state.zoom;
  const nextZoom = Math.min(8, previousZoom * 1.5);
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
  activeStroke = {
    tool: usingPenEraser ? "eraser" : state.tool,
    color: state.color,
    size: state.size,
    smooth: state.smooth,
    pointerType: activePointerType,
    points: [normalizedPoint(event)],
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
  state.strokes.push(activeStroke);
  activeStroke = null;
  activePointerId = null;
  activePointerType = null;
  redoStack = [];
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  saveState();
  renderBoard();
  if (finishedPointerType === "touch" || usedTemporaryEraser) eraserPreview.classList.remove("is-visible");
}

function setPressed(buttons, activeButton) {
  buttons.forEach((button) => button.setAttribute("aria-pressed", String(button === activeButton)));
}

function undo() {
  const stroke = state.strokes.pop();
  if (!stroke) return;
  redoStack.push(stroke);
  saveState();
  renderBoard();
  announce("Last stroke undone.");
}

function redo() {
  const stroke = redoStack.pop();
  if (!stroke) return;
  state.strokes.push(stroke);
  saveState();
  renderBoard();
  announce("Stroke restored.");
}

function drawExportBackground(targetContext, width, height) {
  targetContext.fillStyle = "#fffdf8";
  targetContext.fillRect(0, 0, width, height);
  if (state.grid === "blank") return;

  targetContext.save();
  const spacing = 32 * state.zoom;
  const originX = (width / 2) + state.panX;
  const originY = (height / 2) + state.panY;
  if (state.zoom >= 1.5) {
    const minorSpacing = spacing / 4;
    const minorOffsetX = originX % minorSpacing;
    const minorOffsetY = originY % minorSpacing;
    targetContext.strokeStyle = "rgba(7, 29, 51, 0.05)";
    targetContext.lineWidth = 1;
    for (let x = minorOffsetX; x < width; x += minorSpacing) {
      targetContext.beginPath();
      targetContext.moveTo(x, 0);
      targetContext.lineTo(x, height);
      targetContext.stroke();
    }
    for (let y = minorOffsetY; y < height; y += minorSpacing) {
      targetContext.beginPath();
      targetContext.moveTo(0, y);
      targetContext.lineTo(width, y);
      targetContext.stroke();
    }
  }

  targetContext.strokeStyle = "rgba(7, 29, 51, 0.12)";
  targetContext.lineWidth = 1;
  const offsetX = originX % spacing;
  const offsetY = originY % spacing;
  for (let x = offsetX; x < width; x += spacing) {
    targetContext.beginPath();
    targetContext.moveTo(x, 0);
    targetContext.lineTo(x, height);
    targetContext.stroke();
  }
  for (let y = offsetY; y < height; y += spacing) {
    targetContext.beginPath();
    targetContext.moveTo(0, y);
    targetContext.lineTo(width, y);
    targetContext.stroke();
  }
  if (state.grid === "coordinate") {
    targetContext.strokeStyle = "rgba(7, 29, 51, 0.52)";
    targetContext.lineWidth = 2;
    targetContext.beginPath();
    targetContext.moveTo(originX, 0);
    targetContext.lineTo(originX, height);
    targetContext.moveTo(0, originY);
    targetContext.lineTo(width, originY);
    targetContext.stroke();

    if (state.axisNumbers) {
      targetContext.fillStyle = "rgba(7, 29, 51, 0.68)";
      targetContext.font = `${state.axisFontSize}px Ubuntu, Arial, sans-serif`;
      const labelEvery = coordinateLabelInterval();
      const labelStep = spacing * labelEvery;
      targetContext.textAlign = "center";
      targetContext.textBaseline = "top";
      const minXLabel = Math.ceil(-originX / labelStep);
      const maxXLabel = Math.floor((width - originX) / labelStep);
      for (let offset = minXLabel; offset <= maxXLabel; offset += 1) {
        targetContext.fillText(formatCoordinate(offset * labelEvery), originX + (offset * labelStep), originY + 7);
      }
      targetContext.textAlign = "left";
      targetContext.textBaseline = "middle";
      const minYLabel = Math.ceil(-originY / labelStep);
      const maxYLabel = Math.floor((height - originY) / labelStep);
      for (let offset = minYLabel; offset <= maxYLabel; offset += 1) {
        if (offset !== 0) targetContext.fillText(formatCoordinate(-offset * labelEvery), originX + 8, originY + (offset * labelStep));
      }
    }
  }
  targetContext.restore();
}

function downloadBoard() {
  const bounds = canvas.getBoundingClientRect();
  const scale = 2;
  const exportCanvas = document.createElement("canvas");
  const inkCanvas = document.createElement("canvas");
  exportCanvas.width = Math.round(bounds.width * scale);
  exportCanvas.height = Math.round(bounds.height * scale);
  inkCanvas.width = exportCanvas.width;
  inkCanvas.height = exportCanvas.height;
  const exportContext = exportCanvas.getContext("2d");
  const inkContext = inkCanvas.getContext("2d");
  exportContext.scale(scale, scale);
  inkContext.scale(scale, scale);
  drawExportBackground(exportContext, bounds.width, bounds.height);
  inkContext.translate((bounds.width / 2) + state.panX, (bounds.height / 2) + state.panY);
  inkContext.scale(state.zoom, state.zoom);
  inkContext.translate(-(bounds.width / 2), -(bounds.height / 2));
  state.strokes.forEach((stroke) => renderStroke(inkContext, stroke, bounds.width, bounds.height));
  exportContext.drawImage(inkCanvas, 0, 0, bounds.width, bounds.height);
  const link = document.createElement("a");
  const canvasName = (activeCanvasRecord()?.name || "canvas").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  link.download = `math-whiteboard-${canvasName}-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
  announce("Whiteboard downloaded as a PNG.");
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.tool = button.dataset.tool;
    syncControls();
    saveState();
    announce(`${button.textContent.trim()} selected.`);
  });
});

colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.color = button.dataset.color;
    state.tool = ["eraser", "hand", "zoom"].includes(state.tool) ? "pen" : state.tool;
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
  const tab = event.target.closest("[data-canvas-id]");
  if (!tab) return;
  resetDeleteCanvasConfirmation();
  activateCanvas(tab.dataset.canvasId);
});

canvasTabs.addEventListener("keydown", (event) => {
  const tabs = [...canvasTabs.querySelectorAll("[data-canvas-id]")];
  const currentIndex = tabs.findIndex((tab) => tab === event.target);
  if (currentIndex < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
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
  state.size = Number(sizeInput.value);
  sizeOutput.value = state.size;
  eraserPreview.style.setProperty("--eraser-diameter", `${strokeWidth({ tool: "eraser", size: state.size }) * state.zoom}px`);
  saveState();
});

smoothingButton.addEventListener("click", () => {
  state.smooth = !state.smooth;
  smoothingButton.setAttribute("aria-pressed", String(state.smooth));
  saveState();
  announce(`Smooth curves ${state.smooth ? "enabled" : "disabled"}.`);
});

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
fullscreenButton.addEventListener("click", toggleFullscreenMode);
panelToggleButton.addEventListener("click", togglePanelVisibility);
zoomOutButton.addEventListener("click", zoomOut);
zoomResetButton.addEventListener("click", resetView);
zoomInButton.addEventListener("click", zoomIn);
saveButton.addEventListener("click", downloadBoard);
clearButton.addEventListener("click", () => {
  if (!clearButton.classList.contains("is-confirming")) {
    clearButton.classList.add("is-confirming");
    clearButton.textContent = "Click again to clear";
    announce("Press clear again to erase the whole board.");
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      clearButton.classList.remove("is-confirming");
      clearButton.textContent = "Clear board";
    }, 3000);
    return;
  }
  state.strokes = [];
  redoStack = [];
  clearButton.classList.remove("is-confirming");
  clearButton.textContent = "Clear board";
  saveState();
  renderBoard();
  announce("Whiteboard cleared.");
});

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
  if (event.key === "Escape" && document.querySelector(".whiteboard-main").classList.contains("is-fullscreen-fallback")) {
    document.querySelector(".whiteboard-main").classList.remove("is-fullscreen-fallback");
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

const resizeObserver = new ResizeObserver(renderBoard);
resizeObserver.observe(board);
loadState();
syncCanvasTabs();
syncControls();
renderBoard();
