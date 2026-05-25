Pendientes — MaestraAI
Variables de entorno (.env.local + Vercel)
Variable Descripción
NEXT_PUBLIC_SUPABASE_URL URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY Anon key de Supabase
SUPABASE_SERVICE_ROLE_KEY Service role key (NUNCA al cliente)
ANTHROPIC_API_KEY API key de Claude/Anthropic
ENCRYPTION_KEY 64 hex chars para AES-256-GCM (openssl rand -hex 32)
RICHMOND_ENCRYPTION_KEY Igual formato, para cifrar session cookie de Richmond
RICHMOND_INGEST_TOKEN Token estático para la Chrome Extension (openssl rand -hex 32)
NEXT_PUBLIC_APP_URL https://maestraai.mx
NEXT_PUBLIC_DIARY_URL https://diario.maestraai.mx
NEXT_PUBLIC_FORCE_DIARY_SITE true solo en local — NO agregar a Vercel
Tareas completadas ✅
Migraciones 001-005 corridas en Supabase SQL Editor

seed.sql (vocabulary_items + school) corrido

Variables de entorno en Vercel configuradas

Dominio custom + subdomain diario.\* configurado en Vercel

RLS policies verificadas

Próximo paso para Fase 1: correr migraciones y seeds
1. Correr migración 006_richmond_sync.sql en Supabase SQL Editor
   - Tablas: richmond_credentials, richmond_sync_log, richmond_assignments, richmond_scores
   
2. Regenerar tipos TypeScript después de la migración:
   ```
   supabase gen types typescript --local > types/database.ts
   ```
   IMPORTANTE: Los archivos API de Richmond usan `as any` temporalmente hasta que se regeneren los tipos.

3. Correr seed_step2.sql en Supabase SQL Editor (cada bloque por separado):

BLOCK 1 — Inserta a Alejandra como teacher

Ya tiene su auth UUID: 4acb9c3c-f9fa-4520-be97-0cf1b19d1928

Correr primero

BLOCK 2 — Inserta los 2 grupos con los UUIDs correctos de Richmond

Grupo A course_module_uuid: d46760b9-d435-4561-89f1-74c490ca790e

Grupo B course_module_uuid: 5cdf2913-61e2-4893-8b11-d9fa03ff0bed

BLOCK 3 — Inserta los 12 alumnos del Grupo A

Aitana y Giovanna ya tienen su richmond_student_id confirmado del JSON

Los demás tienen NULL — se poblarán automáticamente en el primer sync

BLOCK 4 — Grupo B pendiente

Descomenta y agrega los 13 nombres cuando Alejandra los proporcione

Migration 006 — Correr 006_richmond_sync.sql para las tablas de sync

Tablas: richmond_credentials, richmond_sync_log, richmond_assignments, richmond_scores

Datos de referencia — Richmond API
Grupo A (Preprimaria A)
Class code: VZU5DHSH

course_module UUID: d46760b9-d435-4561-89f1-74c490ca790e

group_id (averages report): 2fabaa09-4c1f-440c-bf17-c8c0c50c82e2

Course slug: grupo-aca6e

Assignment scores p1: GET /api/course_modules/d46760b9-d435-4561-89f1-74c490ca790e/assignment_scores.json?include=students&filter[is_test]=false

Assignment scores p2: mismo URL con &page=2

Averages: GET /api/v2/reports/averages_scores_report?group_id=2fabaa09-4c1f-440c-bf17-c8c0c50c82e2&filter[date_range_from]=21/07/2025&filter[date_range_to]={HOY}

Grupo B (Preprimaria B)
Class code: XWAMCC4Y

course_module UUID: 5cdf2913-61e2-4893-8b11-d9fa03ff0bed

group_id (averages report): a36708db-16b9-4805-9764-20c7984ad9a5

Course slug: grupo-b01f6

Assignment scores p1: GET /api/course_modules/5cdf2913-61e2-4893-8b11-d9fa03ff0bed/assignment_scores.json?include=students&filter[is_test]=false

Assignment scores p2: mismo URL con &page=2

Averages: GET /api/v2/reports/averages_scores_report?group_id=a36708db-16b9-4805-9764-20c7984ad9a5&filter[date_range_from]=21/07/2025&filter[date_range_to]={HOY}

Estructura JSON confirmada (assignment_scores response)
json
[
{
"id": "8c8b725c-...", // richmond_id → richmond_assignments.richmond_id
"title": "LISTEN, SING...", // → title
"instructions": "...", // → instructions
"start_date": "2025-09-17T00:00:00.000Z", // → assigned_at
"end_date": "2025-09-18T23:59:00.000Z", // → due_at
"total_students": 12, // → total_students
"total_submitted": 11, // → total_submitted
"score": "90.18...", // → class_avg_score
"progress": "started",
"is_test": false,
"due": true,
"students": [
{
"id": "13142822-...", // → richmond_scores.richmond_student_id
"first_name": "AITANA", // para matching con students.first_name_encrypted
"last_name": "RUIZ OLVERA",
"progress": "completed", // → richmond_scores.progress
"total_score": "100.0", // → richmond_scores.total_score (null = no entregado)
"done": true // → richmond_scores.done
}
]
}
]
total_score: null + progress: "not_started" = alumno no entregó la tarea.
Auth: cookie \_unity_web_session — caduca por inactividad (~2h) o absoluta (~1 semana).
En 302/401 → marcar sesión expirada en DB y notificar a Alejandra.

Decisiones de arquitectura pendientes
Nombres de los 13 alumnos del Grupo B (Alejandra los tiene) -> tambien los puedes encontrar en el body del Fetch/XHR

Richmond student IDs de los 10 alumnos del Grupo A sin ID (se poblan en primer sync) -> tambien los puedes encontrar en el body del Fetch/XHR

De igual forma los archivos 006_richmond_sync.sql y seed_step2.sql no se han corrido ya que tu tienes que validar que esten correctos, después los correré.
