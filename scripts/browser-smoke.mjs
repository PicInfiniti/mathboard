import assert from "node:assert/strict";

const pageUrl = process.argv[2] || "http://127.0.0.1:5199/mathboard/";
const debuggerPort = process.argv[3] || "9223";
const target = await fetch(`http://127.0.0.1:${debuggerPort}/json/new?${encodeURIComponent(pageUrl)}`, {
  method: "PUT",
}).then((response) => response.json());

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pendingCommands = new Map();
const runtimeErrors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const pending = pendingCommands.get(message.id);
    if (!pending) return;
    pendingCommands.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    runtimeErrors.push(message.params.exceptionDetails.text);
  }
});

function command(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pendingCommands.set(id, { reject, resolve }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function check(name, expression) {
  assert.equal(await evaluate(expression), true, name);
  process.stdout.write(`✓ ${name}\n`);
}

async function dragPointer(start, end) {
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: start.x, y: start.y, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse" });
  await command("Input.dispatchMouseEvent", { type: "mouseMoved", x: end.x, y: end.y, button: "left", buttons: 1, pointerType: "mouse" });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: end.x, y: end.y, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" });
}

async function drawPointer(points) {
  const [start, ...moves] = points;
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: start.x, y: start.y, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse" });
  for (const point of moves) {
    await command("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "left", buttons: 1, pointerType: "mouse" });
  }
  const end = moves.at(-1) || start;
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: end.x, y: end.y, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse" });
}

await command("Runtime.enable");
await command("Page.enable");
await waitFor('document.readyState === "complete" && document.querySelectorAll("[data-canvas-id]").length > 0');
await evaluate('document.querySelector("#mathboard-project-new").click(); document.querySelector("#mathboard-project-new").click()');
await waitFor('document.querySelectorAll("[data-canvas-id]").length === 1');

await check("renders MathBoard branding", 'document.querySelector(".mathboard-brand strong").textContent === "MathBoard"');
await check("renders the centered tagline", 'document.querySelector(".mathboard-header__title").textContent.trim() === "Sketch · test · explain"');
await check("initializes the canvas", 'document.querySelector("#mathboard-canvas").width > 0');

await evaluate('document.querySelector("[data-tool=highlighter]").click()');
await check("switches drawing tools", 'document.querySelector("[data-tool=highlighter]").getAttribute("aria-pressed") === "true"');
await check("updates the size control", 'document.querySelector("#mathboard-size-label").textContent === "Highlighter size"');

await evaluate('document.querySelector("[data-panel-tab=canvas]").click(); document.querySelector("[data-grid=coordinate]").click()');
await check("switches canvas backgrounds", 'document.querySelector("#mathboard-board").classList.contains("is-grid-coordinate")');
await check("enables coordinate controls", '!document.querySelector("#mathboard-axis-numbers").disabled');
await check("renders coordinate labels", `(() => {
  const labels = document.querySelector("#mathboard-axis-labels");
  return labels.classList.contains("is-visible")
    && labels.querySelectorAll(".mathboard-axis-label--x").length > 2
    && labels.querySelectorAll(".mathboard-axis-label--y").length > 2;
})()`);
await check("centers both coordinate axes", `(() => {
  const board = document.querySelector("#mathboard-board");
  const bounds = board.getBoundingClientRect();
  const verticalAxis = Number.parseFloat(getComputedStyle(board, "::before").left);
  const horizontalAxis = Number.parseFloat(getComputedStyle(board, "::after").top);
  return Math.abs(verticalAxis - bounds.width / 2) < 2 && Math.abs(horizontalAxis - bounds.height / 2) < 2;
})()`);
await evaluate(`(() => {
  const input = document.querySelector("#mathboard-axis-size");
  input.value = "20";
  input.dispatchEvent(new Event("input", { bubbles: true }));
})()`);
await check("updates coordinate label size", `(() => {
  const label = document.querySelector(".mathboard-axis-label");
  return document.querySelector("#mathboard-board").style.getPropertyValue("--axis-label-size") === "20px"
    && getComputedStyle(label).fontSize === "20px";
})()`);
await evaluate('document.querySelector("#mathboard-axis-numbers").click()');
await check("hides coordinate labels", '!document.querySelector("#mathboard-axis-labels").classList.contains("is-visible")');
await evaluate('document.querySelector("#mathboard-axis-numbers").click()');
await check("restores coordinate labels", 'document.querySelector("#mathboard-axis-labels").classList.contains("is-visible")');

await evaluate('document.querySelector("#mathboard-zoom-in").click()');
await check("zooms the canvas", 'document.querySelector("#mathboard-zoom-reset").getAttribute("aria-label").includes("150%")');
await check("scales the coordinate grid", 'document.querySelector("#mathboard-board").style.getPropertyValue("--board-grid-size") === "48px"');
await evaluate(`(() => {
  const zoomIn = document.querySelector("#mathboard-zoom-in");
  while (!zoomIn.disabled) zoomIn.click();
  const canvas = document.querySelector("#mathboard-canvas");
  document.querySelector("[data-tool=hand]").click();
  for (let index = 0; index < 220; index += 1) {
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  }
})()`);
await check("keeps axis labels visible after extreme panning", `(() => {
  const boardBounds = document.querySelector("#mathboard-board").getBoundingClientRect();
  return [...document.querySelectorAll(".mathboard-axis-label")].some((label) => {
    const bounds = label.getBoundingClientRect();
    return bounds.right >= boardBounds.left && bounds.left <= boardBounds.right
      && bounds.bottom >= boardBounds.top && bounds.top <= boardBounds.bottom;
  });
})()`);
await evaluate('document.querySelector("#mathboard-zoom-reset").click()');

await evaluate('document.querySelector("#mathboard-canvas-new").click()');
await check("creates canvases", 'document.querySelectorAll("[data-canvas-id]").length === 2');
await evaluate('document.querySelector("#mathboard-canvas-duplicate").click()');
await check("duplicates canvases", 'document.querySelectorAll("[data-canvas-id]").length === 3');

await evaluate(`(() => {
  document.querySelector("#mathboard-canvas-rename").click();
  const input = document.querySelector("#mathboard-canvas-name");
  input.value = "Algebra";
  document.querySelector("#mathboard-rename-form").requestSubmit();
})()`);
await check("renames canvases", '[...document.querySelectorAll("[data-canvas-id]")].some((tab) => tab.textContent === "Algebra")');

await evaluate('document.querySelector("#mathboard-canvas-delete").click(); document.querySelector("#mathboard-canvas-delete").click()');
await check("deletes canvases", 'document.querySelectorAll("[data-canvas-id]").length === 2');

await evaluate('document.querySelector("[data-panel-tab=draw]").click()');
const canvasBounds = await evaluate(`(() => {
  const canvas = document.querySelector("#mathboard-canvas");
  const bounds = canvas.getBoundingClientRect();
  window.__mathboardPointerEvents = [];
  ["pointerdown", "pointermove", "pointerup", "lostpointercapture"].forEach((type) => {
    canvas.addEventListener(type, (event) => {
      window.__mathboardPointerEvents.push({ type, button: event.button, buttons: event.buttons, pointerId: event.pointerId });
    });
  });
  for (let row = 2; row <= 8; row += 1) {
    for (let column = 2; column <= 8; column += 1) {
      const x = bounds.left + (bounds.width * column / 10);
      const y = bounds.top + (bounds.height * row / 10);
      if (document.elementFromPoint(x, y) === canvas) return { x, y };
    }
  }
  throw new Error("No unobstructed canvas point found");
})()`);

await evaluate('document.querySelector("[data-assist=line]").click()');
await check("enables line draw assist below pen settings", `document.querySelector("[data-assist=line]").getAttribute("aria-pressed") === "true"
  && document.querySelector("[data-tool=pen]").getAttribute("aria-pressed") === "true"
  && document.querySelector(".mathboard-draw-assist").previousElementSibling.id === "mathboard-smoothing"`);
await drawPointer([
  canvasBounds,
  { x: canvasBounds.x + 22, y: canvasBounds.y + 12 },
  { x: canvasBounds.x + 48, y: canvasBounds.y + 17 },
  { x: canvasBounds.x + 76, y: canvasBounds.y + 34 },
  { x: canvasBounds.x + 100, y: canvasBounds.y + 40 },
]);
await check("commits an assisted line", 'document.querySelector("#mathboard-history-output").value.startsWith("1 of 1")');

await evaluate('document.querySelector("[data-assist=circle]").click()');
await check("enables circle draw assist without adding a toolbar tool", `document.querySelector("[data-assist=circle]").getAttribute("aria-pressed") === "true"
  && document.querySelector("#mathboard-size-label").textContent === "Pen size"
  && !document.querySelector("[data-tool=circle]")`);
await drawPointer(Array.from({ length: 17 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2;
  return {
    x: canvasBounds.x + 180 + (45 * Math.cos(angle)) + (index % 2 ? 2 : -2),
    y: canvasBounds.y + 90 + (45 * Math.sin(angle)),
  };
}));
await check("commits an assisted circle", 'document.querySelector("#mathboard-history-output").value.startsWith("2 of 2")');

await evaluate('document.querySelector("[data-assist=off]").click()');
await check("turns draw assist off", 'document.querySelector("[data-assist=off]").getAttribute("aria-pressed") === "true"');
await dragPointer(canvasBounds, { x: canvasBounds.x + 60, y: canvasBounds.y + 40 });
await new Promise((resolve) => setTimeout(resolve, 100));
const drawingDebug = await evaluate(`(() => ({
  bounds: document.querySelector("#mathboard-canvas").getBoundingClientRect().toJSON(),
  hasInk: document.querySelector("#mathboard-board").classList.contains("has-ink"),
  hitTarget: (() => {
    const target = document.elementFromPoint(${canvasBounds.x}, ${canvasBounds.y});
    return { id: target?.id, className: target?.className, tagName: target?.tagName };
  })(),
  penPressed: document.querySelector("[data-tool=pen]").getAttribute("aria-pressed"),
  pointerEvents: window.__mathboardPointerEvents,
  undoDisabled: document.querySelector("#mathboard-undo").disabled,
}))()`);
if (drawingDebug.undoDisabled) process.stdout.write(`Drawing debug: ${JSON.stringify({ drawingDebug, runtimeErrors })}\n`);
await check("records pointer strokes", '!document.querySelector("#mathboard-undo").disabled && document.querySelector("#mathboard-board").classList.contains("has-ink")');

await evaluate('document.querySelector("#mathboard-history-toggle").click()');
await check("opens stroke history", 'document.querySelector("#mathboard-history-scrubber").classList.contains("is-visible")');
await evaluate('document.querySelector("#mathboard-history-start").click()');
await check("undoes strokes", '!document.querySelector("#mathboard-redo").disabled');
await evaluate('document.querySelector("#mathboard-history-end").click()');
await check("redoes strokes", 'document.querySelector("#mathboard-board").classList.contains("has-ink")');
await evaluate('document.querySelector("#mathboard-history-close").click()');
await check("closes stroke history", '!document.querySelector("#mathboard-history-scrubber").classList.contains("is-visible")');

await evaluate('document.querySelector("#mathboard-fullscreen").click()');
await waitFor('document.querySelector(".mathboard-main").classList.contains("is-fullscreen") || document.querySelector(".mathboard-main").classList.contains("is-fullscreen-fallback")');
await check("enters fullscreen mode", 'document.querySelector(".mathboard-main").classList.contains("is-fullscreen") || document.querySelector(".mathboard-main").classList.contains("is-fullscreen-fallback")');
await evaluate('document.querySelector("#mathboard-fullscreen").click()');
await waitFor('document.fullscreenElement === null && !document.querySelector(".mathboard-main").classList.contains("is-fullscreen") && !document.querySelector(".mathboard-main").classList.contains("is-fullscreen-fallback")');
await check("exits fullscreen mode", '!document.querySelector(".mathboard-main").classList.contains("is-fullscreen")');

await command("Browser.setDownloadBehavior", { behavior: "deny", eventsEnabled: true });
await evaluate(`(() => {
  document.querySelector("#mathboard-save").click();
  document.querySelector("#mathboard-pdf").click();
  document.querySelector("#mathboard-project-export").click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 100));
assert.deepEqual(runtimeErrors, [], `Export runtime errors: ${runtimeErrors.join(", ")}`);
process.stdout.write("✓ generates PNG, PDF, and project exports\n");

await evaluate('document.querySelector("#mathboard-clear").click(); document.querySelector("#mathboard-clear").click()');
await check("clears the active canvas", '!document.querySelector("#mathboard-board").classList.contains("has-ink")');

await evaluate('document.querySelector("#mathboard-panel-toggle").click()');
await check("toggles the control panel", 'document.querySelector(".mathboard-main").classList.contains("is-toolbar-hidden")');

await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate('window.__mathboardBeforeReload = true');
await command("Page.reload");
await waitFor('document.readyState === "complete" && !window.__mathboardBeforeReload && document.querySelectorAll("[data-canvas-id]").length === 2');
await check("restores autosaved canvases", 'document.querySelectorAll("[data-canvas-id]").length === 2');

assert.deepEqual(runtimeErrors, [], `Browser runtime errors: ${runtimeErrors.join(", ")}`);
process.stdout.write("✓ no browser runtime errors\n");

socket.close();
