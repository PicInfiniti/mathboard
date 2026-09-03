function toPixels(points, width, height) {
  return points
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => ({ x: point.x * width, y: point.y * height }));
}

function toNormalized(point, width, height) {
  return { x: point.x / width, y: point.y / height, pressure: .5 };
}

function distance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pathLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) length += distance(points[index - 1], points[index]);
  return length;
}

function lineFit(pixels) {
  if (pixels.length < 2) return null;
  const center = pixels.reduce((total, point) => ({
    x: total.x + point.x / pixels.length,
    y: total.y + point.y / pixels.length,
  }), { x: 0, y: 0 });
  let xx = 0;
  let xy = 0;
  let yy = 0;
  pixels.forEach((point) => {
    const x = point.x - center.x;
    const y = point.y - center.y;
    xx += x * x;
    xy += x * y;
    yy += y * y;
  });
  if (xx + yy < 4) return null;
  const angle = .5 * Math.atan2(2 * xy, xx - yy);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const projections = pixels.map((point) => ((point.x - center.x) * direction.x) + ((point.y - center.y) * direction.y));
  const startDistance = Math.min(...projections);
  const endDistance = Math.max(...projections);
  const span = endDistance - startDistance;
  if (span < 2) return null;
  const errors = pixels.map((point, index) => {
    const projected = {
      x: center.x + (direction.x * projections[index]),
      y: center.y + (direction.y * projections[index]),
    };
    return distance(point, projected);
  });
  return {
    direction,
    projections,
    span,
    rmsError: Math.sqrt(errors.reduce((sum, error) => sum + (error * error), 0) / errors.length),
    maxError: Math.max(...errors),
    points: [startDistance, endDistance].map((projection) => ({
      x: center.x + (direction.x * projection),
      y: center.y + (direction.y * projection),
    })),
  };
}

function circleFit(pixels) {
  if (pixels.length < 3) return null;
  const mean = pixels.reduce((total, point) => ({
    x: total.x + point.x / pixels.length,
    y: total.y + point.y / pixels.length,
  }), { x: 0, y: 0 });
  let uu = 0;
  let uv = 0;
  let vv = 0;
  let uuu = 0;
  let uvv = 0;
  let vvv = 0;
  let vuu = 0;
  pixels.forEach((point) => {
    const u = point.x - mean.x;
    const v = point.y - mean.y;
    uu += u * u;
    uv += u * v;
    vv += v * v;
    uuu += u * u * u;
    uvv += u * v * v;
    vvv += v * v * v;
    vuu += v * u * u;
  });
  const determinant = (uu * vv) - (uv * uv);
  if (Math.abs(determinant) < .001) return null;
  const rightU = .5 * (uuu + uvv);
  const rightV = .5 * (vvv + vuu);
  const center = {
    x: mean.x + (((rightU * vv) - (rightV * uv)) / determinant),
    y: mean.y + (((uu * rightV) - (uv * rightU)) / determinant),
  };
  const radii = pixels.map((point) => distance(point, center));
  const radius = radii.reduce((total, value) => total + value, 0) / radii.length;
  if (!Number.isFinite(radius) || radius < 2) return null;
  const errors = radii.map((value) => Math.abs(value - radius));
  return {
    center,
    radius,
    rmsError: Math.sqrt(errors.reduce((sum, error) => sum + (error * error), 0) / errors.length),
    maxError: Math.max(...errors),
  };
}

function recognizeLine(pixels, width, height) {
  if (pixels.length < 3) return null;
  const fit = lineFit(pixels);
  if (!fit) return null;
  const drawnLength = pathLength(pixels);
  const chord = distance(pixels[0], pixels.at(-1));
  const vertical = Math.abs(fit.direction.y) > .94;

  // Compact vertical marks are much more likely to be a handwritten "1".
  if (fit.span < (vertical ? 56 : 36)
    || chord / drawnLength < .955
    || fit.rmsError / fit.span > .026
    || fit.maxError / fit.span > .065) return null;

  let backwardsTravel = 0;
  const overallDirection = fit.projections.at(-1) >= fit.projections[0] ? 1 : -1;
  for (let index = 1; index < fit.projections.length; index += 1) {
    const progress = (fit.projections[index] - fit.projections[index - 1]) * overallDirection;
    if (progress < 0) backwardsTravel -= progress;
  }
  if (backwardsTravel / drawnLength > .025) return null;

  return {
    tool: "line",
    points: fit.points.map((point) => toNormalized(point, width, height)),
  };
}

function recognizeCircle(pixels, width, height) {
  if (pixels.length < 8) return null;
  const fit = circleFit(pixels);
  if (!fit) return null;
  const xs = pixels.map((point) => point.x);
  const ys = pixels.map((point) => point.y);
  const boxWidth = Math.max(...xs) - Math.min(...xs);
  const boxHeight = Math.max(...ys) - Math.min(...ys);
  const aspect = boxWidth / boxHeight;
  const drawnLength = pathLength(pixels);
  const circumference = Math.PI * 2 * fit.radius;
  const closure = distance(pixels[0], pixels.at(-1)) / fit.radius;

  // Keep character-sized loops as ink, but allow deliberately drawn circles to
  // be quite oval or to overlap at the join before fitting them to a circle.
  if (Math.min(boxWidth, boxHeight) < 60
    || aspect < .62
    || aspect > 2.6
    || closure > .85
    || fit.rmsError / fit.radius > .34
    || fit.maxError / fit.radius > .75
    || drawnLength / circumference < .68
    || drawnLength / circumference > 1.5) return null;

  const angles = pixels.map((point) => Math.atan2(point.y - fit.center.y, point.x - fit.center.x));
  let signedRotation = 0;
  let totalRotation = 0;
  for (let index = 1; index < angles.length; index += 1) {
    let turn = angles[index] - angles[index - 1];
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    signedRotation += turn;
    totalRotation += Math.abs(turn);
  }
  if (totalRotation < Math.PI * 1.5 || Math.abs(signedRotation) / totalRotation < .72) return null;

  return {
    tool: "circle",
    points: [
      toNormalized({ x: fit.center.x - fit.radius, y: fit.center.y }, width, height),
      toNormalized({ x: fit.center.x + fit.radius, y: fit.center.y }, width, height),
    ],
  };
}

export function recognizeAssistedShape(points, width, height) {
  if (!Array.isArray(points) || width <= 0 || height <= 0) return null;
  const pixels = toPixels(points, width, height);
  return recognizeCircle(pixels, width, height) || recognizeLine(pixels, width, height);
}
