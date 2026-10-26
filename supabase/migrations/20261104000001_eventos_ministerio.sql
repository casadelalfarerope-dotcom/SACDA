-- =============================================================
-- Eventos del ministerio (Parte 1): agenda propia y asistencia
-- =============================================================
-- Un evento con grupo_id es del ministerio (ensayos, devocionales, reuniones).
-- Sin grupo_id es de toda la iglesia, como hasta ahora.
-- La asistencia del ministerio va en tablas propias: no genera ausencias en
-- Seguimiento ni cuenta en las estadísticas de la iglesia.

CREATE INDEX IF NOT EXISTS idx_eventos_grupo ON eventos(grupo_id);

-- ¿La persona actual lidera este ministerio o el ministerio padre?
CREATE OR REPLACE FUNCTION es_lider_o_padre(p_grupo UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM grupos g
    LEFT JOIN grupos padre ON padre.id = g.grupo_padre_id
    WHERE g.id = p_grupo
      AND (g.encargado_id = auth_persona_id() OR padre.encargado_id = auth_persona_id())
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ¿Puede gestionar la asistencia del evento? (Administración / Coordinación o su líder)
CREATE OR REPLACE FUNCTION gestiona_evento_ministerio(p_evento UUID)
RETURNS BOOLEAN AS $$
  SELECT tiene_permiso('ministerios', 'editar') OR EXISTS (
    SELECT 1 FROM eventos e WHERE e.id = p_evento AND e.grupo_id IS NOT NULL AND es_lider_o_padre(e.grupo_id)
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Quién vino a cada reunión del ministerio (solo se guardan los presentes).
CREATE TABLE asistencia_ministerio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,   -- fecha original de la serie
  persona_id  UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  marcado_por UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, fecha, persona_id)
);
CREATE INDEX idx_asistencia_ministerio_dia ON asistencia_ministerio(evento_id, fecha);

-- Fechas en que se pasó lista (para saber a qué reuniones faltó cada uno).
CREATE TABLE asistencia_ministerio_listas (
  evento_id  UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, fecha)
);

ALTER TABLE asistencia_ministerio        ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_ministerio_listas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asis_min_select" ON asistencia_ministerio FOR SELECT
  USING (gestiona_evento_ministerio(evento_id) OR persona_id = auth_persona_id());
CREATE POLICY "asis_min_write" ON asistencia_ministerio FOR ALL
  USING (gestiona_evento_ministerio(evento_id)) WITH CHECK (gestiona_evento_ministerio(evento_id));

CREATE POLICY "asis_min_listas_select" ON asistencia_ministerio_listas FOR SELECT
  USING (gestiona_evento_ministerio(evento_id));
CREATE POLICY "asis_min_listas_write" ON asistencia_ministerio_listas FOR ALL
  USING (gestiona_evento_ministerio(evento_id)) WITH CHECK (gestiona_evento_ministerio(evento_id));
