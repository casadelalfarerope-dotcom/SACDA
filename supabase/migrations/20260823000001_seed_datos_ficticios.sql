-- ============================================================
-- SACDA — Datos ficticios para pruebas
-- Fecha base: 2026-08-23
-- ============================================================

-- ------------------------------------------------------------
-- PERSONAS
-- ------------------------------------------------------------
INSERT INTO personas (id, nombre_completo, dni, fecha_nacimiento, telefono, email, ministerio, estado, notas) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Miguel Ángel Paredes Salas',      '41234567', '1980-12-08', '987654321', 'miguel.paredes@example.com',   'Predicación',   'activo', 'Pastor principal'),
  ('a1000000-0000-0000-0000-000000000002', 'Juan Carlos Mendoza Ríos',        '45678912', '1985-03-15', '976543210', 'juan.mendoza@example.com',     'Alabanza',      'activo', 'Líder de alabanza'),
  ('a1000000-0000-0000-0000-000000000003', 'María Elena Gutiérrez Torres',    '52341678', '1992-08-28', '965432109', 'maria.gutierrez@example.com',  'Diseño Gráfico','activo', 'Cumpleaños próximo'),
  ('a1000000-0000-0000-0000-000000000004', 'Pedro Pablo Sánchez Vega',        '48923145', '1988-11-22', '954321098', 'pedro.sanchez@example.com',    'Multimedia',    'activo', NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Ana Lucía Flores Castillo',       '61234578', '1995-04-10', '943210987', 'ana.flores@example.com',       'Jóvenes',       'activo', NULL),
  ('a1000000-0000-0000-0000-000000000006', 'Roberto Carlos Díaz Paredes',     '43215678', '1982-07-07', '932109876', 'roberto.diaz@example.com',     'Multimedia',    'activo', 'Encargado de sonido'),
  ('a1000000-0000-0000-0000-000000000007', 'Carmen Rosa López Huamaní',       '55678234', '1990-09-14', '921098765', 'carmen.lopez@example.com',     'Damas',         'activo', NULL),
  ('a1000000-0000-0000-0000-000000000008', 'Luis Alberto Ramírez Quispe',     '38765432', '1978-02-20', '910987654', 'luis.ramirez@example.com',     'Liderazgo',     'activo', 'Tesorero'),
  ('a1000000-0000-0000-0000-000000000009', 'Diego Alejandro Vargas Castro',   '72345678', '2001-08-25', '909876543', 'diego.vargas@example.com',     'Multimedia',    'activo', 'Cumpleaños en 2 días'),
  ('a1000000-0000-0000-0000-000000000010', 'Silvia Beatriz Mendoza Palomino', '49123456', '1987-01-18', '998765432', 'silvia.mendoza@example.com',   'Alabanza',      'activo', NULL),
  ('a1000000-0000-0000-0000-000000000011', 'Jorge Manuel Huanca Apaza',       '34567891', '1975-10-30', '987654320', 'jorge.huanca@example.com',     'Acomodadores',  'activo', NULL),
  ('a1000000-0000-0000-0000-000000000012', 'Lucía del Pilar Ccopa Quispe',    '58234567', '1993-06-25', '976543209', 'lucia.ccopa@example.com',      'Niños',         'activo', NULL),
  ('a1000000-0000-0000-0000-000000000013', 'Rosa Elvira Mamani Condori',      '63456789', '1996-03-22', '965432108', 'rosa.mamani@example.com',      'Damas',         'activo', NULL),
  ('a1000000-0000-0000-0000-000000000014', 'Gonzalo Ernesto Pinto Vilca',     '47890123', '1986-08-31', '954321097', 'gonzalo.pinto@example.com',    'Multimedia',    'activo', 'Cumpleaños en 8 días'),
  ('a1000000-0000-0000-0000-000000000015', 'Vanessa Paola Ríos Aguilar',      '71234567', '2000-09-05', '943210986', 'vanessa.rios@example.com',     'Alabanza',      'activo', NULL),
  ('a1000000-0000-0000-0000-000000000016', 'Fernando José Salinas Herrera',   '44567891', '1983-04-17', '932109875', 'fernando.salinas@example.com', 'Multimedia',    'activo', 'Transmisión en vivo'),
  ('a1000000-0000-0000-0000-000000000017', 'Claudia Milagros Chávez Reyes',   '59876543', '1994-11-11', '921098764', 'claudia.chavez@example.com',   'Diseño Gráfico','activo', NULL),
  ('a1000000-0000-0000-0000-000000000018', 'Alexis David Quispe Mamani',      '73456789', '2002-07-20', '910987653', 'alexis.quispe@example.com',    'Limpieza',      'activo', NULL),
  ('a1000000-0000-0000-0000-000000000019', 'Noemí Esperanza Villanueva Cruz', '65678901', '1998-01-29', '909876542', 'noemi.villanueva@example.com', 'Jóvenes',       'activo', NULL),
  ('a1000000-0000-0000-0000-000000000020', 'Isaías Renato Flores Paredes',    '80123456', '2003-08-26', '998765431', 'isaias.flores@example.com',    'Jóvenes',       'visita', 'Primera visita 20-ago-2026');

-- ------------------------------------------------------------
-- ROLES ASIGNADOS
-- ------------------------------------------------------------
INSERT INTO roles_asignados (persona_id, rol_id, activo)
SELECT 'a1000000-0000-0000-0000-000000000001', id, true FROM roles WHERE nombre = 'pastor'
ON CONFLICT DO NOTHING;

INSERT INTO roles_asignados (persona_id, rol_id, activo)
SELECT 'a1000000-0000-0000-0000-000000000001', id, true FROM roles WHERE nombre = 'administrador'
ON CONFLICT DO NOTHING;

INSERT INTO roles_asignados (persona_id, rol_id, activo)
SELECT 'a1000000-0000-0000-0000-000000000008', id, true FROM roles WHERE nombre = 'tesorero'
ON CONFLICT DO NOTHING;

INSERT INTO roles_asignados (persona_id, rol_id, activo)
SELECT 'a1000000-0000-0000-0000-000000000002', id, true FROM roles WHERE nombre = 'lider'
ON CONFLICT DO NOTHING;

INSERT INTO roles_asignados (persona_id, rol_id, activo)
SELECT 'a1000000-0000-0000-0000-000000000004', id, true FROM roles WHERE nombre = 'multimedia'
ON CONFLICT DO NOTHING;

INSERT INTO roles_asignados (persona_id, rol_id, activo)
SELECT 'a1000000-0000-0000-0000-000000000003', id, true FROM roles WHERE nombre = 'diseniador'
ON CONFLICT DO NOTHING;

INSERT INTO roles_asignados (persona_id, rol_id, activo)
SELECT 'a1000000-0000-0000-0000-000000000017', id, true FROM roles WHERE nombre = 'diseniador'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- GRUPO_MIEMBROS
-- ------------------------------------------------------------
INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000002', 'Líder'
FROM grupos g WHERE g.nombre = 'Ministerio de Alabanza'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000010', 'Vocalista'
FROM grupos g WHERE g.nombre = 'Ministerio de Alabanza'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000015', 'Vocalista'
FROM grupos g WHERE g.nombre = 'Ministerio de Alabanza'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000004', 'Operador'
FROM grupos g WHERE g.nombre = 'Multimedia'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000006', 'Sonido'
FROM grupos g WHERE g.nombre = 'Multimedia'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000016', 'Transmisión'
FROM grupos g WHERE g.nombre = 'Multimedia'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000014', 'Cámaras'
FROM grupos g WHERE g.nombre = 'Multimedia'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000003', 'Diseñadora'
FROM grupos g WHERE g.nombre = 'Diseño Gráfico'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000017', 'Diseñadora'
FROM grupos g WHERE g.nombre = 'Diseño Gráfico'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000005', 'Líder'
FROM grupos g WHERE g.nombre = 'Ministerio de Jóvenes'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000019', 'Miembro'
FROM grupos g WHERE g.nombre = 'Ministerio de Jóvenes'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000009', 'Miembro'
FROM grupos g WHERE g.nombre = 'Ministerio de Jóvenes'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000012', 'Maestra'
FROM grupos g WHERE g.nombre = 'Ministerio de Niños'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000011', 'Coordinador'
FROM grupos g WHERE g.nombre = 'Limpieza'
ON CONFLICT DO NOTHING;

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo)
SELECT g.id, 'a1000000-0000-0000-0000-000000000018', 'Miembro'
FROM grupos g WHERE g.nombre = 'Limpieza'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- SEGUIMIENTO DE VISITAS
-- ------------------------------------------------------------
INSERT INTO seguimiento_visitas (persona_id, fecha_primera_visita, volvio, estado, notas)
VALUES ('a1000000-0000-0000-0000-000000000020', '2026-08-20', false, 'pendiente',
        'Vino con Vanessa Ríos. Mostró interés en el grupo de jóvenes.');

