import { renderStroke, strokeWidth } from "./drawing.js";

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

function orientation(first, second, third) {
  return ((second.y - first.y) * (third.x - second.x)) - ((second.x - first.x) * (third.y - second.y));
}

function segmentsCross(firstStart, firstEnd, secondStart, secondEnd) {
  const firstSide = orientation(firstStart, firstEnd, secondStart);
  const secondSide = orientation(firstStart, firstEnd, secondEnd);
  const thirdSide = orientation(secondStart, secondEnd, firstStart);
  const fourthSide = orientation(secondStart, secondEnd, firstEnd);
  return ((firstSide > 0 && secondSide < 0) || (firstSide < 0 && secondSide > 0))
    && ((thirdSide > 0 && fourthSide < 0) || (thirdSide < 0 && fourthSide > 0));
}

function segmentDistance(firstStart, firstEnd, secondStart, secondEnd) {
  if (segmentsCross(firstStart, firstEnd, secondStart, secondEnd)) return 0;
  return Math.min(
    pointToSegmentDistance(firstStart, secondStart, secondEnd),
    pointToSegmentDistance(firstEnd, secondStart, secondEnd),
    pointToSegmentDistance(secondStart, firstStart, firstEnd),
    pointToSegmentDistance(secondEnd, firstStart, firstEnd),
  );
}

function strokePath(stroke, width, height) {
  if (stroke.tool !== "circle" || stroke.points.length < 2) {
    return stroke.points.map((point) => pixelPoint(point, width, height));
  }
  const start = pixelPoint(stroke.points[0], width, height);
  const end = pixelPoint(stroke.points[1], width, height);
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const radius = Math.hypot(end.x - start.x, end.y - start.y) / 2;
  return Array.from({ length: 49 }, (_, index) => {
    const angle = (index / 48) * Math.PI * 2;
    return { x: center.x + (Math.cos(angle) * radius), y: center.y + (Math.sin(angle) * radius) };
  });
}

function pathBounds(points, padding) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: Math.min(...xs) - padding,
    top: Math.min(...ys) - padding,
    right: Math.max(...xs) + padding,
    bottom: Math.max(...ys) + padding,
  };
}

function boundsOverlap(first, second) {
  return first.left <= second.right && first.right >= second.left
    && first.top <= second.bottom && first.bottom >= second.top;
}

export function strokeIntersectsEraser(stroke, eraser, width, height) {
  if (!stroke?.points?.length || stroke.hidden || !eraser?.points?.length || stroke.tool === "eraser" || stroke.tool === "transform") return false;
  const strokePathPoints = strokePath(stroke, width, height);
  const eraserPathPoints = strokePath(eraser, width, height);
  const threshold = (strokeWidth(stroke) + strokeWidth(eraser)) / 2;
  if (!boundsOverlap(pathBounds(strokePathPoints, threshold), pathBounds(eraserPathPoints, 0))) return false;
  if (strokePathPoints.length === 1) {
    if (eraserPathPoints.length === 1) return Math.hypot(strokePathPoints[0].x - eraserPathPoints[0].x, strokePathPoints[0].y - eraserPathPoints[0].y) <= threshold;
    return eraserPathPoints.slice(1).some((point, index) => pointToSegmentDistance(strokePathPoints[0], eraserPathPoints[index], point) <= threshold);
  }
  if (eraserPathPoints.length === 1) {
    return strokePathPoints.slice(1).some((point, index) => pointToSegmentDistance(eraserPathPoints[0], strokePathPoints[index], point) <= threshold);
  }
  for (let strokeIndex = 1; strokeIndex < strokePathPoints.length; strokeIndex += 1) {
    for (let eraserIndex = 1; eraserIndex < eraserPathPoints.length; eraserIndex += 1) {
      if (segmentDistance(
        strokePathPoints[strokeIndex - 1],
        strokePathPoints[strokeIndex],
        eraserPathPoints[eraserIndex - 1],
        eraserPathPoints[eraserIndex],
      ) <= threshold) return true;
    }
  }
  return false;
}

