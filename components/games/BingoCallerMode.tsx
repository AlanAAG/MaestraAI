'use client'
import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, RotateCcw, List } from 'lucide-react'

interface BingoCallerModeProps {
  vocabulary: string[]
  title: string
  onExit: () => void
}

function seededShuffle(arr: string[], seed: number): string[] {
  const result = [...arr]
  let s = seed | 0
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) | 0
    const j = Math.abs(s) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function BingoCallerMode({ vocabulary, title, onExit }: BingoCallerModeProps) {
  const [words, setWords] = useState<string[]>(() => seededShuffle(vocabulary, Date.now()))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSidebar, setShowSidebar] = useState(false)

  const isComplete = currentIndex >= words.length

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          setCurrentIndex((i) => Math.min(i + 1, words.length))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setCurrentIndex((i) => Math.max(i - 1, 0))
          break
        case 's':
        case 'S':
          e.preventDefault()
          setWords(seededShuffle(vocabulary, Date.now()))
          setCurrentIndex(0)
          break
        case 'Escape':
          e.preventDefault()
          onExit()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length, vocabulary, onExit])

  const calledWords = words.slice(0, currentIndex)
  const currentWord = words[currentIndex]

  return (
    <div className="fixed inset-0 z-50 bg-indigo-950 flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-800">
        <span className="text-indigo-300 text-sm font-medium">{title} — Bingo</span>
        <div className="flex items-center gap-4">
          {!isComplete && (
            <span className="text-indigo-200 text-sm tabular-nums">
              Palabra {currentIndex + 1} de {words.length}
            </span>
          )}
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className={`transition-colors ${showSidebar ? 'text-white' : 'text-indigo-400 hover:text-white'}`}
            aria-label="Palabras llamadas"
          >
            <List className="h-5 w-5" />
          </button>
          <button
            onClick={onExit}
            className="text-indigo-400 hover:text-white transition-colors"
            aria-label="Salir"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center stage */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          {isComplete ? (
            <div className="text-center space-y-6">
              <p className="text-white font-bold" style={{ fontSize: '56px' }}>
                ¡Bingo completado!
              </p>
              <p className="text-indigo-300 text-xl">Se llamaron las {words.length} palabras</p>
              <button
                onClick={() => {
                  setWords(seededShuffle(vocabulary, Date.now()))
                  setCurrentIndex(0)
                }}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-lg font-medium transition-colors"
              >
                <RotateCcw className="h-5 w-5" />
                Jugar de nuevo
              </button>
            </div>
          ) : (
            <>
              <p
                className="text-white font-bold text-center leading-none tracking-tight"
                style={{ fontSize: '96px' }}
              >
                {currentWord}
              </p>
              {currentIndex > 0 && (
                <p className="text-indigo-500 text-base">Anterior: {words[currentIndex - 1]}</p>
              )}
            </>
          )}

          {/* Navigation buttons */}
          {!isComplete && (
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 text-indigo-300 hover:text-white disabled:opacity-30 transition-colors px-4 py-2 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm">Anterior</span>
              </button>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(i + 1, words.length))}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Keyboard hint */}
          <p className="text-indigo-700 text-xs mt-4 text-center">
            → siguiente · ← anterior · S re-mezclar · Esc salir
          </p>
        </div>

        {/* Sidebar: called words */}
        {showSidebar && (
          <div className="w-52 border-l border-indigo-800 flex flex-col bg-indigo-900/40">
            <div className="px-4 py-3 border-b border-indigo-800">
              <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wide">
                Llamadas ({calledWords.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {calledWords.length === 0 ? (
                <p className="text-indigo-700 text-sm mt-2">Ninguna aún</p>
              ) : (
                [...calledWords].reverse().map((word, i) => (
                  <p key={i} className="text-indigo-500 text-sm line-through">
                    {word}
                  </p>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