-- ------------------------------------------------------------
-- CEREMONIAS
-- ------------------------------------------------------------
INSERT INTO ceremonias (id, tipo, fecha, descripcion, officiante) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'bautismo',   '2026-07-20', 'Bautismo de hermanos nuevos',            'Hno. Miguel Paredes'),
  ('c1000000-0000-0000-0000-000000000002', 'dedicacion', '2026-06-01', 'Dedicación de bebé — familia Gutiérrez', 'Hno. Miguel Paredes'),
  ('c1000000-0000-0000-0000-000000000003', 'boda',       '2026-05-15', 'Matrimonio bendecido en iglesia',        'Hno. Miguel Paredes');

INSERT INTO ceremonia_personas (ceremonia_id, persona_id, rol_en_ceremonia) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000019', 'bautizado'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', 'bautizado');

-- ------------------------------------------------------------
-- EVENTOS ADICIONALES
-- (Culto Viernes, Culto Domingo y Santa Cena ya fueron insertados
--  por la migración de fase 2 — aquí solo se agregan los nuevos)
-- ------------------------------------------------------------
INSERT INTO eventos (id, titulo, tipo, tipo_recurrencia, dias_semana, fecha_inicio_serie, hora_inicio, hora_fin, lugar) VALUES
  ('e1000000-0000-0000-0000-000000000003',
   'Reunión de Jóvenes', 'servicio', 'semanal',
   ARRAY['sabado'], '2026-01-03', '17:00', '19:30', 'Salón de jóvenes');

