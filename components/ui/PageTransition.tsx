'use client'

// Route-enter transition: a calm fade + 8px rise. Used from template.tsx files
// (templates remount per navigation, so a mount animation is all that's needed).
import { motion, useReducedMotion } from 'framer-motion'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}
