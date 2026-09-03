export function coordinateLabelInterval(zoom, axisFontSize) {
  let interval = 2;
  if (zoom >= 4) interval = 0.25;
  else if (zoom >= 2.5) interval = 0.5;
  else if (zoom >= 1.5) interval = 1;
  while ((32 * zoom * interval) < (axisFontSize * 3.2) && interval < 32) interval *= 2;
  return interval;
}

export function formatCoordinate(value) {
  const rounded = Math.abs(value) < 0.0001 ? 0 : Number(value.toFixed(2));
  return String(rounded);
}
