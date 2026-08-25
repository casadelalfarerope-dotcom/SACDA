-- =============================================================
-- FASE 3: Programación de Servidores, Capacitación y Tareas
-- =============================================================

-- ===== 5.6 PROGRAMACIÓN DE SERVIDORES =====

CREATE TABLE roles_servicio (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text        NOT NULL,
  descripcion   text,
  color         text        NOT NULL DEFAULT '#6366f1',
  requiere_material boolean NOT NULL DEFAULT false,
  activo        boolean     NOT NULL DEFAULT true,
  orden         int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE programas (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   uuid        REFERENCES eventos(id) ON DELETE SET NULL,
  fecha       date        NOT NULL,
  titulo      text        NOT NULL,
  estado      text        NOT NULL DEFAULT 'borrador'
                CHECK (estado IN ('borrador','publicado')),
  notas       text,
  created_by  uuid        REFERENCES cuentas(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE programa_asignaciones (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id      uuid        NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
  rol_servicio_id  uuid        NOT NULL REFERENCES roles_servicio(id) ON DELETE CASCADE,
  persona_id       uuid        NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  notas            text,
  material_url     text,
  estado_material  text        NOT NULL DEFAULT 'pendiente'
                   CHECK (estado_material IN ('pendiente','subido')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rotacion_configuracion (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_servicio_id uuid        NOT NULL REFERENCES roles_servicio(id) ON DELETE CASCADE UNIQUE,
  activo          boolean     NOT NULL DEFAULT true,
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rotacion_miembros (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  rotacion_id  uuid    NOT NULL REFERENCES rotacion_configuracion(id) ON DELETE CASCADE,
  persona_id   uuid    NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  posicion     int     NOT NULL,
  activo       boolean NOT NULL DEFAULT true,
  UNIQUE(rotacion_id, posicion)
);

-- ===== 5.7 CAPACITACIÓN =====

CREATE TABLE tutoriales (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text        NOT NULL,
  descripcion     text,
  rol_servicio_id uuid        REFERENCES roles_servicio(id) ON DELETE SET NULL,
  tipo_destino    text        NOT NULL DEFAULT 'general'
                  CHECK (tipo_destino IN ('pantalla_principal','redes_sociales','general')),
  url_contenido   text,
  publicado       boolean     NOT NULL DEFAULT false,
  created_by      uuid        REFERENCES cuentas(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tutorial_progreso (
  persona_id   uuid        NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  tutorial_id  uuid        NOT NULL REFERENCES tutoriales(id) ON DELETE CASCADE,
  visto        boolean     NOT NULL DEFAULT false,
  fecha_visto  timestamptz,
  PRIMARY KEY (persona_id, tutorial_id)
);

-- ===== 5.8 TAREAS GENÉRICAS CON APROBACIÓN =====

CREATE TABLE tareas (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo              text        NOT NULL CHECK (tipo IN ('diseno','solicitud_venta','capacitacion','otro')),
  titulo            text        NOT NULL,
  descripcion       text,
  solicitante_id    uuid        REFERENCES cuentas(id) ON DELETE SET NULL,
  asignado_id       uuid        REFERENCES personas(id) ON DELETE SET NULL,
  evento_id         uuid        REFERENCES eventos(id) ON DELETE SET NULL,
  estado            text        NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','en_progreso','entregado','aprobado','rechazado')),
  fecha_limite      date,
  aprobado_por      uuid        REFERENCES cuentas(id) ON DELETE SET NULL,
  fecha_aprobacion  timestamptz,
  feedback_rechazo  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tarea_entregas (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id    uuid        NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  url_archivo text        NOT NULL,
  notas       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tarea_distribuciones (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id    uuid        NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  destino     text        NOT NULL CHECK (destino IN ('multimedia','impresiones')),
  url_archivo text,
  confirmado  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ===== TRIGGERS updated_at =====

CREATE TRIGGER trg_programas_updated_at
  BEFORE UPDATE ON programas
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TRIGGER trg_tutoriales_updated_at
  BEFORE UPDATE ON tutoriales
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TRIGGER trg_tareas_updated_at
  BEFORE UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- ===== RLS =====

ALTER TABLE roles_servicio           ENABLE ROW LEVEL SECURITY;
ALTER TABLE programas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE programa_asignaciones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotacion_configuracion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotacion_miembros        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutoriales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_progreso        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea_entregas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea_distribuciones     ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado
CREATE POLICY "roles_servicio_read" ON roles_servicio FOR SELECT TO authenticated USING (true);
CREATE POLICY "programas_read" ON programas FOR SELECT TO authenticated USING (true);
CREATE POLICY "programa_asignaciones_read" ON programa_asignaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "rotacion_configuracion_read" ON rotacion_configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "rotacion_miembros_read" ON rotacion_miembros FOR SELECT TO authenticated USING (true);
CREATE POLICY "tutoriales_read" ON tutoriales FOR SELECT TO authenticated USING (true);
CREATE POLICY "tutorial_progreso_read" ON tutorial_progreso FOR SELECT TO authenticated USING (true);
CREATE POLICY "tareas_read" ON tareas FOR SELECT TO authenticated USING (true);
CREATE POLICY "tarea_entregas_read" ON tarea_entregas FOR SELECT TO authenticated USING (true);
CREATE POLICY "tarea_distribuciones_read" ON tarea_distribuciones FOR SELECT TO authenticated USING (true);

-- Escritura: usuarios autenticados (permisos finos se manejan en la app)
CREATE POLICY "roles_servicio_write" ON roles_servicio FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "programas_write" ON programas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "programa_asignaciones_write" ON programa_asignaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "rotacion_configuracion_write" ON rotacion_configuracion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "rotacion_miembros_write" ON rotacion_miembros FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tutoriales_write" ON tutoriales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tutorial_progreso_write" ON tutorial_progreso FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tareas_write" ON tareas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tarea_entregas_write" ON tarea_entregas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tarea_distribuciones_write" ON tarea_distribuciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== DATOS INICIALES =====

INSERT INTO roles_servicio (nombre, descripcion, color, requiere_material, orden) VALUES
  ('Predicación',      'Predicador o expositor del mensaje',        '#7c3aed', false, 1),
  ('Alabanza',         'Líder de alabanza y adoración',             '#2563eb', false, 2),
  ('Multimedia',       'Proyección de letras y diapositivas',       '#0891b2', true,  3),
  ('Sonido',           'Manejo de consola y audio',                 '#059669', false, 4),
  ('Transmisión',      'Transmisión en vivo por redes',             '#dc2626', true,  5),
  ('Acomodadores',     'Recepción y orden en el templo',            '#d97706', false, 6),
  ('Limpieza',         'Limpieza antes y después del culto',        '#64748b', false, 7),
  ('Cámaras',          'Fotografía y video del servicio',           '#9333ea', false, 8);
