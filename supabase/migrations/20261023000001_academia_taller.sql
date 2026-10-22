-- ============================================================
-- Academia "El Taller del Alfarero"
-- Cursos, temas, sesiones, asistencia (con recuperación), resúmenes,
-- exámenes con intentos topados y ranking.
-- Los alumnos solo LEEN con RLS; todo lo que escriben pasa por acciones
-- del servidor que validan identidad, inscripción y reglas.
-- ============================================================

INSERT INTO roles (nombre, descripcion)
VALUES ('estudiante', 'Alumno del Taller del Alfarero')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT id, 'academia', true, true, true, true FROM roles WHERE nombre = 'academico'
ON CONFLICT (rol_id, modulo) DO NOTHING;

CREATE TYPE estado_curso      AS ENUM ('borrador', 'activo', 'finalizado');
CREATE TYPE estado_asistencia AS ENUM ('presente', 'ausente', 'recuperada');
CREATE TYPE estado_resumen    AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE estado_examen     AS ENUM ('borrador', 'publicado', 'cerrado');
CREATE TYPE tipo_pregunta     AS ENUM ('opcion_unica', 'opcion_multiple', 'verdadero_falso', 'respuesta_corta', 'parrafo');
CREATE TYPE tipo_intento      AS ENUM ('normal', 'recuperacion');
CREATE TYPE estado_intento    AS ENUM ('en_curso', 'en_revision', 'calificado');

CREATE TABLE cursos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  profesor_id   UUID REFERENCES personas(id) ON DELETE SET NULL,
  fecha_inicio  DATE,
  fecha_fin     DATE,
  estado        estado_curso NOT NULL DEFAULT 'borrador',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE curso_inscripciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id    UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  persona_id  UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curso_id, persona_id)
);
CREATE INDEX idx_inscripciones_persona ON curso_inscripciones(persona_id);

CREATE TABLE temas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id    UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  orden       INT NOT NULL DEFAULT 0,
  titulo      TEXT NOT NULL,
  resumen     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_temas_curso ON temas(curso_id, orden);

-- Un tema puede dictarse en uno o varios días.
CREATE TABLE sesiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id         UUID NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  hora_inicio     TIME,
  hora_fin        TIME,
  enlace_reunion  TEXT,
  grabacion_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sesiones_tema ON sesiones(tema_id, fecha);

CREATE TABLE materiales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id     UUID NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- presente = 1, recuperada = 0.5, ausente (o sin registro) = 0
CREATE TABLE asistencias (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id    UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  persona_id   UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  estado       estado_asistencia NOT NULL,
  marcada_por  UUID REFERENCES personas(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sesion_id, persona_id)
);

CREATE TABLE grabacion_progreso (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id        UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  persona_id       UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  duracion_seg     INT,
  tramos           JSONB NOT NULL DEFAULT '[]',
  segundos_vistos  INT NOT NULL DEFAULT 0,
  -- Para enlaces donde no se puede medir (Drive, OneDrive): el alumno declara que la vio.
  visto_declarado  BOOLEAN NOT NULL DEFAULT false,
  completado       BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sesion_id, persona_id)
);

CREATE TABLE resumenes_clase (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id     UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  persona_id    UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  texto         TEXT NOT NULL,
  estado        estado_resumen NOT NULL DEFAULT 'pendiente',
  comentario    TEXT,
  revisado_por  UUID REFERENCES personas(id) ON DELETE SET NULL,
  revisado_en   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sesion_id, persona_id)
);

CREATE TABLE examenes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id              UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  tema_id               UUID REFERENCES temas(id) ON DELETE SET NULL,
  titulo                TEXT NOT NULL,
  descripcion           TEXT,
  estado                estado_examen NOT NULL DEFAULT 'borrador',
  publicado_en          TIMESTAMPTZ,
  fecha_limite          TIMESTAMPTZ,
  permite_recuperacion  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_examenes_curso ON examenes(curso_id);

CREATE TABLE examen_preguntas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id  UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  orden      INT NOT NULL DEFAULT 0,
  tipo       tipo_pregunta NOT NULL,
  enunciado  TEXT NOT NULL,
  puntos     NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (puntos > 0)
);
CREATE INDEX idx_preguntas_examen ON examen_preguntas(examen_id, orden);

-- En respuesta_corta, las opciones son las respuestas aceptadas.
CREATE TABLE examen_opciones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id  UUID NOT NULL REFERENCES examen_preguntas(id) ON DELETE CASCADE,
  orden        INT NOT NULL DEFAULT 0,
  texto        TEXT NOT NULL,
  es_correcta  BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE examen_habilitaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id       UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  persona_id      UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  fecha_limite    TIMESTAMPTZ NOT NULL,
  habilitado_por  UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (examen_id, persona_id)
);

