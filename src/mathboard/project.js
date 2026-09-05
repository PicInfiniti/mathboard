export const PROJECT_FORMAT = "mathboard";
const LEGACY_PROJECT_FORMAT = "math-1280-whiteboard";
const STROKE_TOOLS = ["pen", "highlighter", "eraser", "line", "circle"];

export function isSupportedProject(project) {
  return [PROJECT_FORMAT, LEGACY_PROJECT_FORMAT].includes(project?.format)
    && project.version === 1
    && Array.isArray(project.canvases)
    && project.canvases.length > 0;
}

export function sanitizeImportedStroke(stroke, budget) {
  if (!stroke || !STROKE_TOOLS.includes(stroke.tool) || !Array.isArray(stroke.points) || budget.remaining <= 0) return null;
  const points = [];
  for (const point of stroke.points) {
    if (budget.remaining <= 0) break;
    const x = Number(point?.x);
    const y = Number(point?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    points.push({
      x: Math.min(100, Math.max(-100, x)),
      y: Math.min(100, Math.max(-100, y)),
      pressure: Number.isFinite(Number(point.pressure)) ? Math.min(1, Math.max(.08, Number(point.pressure))) : .5,
    });
    budget.remaining -= 1;
  }
  if (!points.length) return null;
  const sanitized = {
    tool: stroke.tool,
    color: typeof stroke.color === "string" ? stroke.color.slice(0, 64) : "#071d33",
    size: Number.isFinite(Number(stroke.size)) ? Math.min(30, Math.max(1, Number(stroke.size))) : 5,
    smooth: stroke.smooth !== false,
    pointerType: ["mouse", "touch", "pen"].includes(stroke.pointerType) ? stroke.pointerType : "mouse",
    points,
  };
  const widthScale = Number(stroke.widthScale);
  if (Number.isFinite(widthScale)) sanitized.widthScale = Math.min(400, Math.max(.001, widthScale));
  if (stroke.tool === "eraser" && Array.isArray(stroke.targets)) {
    sanitized.targets = stroke.targets.slice(0, 50000).map((target) => {
      const targetIndex = Number(target?.targetIndex);
      if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= 50000) return null;
      const sanitizedTarget = { targetIndex };
      const renderWidth = Number(target?.renderWidth);
      if (Number.isFinite(renderWidth)) sanitizedTarget.renderWidth = Math.min(1800, Math.max(.1, renderWidth));
      if (Array.isArray(target.points)) {
        const targetPoints = [];
        for (const point of target.points) {
          if (budget.remaining <= 0) break;
          const x = Number(point?.x);
          const y = Number(point?.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          targetPoints.push({
            x: Math.min(100, Math.max(-100, x)),
            y: Math.min(100, Math.max(-100, y)),
            pressure: Number.isFinite(Number(point.pressure)) ? Math.min(1, Math.max(.08, Number(point.pressure))) : .5,
          });
          budget.remaining -= 1;
        }
        if (targetPoints.length) sanitizedTarget.points = targetPoints;
      }
      return sanitizedTarget;
    }).filter(Boolean);
  }
  return sanitized;
}

export function uniqueImportedName(name, usedNames) {
  const base = name.trim().slice(0, 32) || "Imported canvas";
  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffixText = ` ${suffix}`;
    candidate = `${base.slice(0, 32 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}
