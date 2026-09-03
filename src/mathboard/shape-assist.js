function toPixels(points, width, height) {
  return points.map((point) => ({ x: point.x * width, y: point.y * height }));
}

function toNormalized(point, width, height) {
  return { x: point.x / width, y: point.y / height, pressure: .5 };
}

function fitLine(points, width, height) {
  if (points.length < 2) return null;
  const pixels = toPixels(points, width, height);
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
  if (endDistance - startDistance < 2) return null;
  return [startDistance, endDistance].map((distance) => toNormalized({
    x: center.x + (direction.x * distance),
    y: center.y + (direction.y * distance),
  }, width, height));
}

function fitCircle(points, width, height) {
  if (points.length < 3) return null;
  const pixels = toPixels(points, width, height);
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
  const radius = pixels.reduce((total, point) => total + Math.hypot(point.x - center.x, point.y - center.y), 0) / pixels.length;
  if (!Number.isFinite(radius) || radius < 2) return null;
  return [
    toNormalized({ x: center.x - radius, y: center.y }, width, height),
    toNormalized({ x: center.x + radius, y: center.y }, width, height),
  ];
}

export function fitAssistedShape(tool, points, width, height) {
  if (tool === "line") return fitLine(points, width, height);
  if (tool === "circle") return fitCircle(points, width, height);
  return null;
}
