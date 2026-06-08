-- supabase/seed.sql
-- Run AFTER migrations 001-004 using Supabase SQL Editor with service role.
-- The vocabulary INSERT runs immediately. Teacher/group/student INSERTs are
-- commented out — follow inline instructions once you have auth UIDs.

INSERT INTO schools (id, name, state, plan) VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Escuela Americana', 'Ciudad de México', 'free');

-- STEP: Create Alejandra's auth account in Supabase Auth dashboard,
-- copy her UUID, then uncomment and run the following:

-- INSERT INTO teachers (id, auth_id, school_id, full_name, email, role) VALUES
--   ('t1000000-0000-0000-0000-000000000001', 'YOUR-AUTH-UUID-HERE',
--    'a1b2c3d4-0000-0000-0000-000000000001', 'Alejandra Garcia',
--    'alejandra@escuelamericana.mx', 'titular');

-- INSERT INTO groups (id, school_id, titular_teacher_id, name, grade, academic_year, richmond_class_code) VALUES
--   ('g1000000-0000-0000-0000-000000000001',
--    'a1b2c3d4-0000-0000-0000-000000000001',
--    't1000000-0000-0000-0000-000000000001',
--    'Preprimaria A', 'Kinder 3', '2025-2026', 'VZU5DHSH');

-- INSERT INTO students (group_id, display_name, first_name_encrypted, last_name_encrypted, has_nee, observation_day) VALUES
--   ('g1000000-0000-0000-0000-000000000001', 'Aitana R.', 'Aitana', 'Ruiz Olvera', TRUE, 'lunes'),
--   ('g1000000-0000-0000-0000-000000000001', 'Carlos S.', 'Carlos Santiago', 'Ramirez Mendoza', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Dylan Y.', 'Dylan Yamil', 'Perez Valadez', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Emilia G.', 'Emilia', 'Gallegos Espinoza', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Giovanna T.', 'Giovanna', 'Thacker Arreguin', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Guillermo G.', 'Guillermo', 'Garcia Hernandez', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Gustavo S.', 'Gustavo', 'Santos Millan', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Luis F.', 'Luis Fernando', 'Davila Vieyra', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Maria R.', 'Maria Regina', 'Lopez Huitron', TRUE, 'martes'),
--   ('g1000000-0000-0000-0000-000000000001', 'Priscila N.', 'Priscila Nicole', 'Limon Tadeo', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Samuel E.', 'Samuel Enrique', 'Godinez Zambrano', FALSE, NULL),
--   ('g1000000-0000-0000-0000-000000000001', 'Thiago J.', 'Thiago', 'Juarez Guzman', FALSE, NULL);

-- 129 vocabulary items (A-Z, Fly High Pre-Primary official words)
-- color values match API enum: blue | yellow | red | green | purple | pink | orange
INSERT INTO vocabulary_items (letter, word, color) VALUES
  ('A','astronaut','blue'), ('A','ape','yellow'),
  ('A','apple','red'), ('A','ant','green'),
  ('A','arrow','purple'),
  ('B','ball','blue'), ('B','baby','yellow'),
  ('B','book','red'), ('B','bird','green'),
  ('B','bus','purple'),
  ('C','car','blue'), ('C','carrot','yellow'),
  ('C','crocodile','red'), ('C','cat','green'),
  ('C','crayon','purple'),
  ('D','dog','blue'), ('D','doctor','yellow'),
  ('D','duck','red'), ('D','dinner','green'),
  ('D','dinosaur','purple'),
  ('E','egg','blue'), ('E','elbow','yellow'),
  ('E','elephant','red'), ('E','elf','green'),
  ('E','emperor','purple'),
  ('F','frog','blue'), ('F','farmer','yellow'),
  ('F','fish','red'), ('F','family','green'),
  ('F','football','purple'),
  ('G','girl','blue'), ('G','goat','yellow'),
  ('G','goose','red'), ('G','green','green'),
  ('G','guitar','purple'),
  ('H','hat','blue'), ('H','horse','yellow'),
  ('H','hippo','red'), ('H','hands','green'),
  ('H','hero','purple'),
  ('I','insects','blue'), ('I','igloo','yellow'),
  ('I','internet','red'), ('I','ink','green'),
  ('I','imagination','purple'),
  ('J','jacket','blue'), ('J','jar','yellow'),
  ('J','jelly','red'), ('J','juice','green'),
  ('J','jump','purple'),
  ('K','kite','blue'), ('K','koala','yellow'),
  ('K','kangaroo','red'), ('K','kids','green'),
  ('K','key','purple'),
  ('L','lion','blue'), ('L','ladder','yellow'),
  ('L','lamb','red'), ('L','lollypop','green'),
  ('L','lemon','purple'),
  ('M','music','blue'), ('M','magic','yellow'),
  ('M','milk','red'), ('M','monkey','green'),
  ('M','monster','purple'),
  ('N','nose','blue'), ('N','nine','yellow'),
  ('N','nest','red'), ('N','nap','green'),
  ('N','nachos','purple'),
  ('O','orange','blue'), ('O','octopus','yellow'),
  ('O','ox','red'), ('O','old','green'),
  ('O','otter','purple'),
  ('P','pig','blue'), ('P','pirate','yellow'),
  ('P','pineapple','red'), ('P','puppy','green'),
  ('P','popcorn','purple'),
  ('Q','queen','blue'), ('Q','question','yellow'),
  ('Q','quick','red'), ('Q','quiet','green'),
  ('R','red','blue'), ('R','rainbow','yellow'),
  ('R','run','red'), ('R','robot','green'),
  ('R','rose','purple'),
  ('S','snake','blue'), ('S','summer','yellow'),
  ('S','sock','red'), ('S','swing','green'),
  ('S','sister','purple'),
  ('T','truck','blue'), ('T','train','yellow'),
  ('T','triangle','red'), ('T','toys','green'),
  ('T','tiger','purple'),
  ('U','up','blue'), ('U','uniform','yellow'),
  ('U','ugly','red'), ('U','umbrella','green'),
  ('U','uncle','purple'),
  ('V','van','blue'), ('V','Venus','yellow'),
  ('V','vegetables','red'), ('V','violin','green'),
  ('V','volcano','purple'),
  ('W','walk','blue'), ('W','window','yellow'),
  ('W','watermelon','red'), ('W','wand','green'),
  ('W','water','purple'),
  ('X','saxophone','blue'), ('X','fox','yellow'),
  ('X','taxi','red'), ('X','galaxy','green'),
  ('X','box','purple'),
  ('Y','yes','blue'), ('Y','yo-yo','yellow'),
  ('Y','yellow','red'), ('Y','yard','green'),
  ('Y','yoga','purple'),
  ('Z','zoo','blue'), ('Z','zebra','yellow'),
  ('Z','zucchini','red'), ('Z','zip','green'),
  ('Z','zig-zag','purple');
