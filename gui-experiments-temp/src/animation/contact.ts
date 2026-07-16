export function resolveContactY(
  positionY: number,
  lowestPointY: number,
  boundaryY: number,
): number {
  return positionY + Math.max(0, boundaryY - lowestPointY)
}
