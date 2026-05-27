# Richmond CSV Import System

## Overview

Complete implementation of CSV/Excel upload system for importing Richmond markbook data into MaestraAI.

## User Flow

1. **Navigate to Import**
   - From Richmond dashboard → click "Importar CSV" button
   - Redirects to `/richmond/subir`

2. **Upload File**
   - Drag-and-drop or click to select file
   - Accepts: CSV, XLS, XLSX (max 5MB)
   - File validation with error messages

3. **Preview Data**
   - System parses file and matches students
   - Shows breakdown:
     - Total students and assignments found
     - Matched students (linked to existing records)
     - Unmatched students (will import but not linked)
     - Group-by-group breakdown
   - Teacher can review before confirming

4. **Import**
   - Click "Importar" button
   - System creates assignments and links to matched students
   - Creates sync log entries
   - Redirects to Richmond dashboard on success

## Technical Implementation

### Files Created

**Backend:**

- `lib/richmond/csv-parser.ts` - Core parsing logic
  - `parseRichmondCSV()` - Parse CSV/XLSX files
  - `matchStudents()` - Fuzzy name matching with Levenshtein distance
  - Flexible column detection (supports multiple header formats)
- `app/api/richmond/parse-csv/route.ts` - Upload & parse endpoint
  - File validation (type, size)
  - CSV parsing
  - Student matching across teacher's groups
  - Returns preview data
- `app/api/richmond/import-batch/route.ts` - Batch import endpoint
  - Zod validation
  - Transaction handling
  - Creates assignments and scores
  - Updates sync logs

**Frontend:**

- `app/(main)/richmond/subir/page.tsx` - Upload UI
  - Drag-and-drop file upload
  - File validation
  - Preview screen with stats
  - Error handling

**Tests:**

- `lib/richmond/__tests__/csv-parser.test.ts` - Unit tests
  - Exact name matching
  - Fuzzy matching
  - No match scenarios
  - First name fallback

### Dependencies Added

- `fastest-levenshtein` - For fuzzy string matching
- `xlsx` - Already installed, used for Excel parsing

### Database Integration

Uses existing tables:

- `richmond_assignments` - Stores assignment records
- `richmond_scores` - Stores individual student submissions
- `richmond_sync_log` - Logs import operations
- `students` - Matches against existing student records

## Fuzzy Matching Algorithm

The system uses Levenshtein distance to match student names:

1. **Full name comparison** - Compares entire name string
2. **First name fallback** - If full name doesn't match, tries first name only
3. **Confidence threshold** - Requires >60% confidence to create match
4. **Best match selection** - Chooses highest confidence match per student

Examples:

- "Luis Fernando Dominguez" → "Luis Fernando Dominguez" (exact, 100%)
- "Luis F Dominguez" → "Luis Fernando Dominguez" (fuzzy, ~80%)
- "Sofia Martinez" → "Sofia Martinez Lopez" (partial, ~75%)

## Error Handling

- Invalid file types → User-friendly error message
- File too large → Size limit warning
- Missing student column → Column detection error
- No groups found → Setup instruction
- Import failures → Per-assignment error tracking

## Testing

All tests passing:

```bash
npm test lib/richmond/__tests__/csv-parser.test.ts
# 4 tests passed
```

## Next Steps (Optional Enhancements)

- Manual student linking for unmatched names
- CSV template download
- Import history view
- Bulk edit imported assignments
- Support for group detection from CSV

## Usage Example

Teacher workflow:

1. Download markbook from Richmond LP
2. Go to MaestraAI → Richmond dashboard
3. Click "Importar CSV"
4. Upload downloaded file
5. Review preview showing matched students
6. Click "Importar" to complete
7. View imported assignments in dashboard