INSERT INTO eventos (id, titulo, tipo, tipo_recurrencia, fecha_unica, hora_inicio, hora_fin, lugar) VALUES
  ('e1000000-0000-0000-0000-000000000005',
   'Conferencia Anual 2026', 'evento_unico', 'ninguna',
   '2026-09-12', '09:00', '21:00', 'Centro de Convenciones');

-- ------------------------------------------------------------
-- PROGRAMAS DE SERVIDORES
-- ------------------------------------------------------------
INSERT INTO programas (id, fecha, titulo, estado, notas) VALUES
  ('p1000000-0000-0000-0000-000000000001', '2026-08-24', 'Programa — Culto Domingo 24 de agosto', 'publicado', 'Tema: Fe que mueve montañas'),
  ('p1000000-0000-0000-0000-000000000002', '2026-08-28', 'Programa — Culto Viernes 28 de agosto', 'publicado', NULL),
  ('p1000000-0000-0000-0000-000000000003', '2026-08-31', 'Programa — Culto Domingo 31 de agosto', 'borrador',  'Incluye Santa Cena');

-- Domingo 24
INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id, notas)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000001', 'Mensaje central'
FROM roles_servicio r WHERE r.nombre = 'Predicación';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000002'
FROM roles_servicio r WHERE r.nombre = 'Alabanza';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000010'
FROM roles_servicio r WHERE r.nombre = 'Alabanza';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000006'
FROM roles_servicio r WHERE r.nombre = 'Sonido';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id, material_url, estado_material)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000004',
       'https://drive.google.com/file/d/ejemplo_multimedia/view', 'subido'
FROM roles_servicio r WHERE r.nombre = 'Multimedia';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000016'
FROM roles_servicio r WHERE r.nombre = 'Transmisión';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000011'
FROM roles_servicio r WHERE r.nombre = 'Acomodadores';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000018'
FROM roles_servicio r WHERE r.nombre = 'Limpieza';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000001', r.id, 'a1000000-0000-0000-0000-000000000014'
FROM roles_servicio r WHERE r.nombre = 'Cámaras';

