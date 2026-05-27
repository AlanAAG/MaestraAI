'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface GameContainerProps {
  children: React.ReactNode
  onExit?: () => void
}

export function GameContainer({ children, onExit }: GameContainerProps) {
  const router = useRouter()

  useEffect(() => {
    // ESC key listener
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (onExit) {
          onExit()
        } else {
          router.back()
        }
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onExit, router])

  function handleExit() {
    if (onExit) {
      onExit()
    } else {
      router.back()
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-bg to-accent/5 z-50 overflow-auto">
      {/* Exit button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={handleExit}
          variant="ghost"
          size="sm"
          className="bg-surface/80 backdrop-blur-sm hover:bg-surface"
        >
          <X size={18} className="mr-2" />
          Salir (ESC)
        </Button>
      </div>

      {/* Game content */}
      <div className="w-full min-h-screen flex items-center justify-center p-4">{children}</div>
    </div>
  )
}
