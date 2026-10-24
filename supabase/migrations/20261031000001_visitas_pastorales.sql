-- =============================================================
-- Visitas pastorales (ir a la casa de un hermano)
-- =============================================================
-- Se programan desde "Faltaron" (o desde la ficha): fecha, quién irá y el
-- resultado. Por ahora las gestiona quien tiene el permiso de Seguimiento
-- (Coordinación / Administrador). Lo que antes se llamaba "Visitas"
-- (seguimiento_visitas) son las personas nuevas que vienen por primera vez.

CREATE TABLE visitas_pastorales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id     UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  fecha          DATE NOT NULL,
  responsable_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  estado         TEXT NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'realizada', 'cancelada')),
  motivo         TEXT,       -- por qué se le visita (p. ej. faltó 3 cultos)
  nota           TEXT,       -- cómo le fue
  ausencia_id    UUID REFERENCES ausencias(id) ON DELETE SET NULL,
  creado_por     UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visitas_pastorales_fecha ON visitas_pastorales(fecha);
CREATE INDEX idx_visitas_pastorales_persona ON visitas_pastorales(persona_id);

CREATE TRIGGER trg_visitas_pastorales_updated BEFORE UPDATE ON visitas_pastorales
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

ALTER TABLE visitas_pastorales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitas_pastorales_select" ON visitas_pastorales FOR SELECT
  USING (tiene_permiso('miembros', 'ver') OR responsable_id = auth_persona_id());
CREATE POLICY "visitas_pastorales_insert" ON visitas_pastorales FOR INSERT WITH CHECK (tiene_permiso('miembros', 'crear'));
CREATE POLICY "visitas_pastorales_update" ON visitas_pastorales FOR UPDATE
  USING (tiene_permiso('miembros', 'editar') OR responsable_id = auth_persona_id());
CREATE POLICY "visitas_pastorales_delete" ON visitas_pastorales FOR DELETE USING (tiene_permiso('miembros', 'eliminar'));
