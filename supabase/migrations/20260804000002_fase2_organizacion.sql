-- ============================================================
-- SACDA — Fase 2: Organización y comunicación
-- ============================================================

-- Tipos enumerados
CREATE TYPE tipo_grupo AS ENUM ('servicio', 'administrativo');
CREATE TYPE tipo_material AS ENUM ('imagen', 'pdf', 'enlace_externo');
CREATE TYPE tipo_evento AS ENUM ('servicio', 'actividad_especial', 'evento_unico');
CREATE TYPE tipo_recurrencia AS ENUM ('ninguna', 'semanal', 'mensual_por_dia', 'anual');
CREATE TYPE tipo_excepcion AS ENUM ('cancelado', 'reprogramado', 'modificado');
CREATE TYPE tipo_notificacion AS ENUM (
  'turno_asignado', 'cumpleanios', 'ausencia', 'reunion_grupo',
  'tarea_diseno', 'mantenimiento', 'solicitud_venta', 'general'
);

-- ------------------------------------------------------------
-- 1. GRUPOS / MINISTERIOS
-- ------------------------------------------------------------
CREATE TABLE grupos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT NOT NULL,
  descripcion      TEXT,
  tipo             tipo_grupo NOT NULL DEFAULT 'servicio',
  grupo_padre_id   UUID REFERENCES grupos(id) ON DELETE SET NULL,
  encargado_id     UUID REFERENCES personas(id) ON DELETE SET NULL,
  enlace_whatsapp  TEXT,
  activo           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grupos_padre ON grupos(grupo_padre_id) WHERE grupo_padre_id IS NOT NULL;

-- Ministerios iniciales
INSERT INTO grupos (nombre, descripcion, tipo) VALUES
  ('Ministerio de Alabanza',   'Banda y coreografía de la iglesia',   'servicio'),
  ('Ministerio de Jóvenes',    'Congregación joven de la iglesia',    'servicio'),
  ('Ministerio de Niños',      'Escuela dominical y niños',           'servicio'),
  ('Ministerio de Intercesión','Grupo de oración e intercesión',      'servicio'),
  ('Multimedia',               'Proyección, sonido y transmisión',    'servicio'),
  ('Diseño Gráfico',           'Diseño de artes y materiales',        'servicio'),
  ('Limpieza',                 'Equipo de limpieza del templo',       'servicio'),
  ('Impresiones',              'Impresión de materiales',             'servicio'),
  ('Comité de Líderes',        'Líderes y pastores',                  'administrativo');

-- Sub-grupos (requiere que los padres existan, se insertan referenciando por nombre)
INSERT INTO grupos (nombre, descripcion, tipo, grupo_padre_id)
SELECT 'Banda', 'Músicos y vocalistas', 'servicio', id FROM grupos WHERE nombre = 'Ministerio de Alabanza';

INSERT INTO grupos (nombre, descripcion, tipo, grupo_padre_id)
SELECT 'Coreografía', 'Equipo de danza', 'servicio', id FROM grupos WHERE nombre = 'Ministerio de Alabanza';

-- ------------------------------------------------------------
-- 2. MIEMBROS DE GRUPO
-- ------------------------------------------------------------
CREATE TABLE grupo_miembros (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id      UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  persona_id    UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  rol_en_grupo  TEXT,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, persona_id)
);

CREATE INDEX idx_grupo_miembros_grupo   ON grupo_miembros(grupo_id);
CREATE INDEX idx_grupo_miembros_persona ON grupo_miembros(persona_id);

