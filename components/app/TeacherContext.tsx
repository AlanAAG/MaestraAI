'use client'
import { createContext, useContext } from 'react'

// Exposes the signed-in teacher's name to (main) pages without a per-page fetch — the (main)
// layout already loads it. Lets empty states / greetings address the teacher by name.
const TeacherNameContext = createContext<string>('')

export function TeacherNameProvider({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return <TeacherNameContext.Provider value={name}>{children}</TeacherNameContext.Provider>
}

/** First name only, safe for greetings. Empty string if unknown → callers omit gracefully. */
export function useTeacherFirstName(): string {
  const full = useContext(TeacherNameContext)
  return full.trim().split(/\s+/)[0] || ''
}
