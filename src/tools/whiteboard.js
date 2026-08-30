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
        <fieldset class="whiteboard-tool-group whiteboard-tool-group--drawing">
          <legend>Drawing tool</legend>
          <div class="whiteboard-tool-grid">
            <button class="whiteboard-tool" type="button" data-tool="pen" aria-pressed="true"><span aria-hidden="true">✎</span><span>Pen</span></button>
            <button class="whiteboard-tool" type="button" data-tool="highlighter" aria-pressed="false"><span aria-hidden="true">▰</span><span>Highlight</span></button>
            <button class="whiteboard-tool" type="button" data-tool="eraser" aria-pressed="false"><span aria-hidden="true">◇</span><span>Eraser</span></button>
            <button class="whiteboard-tool" type="button" data-tool="hand" aria-pressed="false"><span aria-hidden="true">✋</span><span>Move</span></button>
          </div>
        </fieldset>

        <fieldset class="whiteboard-tool-group whiteboard-tool-group--colors">
          <legend>Ink color</legend>
          <div class="whiteboard-colors">
            <button class="whiteboard-color" style="--swatch: #071d33" type="button" data-color="#071d33" aria-label="Navy ink" aria-pressed="true"></button>
            <button class="whiteboard-color" style="--swatch: #ff6b48" type="button" data-color="#ff6b48" aria-label="Coral ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #d99f18" type="button" data-color="#d99f18" aria-label="Gold ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #168ca8" type="button" data-color="#168ca8" aria-label="Blue ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #765fc0" type="button" data-color="#765fc0" aria-label="Violet ink" aria-pressed="false"></button>
          </div>
        </fieldset>

        <div class="whiteboard-tool-group whiteboard-tool-group--stroke">
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

        <fieldset class="whiteboard-tool-group whiteboard-tool-group--background">
          <legend>Background</legend>
          <div class="whiteboard-grid-options">
            <button class="whiteboard-grid-button" type="button" data-grid="blank" aria-pressed="true">Blank</button>
            <button class="whiteboard-grid-button" type="button" data-grid="square" aria-pressed="false">Grid</button>
            <button class="whiteboard-grid-button" type="button" data-grid="coordinate" aria-pressed="false">Axes</button>
          </div>
          <button class="whiteboard-axis-numbers" id="whiteboard-axis-numbers" type="button" aria-pressed="true" disabled>
            <span><strong>Axis numbers</strong><small>Label coordinate values</small></span>
            <span class="whiteboard-axis-numbers__switch" aria-hidden="true"><i></i></span>
          </button>
        </fieldset>

        <div class="whiteboard-history" aria-label="Board actions">
          <button class="whiteboard-action" id="whiteboard-undo" type="button" disabled>Undo</button>
          <button class="whiteboard-action" id="whiteboard-redo" type="button" disabled>Redo</button>
          <button class="whiteboard-action whiteboard-action--save" id="whiteboard-save" type="button">Download PNG</button>
          <button class="whiteboard-action whiteboard-action--clear" id="whiteboard-clear" type="button">Clear board</button>
        </div>

        <p class="whiteboard-help"><strong>Tip:</strong> Pen pressure and a stylus eraser tip are supported. Use Move to pan; arrow keys move the focused canvas and Home recenters it. Press <strong>Ctrl/⌘ + Z</strong> to undo. Your board is saved automatically on this device.</p>
      </aside>

      <section class="whiteboard-board" id="whiteboard-board" aria-label="Drawing area">
        <div class="whiteboard-axis-labels" id="whiteboard-axis-labels" aria-hidden="true"></div>
        <canvas
          class="whiteboard-canvas"
          id="whiteboard-canvas"
          tabindex="0"
          aria-label="Whiteboard canvas. Draw with a mouse, finger, or stylus. Use the toolbar to change tools."
        ></canvas>
        <span class="whiteboard-eraser-preview" id="whiteboard-eraser-preview" aria-hidden="true"></span>
        <p class="whiteboard-board__hint" aria-hidden="true">Draw anywhere to begin</p>
        <p class="whiteboard-status" id="whiteboard-status" role="status" aria-live="polite"></p>
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
const sizeInput = document.querySelector("#whiteboard-size");
const sizeOutput = document.querySelector("#whiteboard-size-output");
const smoothingButton = document.querySelector("#whiteboard-smoothing");
const axisNumbersButton = document.querySelector("#whiteboard-axis-numbers");
const axisLabels = document.querySelector("#whiteboard-axis-labels");
const undoButton = document.querySelector("#whiteboard-undo");
const redoButton = document.querySelector("#whiteboard-redo");
const panelToggleButton = document.querySelector("#whiteboard-panel-toggle");
const fullscreenButton = document.querySelector("#whiteboard-fullscreen");
const saveButton = document.querySelector("#whiteboard-save");
const clearButton = document.querySelector("#whiteboard-clear");
const status = document.querySelector("#whiteboard-status");
const eraserPreview = document.querySelector("#whiteboard-eraser-preview");

