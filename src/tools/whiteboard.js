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
      <aside class="whiteboard-toolbar" aria-label="Whiteboard tools">
        <fieldset class="whiteboard-tool-group">
          <legend>Drawing tool</legend>
          <div class="whiteboard-tool-grid">
            <button class="whiteboard-tool" type="button" data-tool="pen" aria-pressed="true"><span aria-hidden="true">✎</span><span>Pen</span></button>
            <button class="whiteboard-tool" type="button" data-tool="highlighter" aria-pressed="false"><span aria-hidden="true">▰</span><span>Highlight</span></button>
            <button class="whiteboard-tool" type="button" data-tool="eraser" aria-pressed="false"><span aria-hidden="true">◇</span><span>Eraser</span></button>
          </div>
        </fieldset>

        <fieldset class="whiteboard-tool-group">
          <legend>Ink color</legend>
          <div class="whiteboard-colors">
            <button class="whiteboard-color" style="--swatch: #071d33" type="button" data-color="#071d33" aria-label="Navy ink" aria-pressed="true"></button>
            <button class="whiteboard-color" style="--swatch: #ff6b48" type="button" data-color="#ff6b48" aria-label="Coral ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #d99f18" type="button" data-color="#d99f18" aria-label="Gold ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #168ca8" type="button" data-color="#168ca8" aria-label="Blue ink" aria-pressed="false"></button>
            <button class="whiteboard-color" style="--swatch: #765fc0" type="button" data-color="#765fc0" aria-label="Violet ink" aria-pressed="false"></button>
          </div>
        </fieldset>

        <div class="whiteboard-tool-group">
          <label for="whiteboard-size">Stroke size</label>
          <div class="whiteboard-size-row">
            <input class="whiteboard-size" id="whiteboard-size" type="range" min="2" max="18" value="5" />
            <output for="whiteboard-size" id="whiteboard-size-output">5</output>
          </div>
        </div>

        <fieldset class="whiteboard-tool-group">
          <legend>Background</legend>
          <div class="whiteboard-grid-options">
            <button class="whiteboard-grid-button" type="button" data-grid="blank" aria-pressed="true">Blank</button>
            <button class="whiteboard-grid-button" type="button" data-grid="square" aria-pressed="false">Grid</button>
            <button class="whiteboard-grid-button" type="button" data-grid="coordinate" aria-pressed="false">Axes</button>
          </div>
        </fieldset>

        <div class="whiteboard-history" aria-label="Board actions">
          <button class="whiteboard-action" id="whiteboard-undo" type="button" disabled>Undo</button>
          <button class="whiteboard-action" id="whiteboard-redo" type="button" disabled>Redo</button>
          <button class="whiteboard-action whiteboard-action--save" id="whiteboard-save" type="button">Download PNG</button>
          <button class="whiteboard-action whiteboard-action--clear" id="whiteboard-clear" type="button">Clear board</button>
        </div>

        <p class="whiteboard-help"><strong>Tip:</strong> Use a mouse, finger, or stylus. Press <strong>Ctrl/⌘ + Z</strong> to undo. Your board is saved automatically on this device.</p>
      </aside>

      <section class="whiteboard-board" id="whiteboard-board" aria-label="Drawing area">
        <canvas
          class="whiteboard-canvas"
          id="whiteboard-canvas"
          tabindex="0"
          aria-label="Whiteboard canvas. Draw with a mouse, finger, or stylus. Use the toolbar to change tools."
        ></canvas>
        <p class="whiteboard-board__hint" aria-hidden="true">Draw anywhere to begin</p>
        <p class="whiteboard-status" id="whiteboard-status" role="status" aria-live="polite"></p>
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
const undoButton = document.querySelector("#whiteboard-undo");
const redoButton = document.querySelector("#whiteboard-redo");
const saveButton = document.querySelector("#whiteboard-save");
const clearButton = document.querySelector("#whiteboard-clear");
const status = document.querySelector("#whiteboard-status");