-- ------------------------------------------------------------
-- 3. MATERIALES DE GRUPO
-- ------------------------------------------------------------
CREATE TABLE grupo_materiales (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id     UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  titulo       TEXT NOT NULL,
  descripcion  TEXT,
  tipo         tipo_material NOT NULL,
  url          TEXT NOT NULL,
  subido_por   UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grupo_materiales_grupo ON grupo_materiales(grupo_id);

-- ------------------------------------------------------------
-- 4. EVENTOS (plantillas de calendario)
-- ------------------------------------------------------------
CREATE TABLE eventos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo              TEXT NOT NULL,
  descripcion         TEXT,
  tipo                tipo_evento NOT NULL DEFAULT 'evento_unico',
  hora_inicio         TIME,
  hora_fin            TIME,
  lugar               TEXT,
  grupo_id            UUID REFERENCES grupos(id) ON DELETE SET NULL,
  created_by          UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Recurrencia
  tipo_recurrencia    tipo_recurrencia NOT NULL DEFAULT 'ninguna',
  fecha_inicio_serie  DATE,
  fecha_fin_serie     DATE,

  -- Para recurrencia semanal: días de la semana en español
  dias_semana         TEXT[],

  -- Para recurrencia mensual por día (ej. primer domingo del mes)
  semana_del_mes      INTEGER CHECK (semana_del_mes BETWEEN -1 AND 5 AND semana_del_mes != 0),
  dia_semana_mes      TEXT,

  -- Para evento único sin recurrencia
  fecha_unica         DATE,

  CONSTRAINT chk_recurrencia CHECK (
    (tipo_recurrencia = 'ninguna'         AND fecha_unica IS NOT NULL) OR
    (tipo_recurrencia = 'semanal'         AND dias_semana IS NOT NULL AND fecha_inicio_serie IS NOT NULL) OR
    (tipo_recurrencia = 'mensual_por_dia' AND semana_del_mes IS NOT NULL AND dia_semana_mes IS NOT NULL AND fecha_inicio_serie IS NOT NULL) OR
    (tipo_recurrencia = 'anual'           AND fecha_inicio_serie IS NOT NULL)
  )
);

CREATE INDEX idx_eventos_tipo       ON eventos(tipo);
CREATE INDEX idx_eventos_fecha      ON eventos(fecha_unica) WHERE fecha_unica IS NOT NULL;
CREATE INDEX idx_eventos_grupo      ON eventos(grupo_id) WHERE grupo_id IS NOT NULL;

-- Eventos recurrentes predefinidos de la iglesia
INSERT INTO eventos (titulo, tipo, tipo_recurrencia, dias_semana, fecha_inicio_serie, hora_inicio, hora_fin, lugar)
VALUES
  ('Culto de Viernes', 'servicio', 'semanal', ARRAY['viernes'], '2026-01-02', '19:00', '21:00', 'Templo principal'),
  ('Culto de Domingo', 'servicio', 'semanal', ARRAY['domingo'], '2026-01-04', '10:00', '12:00', 'Templo principal');

INSERT INTO eventos (titulo, descripcion, tipo, tipo_recurrencia, semana_del_mes, dia_semana_mes, fecha_inicio_serie, hora_inicio)
VALUES
  ('Santa Cena', 'Primer domingo de cada mes', 'actividad_especial', 'mensual_por_dia', 1, 'domingo', '2026-01-01', '10:00');

-- ------------------------------------------------------------
-- 5. EXCEPCIONES A EVENTOS RECURRENTES
-- ------------------------------------------------------------
CREATE TABLE evento_excepciones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id           UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  fecha_original      DATE NOT NULL,
  tipo_excepcion      tipo_excepcion NOT NULL,
  fecha_nueva         DATE,
  hora_nueva_inicio   TIME,
  hora_nueva_fin      TIME,
  titulo_override     TEXT,
  descripcion_override TEXT,
  notas               TEXT,
  created_by          UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, fecha_original)
);

CREATE INDEX idx_excepciones_evento ON evento_excepciones(evento_id);
CREATE INDEX idx_excepciones_fecha  ON evento_excepciones(fecha_original);

-- ------------------------------------------------------------
-- 6. RESPONSABLES DE EVENTO
-- ------------------------------------------------------------
CREATE TABLE evento_responsables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  persona_id  UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  rol         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, persona_id)
);

-- ------------------------------------------------------------
-- 7. NOTIFICACIONES IN-APP
-- ------------------------------------------------------------
CREATE TABLE notificaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id  UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  tipo        tipo_notificacion NOT NULL DEFAULT 'general',
  titulo      TEXT NOT NULL,
  cuerpo      TEXT,
  canal       canal_notificacion NOT NULL DEFAULT 'in_app',
  leida       BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_persona ON notificaciones(persona_id);
