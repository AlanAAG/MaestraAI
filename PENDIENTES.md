# Pendientes — MaestraAI

## Credenciales requeridas para producción

El archivo `.env.local` ya existe en el proyecto. Antes de hacer deploy a producción, verificar que contenga:

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key de Supabase (NUNCA exponer al cliente)
- `ANTHROPIC_API_KEY` — API key de Claude/Anthropic
- `ENCRYPTION_KEY` — 64 caracteres hexadecimales para AES-256-GCM (generar con: `openssl rand -hex 32`)
- `NEXT_PUBLIC_APP_URL` — URL de producción del app principal (ej: https://maestraai.mx)
- `NEXT_PUBLIC_DIARY_URL` — URL de producción del diary (ej: https://diario.maestraai.mx)
- `NEXT_PUBLIC_FORCE_DIARY_SITE` — `true` para testing local del diary site

## Tareas de deploy

1. **Supabase**: ejecutar migraciones en orden (001 → 005) en SQL Editor
2. **Supabase**: ejecutar `seed.sql` para vocabulary_items
3. **Vercel**: configurar variables de entorno
4. **Vercel**: configurar dominio custom + subdomain diario.\*
5. **Supabase**: verificar RLS policies activas en todas las tablas

## Datos de seed inicial (Alejandra García - piloto)

Ya definidos en `seed.sql`:

- School: "Escuela Americana", CDMX
- Teacher: Alejandra García (requiere auth_id después de registro)
- Group A: "Preprimaria A", Kinder 3, ciclo 2025-2026
- Richmond class_code Group A: VZU5DHSH, UUID: dcdb1c33-cb61-4822-a05b-32202df8ece4
- Group A: 12 alumnos
- Group B: "Preprimaria B", Kinder 3, ciclo 2025-2026
- Richmond class_code Group B: XWAMCC4Y, UUID: dcdb1c33-cb61-4822-a05b-32202df8ece4
- Group B: 13 alumnos

## Decisiones de arquitectura pendientes

Ninguna por ahora — stack definido en CLAUDE.md
