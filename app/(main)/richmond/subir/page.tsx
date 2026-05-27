'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

type ParsedPreview = {
  totalStudents: number
  totalAssignments: number
  matchedStudents: number
  unmatchedStudents: number
  groups: {
    groupId: string
    groupName: string
    matchedCount: number
  }[]
}

type ParsedData = {
  assignments: {
    title: string
    dueDate?: string
    submissions: {
      studentName: string
      rawValue: number | null
      progress: string
    }[]
  }[]
  students: {
    name: string
    firstName: string
    lastName: string
    matchedStudentId?: string
    matchConfidence?: number
  }[]
}

export default function RichmondUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  function handleFileSelect(selectedFile: File) {
    const ext = selectedFile.name.toLowerCase().split('.').pop()
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setError('Tipo de archivo no válido. Solo se permiten CSV, XLS y XLSX.')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Archivo demasiado grande. El tamaño máximo es 5MB.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setPreview(null)
    setParsedData(null)
  }

  async function handleParse() {
    if (!file) return

    setParsing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/richmond/parse-csv', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al analizar el archivo')
        return
      }

      setPreview(result.preview)
      setParsedData(result.data)
    } catch {
      setError('Error de red al analizar el archivo')
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (!parsedData || !preview) return

    setImporting(true)
    setError(null)

    try {
      const response = await fetch('/api/richmond/import-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: parsedData.assignments,
          students: parsedData.students,
          groupIds: preview.groups.map((g) => g.groupId),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al importar datos')
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard/richmond')
    } catch {
      setError('Error de red al importar datos')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Importar Calificaciones de Richmond
        </h1>
        <p className="text-sm text-text-secondary">
          Sube el archivo CSV descargado desde Richmond LP Markbook
        </p>
      </div>

      {/* Instructions */}
      <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Cómo descargar el archivo:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Inicia sesión en richmondlp.com</li>
          <li>Ve a Markbook</li>
          <li>Haz clic en &quot;Download Markbook&quot; (botón superior derecho)</li>
          <li>Sube el archivo CSV aquí</li>
        </ol>
      </Card>

      {/* File Upload */}
      {!preview && (
        <Card className="p-8">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary-light'
                : 'border-border hover:border-primary-light'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
            />

            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
                {file ? (
                  <FileSpreadsheet size={32} className="text-primary" />
                ) : (
                  <Upload size={32} className="text-primary" />
                )}
              </div>

              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">{file.name}</p>
                  <p className="text-xs text-text-secondary">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">
                    Arrastra tu archivo CSV aquí
                  </p>
                  <p className="text-xs text-text-secondary">
                    o haz clic para seleccionar un archivo
                  </p>
                </div>
              )}

              <p className="text-xs text-text-secondary mt-2">CSV, XLS o XLSX (máx. 5MB)</p>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {file && !error && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleParse}
                disabled={parsing}
                className="min-h-[44px] gap-2 bg-primary hover:bg-primary-dark"
              >
                {parsing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={18} />
                    Analizar archivo
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Preview */}
      {preview && parsedData && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle2 size={24} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Archivo analizado</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Revisa los datos antes de importar
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-surface">
                <p className="text-xs text-text-secondary mb-1">Estudiantes</p>
                <p className="text-2xl font-semibold text-text-primary">{preview.totalStudents}</p>
              </div>
              <div className="p-4 rounded-lg bg-surface">
                <p className="text-xs text-text-secondary mb-1">Tareas</p>
                <p className="text-2xl font-semibold text-text-primary">
                  {preview.totalAssignments}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-green-50">
                <p className="text-xs text-green-700 mb-1">Coincidencias</p>
                <p className="text-2xl font-semibold text-green-800">{preview.matchedStudents}</p>
              </div>
              <div className="p-4 rounded-lg bg-orange-50">
                <p className="text-xs text-orange-700 mb-1">Sin coincidencia</p>
                <p className="text-2xl font-semibold text-orange-800">
                  {preview.unmatchedStudents}
                </p>
              </div>
            </div>

            {/* Groups */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Por grupo:</h4>
              <div className="space-y-2">
                {preview.groups.map((group) => (
                  <div
                    key={group.groupId}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface"
                  >
                    <span className="text-sm font-medium text-text-primary">{group.groupName}</span>
                    <span className="text-sm text-text-secondary">
                      {group.matchedCount} estudiantes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {preview.unmatchedStudents > 0 && (
              <div className="mt-6 p-4 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-800">
                  {preview.unmatchedStudents} estudiantes no se pudieron relacionar automáticamente.
                  Se importarán las tareas pero sin vincular a esos estudiantes.
                </p>
              </div>
            )}
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setFile(null)
                setPreview(null)
                setParsedData(null)
                setError(null)
              }}
              variant="outline"
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="min-h-[44px] gap-2 bg-primary hover:bg-primary-dark"
            >
              {importing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Importar {preview.totalAssignments} tareas
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
