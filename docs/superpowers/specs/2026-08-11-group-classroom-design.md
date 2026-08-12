# Group Classroom (anuncios + tareas por grupo) — Design

**Date:** 2026-08-11 · **Status:** approved by Alan

**Goal:** a Google-Classroom-style space per group: the teacher posts announcements and tareas (assigning existing materials), every post is emailed automatically to each child's saved family emails, and parents see the feed in /familia.

## 1. Data — migration 074

- `group_posts`: `id, teacher_id → teachers, group_id → groups, kind check in ('anuncio','tarea'), title (≤200), body (≤5000, nullable), material_id → materials nullable (tarea), due_date date nullable, created_at`. RLS: teacher FOR ALL (owner); parent SELECT when they hold a claimed, unrevoked `parent_link` to a student of that group.
- `group_post_emails`: `post_id → group_posts cascade, sent int, total int, created_at`. Teacher SELECT; written server-side. Shows "enviado a N de M familias"; one row per send.

## 2. Teacher UI

- `/grupos`: one card per active group (name, grade, student count) → `/grupos/[id]`.
- `/grupos/[id]`: composer on top — tabs Anuncio | Tarea. Tarea adds: material picker (teacher's materials, newest first, shows type + title) and optional due date. Publicar = save + emails sent automatically; feedback line "Enviado a N de M familias". Feed below, newest first, each post shows kind badge, date, body, material link, email count; delete button.

## 3. Emails (Resend, existing)

Recipients per group, deduped case-insensitively: decrypted `students.parent_contact_encrypted` that look like emails (the field holds phone OR email; only emails are used) + `parent_links.invite_email_encrypted` of non-revoked links for students of the group. One email per address: subject = post title, body = post body + (tarea) link to `/jugar/<play_token>` + due date + button to `/familia`. Best-effort per address; totals logged to `group_post_emails`. From `notificaciones@maestraia.com`, replyTo teacher.

## 4. /familia

Per child: new "Anuncios y tareas" section — the child's group feed (service-role fetch scoped by verified parent_links, same pattern as the rest of the page). Tareas show the material with Jugar button and, when the child's game profile is linked, **Entregado/Pendiente**: entregado = any `game_plays` row for that material by the child's profiles with `passed !== false` (i.e. passed true, or no threshold set).

## Out of scope (v1)

Parent comments/replies, arbitrary file attachments, calendar view, manual turn-ins, per-student targeting, editing posts (delete + repost instead).

## Testing

Pure helpers unit-tested: recipient merge/dedup/email-detection; tarea delivery status logic. Existing suite stays green.
