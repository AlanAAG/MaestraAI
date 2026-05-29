/**
 * File Validation with MIME type and magic byte checks
 *
 * Validates uploaded files by:
 * 1. Size limits
 * 2. MIME type (not just extension)
 * 3. Magic bytes (file signature) to prevent spoofing
 * 4. Image dimensions (prevent image bombs)
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
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  csv: 5 * 1024 * 1024, // 5MB
}

const MAX_IMAGE_DIMENSIONS = {
  width: 10000,
  height: 10000,
}

export type FileType = 'image' | 'document' | 'csv'

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate a file before processing or uploading
 *
 * @param file - File object from form upload
 * @param type - Expected file type category
 * @returns Validation result with error message if invalid
 */
export async function validateFile(file: File, type: FileType): Promise<ValidationResult> {
  // Check size
  const maxSize = MAX_SIZES[type]
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
    }
  }

  // Check MIME type (not just extension)
  const allowedTypes =
    type === 'csv'
      ? ALLOWED_MIME_TYPES.spreadsheets
      : type === 'image'
        ? ALLOWED_MIME_TYPES.images
        : ALLOWED_MIME_TYPES.documents

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    }
  }

  // Check magic bytes (file signature) - prevent extension spoofing
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (type === 'image') {
    const signatureValid = await validateImageSignature(bytes)
    if (!signatureValid) {
      return {
        valid: false,
        error: 'Invalid image file signature. File may be corrupted or renamed.',
      }
    }

    // Check image dimensions (prevent image bombs)
    const dimensionsValid = await validateImageDimensions(buffer)
    if (!dimensionsValid) {
      return {
        valid: false,
        error: `Image dimensions too large. Maximum: ${MAX_IMAGE_DIMENSIONS.width}x${MAX_IMAGE_DIMENSIONS.height}px`,
      }
    }
  }

  if (type === 'csv') {
    const signatureValid = validateCsvSignature(bytes)
    if (!signatureValid) {
      return {
        valid: false,
        error: 'Invalid CSV file signature.',
      }
    }
  }

  if (type === 'document') {
    const signatureValid = validateDocumentSignature(bytes)
    if (!signatureValid) {
      return {
        valid: false,
        error: 'Invalid document file signature.',
      }
    }
  }

  return { valid: true }
}

/**
 * Validate image file signature (magic bytes)
 */
async function validateImageSignature(bytes: Uint8Array): Promise<boolean> {
  // Need at least 4 bytes for basic checks
  if (bytes.length < 4) return false

  // PNG: 89 50 4E 47
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47

  // JPEG: FF D8 FF
  const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff

  // WebP: RIFF....WEBP (check bytes 8-11, need at least 12 bytes)
  const isWEBP =
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50

  return isPNG || isJPEG || isWEBP
}

/**
 * Validate image dimensions (prevent image bombs)
 */
async function validateImageDimensions(buffer: ArrayBuffer): Promise<boolean> {
  try {
    const blob = new Blob([buffer])
    const img = await createImageBitmap(blob)

    if (img.width > MAX_IMAGE_DIMENSIONS.width || img.height > MAX_IMAGE_DIMENSIONS.height) {
      return false
    }

    return true
  } catch {
    // If createImageBitmap fails, the image is invalid
    return false
  }
}

/**
 * Validate CSV file signature
 */
function validateCsvSignature(bytes: Uint8Array): boolean {
  // CSV files should start with text characters (printable ASCII)
  // Check first 10 bytes are printable
  for (let i = 0; i < Math.min(10, bytes.length); i++) {
    const byte = bytes[i]
    // Printable ASCII: 32-126, plus newline (10) and carriage return (13)
    if (!((byte >= 32 && byte <= 126) || byte === 10 || byte === 13)) {
      return false
    }
  }
  return true
}

/**
 * Validate document file signature
 */
function validateDocumentSignature(bytes: Uint8Array): boolean {
  // PDF: 25 50 44 46 (%PDF)
  const isPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46

  // DOCX: PK (ZIP header, 50 4B 03 04)
  const isDOCX = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04

  return isPDF || isDOCX
}

/**
 * Validate base64 image data
 *
 * @param base64Data - Base64 encoded image data (without data: prefix)
 * @param mimeType - MIME type of the image
 * @returns Validation result
 */
export async function validateBase64Image(
  base64Data: string,
  mimeType: string
): Promise<ValidationResult> {
  try {
    // Convert base64 to bytes for validation
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Check size (5MB max for images)
    if (bytes.length > MAX_SIZES.image) {
      return {
        valid: false,
        error: `Image too large. Maximum size: ${MAX_SIZES.image / 1024 / 1024}MB`,
      }
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.images.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid image type. Allowed: ${ALLOWED_MIME_TYPES.images.join(', ')}`,
      }
    }

    // Validate image signature (magic bytes)
    const signatureValid = await validateImageSignature(bytes)
    if (!signatureValid) {
      return {
        valid: false,
        error: 'Invalid image file signature. File may be corrupted or not a real image.',
      }
    }

    // Validate dimensions
    const blob = new Blob([bytes], { type: mimeType })
    const img = await createImageBitmap(blob)
    if (img.width > MAX_IMAGE_DIMENSIONS.width || img.height > MAX_IMAGE_DIMENSIONS.height) {
      return {
        valid: false,
        error: `Image dimensions too large. Maximum: ${MAX_IMAGE_DIMENSIONS.width}x${MAX_IMAGE_DIMENSIONS.height}px`,
      }
    }

    return { valid: true }
  } catch {
    return {
      valid: false,
      error: 'Failed to validate image data',
    }
  }
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