-- nota = puntaje / puntaje_max * 20 * factor  (escala vigesimal)
CREATE TABLE examen_intentos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id    UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  persona_id   UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  numero       INT NOT NULL,
  tipo         tipo_intento NOT NULL DEFAULT 'normal',
  factor       NUMERIC(3,2) NOT NULL,
  estado       estado_intento NOT NULL DEFAULT 'en_curso',
  iniciado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_en   TIMESTAMPTZ,
  puntaje      NUMERIC(6,2),
  puntaje_max  NUMERIC(6,2),
  nota         NUMERIC(4,2),
  UNIQUE (examen_id, persona_id, tipo, numero)
);
CREATE INDEX idx_intentos_persona ON examen_intentos(persona_id, examen_id);

CREATE TABLE examen_respuestas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intento_id   UUID NOT NULL REFERENCES examen_intentos(id) ON DELETE CASCADE,
  pregunta_id  UUID NOT NULL REFERENCES examen_preguntas(id) ON DELETE CASCADE,
  opciones     UUID[] NOT NULL DEFAULT '{}',
  texto        TEXT,
  puntos       NUMERIC(5,2),
  UNIQUE (intento_id, pregunta_id)
);

CREATE TRIGGER trg_cursos_updated BEFORE UPDATE ON cursos
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();
CREATE TRIGGER trg_resumenes_updated BEFORE UPDATE ON resumenes_clase
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION es_inscrito(p_curso UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM curso_inscripciones
    WHERE curso_id = p_curso AND persona_id = auth_persona_id() AND activo
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION curso_de_tema(p_tema UUID)
RETURNS UUID AS $$ SELECT curso_id FROM temas WHERE id = p_tema $$
LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION curso_de_sesion(p_sesion UUID)
RETURNS UUID AS $$
  SELECT t.curso_id FROM sesiones s JOIN temas t ON t.id = s.tema_id WHERE s.id = p_sesion
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE cursos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE curso_inscripciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE temas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales            ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE grabacion_progreso    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumenes_clase       ENABLE ROW LEVEL SECURITY;
ALTER TABLE examenes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_preguntas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_opciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_habilitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_intentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_respuestas     ENABLE ROW LEVEL SECURITY;

-- Líderes (permiso en el módulo academia): leen y administran todo.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['cursos','curso_inscripciones','temas','sesiones','materiales','asistencias',
    'grabacion_progreso','resumenes_clase','examenes','examen_preguntas','examen_opciones',
    'examen_habilitaciones','examen_intentos','examen_respuestas']
  LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tiene_permiso(''academia'', ''ver''))', t || '_lider_ver', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (tiene_permiso(''academia'', ''editar'')) WITH CHECK (tiene_permiso(''academia'', ''editar''))', t || '_lider_editar', t);
  END LOOP;
END $$;

-- Alumnos: solo lectura de lo que les corresponde.
CREATE POLICY cursos_alumno ON cursos FOR SELECT
  USING (estado <> 'borrador' AND es_inscrito(id));
CREATE POLICY inscripciones_alumno ON curso_inscripciones FOR SELECT
  USING (persona_id = auth_persona_id());
CREATE POLICY temas_alumno ON temas FOR SELECT
  USING (es_inscrito(curso_id));
CREATE POLICY sesiones_alumno ON sesiones FOR SELECT
  USING (es_inscrito(curso_de_tema(tema_id)));
CREATE POLICY materiales_alumno ON materiales FOR SELECT
  USING (es_inscrito(curso_de_tema(tema_id)));
CREATE POLICY asistencias_alumno ON asistencias FOR SELECT
  USING (persona_id = auth_persona_id());
CREATE POLICY progreso_alumno ON grabacion_progreso FOR SELECT
  USING (persona_id = auth_persona_id());
CREATE POLICY resumenes_alumno ON resumenes_clase FOR SELECT
  USING (persona_id = auth_persona_id());
CREATE POLICY examenes_alumno ON examenes FOR SELECT
  USING (estado <> 'borrador' AND es_inscrito(curso_id));
CREATE POLICY habilitaciones_alumno ON examen_habilitaciones FOR SELECT
  USING (persona_id = auth_persona_id());
CREATE POLICY intentos_alumno ON examen_intentos FOR SELECT
  USING (persona_id = auth_persona_id());
-- examen_preguntas, examen_opciones y examen_respuestas: el alumno no los lee
-- directamente; el servidor le entrega las preguntas sin las respuestas correctas.

NOTIFY pgrst, 'reload schema';
