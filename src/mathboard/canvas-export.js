import { coordinateLabelInterval, formatCoordinate } from "./coordinates.js";
import { associateLegacyErasers, renderStrokeObjects } from "./object-eraser.js";

function drawExportBackground(targetContext, width, height, state) {
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
      const labelEvery = coordinateLabelInterval(state.zoom, state.axisFontSize);
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

export function createCanvasExport(canvas, state) {
  const bounds = canvas.getBoundingClientRect();
  const scale = 2;
  const exportCanvas = document.createElement("canvas");
  const inkCanvas = document.createElement("canvas");
  const objectMaskCanvas = document.createElement("canvas");
  exportCanvas.width = Math.round(bounds.width * scale);
  exportCanvas.height = Math.round(bounds.height * scale);
  inkCanvas.width = exportCanvas.width;
  inkCanvas.height = exportCanvas.height;
  const exportContext = exportCanvas.getContext("2d");
  const inkContext = inkCanvas.getContext("2d");
  exportContext.scale(scale, scale);
  inkContext.scale(scale, scale);
  drawExportBackground(exportContext, bounds.width, bounds.height, state);
  inkContext.translate((bounds.width / 2) + state.panX, (bounds.height / 2) + state.panY);
  inkContext.scale(state.zoom, state.zoom);
  inkContext.translate(-(bounds.width / 2), -(bounds.height / 2));
  associateLegacyErasers(state.strokes, bounds.width, bounds.height);
  renderStrokeObjects(inkContext, state.strokes, bounds.width, bounds.height, objectMaskCanvas);
  exportContext.drawImage(inkCanvas, 0, 0, bounds.width, bounds.height);
  return exportCanvas;
}
