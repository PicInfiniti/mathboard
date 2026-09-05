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

async function pressKey(key, code = `Key${key.toUpperCase()}`) {
  await command("Input.dispatchKeyEvent", { type: "keyDown", key, code });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key, code });
}

async function rightClick(point) {
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "right", buttons: 2, clickCount: 1, pointerType: "mouse" });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "right", buttons: 0, clickCount: 1, pointerType: "mouse" });
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

await evaluate('document.querySelector("#mathboard-draw-assist").click()');
await check("enables automatic draw assist below pen settings", `document.querySelector("#mathboard-draw-assist").getAttribute("aria-pressed") === "true"
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

await check("keeps automatic assist active without adding shape tools", `document.querySelector("#mathboard-draw-assist").getAttribute("aria-pressed") === "true"
  && document.querySelector("#mathboard-size-label").textContent === "Pen size"
  && !document.querySelector("[data-tool=circle]")`);
await evaluate(`(() => {
  const originalArc = CanvasRenderingContext2D.prototype.arc;
  window.__mathboardAssistedArcCalls = 0;
  CanvasRenderingContext2D.prototype.arc = function (...args) {
    window.__mathboardAssistedArcCalls += 1;
    return originalArc.apply(this, args);
  };
})()`);
await drawPointer(Array.from({ length: 25 }, (_, index) => {
  const angle = (index / 24) * Math.PI * 2.12;
  return {
    x: canvasBounds.x + 180 + (65 * Math.cos(angle)) + (index % 2 ? 2 : -2),
    y: canvasBounds.y + 90 + (32 * Math.sin(angle)),
  };
}));
await check("fits a wide overdrawn oval to a circle", `document.querySelector("#mathboard-history-output").value.startsWith("2 of 2")
  && window.__mathboardAssistedArcCalls > 0`);

await evaluate(`(() => {
  const originalStrokeRect = CanvasRenderingContext2D.prototype.strokeRect;
  window.__mathboardSelectionBoxes = 0;
  CanvasRenderingContext2D.prototype.strokeRect = function (...args) {
    window.__mathboardSelectionBoxes += 1;
    window.__mathboardLastSelectionBox = args;
    return originalStrokeRect.apply(this, args);
  };
  document.querySelector("[data-tool=select]").click();
})()`);
await check("enables the Select tool", 'document.querySelector("[data-tool=select]").getAttribute("aria-pressed") === "true"');
await dragPointer(
  { x: canvasBounds.x + 50, y: canvasBounds.y + 20 },
  { x: canvasBounds.x + 80, y: canvasBounds.y + 50 },
);
await check("selects and moves an object", `window.__mathboardSelectionBoxes > 0
  && document.querySelector("#mathboard-history-output").value.startsWith("3 of 3")`);
await dragPointer(
  { x: canvasBounds.x + 141, y: canvasBounds.y + 81 },
  { x: canvasBounds.x + 190, y: canvasBounds.y + 130 },
);
await check("resizes the selected object from its corner", 'document.querySelector("#mathboard-history-output").value.startsWith("4 of 4")');
await evaluate('document.querySelector("#mathboard-undo").click()');
await check("undoes an object resize", 'document.querySelector("#mathboard-history-output").value.startsWith("3 of 4")');
await evaluate('document.querySelector("#mathboard-redo").click()');
await check("redoes an object resize", 'document.querySelector("#mathboard-history-output").value.startsWith("4 of 4")');

await evaluate('document.querySelector("#mathboard-draw-assist").click()');
await check("turns draw assist off", 'document.querySelector("#mathboard-draw-assist").getAttribute("aria-pressed") === "false"');
await evaluate('document.querySelector("[data-tool=pen]").click()');
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

await evaluate('document.querySelector("#mathboard-clear").click(); document.querySelector("#mathboard-clear").click(); document.querySelector("[data-tool=pen]").click()');
const eraseCanvasArea = await evaluate(`(() => {
  const canvas = document.querySelector("#mathboard-canvas");
  const bounds = document.querySelector("#mathboard-canvas").getBoundingClientRect();
  const visibleLeft = Math.max(0, bounds.left);
  const visibleTop = Math.max(0, bounds.top);
  const visibleRight = Math.min(window.innerWidth, bounds.right);
  const visibleBottom = Math.min(window.innerHeight, bounds.bottom);
  let best = null;
  for (let y = visibleTop + 40; y < visibleBottom - 120; y += 20) {
    let runStart = null;
    for (let x = visibleLeft; x <= visibleRight; x += 4) {
      if (document.elementFromPoint(x, y) === canvas && document.elementFromPoint(x, y + 80) === canvas) {
        if (runStart === null) runStart = x;
      } else if (runStart !== null) {
        if (!best || x - runStart > best.right - best.left) best = { left: runStart, right: x - 4, y };
        runStart = null;
      }
    }
    if (runStart !== null && (!best || visibleRight - runStart > best.right - best.left)) {
      best = { left: runStart, right: visibleRight, y };
    }
  }
  if (!best || best.right - best.left < 260) throw new Error("No clear canvas area for eraser resize test");
  const available = best.right - best.left;
  return {
    start: { x: best.left + 20, y: best.y },
    lineLength: Math.min(140, available * .4),
    moveX: Math.min(100, available * .3),
  };
})()`);
const eraseTest = {
  start: eraseCanvasArea.start,
  middle: { x: eraseCanvasArea.start.x + (eraseCanvasArea.lineLength / 2), y: eraseCanvasArea.start.y },
  end: { x: eraseCanvasArea.start.x + eraseCanvasArea.lineLength, y: eraseCanvasArea.start.y },
};
await drawPointer([eraseTest.start, eraseTest.middle, eraseTest.end]);
await evaluate('document.querySelector("[data-tool=eraser]").click()');
await drawPointer([
  { x: eraseTest.middle.x, y: eraseTest.middle.y - 30 },
  { x: eraseTest.middle.x, y: eraseTest.middle.y + 30 },
]);
await evaluate('document.querySelector("[data-tool=select]").click()');
await dragPointer(eraseTest.start, { x: eraseTest.start.x + eraseCanvasArea.moveX, y: eraseTest.start.y + 80 });
await check("keeps erased gaps attached when moving objects", `(() => {
  const canvas = document.querySelector("#mathboard-canvas");
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  const hasInkNear = (clientX, clientY, radius = 4) => {
    const centerX = Math.round((clientX - bounds.left) * scaleX);
    const centerY = Math.round((clientY - bounds.top) * scaleY);
    const pixels = canvas.getContext("2d").getImageData(centerX - radius, centerY - radius, radius * 2 + 1, radius * 2 + 1).data;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 20) return true;
    return false;
  };
  const deltaX = ${eraseCanvasArea.moveX};
  const deltaY = 80;
  return hasInkNear(${eraseTest.start.x} + deltaX + 20, ${eraseTest.start.y} + deltaY)
    && !hasInkNear(${eraseTest.middle.x} + deltaX, ${eraseTest.middle.y} + deltaY, 6)
    && hasInkNear(${eraseTest.end.x} + deltaX - 20, ${eraseTest.end.y} + deltaY)
    && !hasInkNear(${eraseTest.start.x} + 20, ${eraseTest.start.y});
})()`);

const resizeGesture = await evaluate(`(() => {
  const canvasBounds = document.querySelector("#mathboard-canvas").getBoundingClientRect();
  const [left, top, width, height] = window.__mathboardLastSelectionBox;
  return {
    start: { x: canvasBounds.left + left + width - 1, y: canvasBounds.top + top + height - 1 },
    end: { x: canvasBounds.left + left + (width * .35), y: canvasBounds.top + top + (height * .35) },
  };
})()`);
await dragPointer(resizeGesture.start, resizeGesture.end);
await check("scales erased gaps proportionally when resizing objects", `(() => {
  const canvas = document.querySelector("#mathboard-canvas");
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  const [boxLeft, boxTop, boxWidth, boxHeight] = window.__mathboardLastSelectionBox;
  const startX = Math.ceil(boxLeft + 9);
  const endX = Math.floor(boxLeft + boxWidth - 9);
  const centerY = Math.round((boxTop + (boxHeight / 2)) * scaleY);
  const inkColumns = [];
  for (let x = startX; x <= endX; x += 1) {
    const pixelX = Math.round(x * scaleX);
    const pixels = canvas.getContext("2d").getImageData(pixelX, centerY - 3, 1, 7).data;
    inkColumns.push([...pixels].some((value, index) => index % 4 === 3 && value > 20));
  }
  const firstInk = inkColumns.indexOf(true);
  const lastInk = inkColumns.lastIndexOf(true);
  let currentGap = 0;
  let largestGap = 0;
  inkColumns.slice(firstInk, lastInk + 1).forEach((hasInk) => {
    if (hasInk) currentGap = 0;
    else {
      currentGap += 1;
      largestGap = Math.max(largestGap, currentGap);
    }
  });
  return document.querySelector("#mathboard-history-output").value.startsWith("4 of 4")
    && firstInk >= 0
    && largestGap > 2
    && largestGap < 12;
})()`);

await pressKey("y");
await check("copies a selected object with Y", `document.querySelector("#mathboard-status").textContent.includes("Object copied")
  && document.querySelector("#mathboard-history-output").value.startsWith("4 of 4")`);
await pressKey("x");
await check("cuts a selected object with X", `document.querySelector("#mathboard-status").textContent.includes("Object cut")
  && document.querySelector("#mathboard-history-output").value.startsWith("5 of 5")
  && !document.querySelector("#mathboard-board").classList.contains("has-ink")`);
await pressKey("p");
const pastedHitPoint = await evaluate(`(() => {
  const canvas = document.querySelector("#mathboard-canvas");
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  const [left, top, width, height] = window.__mathboardLastSelectionBox;
  const y = top + (height / 2);
  for (let x = left + 9; x < left + width - 9; x += 1) {
    const alpha = canvas.getContext("2d").getImageData(Math.round(x * scaleX), Math.round(y * scaleY), 1, 1).data[3];
    const clientPoint = { x: bounds.left + x, y: bounds.top + y };
    if (alpha > 20 && document.elementFromPoint(clientPoint.x, clientPoint.y) === canvas) return clientPoint;
  }
  throw new Error("No visible pasted stroke point found");
})()`);
await check("pastes a copied object with P", `document.querySelector("#mathboard-status").textContent.includes("Object pasted")
  && document.querySelector("#mathboard-history-output").value.startsWith("6 of 6")
  && document.querySelector("#mathboard-board").classList.contains("has-ink")`);
await pressKey("d");
await check("duplicates a selected object with D", `document.querySelector("#mathboard-status").textContent.includes("Object duplicated")
  && document.querySelector("#mathboard-history-output").value.startsWith("7 of 7")
  && document.querySelector("#mathboard-board").classList.contains("has-ink")`);
await pressKey("u");
await check("undoes with U", 'document.querySelector("#mathboard-history-output").value.startsWith("6 of 7")');
await pressKey("r");
await check("redoes with R", 'document.querySelector("#mathboard-history-output").value.startsWith("7 of 7")');
await rightClick(pastedHitPoint);
await pressKey("Escape", "Escape");
await pressKey("Delete", "Delete");
await check("deletes a selected object with Delete", `document.querySelector("#mathboard-status").textContent.includes("Object deleted")
  && document.querySelector("#mathboard-history-output").value.startsWith("8 of 8")`);
await pressKey("u");
await rightClick(pastedHitPoint);
await check("opens selected-object actions on right click", `(() => {
  const menu = document.querySelector("#mathboard-context-menu");
  return !menu.hidden
    && menu.getAttribute("aria-label") === "Selected object actions"
    && Boolean(menu.querySelector("[data-context-action=duplicate]"))
    && Boolean(menu.querySelector("[data-context-action=delete]"));
})()`);
await evaluate('document.querySelector("#mathboard-context-menu [data-context-action=duplicate]").click()');
await check("duplicates from the object context menu", `document.querySelector("#mathboard-status").textContent.includes("Object duplicated")
  && document.querySelector("#mathboard-history-output").value.startsWith("8 of 8")`);
await rightClick(eraseTest.start);
await check("opens board actions on empty-space right click", `(() => {
  const menu = document.querySelector("#mathboard-context-menu");
  return !menu.hidden
    && menu.getAttribute("aria-label") === "Board actions"
    && Boolean(menu.querySelector("[data-context-action=paste]"))
    && Boolean(menu.querySelector("[data-context-action=history]"))
    && Boolean(menu.querySelector("[data-context-action=reset-view]"))
    && Boolean(menu.querySelector("[data-context-action=fullscreen]"))
    && Boolean(menu.querySelector("[data-context-action=clear]"));
})()`);
await pressKey("Escape", "Escape");
await check("closes the context menu with Escape", 'document.querySelector("#mathboard-context-menu").hidden');

await pressKey("h");
await check("opens stroke history with H", 'document.querySelector("#mathboard-history-scrubber").classList.contains("is-visible")');
await evaluate('document.querySelector("#mathboard-history-start").click()');
await check("undoes strokes", '!document.querySelector("#mathboard-redo").disabled');
await evaluate('document.querySelector("#mathboard-history-end").click()');
await check("redoes strokes", 'document.querySelector("#mathboard-board").classList.contains("has-ink")');
await pressKey("h");
await check("closes stroke history with H", '!document.querySelector("#mathboard-history-scrubber").classList.contains("is-visible")');

await pressKey("f");
await waitFor('document.querySelector(".mathboard-main").classList.contains("is-fullscreen") || document.querySelector(".mathboard-main").classList.contains("is-fullscreen-fallback")');
await check("enters fullscreen mode with F", 'document.querySelector(".mathboard-main").classList.contains("is-fullscreen") || document.querySelector(".mathboard-main").classList.contains("is-fullscreen-fallback")');
await pressKey("f");
await waitFor('document.fullscreenElement === null && !document.querySelector(".mathboard-main").classList.contains("is-fullscreen") && !document.querySelector(".mathboard-main").classList.contains("is-fullscreen-fallback")');
await check("exits fullscreen mode with F", '!document.querySelector(".mathboard-main").classList.contains("is-fullscreen")');

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
