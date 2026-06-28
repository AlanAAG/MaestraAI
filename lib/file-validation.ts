/**
 * File Validation — MIME type, magic bytes, and dimension checks.
 * Server-safe: no browser APIs (no createImageBitmap, no Blob URL, no canvas).
 */

const ALLOWED_MIME_TYPES = {
  images: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  documents: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  spreadsheets: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
}

const MAX_SIZES = {
  image: 5 * 1024 * 1024, // 5 MB
  document: 10 * 1024 * 1024, // 10 MB
  csv: 5 * 1024 * 1024, // 5 MB
  xlsx: 5 * 1024 * 1024, // 5 MB
}

const MAX_IMAGE_DIMENSIONS = { width: 10000, height: 10000 }

export type FileType = 'image' | 'document' | 'csv' | 'xlsx'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export async function validateFile(file: File, type: FileType): Promise<ValidationResult> {
  const maxSize = MAX_SIZES[type]
  if (file.size > maxSize) {
    return { valid: false, error: `Archivo demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB` }
  }

  const allowedTypes =
    type === 'csv'
      ? ALLOWED_MIME_TYPES.spreadsheets
      : type === 'xlsx'
        ? ALLOWED_MIME_TYPES.spreadsheets
        : type === 'image'
          ? ALLOWED_MIME_TYPES.images
          : ALLOWED_MIME_TYPES.documents

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`,
    }
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (type === 'image') {
    if (!validateImageSignature(bytes)) {
      return { valid: false, error: 'Firma de archivo inválida. El archivo puede estar dañado.' }
    }
    if (!validateImageDimensions(bytes)) {
      return {
        valid: false,
        error: `Dimensiones demasiado grandes. Máximo: ${MAX_IMAGE_DIMENSIONS.width}x${MAX_IMAGE_DIMENSIONS.height}px`,
      }
    }
  }

  if (type === 'csv') {
    if (!validateCsvSignature(bytes)) {
      return { valid: false, error: 'Firma de CSV inválida.' }
    }
  }

  if (type === 'xlsx') {
    if (!validateXlsxSignature(bytes)) {
      return {
        valid: false,
        error: 'Firma de archivo XLSX inválida. Verifica que sea un archivo Excel válido.',
      }
    }
  }

  if (type === 'document') {
    if (!validateDocumentSignature(bytes)) {
      return { valid: false, error: 'Firma de documento inválida.' }
    }
  }

  return { valid: true }
}

function validateImageSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isWEBP =
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  return isPNG || isJPEG || isWEBP
}

/**
 * Parse image dimensions from raw bytes without any browser API.
 * Supports PNG, JPEG (SOF markers), and WebP VP8X.
 */
function getImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null

  // PNG: IHDR chunk starts at byte 8; width at 16-19, height at 20-23 (big-endian uint32)
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const w = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0
    const h = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0
    return { width: w, height: h }
  }

  // JPEG: scan for SOF0/SOF1/SOF2 markers (FF C0..C3, C9)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2
    while (i + 8 < bytes.length) {
      if (bytes[i] !== 0xff) break
      const marker = bytes[i + 1]
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb
      ) {
        const h = (bytes[i + 5] << 8) | bytes[i + 6]
        const w = (bytes[i + 7] << 8) | bytes[i + 8]
        return { width: w, height: h }
      }
      if (i + 3 >= bytes.length) break
      const segLen = (bytes[i + 2] << 8) | bytes[i + 3]
      i += 2 + segLen
    }
  }

  // WebP VP8X: canvas width at bytes 24-26 (LE uint24 + 1), height at 27-29
  if (
    bytes.length >= 30 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50 &&
    bytes[12] === 0x56 &&
    bytes[13] === 0x50 &&
    bytes[14] === 0x38 &&
    bytes[15] === 0x58
  ) {
    const w = ((bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) & 0xffffff) + 1
    const h = ((bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) & 0xffffff) + 1
    return { width: w, height: h }
  }

  return null // Unknown format or lossy WebP — can't determine; allow
}

function validateImageDimensions(bytes: Uint8Array): boolean {
  const dims = getImageDimensions(bytes)
  if (!dims) return true // Can't determine — allow (size limit already blocks bombs)
  return dims.width <= MAX_IMAGE_DIMENSIONS.width && dims.height <= MAX_IMAGE_DIMENSIONS.height
}

function validateCsvSignature(bytes: Uint8Array): boolean {
  for (let i = 0; i < Math.min(10, bytes.length); i++) {
    const b = bytes[i]
    if (!((b >= 32 && b <= 126) || b === 10 || b === 13)) return false
  }
  return true
}

/** XLSX files are ZIP archives: magic bytes PK\x03\x04 */
function validateXlsxSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  )
}

function validateDocumentSignature(bytes: Uint8Array): boolean {
  const isPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  const isDOCX = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  return isPDF || isDOCX
}

/**
 * Validate base64 image (server-safe, no browser APIs).
 */
export async function validateBase64Image(
  base64Data: string,
  mimeType: string
): Promise<ValidationResult> {
  try {
    const binaryString = atob(base64Data) // atob is available in Node 16+
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    if (bytes.length > MAX_SIZES.image) {
      return {
        valid: false,
        error: `Imagen demasiado grande. Máximo: ${MAX_SIZES.image / 1024 / 1024}MB`,
      }
    }

    if (!ALLOWED_MIME_TYPES.images.includes(mimeType)) {
      return {
        valid: false,
        error: `Tipo de imagen no permitido. Permitidos: ${ALLOWED_MIME_TYPES.images.join(', ')}`,
      }
    }

    if (!validateImageSignature(bytes)) {
      return {
        valid: false,
        error: 'Firma de imagen inválida. El archivo puede no ser una imagen real.',
      }
    }

    if (!validateImageDimensions(bytes)) {
      return {
        valid: false,
        error: `Dimensiones demasiado grandes. Máximo: ${MAX_IMAGE_DIMENSIONS.width}x${MAX_IMAGE_DIMENSIONS.height}px`,
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'No se pudo validar la imagen.' }
  }
}
