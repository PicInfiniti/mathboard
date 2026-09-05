import { strokeWidth } from "./drawing.js";

export const SELECTION_HANDLES = ["nw", "ne", "se", "sw"];

function pixelPoint(point, width, height) {
  return { x: point.x * width, y: point.y * height };
}

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const amount = Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / ((dx * dx) + (dy * dy))));
  return Math.hypot(point.x - start.x - (amount * dx), point.y - start.y - (amount * dy));
}

export function isTransformEntry(entry) {
  return entry?.tool === "transform"
    && Number.isInteger(entry.targetIndex)
    && Array.isArray(entry.beforePoints)
    && Array.isArray(entry.afterPoints);
}

export function isVisibilityEntry(entry) {
  return entry?.tool === "visibility"
    && Number.isInteger(entry.targetIndex)
    && typeof entry.beforeHidden === "boolean"
    && typeof entry.afterHidden === "boolean";
}

export function clonePoints(points) {
  return points.map((point) => ({ ...point }));
}

export function applyTransformEntry(strokes, entry, pointsKey) {
  if (!isTransformEntry(entry) || !["beforePoints", "afterPoints"].includes(pointsKey)) return false;
  const target = strokes[entry.targetIndex];
  if (!target?.points) return false;
  target.points = clonePoints(entry[pointsKey]);
  const widthScaleKey = pointsKey === "beforePoints" ? "beforeWidthScale" : "afterWidthScale";
  if (Number.isFinite(entry[widthScaleKey])) target.widthScale = entry[widthScaleKey];
  if (Array.isArray(entry.maskTransforms)) {
    entry.maskTransforms.forEach((maskTransform) => {
      const eraser = Number.isInteger(maskTransform.eraserIndex) ? strokes[maskTransform.eraserIndex] : null;
      const maskTarget = Number.isInteger(maskTransform.inlineMaskIndex)
        ? target.inlineErasers?.[maskTransform.inlineMaskIndex]
        : eraser?.targets?.find((item) => item.targetIndex === entry.targetIndex);
      if (maskTarget && Array.isArray(maskTransform[pointsKey])) {
        maskTarget.points = clonePoints(maskTransform[pointsKey]);
        const renderWidthKey = pointsKey === "beforePoints" ? "beforeRenderWidth" : "afterRenderWidth";
        if (Number.isFinite(maskTransform[renderWidthKey])) {
          maskTarget.renderWidth = maskTransform[renderWidthKey];
        }
      }
    });
  }
  return true;
}

export function applyVisibilityEntry(strokes, entry, hiddenKey) {
  if (!isVisibilityEntry(entry) || !["beforeHidden", "afterHidden"].includes(hiddenKey)) return false;
  const target = strokes[entry.targetIndex];
  if (!target?.points) return false;
  target.hidden = entry[hiddenKey];
  return true;
}

export function strokeBounds(stroke, width, height) {
  if (!stroke?.points?.length || stroke.hidden || isTransformEntry(stroke) || stroke.tool === "eraser") return null;
  if (stroke.tool === "circle" && stroke.points.length > 1) {
    const start = pixelPoint(stroke.points[0], width, height);
    const end = pixelPoint(stroke.points[1], width, height);
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radius = Math.hypot(end.x - start.x, end.y - start.y) / 2;
    return { left: centerX - radius, top: centerY - radius, right: centerX + radius, bottom: centerY + radius };
  }
  const pixels = stroke.points.map((point) => pixelPoint(point, width, height));
  const xs = pixels.map((point) => point.x);
  const ys = pixels.map((point) => point.y);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
}

export function selectionGeometry(stroke, width, height, zoom) {
  const bounds = strokeBounds(stroke, width, height);
  if (!bounds) return null;
  const padding = (strokeWidth(stroke) / 2) + (8 / zoom);
  const box = {
    left: bounds.left - padding,
    top: bounds.top - padding,
    right: bounds.right + padding,
    bottom: bounds.bottom + padding,
  };
  return {
    bounds,
    box,
    handles: {
      nw: { x: box.left, y: box.top },
      ne: { x: box.right, y: box.top },
      se: { x: box.right, y: box.bottom },
      sw: { x: box.left, y: box.bottom },
    },
  };
}