-- Viernes 28
INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000002', r.id, 'a1000000-0000-0000-0000-000000000001'
FROM roles_servicio r WHERE r.nombre = 'Predicación';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000002', r.id, 'a1000000-0000-0000-0000-000000000015'
FROM roles_servicio r WHERE r.nombre = 'Alabanza';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000002', r.id, 'a1000000-0000-0000-0000-000000000004'
FROM roles_servicio r WHERE r.nombre = 'Multimedia';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000002', r.id, 'a1000000-0000-0000-0000-000000000006'
FROM roles_servicio r WHERE r.nombre = 'Sonido';

INSERT INTO programa_asignaciones (programa_id, rol_servicio_id, persona_id)
SELECT 'p1000000-0000-0000-0000-000000000002', r.id, 'a1000000-0000-0000-0000-000000000016'
FROM roles_servicio r WHERE r.nombre = 'Transmisión';

-- ------------------------------------------------------------
-- TUTORIALES
-- ------------------------------------------------------------
INSERT INTO tutoriales (id, titulo, descripcion, rol_servicio_id, tipo_destino, url_contenido, publicado)
SELECT 'tu000000-0000-0000-0000-000000000001',
       'Cómo operar el proyector Epson EB-X49',
       'Tutorial paso a paso para encender, configurar y apagar el proyector correctamente.',
       r.id, 'pantalla_principal',
       'https://www.youtube.com/watch?v=dQw4w9WgXcQ', true
FROM roles_servicio r WHERE r.nombre = 'Multimedia';

INSERT INTO tutoriales (id, titulo, descripcion, rol_servicio_id, tipo_destino, url_contenido, publicado)
SELECT 'tu000000-0000-0000-0000-000000000002',
       'Guía de mezcla de sonido en vivo',
       'Niveles recomendados para el culto dominical. Configuración para pastor y banda.',
       r.id, 'general',
       'https://www.youtube.com/watch?v=ejemplo_sonido', true
FROM roles_servicio r WHERE r.nombre = 'Sonido';

INSERT INTO tutoriales (id, titulo, descripcion, rol_servicio_id, tipo_destino, url_contenido, publicado)
SELECT 'tu000000-0000-0000-0000-000000000003',
       'Transmisión en Facebook Live paso a paso',
       'Desde iniciar OBS hasta terminar la transmisión y guardar el video.',
       r.id, 'pantalla_principal',
       'https://drive.google.com/file/d/ejemplo_transmision/view', true
FROM roles_servicio r WHERE r.nombre = 'Transmisión';

INSERT INTO tutoriales (id, titulo, descripcion, tipo_destino, url_contenido, publicado) VALUES
  ('tu000000-0000-0000-0000-000000000004',
   'Tamaños de artes para redes sociales 2026',
   'Dimensiones para Instagram, Facebook y WhatsApp actualizadas.',
   'redes_sociales',
   'https://drive.google.com/file/d/ejemplo_tamanios/view', true),
  ('tu000000-0000-0000-0000-000000000005',
   'Protocolo de limpieza del templo',
   'Checklist de limpieza antes y después de cada culto.',
   'general', NULL, false);

