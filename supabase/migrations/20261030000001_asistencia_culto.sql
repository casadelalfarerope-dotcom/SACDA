-- =============================================================
-- Asistencia a los cultos (pasar lista)
-- =============================================================
-- · Cada evento indica si en él se toma asistencia (los cultos de servicio,
--   por defecto sí).
-- · Solo se guarda a quienes VINIERON: por defecto todos "no vinieron".
-- · Al cerrar la lista (al día siguiente, o manualmente), quienes no vinieron
--   pasan a "ausencias" por contactar, donde luego se agrega el motivo.

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS requiere_asistencia BOOLEAN NOT NULL DEFAULT false;
UPDATE eventos SET requiere_asistencia = true WHERE tipo = 'servicio';

-- Quién vino a cada día de un evento (fecha = día original de la serie).
CREATE TABLE asistencia_culto (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id   UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  persona_id  UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  marcado_por UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, fecha, persona_id)
);
CREATE INDEX idx_asistencia_culto_dia ON asistencia_culto(evento_id, fecha);

-- Listas ya cerradas (sus ausencias ya se generaron).
CREATE TABLE asistencia_culto_cierres (
  evento_id  UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL,
  cerrada_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, fecha)
);

-- La ausencia recuerda de qué culto viene (para no duplicarla).
ALTER TABLE ausencias ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES eventos(id) ON DELETE SET NULL;
-- Índice único completo (no parcial) para poder usar ON CONFLICT; las ausencias
-- registradas a mano tienen evento_id nulo y no chocan entre sí.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ausencia_culto ON ausencias(evento_id, fecha, persona_id);

ALTER TABLE asistencia_culto         ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia_culto_cierres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asistencia_culto_select" ON asistencia_culto FOR SELECT USING (tiene_permiso('miembros', 'ver'));
CREATE POLICY "asistencia_culto_insert" ON asistencia_culto FOR INSERT WITH CHECK (tiene_permiso('miembros', 'crear'));
CREATE POLICY "asistencia_culto_delete" ON asistencia_culto FOR DELETE USING (tiene_permiso('miembros', 'crear'));

CREATE POLICY "cierres_select" ON asistencia_culto_cierres FOR SELECT USING (tiene_permiso('miembros', 'ver'));
CREATE POLICY "cierres_cambios" ON asistencia_culto_cierres FOR ALL
  USING (tiene_permiso('miembros', 'crear')) WITH CHECK (tiene_permiso('miembros', 'crear'));
