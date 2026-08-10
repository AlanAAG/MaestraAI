'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Brush, Eraser, Undo2, Trash2, Download, X } from 'lucide-react'
import { VocabVisual } from '@/components/games/VocabVisual'

// Crayon box. Ordered like a real one so a child finds "su" color by position, not by name.
const COLORS = [
  { hex: '#EF4444', name: 'rojo' },
  { hex: '#F97316', name: 'naranja' },
  { hex: '#FACC15', name: 'amarillo' },
  { hex: '#22C55E', name: 'verde' },
  { hex: '#0EA5E9', name: 'azul' },
  { hex: '#6366F1', name: 'morado' },
  { hex: '#EC4899', name: 'rosa' },
  { hex: '#92400E', name: 'café' },
  { hex: '#F5D0A9', name: 'piel' },
  { hex: '#111827', name: 'negro' },
]

const SIZES = [
  { px: 10, label: 'Delgado' },
  { px: 24, label: 'Mediano' },
  { px: 48, label: 'Grueso' },
]

const MAX_UNDO = 12

/**
 * Digital coloring over the word's picture. The strokes live on a canvas laid over the image with
 * `multiply` blending, so it behaves like a marker: the drawing's lines stay visible underneath.
 * ponytail: no flood fill / no layers. Kids color by scribbling; add a bucket only if asked.
 */
export function ColoringCanvas({
  word,
  instruction,
  emoji,
  imageUrl,
  onClose,
}: {
  word: string
  instruction?: string
  emoji?: string | null
  imageUrl?: string | null
  onClose?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const undoStack = useRef<ImageData[]>([])
  const drawing = useRef(false)
  const [color, setColor] = useState(COLORS[0].hex)
  const [size, setSize] = useState(SIZES[1].px)
  const [erasing, setErasing] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Size the bitmap to the element (device-pixel aware) so strokes aren't blurry on tablets.
  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const { width, height } = stage.getBoundingClientRect()
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(ratio, ratio)
  }, [])

  const ctxOf = () => canvasRef.current?.getContext('2d') ?? null

  const pushUndo = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxOf()
    if (!canvas || !ctx) return
    undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
    setCanUndo(true)
  }, [])

  function pointIn(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = ctxOf()
    if (!ctx) return
    pushUndo()
    drawing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = pointIn(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    // A dot, so a single tap paints instead of doing nothing.
    ctx.lineTo(x + 0.01, y)
    applyBrush(ctx)
    ctx.stroke()
  }

  function applyBrush(ctx: CanvasRenderingContext2D) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = size
    ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over'
    ctx.strokeStyle = erasing ? 'rgba(0,0,0,1)' : color
  }

  function moveStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = ctxOf()
    if (!ctx) return
    const { x, y } = pointIn(e)
    applyBrush(ctx)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function endStroke() {
    drawing.current = false
  }

  function undo() {
    const ctx = ctxOf()
    const prev = undoStack.current.pop()
    if (!ctx || !prev) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.putImageData(prev, 0, 0)
    ctx.restore()
    setCanUndo(undoStack.current.length > 0)
  }

  function clearAll() {
    const canvas = canvasRef.current
    const ctx = ctxOf()
    if (!canvas || !ctx) return
    pushUndo()
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  // Flatten picture + strokes into a PNG the family can print or send to the teacher.
  async function download() {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    setSaveError('')
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    const img = stage.querySelector('img')
    try {
      if (img) {
        const loaded = new Image()
        loaded.crossOrigin = 'anonymous'
        loaded.src = img.src
        await loaded.decode()
        // Contain the picture in the square, same as the on-screen object-contain.
        const scale = Math.min(out.width / loaded.width, out.height / loaded.height)
        const w = loaded.width * scale
        const h = loaded.height * scale
        ctx.drawImage(loaded, (out.width - w) / 2, (out.height - h) / 2, w, h)
      }
      ctx.globalCompositeOperation = 'multiply'
      ctx.drawImage(canvas, 0, 0)
      const url = out.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${word}-coloreado.png`
      a.click()
    } catch {
      setSaveError('No pude guardar el dibujo, pero puedes tomarle una foto a la pantalla.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold text-gray-900">{word}</p>
          {instruction && <p className="text-sm text-gray-600">{instruction}</p>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer rounded-full border-2 border-gray-200 p-2 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* The drawing. Square so it scales the same on a phone, a tablet and the projector. */}
      <div
        ref={stageRef}
        className="relative h-[min(78vw,58vh)] w-[min(78vw,58vh)] overflow-hidden rounded-3xl border-4 border-gray-200 bg-white shadow-[0_10px_0_-2px_rgba(0,0,0,0.06),0_18px_30px_-12px_rgba(0,0,0,0.25)]"
      >
        <VocabVisual
          word={word}
          emoji={emoji}
          imageUrl={imageUrl}
          className="absolute inset-0 h-full w-full p-4"
          emojiClassName="text-[min(48vw,34vh)] leading-none"
        />
        <canvas
          ref={canvasRef}
          onPointerDown={startStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          role="img"
          aria-label={`Área para colorear ${word}`}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none mix-blend-multiply"
        />
      </div>

      {/* Crayons — 56px targets, well above the 44px minimum, for small fingers. */}
      <div className="flex flex-wrap justify-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => {
              setColor(c.hex)
              setErasing(false)
            }}
            aria-label={`Color ${c.name}`}
            aria-pressed={!erasing && color === c.hex}
            style={{ backgroundColor: c.hex }}
            className={`h-14 w-14 cursor-pointer rounded-2xl border-4 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
              !erasing && color === c.hex
                ? 'border-gray-900 shadow-[0_6px_0_-1px_rgba(0,0,0,0.25)]'
                : 'border-white shadow-[0_4px_0_-1px_rgba(0,0,0,0.15)]'
            }`}
          />
        ))}
      </div>

      {/* Brush size + tools */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SIZES.map((s) => (
          <button
            key={s.px}
            type="button"
            onClick={() => setSize(s.px)}
            aria-label={`Grosor ${s.label}`}
            aria-pressed={size === s.px}
            className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border-4 bg-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
              size === s.px ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span
              className="rounded-full bg-gray-800"
              style={{ width: s.px / 2 + 6, height: s.px / 2 + 6 }}
            />
          </button>
        ))}

        <button
          type="button"
          onClick={() => setErasing((v) => !v)}
          aria-label="Borrador"
          aria-pressed={erasing}
          className={`flex h-14 cursor-pointer items-center gap-2 rounded-2xl border-4 px-4 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${
            erasing
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          {erasing ? <Eraser className="h-5 w-5" /> : <Brush className="h-5 w-5" />}
          {erasing ? 'Borrar' : 'Pintar'}
        </button>

        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Deshacer"
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border-4 border-gray-200 bg-white text-gray-700 transition-colors duration-200 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={clearAll}
          aria-label="Empezar de nuevo"
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border-4 border-gray-200 bg-white text-gray-700 transition-colors duration-200 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={download}
          aria-label="Guardar mi dibujo"
          className="flex h-14 cursor-pointer items-center gap-2 rounded-2xl border-4 border-primary bg-primary px-4 font-semibold text-white transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          <Download className="h-5 w-5" /> Guardar
        </button>
      </div>
      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
    </div>
  )
}
