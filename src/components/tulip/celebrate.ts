import confetti from 'canvas-confetti'

let confettiShapes: confetti.Shape[] | null = null

/** A burst of tulip and heart confetti. */
export function celebrate() {
  try {
    confettiShapes ??= ['🌷', '💖', '💕'].map((text) => confetti.shapeFromText({ text, scalar: 2 }))
    confetti({ shapes: confettiShapes, scalar: 2, particleCount: 70, spread: 110, origin: { y: 0.65 }, disableForReducedMotion: true })
  } catch {
    // Emoji confetti needs canvas text support; everything works fine without it.
  }
}
