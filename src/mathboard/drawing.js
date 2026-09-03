export function strokeWidth(stroke) {
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

export function shapeLength(stroke, width, height) {
  if (!stroke.points?.[1]) return 0;
  const [start, end] = stroke.points;
  return Math.hypot((end.x - start.x) * width, (end.y - start.y) * height);
}

function renderLine(targetContext, stroke, width, height) {
  const [start, end] = stroke.points;
  targetContext.beginPath();
  targetContext.moveTo(start.x * width, start.y * height);
  targetContext.lineTo(end.x * width, end.y * height);
  targetContext.stroke();
}

function renderCircle(targetContext, stroke, width, height) {
  const [start, end] = stroke.points;
  const startX = start.x * width;
  const startY = start.y * height;
  const endX = end.x * width;
  const endY = end.y * height;
  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;
  const radius = Math.hypot(endX - startX, endY - startY) / 2;
  targetContext.beginPath();
  targetContext.arc(centerX, centerY, radius, 0, Math.PI * 2);
  targetContext.stroke();
}

export function renderStroke(targetContext, stroke, width, height) {
  if (!stroke.points?.length) return;
  targetContext.save();
  targetContext.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  targetContext.globalAlpha = stroke.tool === "highlighter" ? 0.28 : 1;
  targetContext.strokeStyle = stroke.color;
  targetContext.fillStyle = stroke.color;
  targetContext.lineWidth = strokeWidth(stroke);
  targetContext.lineCap = "round";
  targetContext.lineJoin = "round";

  if (stroke.tool === "line" && stroke.points.length > 1) {
    renderLine(targetContext, stroke, width, height);
  } else if (stroke.tool === "circle" && stroke.points.length > 1) {
    renderCircle(targetContext, stroke, width, height);
  } else if (stroke.points.length === 1) {
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
