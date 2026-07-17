import confetti from 'canvas-confetti'

// A short, kid-friendly confetti burst for game win screens.
export function celebrate() {
  if (typeof window === 'undefined') return
  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4']
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors })
  setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 }, colors }), 250)
}

// Warm brand-palette burst for teacher-facing conversion/completion moments
// (waitlist joined, planeación generated, material created). Softer than the game one.
export function celebrateWarm() {
  if (typeof window === 'undefined') return
  confetti({
    particleCount: 80,
    spread: 75,
    origin: { y: 0.6 },
    colors: ['#B8860B', '#E8B54A', '#D4956B', '#7C9A6D', '#C97B63'],
    disableForReducedMotion: true,
  })
}