let state = {
  tool: "pen",
  color: "#071d33",
  size: 5,
  smooth: true,
  grid: "blank",
  axisNumbers: true,
  panX: 0,
  panY: 0,
  strokes: [],
};
let redoStack = [];
let activeStroke = null;
let activePointerId = null;
let activePointerType = null;
let activePan = null;
let lastPenInteraction = 0;
let clearTimer = null;
let statusTimer = null;
let axisLabelSignature = "";

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

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    announce("This board could not be saved in the browser.");
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.strokes)) return;
    state = {
      tool: ["pen", "highlighter", "eraser", "hand"].includes(saved.tool) ? saved.tool : state.tool,
      color: typeof saved.color === "string" ? saved.color : state.color,
      size: Number.isFinite(Number(saved.size)) ? Math.min(30, Math.max(1, Number(saved.size))) : state.size,
      smooth: saved.smooth !== false,
      grid: ["blank", "square", "coordinate"].includes(saved.grid) ? saved.grid : state.grid,
      axisNumbers: saved.axisNumbers !== false,
      panX: Number.isFinite(Number(saved.panX)) ? Number(saved.panX) : 0,
      panY: Number.isFinite(Number(saved.panY)) ? Number(saved.panY) : 0,
      strokes: saved.strokes,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function syncControls() {
  toolButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tool === state.tool)));
  colorButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.color === state.color)));
  gridButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.grid === state.grid)));
  sizeInput.value = state.size;
  sizeOutput.value = state.size;
  smoothingButton.setAttribute("aria-pressed", String(state.smooth));
  axisNumbersButton.setAttribute("aria-pressed", String(state.axisNumbers));
  axisNumbersButton.disabled = state.grid !== "coordinate";
  canvas.classList.toggle("is-erasing", state.tool === "eraser" || activeStroke?.tool === "eraser");
  canvas.classList.toggle("is-panning", state.tool === "hand");
  canvas.classList.toggle("is-panning-active", Boolean(activePan));
  if (state.tool !== "eraser" && activeStroke?.tool !== "eraser") eraserPreview.classList.remove("is-visible");
  board.style.setProperty("--board-pan-x", `${state.panX}px`);
  board.style.setProperty("--board-pan-y", `${state.panY}px`);
  board.classList.toggle("is-grid-square", state.grid === "square");
  board.classList.toggle("is-grid-coordinate", state.grid === "coordinate");
  syncAxisLabels();
  board.classList.toggle("has-ink", state.strokes.length > 0);
  undoButton.disabled = state.strokes.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function syncAxisLabels() {
  const bounds = board.getBoundingClientRect();
  const visible = state.grid === "coordinate" && state.axisNumbers;
  const signature = visible ? `${Math.round(bounds.width)}:${Math.round(bounds.height)}` : "hidden";
  axisLabels.classList.toggle("is-visible", visible);
  if (signature !== axisLabelSignature) {
    axisLabelSignature = signature;
    axisLabels.replaceChildren();
    if (visible) {
      const spacing = 32;
      const labelEvery = 2;
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
        label.textContent = String(offset * labelEvery);
        label.style.left = `${centerX + (offset * step)}px`;
        label.style.top = `${centerY + 7}px`;
        layer.append(label);
      }

      for (let offset = -yRange; offset <= yRange; offset += 1) {
        if (offset === 0) continue;
        const label = document.createElement("span");
        label.className = "whiteboard-axis-label whiteboard-axis-label--y";
        label.textContent = String(-offset * labelEvery);
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
  const pressure = event.pointerType === "pen"
    ? Math.min(1, Math.max(0.08, event.pressure || 0.5))
    : 0.5;
  return {
    x: (event.clientX - bounds.left - state.panX) / bounds.width,
    y: (event.clientY - bounds.top - state.panY) / bounds.height,
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
  state.panX = clampPan(state.panX, bounds.width);
  state.panY = clampPan(state.panY, bounds.height);
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
  context.translate(state.panX, state.panY);
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
  const diameter = strokeWidth(activeStroke || { tool: "eraser", size: state.size });
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
  state.panX = clampPan(state.panX + deltaX, bounds.width);
  state.panY = clampPan(state.panY + deltaY, bounds.height);
  saveState();
  renderBoard();
}

function startStroke(event) {
  if (activePointerId !== null || (state.tool !== "hand" && isLikelyPalm(event))) return;
  const usingPenEraser = isPenEraser(event);
  if (event.button !== undefined && event.button !== 0 && !usingPenEraser) return;
  if (event.pointerType === "pen") lastPenInteraction = performance.now();
  activePointerId = event.pointerId;
  activePointerType = event.pointerType || "mouse";
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
  if (activePan && event.pointerId === activePointerId) {
    const bounds = canvas.getBoundingClientRect();
    state.panX = clampPan(activePan.originX + event.clientX - activePan.startX, bounds.width);
    state.panY = clampPan(activePan.originY + event.clientY - activePan.startY, bounds.height);
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
  targetContext.strokeStyle = "rgba(7, 29, 51, 0.12)";
  targetContext.lineWidth = 1;
  const spacing = 32;
  const originX = (width / 2) + state.panX;
  const originY = (height / 2) + state.panY;
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
      targetContext.font = "10px Ubuntu, Arial, sans-serif";
      const labelStep = spacing * 2;
      targetContext.textAlign = "center";
      targetContext.textBaseline = "top";
      const minXLabel = Math.ceil(-originX / labelStep);
      const maxXLabel = Math.floor((width - originX) / labelStep);
      for (let offset = minXLabel; offset <= maxXLabel; offset += 1) {
        targetContext.fillText(String(offset * 2), originX + (offset * labelStep), originY + 7);
      }
      targetContext.textAlign = "left";
      targetContext.textBaseline = "middle";
      const minYLabel = Math.ceil(-originY / labelStep);
      const maxYLabel = Math.floor((height - originY) / labelStep);
      for (let offset = minYLabel; offset <= maxYLabel; offset += 1) {
        if (offset !== 0) targetContext.fillText(String(-offset * 2), originX + 8, originY + (offset * labelStep));
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
  inkContext.translate(state.panX, state.panY);
  state.strokes.forEach((stroke) => renderStroke(inkContext, stroke, bounds.width, bounds.height));
  exportContext.drawImage(inkCanvas, 0, 0, bounds.width, bounds.height);
  const link = document.createElement("a");
  link.download = `math-whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
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
    state.tool = ["eraser", "hand"].includes(state.tool) ? "pen" : state.tool;
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

axisNumbersButton.addEventListener("click", () => {
  state.axisNumbers = !state.axisNumbers;
  axisLabelSignature = "";
  syncControls();
  saveState();
  announce(`Axis numbers ${state.axisNumbers ? "shown" : "hidden"}.`);
});

sizeInput.addEventListener("input", () => {
  state.size = Number(sizeInput.value);
  sizeOutput.value = state.size;
  eraserPreview.style.setProperty("--eraser-diameter", `${strokeWidth({ tool: "eraser", size: state.size })}px`);
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
  if ((activeStroke || activePan) && event.pointerId === activePointerId) finishStroke(event);
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("keydown", (event) => {
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
  } else if (event.key === "Home") {
    event.preventDefault();
    state.panX = 0;
    state.panY = 0;
    saveState();
    renderBoard();
    announce("Canvas centered.");
  }
});

document.addEventListener("keydown", (event) => {
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
syncControls();
renderBoard();