export function selectionHandleAt(stroke, point, width, height, zoom) {
  const geometry = selectionGeometry(stroke, width, height, zoom);
  if (!geometry) return null;
  const hitRadius = 11 / zoom;
  return SELECTION_HANDLES.find((name) => {
    const handle = geometry.handles[name];
    return Math.abs(point.x - handle.x) <= hitRadius && Math.abs(point.y - handle.y) <= hitRadius;
  }) || null;
}

export function pointInSelection(stroke, point, width, height, zoom) {
  const box = selectionGeometry(stroke, width, height, zoom)?.box;
  return Boolean(box && point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom);
}

export function hitTestStroke(stroke, point, width, height, zoom) {
  if (!stroke?.points?.length || stroke.hidden || stroke.tool === "eraser" || isTransformEntry(stroke)) return false;
  const threshold = (strokeWidth(stroke) / 2) + (7 / zoom);
  if (stroke.tool === "circle" && stroke.points.length > 1) {
    const start = pixelPoint(stroke.points[0], width, height);
    const end = pixelPoint(stroke.points[1], width, height);
    const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const radius = Math.hypot(end.x - start.x, end.y - start.y) / 2;
    return Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - radius) <= threshold;
  }
  const pixels = stroke.points.map((item) => pixelPoint(item, width, height));
  if (pixels.length === 1) return Math.hypot(point.x - pixels[0].x, point.y - pixels[0].y) <= threshold;
  for (let index = 1; index < pixels.length; index += 1) {
    if (pointToSegmentDistance(point, pixels[index - 1], pixels[index]) <= threshold) return true;
  }
  return false;
}

export function findStrokeAt(strokes, point, width, height, zoom) {
  for (let index = strokes.length - 1; index >= 0; index -= 1) {
    if (hitTestStroke(strokes[index], point, width, height, zoom)) return index;
  }
  return null;
}

export function translatedPoints(points, deltaX, deltaY, width, height) {
  return points.map((point) => ({
    ...point,
    x: point.x + (deltaX / width),
    y: point.y + (deltaY / height),
  }));
}

export function scaledPoints(points, anchor, scale, width, height) {
  return points.map((point) => ({
    ...point,
    x: (anchor.x + (((point.x * width) - anchor.x) * scale)) / width,
    y: (anchor.y + (((point.y * height) - anchor.y) * scale)) / height,
  }));
}

export function oppositeAnchor(bounds, handle) {
  return {
    x: handle.includes("w") ? bounds.right : bounds.left,
    y: handle.includes("n") ? bounds.bottom : bounds.top,
  };
}

export function renderSelection(targetContext, stroke, width, height, zoom) {
  const geometry = selectionGeometry(stroke, width, height, zoom);
  if (!geometry) return;
  const handleSize = 9 / zoom;
  targetContext.save();
  targetContext.globalCompositeOperation = "source-over";
  targetContext.globalAlpha = 1;
  targetContext.strokeStyle = "#168ca8";
  targetContext.fillStyle = "#fffdf8";
  targetContext.lineWidth = 1.5 / zoom;
  targetContext.setLineDash([6 / zoom, 4 / zoom]);
  targetContext.strokeRect(
    geometry.box.left,
    geometry.box.top,
    geometry.box.right - geometry.box.left,
    geometry.box.bottom - geometry.box.top,
  );
  targetContext.setLineDash([]);
  SELECTION_HANDLES.forEach((name) => {
    const handle = geometry.handles[name];
    targetContext.beginPath();
    targetContext.rect(handle.x - (handleSize / 2), handle.y - (handleSize / 2), handleSize, handleSize);
    targetContext.fill();
    targetContext.stroke();
  });
  targetContext.restore();
}