CREATE INDEX idx_notificaciones_leida   ON notificaciones(persona_id, leida) WHERE leida = false;

-- ------------------------------------------------------------
-- 8. TRIGGERS updated_at
-- ------------------------------------------------------------
CREATE TRIGGER trg_updated_grupos
  BEFORE UPDATE ON grupos
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TRIGGER trg_updated_eventos
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- ------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE grupos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_miembros      ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_materiales    ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_excepciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones      ENABLE ROW LEVEL SECURITY;

-- Grupos: visibles para todos los autenticados; edición requiere permiso
CREATE POLICY "grupos_select" ON grupos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "grupos_insert" ON grupos
  FOR INSERT WITH CHECK (tiene_permiso('ministerios', 'crear'));

CREATE POLICY "grupos_update" ON grupos
  FOR UPDATE USING (tiene_permiso('ministerios', 'editar'));

CREATE POLICY "grupos_delete" ON grupos
  FOR DELETE USING (tiene_permiso('ministerios', 'eliminar'));

-- Miembros de grupo
CREATE POLICY "grupo_miembros_select" ON grupo_miembros
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "grupo_miembros_all" ON grupo_miembros
  FOR ALL USING (tiene_permiso('ministerios', 'editar'));

-- Materiales: visibles para miembros del grupo o con permiso
CREATE POLICY "grupo_materiales_select" ON grupo_materiales
  FOR SELECT USING (
    tiene_permiso('ministerios', 'ver') OR
    EXISTS (
      SELECT 1 FROM grupo_miembros gm
      WHERE gm.grupo_id = grupo_materiales.grupo_id
        AND gm.persona_id = auth_persona_id()
        AND gm.activo = true
    )
  );

CREATE POLICY "grupo_materiales_all" ON grupo_materiales
  FOR ALL USING (tiene_permiso('ministerios', 'editar'));

-- Eventos: visibles para todos
CREATE POLICY "eventos_select" ON eventos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "eventos_insert" ON eventos
  FOR INSERT WITH CHECK (tiene_permiso('calendario', 'crear'));

CREATE POLICY "eventos_update" ON eventos
  FOR UPDATE USING (tiene_permiso('calendario', 'editar'));

CREATE POLICY "eventos_delete" ON eventos
  FOR DELETE USING (tiene_permiso('calendario', 'eliminar'));

-- Excepciones
CREATE POLICY "excepciones_select" ON evento_excepciones
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "excepciones_all" ON evento_excepciones
  FOR ALL USING (tiene_permiso('calendario', 'editar'));

-- Responsables
CREATE POLICY "responsables_select" ON evento_responsables
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "responsables_all" ON evento_responsables
  FOR ALL USING (tiene_permiso('calendario', 'editar'));

-- Notificaciones: cada usuario solo ve las suyas
CREATE POLICY "notificaciones_select" ON notificaciones
  FOR SELECT USING (persona_id = auth_persona_id());

CREATE POLICY "notificaciones_update" ON notificaciones
  FOR UPDATE USING (persona_id = auth_persona_id());

-- Inserción de notificaciones: solo desde service role (server-side)
CREATE POLICY "notificaciones_insert" ON notificaciones
  FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------
-- 10. Agregar permisos de Fase 2 al rol administrador
-- ------------------------------------------------------------
INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, m.modulo, true, true, true, true
FROM roles r
CROSS JOIN (VALUES ('ministerios'), ('calendario'), ('notificaciones')) AS m(modulo)
WHERE r.nombre = 'administrador'
ON CONFLICT (rol_id, modulo) DO UPDATE
  SET puede_ver = true, puede_crear = true, puede_editar = true, puede_eliminar = true;

INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, m.modulo, true, true, true, false
FROM roles r
CROSS JOIN (VALUES ('ministerios'), ('calendario'), ('notificaciones')) AS m(modulo)
WHERE r.nombre = 'pastor'
ON CONFLICT (rol_id, modulo) DO UPDATE
  SET puede_ver = true, puede_crear = true, puede_editar = true;