let state = {
  tool: "pen",
  color: "#071d33",
  size: 5,
  grid: "blank",
  strokes: [],
};
let redoStack = [];
let activeStroke = null;
let activePointerId = null;
let clearTimer = null;
let statusTimer = null;

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
      tool: ["pen", "highlighter", "eraser"].includes(saved.tool) ? saved.tool : state.tool,
      color: typeof saved.color === "string" ? saved.color : state.color,
      size: Number.isFinite(Number(saved.size)) ? Number(saved.size) : state.size,
      grid: ["blank", "square", "coordinate"].includes(saved.grid) ? saved.grid : state.grid,
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
  canvas.classList.toggle("is-erasing", state.tool === "eraser");
  board.classList.toggle("is-grid-square", state.grid === "square");
  board.classList.toggle("is-grid-coordinate", state.grid === "coordinate");
  board.classList.toggle("has-ink", state.strokes.length > 0);
  undoButton.disabled = state.strokes.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function normalizedPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    pressure: event.pressure > 0 ? event.pressure : 0.5,
  };
}

function strokeWidth(stroke) {
  if (stroke.tool === "eraser") return stroke.size * 2.2;
  if (stroke.tool === "highlighter") return stroke.size * 3;
  return stroke.size;
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
    targetContext.arc(point.x * width, point.y * height, strokeWidth(stroke) / 2, 0, Math.PI * 2);
    targetContext.fill();
  } else {
    targetContext.beginPath();
    targetContext.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (let index = 1; index < stroke.points.length; index += 1) {
      const point = stroke.points[index];
      targetContext.lineTo(point.x * width, point.y * height);
    }
    targetContext.stroke();
  }
  targetContext.restore();
}

function renderBoard() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.round(bounds.width * ratio));
  const pixelHeight = Math.max(1, Math.round(bounds.height * ratio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  state.strokes.forEach((stroke) => renderStroke(context, stroke, bounds.width, bounds.height));
  if (activeStroke) renderStroke(context, activeStroke, bounds.width, bounds.height);
  syncControls();
}

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function startStroke(event) {
  if (event.button !== undefined && event.button !== 0) return;
  activePointerId = event.pointerId;
  activeStroke = {
    tool: state.tool,
    color: state.color,
    size: state.size,
    points: [normalizedPoint(event)],
  };
  canvas.setPointerCapture(event.pointerId);
  renderBoard();
  event.preventDefault();
}

function continueStroke(event) {
  if (!activeStroke || event.pointerId !== activePointerId) return;
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
  if (!activeStroke || event.pointerId !== activePointerId) return;
  state.strokes.push(activeStroke);
  activeStroke = null;
  activePointerId = null;
  redoStack = [];
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  saveState();
  renderBoard();
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
  const offsetX = (width / 2) % spacing;
  const offsetY = (height / 2) % spacing;
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
    targetContext.moveTo(width / 2, 0);
    targetContext.lineTo(width / 2, height);
    targetContext.moveTo(0, height / 2);
    targetContext.lineTo(width, height / 2);
    targetContext.stroke();
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
    setPressed(toolButtons, button);
    canvas.classList.toggle("is-erasing", state.tool === "eraser");
    saveState();
    announce(`${button.textContent.trim()} selected.`);
  });
});

colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.color = button.dataset.color;
    state.tool = state.tool === "eraser" ? "pen" : state.tool;
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

sizeInput.addEventListener("input", () => {
  state.size = Number(sizeInput.value);
  sizeOutput.value = state.size;
  saveState();
});

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
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
canvas.addEventListener("pointermove", continueStroke);
canvas.addEventListener("pointerup", finishStroke);
canvas.addEventListener("pointercancel", finishStroke);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

document.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier || event.key.toLowerCase() !== "z") return;
  event.preventDefault();
  if (event.shiftKey) redo();
  else undo();
});

const resizeObserver = new ResizeObserver(renderBoard);
resizeObserver.observe(board);
loadState();
syncControls();
renderBoard();
