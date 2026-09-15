/** Round half away from zero to `decimals` (matches PHP `round`, which the original reports used). */
export function roundHalfAwayFromZero(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
}
