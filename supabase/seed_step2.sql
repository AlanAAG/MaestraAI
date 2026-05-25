-- seed_step2.sql
-- Run AFTER creating Alejandra's auth account in Supabase Auth dashboard.
-- Auth UUID: 4acb9c3c-f9fa-4520-be97-0cf1b19d1928
-- Run each block separately in SQL Editor.

-- ============================================================
-- BLOCK 1: Teacher
-- ============================================================
INSERT INTO teachers (
  id, auth_id, school_id, full_name, email, role
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '4acb9c3c-f9fa-4520-be97-0cf1b19d1928',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Alejandra Garcia',
  'alejandra@escuelamericana.mx',
  'titular'
);

-- ============================================================
-- BLOCK 2: Groups (with correct Richmond UUIDs)
-- ============================================================
INSERT INTO groups (
  id, school_id, titular_teacher_id, name, grade,
  academic_year, richmond_class_code, richmond_course_module_uuid
) VALUES
(
  '91000000-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Preprimaria A', 'Kinder 3', '2025-2026',
  'VZU5DHSH',
  'd46760b9-d435-4561-89f1-74c490ca790e'  -- course_module UUID for assignment_scores
),
(
  '92000000-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Preprimaria B', 'Kinder 3', '2025-2026',
  'XWAMCC4Y',
  '5cdf2913-61e2-4893-8b11-d9fa03ff0bed'  -- course_module UUID for assignment_scores
);

-- ============================================================
-- BLOCK 3: Students — Grupo A (12 alumnos)
-- NOTE: first_name_encrypted and last_name_encrypted should be
-- AES-256-GCM encrypted in production. For seed/pilot use plain text.
-- ============================================================
INSERT INTO students (
  group_id, display_name,
  first_name_encrypted, last_name_encrypted,
  richmond_student_id, has_nee, observation_day
) VALUES
('91000000-0000-0000-0000-000000000001', 'Aitana R.',      'Aitana',           'Ruiz Olvera',        '13142822-4676-4586-bf8c-80dc223492f8', TRUE,  'lunes'),
('91000000-0000-0000-0000-000000000001', 'Carlos S.',      'Carlos Santiago',  'Ramirez Mendoza',    NULL,                                  FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Dylan Y.',       'Dylan Yamil',      'Perez Valadez',      NULL,                                  FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Emilia G.',      'Emilia',           'Gallegos Espinoza',  NULL,                                  FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Giovanna T.',    'Giovanna',         'Thacker Arreguin',   'a09b474e-e1a1-4d4e-bf8f-81bb9d8cd7c8', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Guillermo G.',   'Guillermo',        'Garcia Hernandez',   NULL,                                  FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Gustavo S.',     'Gustavo',          'Santos Millan',      NULL,                                  FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Luis F.',        'Luis Fernando',    'Davila Vieyra',      NULL,                                  FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Maria R.',       'Maria Regina',     'Lopez Huitron',      NULL,                                  TRUE,  'martes'),
('91000000-0000-0000-0000-000000000001', 'Priscila N.',    'Priscila Nicole',  'Limon Tadeo',        NULL,                                  FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Samuel E.',      'Samuel Enrique',   'Godinez Zambrano',   NULL,                                  FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Thiago J.',      'Thiago',           'Juarez Guzman',      NULL,                                  FALSE, NULL);

-- ============================================================
-- BLOCK 4: Students — Grupo B (13 alumnos)
-- Nombres pendientes — reemplaza con los nombres reales de Alejandra
-- ============================================================
-- INSERT INTO students (group_id, display_name, first_name_encrypted, last_name_encrypted, has_nee)
-- VALUES
-- ('92000000-0000-0000-0000-000000000002', 'Alumno 1', '...', '...', FALSE),
-- ... (13 rows)
-- Descomenta y completa cuando Alejandra proporcione la lista del Grupo B
