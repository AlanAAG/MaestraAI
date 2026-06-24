import { toast } from 'sonner'

// An animated loading toast that cycles through engaging messages until you finish it.
// Use for any operation that takes more than ~1s so the user always knows it's working.
//
//   const p = progressToast(['Analizando tu formato…', 'Capturando tu estilo…'])
//   try { ...; p.success('Listo ✨') } catch { p.error('No pude…') }
export function progressToast(messages: string[], intervalMs = 2500) {
  const id = toast.loading(messages[0] ?? 'Procesando…')
  let i = 0
  const interval =
    messages.length > 1
      ? setInterval(() => {
          i = (i + 1) % messages.length
          toast.loading(messages[i], { id })
        }, intervalMs)
      : null
  const stop = () => {
    if (interval) clearInterval(interval)
  }
  return {
    id,
    success: (msg: string) => {
      stop()
      toast.success(msg, { id })
    },
    error: (msg: string) => {
      stop()
      toast.error(msg, { id })
    },
    dismiss: () => {
      stop()
      toast.dismiss(id)
    },
  }
}