-- ------------------------------------------------------------
-- TAREAS
-- ------------------------------------------------------------
INSERT INTO tareas (id, tipo, titulo, descripcion, asignado_id, estado, fecha_limite) VALUES
  ('ta000000-0000-0000-0000-000000000001',
   'diseno', 'Arte para Conferencia Anual 2026',
   'Afiche principal y banner de redes sociales para la conferencia de septiembre.',
   'a1000000-0000-0000-0000-000000000017', 'en_progreso', '2026-09-05'),

  ('ta000000-0000-0000-0000-000000000002',
   'diseno', 'Flyer Santa Cena — septiembre',
   'Arte para comunicar la Santa Cena del primer domingo de septiembre.',
   'a1000000-0000-0000-0000-000000000003', 'pendiente', '2026-08-30'),

  ('ta000000-0000-0000-0000-000000000003',
   'diseno', 'Arte cumpleaños — agosto',
   'Post de cumpleaños para redes sociales con los hermanos que cumplen este mes.',
   'a1000000-0000-0000-0000-000000000017', 'aprobado', '2026-08-20'),

  ('ta000000-0000-0000-0000-000000000004',
   'solicitud_venta', 'Venta de empanadas — 31 de agosto',
   'Se solicita permiso para vender empanadas de pollo al finalizar el culto del domingo 31.',
   'a1000000-0000-0000-0000-000000000007', 'pendiente', '2026-08-31'),

  ('ta000000-0000-0000-0000-000000000005',
   'solicitud_venta', 'Venta de libros — Conferencia Anual',
   'Libros de consejería cristiana durante la Conferencia Anual 2026.',
   'a1000000-0000-0000-0000-000000000011', 'aprobado', '2026-09-12'),

  ('ta000000-0000-0000-0000-000000000006',
   'diseno', 'Banner bienvenida pantalla principal',
   'Diseño para la pantalla de bienvenida que se proyecta antes del culto.',
   'a1000000-0000-0000-0000-000000000003', 'rechazado', '2026-08-15');

-- Entrega de tarea aprobada (#3)
INSERT INTO tarea_entregas (id, tarea_id, persona_id, url, notas) VALUES
  ('te000000-0000-0000-0000-000000000001',
   'ta000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000017',
   'https://drive.google.com/file/d/arte_cumpleanios_agosto/view',
   'Arte con todos los hermanos del mes. Versión feed y story.');

-- Entrega de tarea rechazada (#6)
INSERT INTO tarea_entregas (id, tarea_id, persona_id, url, notas) VALUES
  ('te000000-0000-0000-0000-000000000002',
   'ta000000-0000-0000-0000-000000000006',
   'a1000000-0000-0000-0000-000000000003',
   'https://drive.google.com/file/d/banner_bienvenida_v1/view',
   'Primera versión del banner de bienvenida.');

UPDATE tareas
SET feedback_rechazo = 'El texto está muy pequeño para verse bien proyectado. Aumentar tamaño de fuente y simplificar el fondo.'
WHERE id = 'ta000000-0000-0000-0000-000000000006';

-- ------------------------------------------------------------
-- APORTES — últimos 3 meses
-- ------------------------------------------------------------
-- Junio 2026
INSERT INTO aportes (persona_id, tipo, monto, fecha) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'diezmo',  180.00, '2026-06-01'),
  ('a1000000-0000-0000-0000-000000000004', 'ofrenda',  50.00, '2026-06-01'),
  ('a1000000-0000-0000-0000-000000000006', 'ofrenda',  30.00, '2026-06-01'),
  ('a1000000-0000-0000-0000-000000000008', 'diezmo',  350.00, '2026-06-01'),
  ('a1000000-0000-0000-0000-000000000010', 'ofrenda',  45.00, '2026-06-01'),
  ('a1000000-0000-0000-0000-000000000001', 'pacto',   500.00, '2026-06-01'),
  ('a1000000-0000-0000-0000-000000000002', 'ofrenda',  60.00, '2026-06-08'),
  ('a1000000-0000-0000-0000-000000000005', 'ofrenda',  20.00, '2026-06-08'),
  ('a1000000-0000-0000-0000-000000000012', 'ofrenda',  35.00, '2026-06-08'),
  ('a1000000-0000-0000-0000-000000000002', 'ofrenda',  55.00, '2026-06-15'),
  ('a1000000-0000-0000-0000-000000000008', 'ofrenda',  80.00, '2026-06-15'),
  ('a1000000-0000-0000-0000-000000000013', 'ofrenda',  25.00, '2026-06-15'),
  ('a1000000-0000-0000-0000-000000000002', 'ofrenda',  65.00, '2026-06-22'),
  ('a1000000-0000-0000-0000-000000000007', 'ofrenda',  40.00, '2026-06-22'),
  ('a1000000-0000-0000-0000-000000000010', 'ofrenda',  30.00, '2026-06-29'),
  ('a1000000-0000-0000-0000-000000000015', 'ofrenda',  15.00, '2026-06-29');

-- Julio 2026
INSERT INTO aportes (persona_id, tipo, monto, fecha) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'diezmo',  180.00, '2026-07-06'),
  ('a1000000-0000-0000-0000-000000000008', 'diezmo',  350.00, '2026-07-06'),
  ('a1000000-0000-0000-0000-000000000004', 'ofrenda',  45.00, '2026-07-06'),
  ('a1000000-0000-0000-0000-000000000006', 'ofrenda',  35.00, '2026-07-06'),
  ('a1000000-0000-0000-0000-000000000001', 'pacto',   500.00, '2026-07-06'),
  ('a1000000-0000-0000-0000-000000000010', 'ofrenda',  50.00, '2026-07-13'),
  ('a1000000-0000-0000-0000-000000000005', 'ofrenda',  25.00, '2026-07-13'),
  ('a1000000-0000-0000-0000-000000000012', 'ofrenda',  40.00, '2026-07-13'),
  ('a1000000-0000-0000-0000-000000000002', 'ofrenda',  70.00, '2026-07-20'),
  ('a1000000-0000-0000-0000-000000000007', 'ofrenda',  30.00, '2026-07-20'),
  ('a1000000-0000-0000-0000-000000000013', 'ofrenda',  20.00, '2026-07-20'),
  ('a1000000-0000-0000-0000-000000000015', 'ofrenda',  18.00, '2026-07-27'),
  ('a1000000-0000-0000-0000-000000000009', 'ofrenda',  15.00, '2026-07-27'),
  ('a1000000-0000-0000-0000-000000000008', 'ofrenda',  90.00, '2026-07-27');

