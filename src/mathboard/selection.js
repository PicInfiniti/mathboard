import { strokeWidth } from "./drawing.js";

export const SELECTION_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

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
    && ((Number.isInteger(entry.targetIndex)
      && Array.isArray(entry.beforePoints)
      && Array.isArray(entry.afterPoints))
      || (Array.isArray(entry.transforms) && entry.transforms.length > 0));
}

export function isVisibilityEntry(entry) {
  return entry?.tool === "visibility"
    && ((Number.isInteger(entry.targetIndex)
      && typeof entry.beforeHidden === "boolean"
      && typeof entry.afterHidden === "boolean")
      || (Array.isArray(entry.changes) && entry.changes.length > 0));
}

export function clonePoints(points) {
  return points.map((point) => ({ ...point }));
}

export function applyTransformEntry(strokes, entry, pointsKey) {
  if (!isTransformEntry(entry) || !["beforePoints", "afterPoints"].includes(pointsKey)) return false;
  const transforms = Array.isArray(entry.transforms) ? entry.transforms : [entry];
  let applied = false;
  transforms.forEach((transform) => { applied = applySingleTransform(strokes, transform, pointsKey) || applied; });
  return applied;
}

function applySingleTransform(strokes, entry, pointsKey) {
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
  const changes = Array.isArray(entry.changes) ? entry.changes : [entry];
  let applied = false;
  changes.forEach((change) => {
    const target = strokes[change.targetIndex];
    if (!target?.points || typeof change[hiddenKey] !== "boolean") return;
    target.hidden = change[hiddenKey];
    applied = true;
  });
  return applied;
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
  return selectionGeometryForStrokes([stroke], width, height, zoom);
}

export function selectionGeometryForStrokes(strokes, width, height, zoom) {
  const entries = strokes.map((stroke) => ({ stroke, bounds: strokeBounds(stroke, width, height) })).filter((entry) => entry.bounds);
  if (!entries.length) return null;
  const bounds = {
    left: Math.min(...entries.map((entry) => entry.bounds.left)),
    top: Math.min(...entries.map((entry) => entry.bounds.top)),
    right: Math.max(...entries.map((entry) => entry.bounds.right)),
    bottom: Math.max(...entries.map((entry) => entry.bounds.bottom)),
  };
  const padding = Math.max(...entries.map((entry) => strokeWidth(entry.stroke) / 2)) + (8 / zoom);
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
      n: { x: (box.left + box.right) / 2, y: box.top },
      ne: { x: box.right, y: box.top },
      e: { x: box.right, y: (box.top + box.bottom) / 2 },
      se: { x: box.right, y: box.bottom },
      s: { x: (box.left + box.right) / 2, y: box.bottom },
      sw: { x: box.left, y: box.bottom },
      w: { x: box.left, y: (box.top + box.bottom) / 2 },
    },
  };
}

export function selectionHandleAt(stroke, point, width, height, zoom) {
  const geometry = selectionGeometry(stroke, width, height, zoom);
  return selectionHandleAtGeometry(geometry, point, zoom);
}

export function selectionHandleAtGeometry(geometry, point, zoom) {
  if (!geometry) return null;
  const hitRadius = 11 / zoom;
  return SELECTION_HANDLES.map((name) => {
    const handle = geometry.handles[name];
    return { name, distance: Math.hypot(point.x - handle.x, point.y - handle.y) };
  }).filter((item) => item.distance <= hitRadius)
    .sort((first, second) => first.distance - second.distance)[0]?.name || null;
}

export function pointInSelection(stroke, point, width, height, zoom) {
  const box = selectionGeometry(stroke, width, height, zoom)?.box;
  return pointInSelectionGeometry({ box }, point);
}

export function pointInSelectionGeometry(geometry, point) {
  const box = geometry?.box;
  return Boolean(box && point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom);
}

export function strokeIndicesInBox(strokes, box, width, height) {
  return strokes.reduce((indices, stroke, index) => {
    const bounds = strokeBounds(stroke, width, height);
    if (bounds && bounds.left <= box.right && bounds.right >= box.left && bounds.top <= box.bottom && bounds.bottom >= box.top) indices.push(index);
    return indices;
  }, []);
}

export function hitTestStroke(stroke, point, width, height, zoom) {
  if (!stroke?.points?.length || stroke.hidden || stroke.tool === "eraser" || isTransformEntry(stroke)) return false;
  const threshold = (strokeWidth(stroke) / 2) + (7 / zoom);
  if (stroke.tool === "image") {
    const bounds = strokeBounds(stroke, width, height);
    return Boolean(bounds && point.x >= bounds.left - threshold && point.x <= bounds.right + threshold
      && point.y >= bounds.top - threshold && point.y <= bounds.bottom + threshold);
  }
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
  return scaledPointsByAxis(points, anchor, scale, scale, width, height);
}

export function scaledPointsByAxis(points, anchor, scaleX, scaleY, width, height) {
  return points.map((point) => ({
    ...point,
    x: (anchor.x + (((point.x * width) - anchor.x) * scaleX)) / width,
    y: (anchor.y + (((point.y * height) - anchor.y) * scaleY)) / height,
  }));
}

export function oppositeAnchor(bounds, handle) {
  return {
    x: handle.includes("w") ? bounds.right : handle.includes("e") ? bounds.left : (bounds.left + bounds.right) / 2,
    y: handle.includes("n") ? bounds.bottom : handle.includes("s") ? bounds.top : (bounds.top + bounds.bottom) / 2,
  };
}

export function renderSelection(targetContext, stroke, width, height, zoom) {
  const geometry = selectionGeometry(stroke, width, height, zoom);
  renderSelectionGeometry(targetContext, geometry, zoom);
}

export function renderSelectionGeometry(targetContext, geometry, zoom) {
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
