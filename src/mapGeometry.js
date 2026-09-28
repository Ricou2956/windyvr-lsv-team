// Rendering coordinates only: never write unwrapped longitudes into imported points.
export function longitudeNear(longitude, reference) {
  return longitude + 360 * Math.round((reference - longitude) / 360);
}

export function unwrapMapGeometry(coordinates, reference = coordinates[0]?.[1]) {
  let previous = reference;
  return coordinates.map(([lat, lon]) => {
    const longitude = longitudeNear(lon, previous);
    previous = longitude;
    return [lat, longitude];
  });
}

// Locate the correct world copy using the route at this time, not the map centre.
// This also keeps markers and clipped risk segments aligned after the crossing.
export function mapPositionOnRoute(points, geometry, position) {
  if (!position || !points.length) return null;
  const timestamp = Number(position.time);
  let lo = 0, hi = points.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (Number(points[mid].time) <= timestamp) lo = mid;
    else hi = mid - 1;
  }
  return [position.lat, longitudeNear(position.lon, geometry[lo][1])];
}