-- Agosto 2026
INSERT INTO aportes (persona_id, tipo, monto, fecha) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'diezmo',  180.00, '2026-08-03'),
  ('a1000000-0000-0000-0000-000000000008', 'diezmo',  350.00, '2026-08-03'),
  ('a1000000-0000-0000-0000-000000000001', 'pacto',   500.00, '2026-08-03'),
  ('a1000000-0000-0000-0000-000000000004', 'ofrenda',  55.00, '2026-08-03'),
  ('a1000000-0000-0000-0000-000000000010', 'ofrenda',  45.00, '2026-08-10'),
  ('a1000000-0000-0000-0000-000000000005', 'ofrenda',  30.00, '2026-08-10'),
  ('a1000000-0000-0000-0000-000000000007', 'ofrenda',  35.00, '2026-08-17'),
  ('a1000000-0000-0000-0000-000000000012', 'ofrenda',  20.00, '2026-08-17'),
  ('a1000000-0000-0000-0000-000000000002', 'ofrenda',  75.00, '2026-08-17');

-- ------------------------------------------------------------
-- GASTOS — últimos 3 meses
-- ------------------------------------------------------------
INSERT INTO gastos (concepto, monto, fecha, categoria, descripcion) VALUES
  ('Servicio de agua',                85.00, '2026-06-05', 'servicios',   'Recibo mensual junio'),
  ('Servicio de luz',                220.00, '2026-06-05', 'servicios',   'Recibo mensual junio'),
  ('Artículos de limpieza',           65.00, '2026-06-10', 'local',       'Detergente, cloro, trapeadores'),
  ('Cable HDMI 5m',                   35.00, '2026-06-15', 'equipos',     'Para conectar laptop al proyector'),
  ('Impresión de partituras',         28.00, '2026-06-20', 'actividades', NULL),
  ('Servicio de agua',                85.00, '2026-07-05', 'servicios',   'Recibo mensual julio'),
  ('Servicio de luz',                198.00, '2026-07-05', 'servicios',   'Recibo mensual julio'),
  ('Artículos de limpieza',           55.00, '2026-07-10', 'local',       NULL),
  ('Impresión de boletines',          45.00, '2026-07-13', 'actividades', '50 boletines dominicales'),
  ('Reparación de micrófono',        120.00, '2026-07-18', 'equipos',     'Cambio de cápsula Shure SM58'),
  ('Servicio de agua',                85.00, '2026-08-05', 'servicios',   'Recibo mensual agosto'),
  ('Servicio de luz',                235.00, '2026-08-05', 'servicios',   'Recibo mensual agosto'),
  ('Artículos de limpieza',           60.00, '2026-08-08', 'local',       NULL),
  ('Impresión afiches conferencia',  180.00, '2026-08-10', 'actividades', 'Afiches A3 para septiembre'),
  ('Internet fibra óptica',          120.00, '2026-08-15', 'servicios',   'Plan 200 Mbps para transmisión');

