// Hand-drawn marks as SVG paths: a bracket down the margin, a line under a
// phrase, a loop round a word, a box, a line through. The wobble comes from a
// seeded random, so a mark looks the same on every render rather than
// twitching as React re-draws.
//
// Adapted from resumezip's review marks
// (MIT, © 2025 Ian Hoang — https://github.com/ian-hoang/resumezip).

/** Left, top, right, bottom — in the paper's own coordinate space. */
export type Box = [number, number, number, number]

/** The same numbers for the same seed (Park–Miller). */
function seeded(seed: number): () => number {
  let state = Math.abs(Math.round(seed)) % 2147483647 || 1
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

// A smooth curve through the points (Catmull-Rom, as cubic Béziers).
function smooth(points: [number, number][]): string {
  const [first] = points
  let d = `M${first[0].toFixed(1)} ${first[1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

// A pen's straight line from one point to another: its ends a little off, and bowed a little.
function stroke([x0, y0]: [number, number], [x1, y1]: [number, number], random: () => number, jitter: number): string {
  const off = () => (random() - 0.5) * 2 * jitter
  return smooth([
    [x0 + off(), y0 + off()],
    [(x0 + x1) / 2 + off(), (y0 + y1) / 2 + off()],
    [x1 + off(), y1 + off()],
  ])
}

/** A bracket down the left of `boxes`, from the first's top to the last's bottom. */
export function bracket(boxes: readonly Box[], seed: number): string {
  const random = seeded(seed)
  const x = Math.min(...boxes.map(([left]) => left)) - 6
  const top = boxes[0][1] - 1
  const bottom = boxes[boxes.length - 1][3] + 1
  return [0, 1]
    .map(() =>
      [
        stroke([x + 5, top], [x, top + 1], random, 0.5),
        stroke([x, top], [x, bottom], random, 0.7),
        stroke([x, bottom - 1], [x + 5, bottom], random, 0.5),
      ].join(" "),
    )
    .join(" ")
}

/** A line under `box`, gone over twice. */
export function underline([left, , right, bottom]: Box, seed: number, jitter = 1): string {
  const random = seeded(seed)
  const steps = Math.max(3, Math.round((right - left) / 60))
  return [0, 1]
    .map((pass) =>
      smooth(
        Array.from({ length: steps + 1 }, (_, i) => [
          left - 2 + ((right - left + 4) * i) / steps + (random() - 0.5) * 2 * jitter,
          bottom + 1.5 + (random() - 0.5) * 2 * jitter + pass * 1.4 * jitter,
        ]),
      ),
    )
    .join(" ")
}

/** A loop round `box`, going a little past where it started, as a pen does. */
export function circle([left, top, right, bottom]: Box, seed: number, pad = 4): string {
  const random = seeded(seed)
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  const rx = (right - left) / 2 + pad + 2
  const ry = (bottom - top) / 2 + pad
  const start = -Math.PI * (0.55 + random() * 0.2)
  const turn = Math.PI * 2 * (1.08 + random() * 0.08)
  const steps = 22
  return smooth(
    Array.from({ length: steps + 1 }, (_, i) => {
      const angle = start + (turn * i) / steps
      const wobble = 1 + (random() - 0.5) * 0.06 + (i / steps) * 0.05
      return [cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble]
    }),
  )
}

/** A box round `box`, gone over twice, its corners overshot. */
export function rectangle([left, top, right, bottom]: Box, seed: number, pad = 2.5): string {
  const random = seeded(seed)
  const [l, t, r, b] = [left - pad, top - pad * 0.6, right + pad, bottom + pad * 0.6]
  return [0, 1]
    .flatMap(() => [
      stroke([l - 1, t], [r + 1.5, t], random, 0.8),
      stroke([r, t - 1], [r, b + 1.5], random, 0.8),
      stroke([r + 1, b], [l - 1.5, b], random, 0.8),
      stroke([l, b + 1], [l, t - 1.5], random, 0.8),
    ])
    .join(" ")
}

/** The same wobble for a mark on every render: its key, hashed. */
export const seedOf = (key: string) => [...key].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 7)