export function associateEraser(strokes, eraser, width, height) {
  eraser.targets = [];
  strokes.forEach((stroke, targetIndex) => {
    if (strokeIntersectsEraser(stroke, eraser, width, height)) eraser.targets.push({ targetIndex });
  });
  return eraser.targets;
}

export function associateLegacyErasers(strokes, width, height) {
  strokes.forEach((stroke, index) => {
    if (stroke?.tool === "eraser" && !Array.isArray(stroke.targets)) {
      associateEraser(strokes.slice(0, index), stroke, width, height);
    }
  });
}

export function eraserMasksForStroke(strokes, targetIndex) {
  const masks = [];
  const stroke = strokes[targetIndex];
  if (Array.isArray(stroke?.inlineErasers)) {
    stroke.inlineErasers.forEach((eraser, inlineMaskIndex) => {
      if (!eraser?.points?.length) return;
      masks.push({
        eraser,
        eraserIndex: null,
        inlineMaskIndex,
        target: eraser,
        points: eraser.points,
        renderWidth: Number.isFinite(eraser.renderWidth) ? eraser.renderWidth : strokeWidth(eraser),
      });
    });
  }
  strokes.forEach((eraser, eraserIndex) => {
    if (eraser?.tool !== "eraser" || !Array.isArray(eraser.targets)) return;
    const target = eraser.targets.find((item) => item.targetIndex === targetIndex);
    if (target) {
      masks.push({
        eraser,
        eraserIndex,
        target,
        points: target.points || eraser.points,
        renderWidth: Number.isFinite(target.renderWidth) ? target.renderWidth : strokeWidth(eraser),
      });
    }
  });
  return masks;
}

export function renderStrokeObjects(targetContext, strokes, width, height, layerCanvas) {
  const masksByTarget = new Map();
  strokes.forEach((eraser) => {
    if (eraser?.tool !== "eraser" || !Array.isArray(eraser.targets)) return;
    eraser.targets.forEach((target) => {
      const masks = masksByTarget.get(target.targetIndex) || [];
      masks.push({
        ...eraser,
        points: target.points || eraser.points,
        renderWidth: Number.isFinite(target.renderWidth) ? target.renderWidth : strokeWidth(eraser),
      });
      masksByTarget.set(target.targetIndex, masks);
    });
  });

  strokes.forEach((stroke, index) => {
    if (stroke?.hidden || stroke?.tool === "transform" || stroke?.tool === "visibility") return;
    if (stroke?.tool === "eraser" && Array.isArray(stroke.targets)) return;
    const inlineMasks = Array.isArray(stroke?.inlineErasers)
      ? stroke.inlineErasers.map((eraser) => ({
        ...eraser,
        renderWidth: Number.isFinite(eraser.renderWidth) ? eraser.renderWidth : strokeWidth(eraser),
      }))
      : [];
    const masks = [...(masksByTarget.get(index) || []), ...inlineMasks];
    if (!masks?.length || !layerCanvas || typeof targetContext.getTransform !== "function") {
      renderStroke(targetContext, stroke, width, height);
      return;
    }

    const sourceCanvas = targetContext.canvas;
    if (layerCanvas.width !== sourceCanvas.width || layerCanvas.height !== sourceCanvas.height) {
      layerCanvas.width = sourceCanvas.width;
      layerCanvas.height = sourceCanvas.height;
    }
    const layerContext = layerCanvas.getContext("2d");
    layerContext.setTransform(1, 0, 0, 1, 0, 0);
    layerContext.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
    const transform = targetContext.getTransform();
    layerContext.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
    layerContext.imageSmoothingEnabled = true;
    layerContext.imageSmoothingQuality = "high";
    renderStroke(layerContext, stroke, width, height);
    masks.forEach((mask) => renderStroke(layerContext, mask, width, height));

    targetContext.save();
    targetContext.setTransform(1, 0, 0, 1, 0, 0);
    targetContext.globalCompositeOperation = "source-over";
    targetContext.globalAlpha = 1;
    targetContext.drawImage(layerCanvas, 0, 0);
    targetContext.restore();
  });
}