-- ------------------------------------------------------------
-- ACTIVIDADES FINANCIERAS
-- ------------------------------------------------------------
INSERT INTO actividades_financieras (id, nombre, fecha, descripcion) VALUES
  ('af000000-0000-0000-0000-000000000001', 'Pollada Benéfica — julio 2026',   '2026-07-19', 'Recaudación para el proyecto de sillas nuevas.'),
  ('af000000-0000-0000-0000-000000000002', 'Conferencia Anual 2026',          '2026-09-12', 'Ingresos y gastos propios de la conferencia anual.');

INSERT INTO actividad_movimientos (actividad_id, tipo, concepto, monto, fecha) VALUES
  ('af000000-0000-0000-0000-000000000001', 'ingreso', 'Venta de platos (150 x S/15)',     2250.00, '2026-07-19'),
  ('af000000-0000-0000-0000-000000000001', 'ingreso', 'Venta de bebidas',                  380.00, '2026-07-19'),
  ('af000000-0000-0000-0000-000000000001', 'egreso',  'Compra de insumos (pollo, leña)',  1100.00, '2026-07-18'),
  ('af000000-0000-0000-0000-000000000001', 'egreso',  'Carbón y condimentos',              120.00, '2026-07-18'),
  ('af000000-0000-0000-0000-000000000001', 'egreso',  'Vasos y cubiertos descartables',    85.00, '2026-07-18'),
  ('af000000-0000-0000-0000-000000000002', 'egreso',  'Reserva del centro de convenciones',800.00, '2026-08-01'),
  ('af000000-0000-0000-0000-000000000002', 'egreso',  'Honorarios del conferencista',      500.00, '2026-08-15');

