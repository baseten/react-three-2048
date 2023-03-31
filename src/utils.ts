export function randomIntInclusive(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function arrayRandomItem<T>(arr: T[]): T {
  return arr[randomIntInclusive(0, arr.length - 1)];
}

export function mapNumber(
  x: number,
  sMin: number,
  sMax: number,
  dMin: number,
  dMax: number,
): number {
  return (dMax - dMin) * (x / (sMax - sMin)) + dMin;
}

export function buildUVinRange(
  uMin: number,
  uMax: number,
  vMin: number,
  vMax: number,
  widthSegments: number,
  depthSegments: number,
  heightSegments: number,
): number[] {
  const uvs: number[] = [];

  function buildPlane(gridX: number, gridY: number) {
    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;

    for (let iy = 0; iy < gridY1; iy++) {
      for (let ix = 0; ix < gridX1; ix++) {
        uvs.push(mapNumber(ix / gridX, 0, 1, uMin, uMax));
        uvs.push(mapNumber(1 - iy / gridY, 0, 1, vMin, vMax));
      }
    }
  }

  // rebuilds UVs based on sprite sheet, builds in same order as three.js/BoxGeometry
  buildPlane(depthSegments, heightSegments); // px
  buildPlane(depthSegments, heightSegments); // nx
  buildPlane(widthSegments, depthSegments); // py
  buildPlane(widthSegments, depthSegments); // ny
  buildPlane(widthSegments, heightSegments); // pz
  buildPlane(widthSegments, heightSegments); // nz

  return uvs;
}
