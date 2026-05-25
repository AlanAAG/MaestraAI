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
('91000000-0000-0000-0000-000000000001', 'Aitana R.',      'Aitana',           'Ruiz Olvera',        'ee50bed5-5428-4775-b7e3-3278d47d976b', TRUE,  'lunes'),
('91000000-0000-0000-0000-000000000001', 'Carlos S.',      'Carlos Santiago',  'Ramirez Mendoza',    '62a48151-8dad-42a2-aea0-0b3ea8040d11', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Dylan Y.',       'Dylan Yamil',      'Perez Valadez',      '8767f9c7-c370-4501-9713-d194b842039a', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Emilia G.',      'Emilia',           'Gallegos Espinoza',  '5cff0002-f010-48e5-a415-3447cb56c7bd', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Giovanna T.',    'Giovanna',         'Thacker Arreguin',   'cab43cb1-7f53-4b92-b7b8-76349766f411', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Guillermo G.',   'Guillermo',        'Garcia Hernandez',   '11df356f-9e2e-4448-858a-112c8408d376', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Gustavo S.',     'Gustavo',          'Santos Millan',      'd746a546-1064-4176-9918-b204d34a98ae', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Luis F.',        'Luis Fernando',    'Davila Vieyra',      'c26241c0-cf73-4af7-9100-bf28e57fedd5', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Maria R.',       'Maria Regina',     'Lopez Huitron',      '633cc8e9-6768-4c91-b34f-4e307fb52c48', TRUE,  'martes'),
('91000000-0000-0000-0000-000000000001', 'Priscila N.',    'Priscila Nicole',  'Limon Tadeo',        '96077f32-d46e-4ed6-8959-79129c51dea0', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Samuel E.',      'Samuel Enrique',   'Godinez Zambrano',   '6c273f6d-814c-46c1-bed0-be684dcebf77', FALSE, NULL),
('91000000-0000-0000-0000-000000000001', 'Thiago J.',      'Thiago',           'Juarez Guzman',      '28f78d00-fbdc-4791-8cbd-92ae8994c954', FALSE, NULL);

-- ============================================================
-- BLOCK 4: Students — Grupo B (12 alumnos)
-- ============================================================
INSERT INTO students (
  group_id, display_name,
  first_name_encrypted, last_name_encrypted,
  richmond_student_id, has_nee, observation_day
) VALUES
('92000000-0000-0000-0000-000000000002', 'Aranza G.',        'Aranza',                 'Gonzalez Camacho',         'bc3819f7-29a4-42ef-856f-c785ecf958a5', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Alejandra T.',     'Alejandra',              'Tovar Diaz',               'fa353a03-d455-45cc-bfc1-e02c6da21e45', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Alexa R.',         'Alexa Rafaella',         'Gonzalez Herrera',         '8f2ed79b-0d2e-4b74-b807-d88e34b9f795', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Cristopher M.',    'Cristopher Antonio',     'Martinez Garcia',          'd045b17f-b889-4a7a-88ed-430f7e336e03', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Julian S.',        'Julian Alfredo',         'Sanchez Gonzalez',         '6efc2553-c1bc-4952-8d1f-59dfd17e1dee', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Liam D.',          'Liam Leandro',           'Diaz Martinez',            '81efe57e-f9ee-4cd8-9811-8569b9e71584', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Maciel B.',        'Maciel Alexander',       'Benitez Hernandez',        '0e9321a0-6de2-41f5-ab40-6e6ba139684d', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Maria R.',         'Maria De Los Milagros',  'Ruiz Velasco Berroca',     'f73ba68a-b18d-49fb-aa9d-7a86efa591a2', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Rodrigo P.',       'Rodrigo',                'Pina Lopez',               'a04216a7-f2c7-4097-9a95-afdd005edd11', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Regina T.',        'Regina Sofia',           'Tapia Ramirez',            '643ac682-e4da-4ef9-a073-774b9112b688', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Santiago V.',      'Santiago',               'Velazquez Huete',          'a8acd717-4dbc-481b-b81c-4d411075fcbc', FALSE, NULL),
('92000000-0000-0000-0000-000000000002', 'Thiago M.',        'Thiago Matias',          'Madrigal Garcia',          'd29ca14a-850d-488d-a32c-1fedaeb6f2dc', FALSE, NULL);