-- ------------------------------------------------------------
-- BIENES (inventario)
-- Categorías válidas: instrumento | equipo_audio | equipo_video | mobiliario | otro
-- Estados válidos: bueno | regular | malo | baja
-- ------------------------------------------------------------
INSERT INTO bienes (id, nombre, categoria, numero_serie, fecha_compra, valor_compra, vida_util_anios, estado, proximo_mantenimiento, intervalo_mantenimiento_dias, ubicacion, notas) VALUES
  ('bi000000-0000-0000-0000-000000000001',
   'Parlante JBL PRX815 (derecho)', 'equipo_audio', 'JBL-PRX-0047821', '2023-03-10', 2800.00, 8,
   'bueno', '2026-09-10', 180, 'Escenario lado derecho', 'Requiere revisión de cablería.'),

  ('bi000000-0000-0000-0000-000000000002',
   'Parlante JBL PRX815 (izquierdo)', 'equipo_audio', 'JBL-PRX-0047822', '2023-03-10', 2800.00, 8,
   'bueno', '2026-09-10', 180, 'Escenario lado izquierdo', NULL),

  ('bi000000-0000-0000-0000-000000000003',
   'Consola Soundcraft Ui16', 'equipo_audio', 'SC-UI16-20231', '2023-05-20', 3500.00, 10,
   'bueno', '2027-01-20', 365, 'Sala de mezcla', 'Control remoto vía WiFi.'),

  ('bi000000-0000-0000-0000-000000000004',
   'Micrófono Shure SM58 (x3)', 'equipo_audio', 'SHURE-SM58-3UN', '2022-08-15', 780.00, 7,
   'regular', '2026-08-30', 90, 'Armario de sonido', 'Uno tiene el jack flojo. Revisar conexión.'),

  ('bi000000-0000-0000-0000-000000000005',
   'Proyector Epson EB-X49', 'equipo_video', 'EPS-EBX49-11203', '2022-11-05', 1650.00, 6,
   'bueno', '2026-09-05', 180, 'Zona de proyección', 'Horas de lámpara: 1840 de 6000.'),

  ('bi000000-0000-0000-0000-000000000006',
   'Cámara Sony HXR-NX80', 'equipo_video', 'SONY-NX80-00774', '2024-01-20', 5200.00, 8,
   'bueno', '2026-12-20', 180, 'Armario multimedia', 'Para transmisiones y grabaciones.'),

  ('bi000000-0000-0000-0000-000000000007',
   'Laptop Lenovo IdeaPad 3', 'equipo_video', 'LEN-IP3-2024X', '2024-02-10', 1800.00, 5,
   'bueno', '2026-12-10', 365, 'Sala de mezcla', 'OBS y ProPresenter instalados.'),

  ('bi000000-0000-0000-0000-000000000008',
   'Guitarra eléctrica Fender Stratocaster', 'instrumento', 'FEND-STRAT-220', '2021-06-01', 2200.00, 15,
   'bueno', NULL, NULL, 'Armario de instrumentos', NULL),

  ('bi000000-0000-0000-0000-000000000009',
   'Bajo eléctrico Ibanez GSR200', 'instrumento', 'IBA-GSR200-0881', '2020-03-15', 980.00, 12,
   'regular', NULL, NULL, 'Armario de instrumentos', 'Clavijero necesita ajuste.'),

  ('bi000000-0000-0000-0000-000000000010',
   'Teclado Roland FP-60X', 'instrumento', 'ROL-FP60-09341', '2023-09-10', 3100.00, 12,
   'bueno', NULL, NULL, 'Escenario', NULL),

  ('bi000000-0000-0000-0000-000000000011',
   'Batería Pearl Export Series', 'instrumento', 'PEARL-EXP-5PCS', '2019-11-20', 2400.00, 15,
   'regular', '2026-09-20', 365, 'Sala de ensayos', 'Parche de bombo desgastado.'),

  ('bi000000-0000-0000-0000-000000000012',
   'Amplificador Fender Champion 100', 'equipo_audio', 'FEND-CHAMP-0093', '2021-04-05', 1450.00, 10,
   'bueno', NULL, NULL, 'Sala de ensayos', NULL),

  ('bi000000-0000-0000-0000-000000000013',
   'Sillas plásticas (lote 80 und)', 'mobiliario', NULL, '2022-01-15', 3200.00, 8,
   'regular', NULL, NULL, 'Auditorio', '12 sillas con patas flojas. Pendiente reparación.'),

  ('bi000000-0000-0000-0000-000000000014',
   'Atril de predicación', 'mobiliario', NULL, '2018-06-10', 450.00, 20,
   'bueno', NULL, NULL, 'Escenario', NULL);

-- Historial de mantenimiento
INSERT INTO mantenimiento_historial (bien_id, fecha, descripcion, costo, realizado_por) VALUES
  ('bi000000-0000-0000-0000-000000000001', '2026-03-10', 'Limpieza general y revisión de bocinas',       0.00, 'Pedro Sánchez'),
  ('bi000000-0000-0000-0000-000000000002', '2026-03-10', 'Limpieza general y revisión de bocinas',       0.00, 'Pedro Sánchez'),
  ('bi000000-0000-0000-0000-000000000004', '2026-05-30', 'Cambio de cápsula en micrófono #2',          120.00, 'Técnico externo — Sonido Total SAC'),
  ('bi000000-0000-0000-0000-000000000005', '2026-03-05', 'Limpieza de lente y filtro de aire',           0.00, 'Roberto Díaz'),
  ('bi000000-0000-0000-0000-000000000011', '2025-09-20', 'Tensado de parches y revisión de torniquetes', 50.00, 'Juan Mendoza');

-- ------------------------------------------------------------
-- AUSENCIAS
-- ------------------------------------------------------------
INSERT INTO ausencias (persona_id, fecha, motivo, estado) VALUES
  ('a1000000-0000-0000-0000-000000000012', '2026-08-17', 'Enfermedad',       'pendiente'),
  ('a1000000-0000-0000-0000-000000000009', '2026-08-17', 'Viaje familiar',   'contactado'),
  ('a1000000-0000-0000-0000-000000000011', '2026-08-10', 'Sin aviso previo', 'resuelto');
