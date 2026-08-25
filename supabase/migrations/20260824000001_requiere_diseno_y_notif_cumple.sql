-- ============================================================
-- Automatizaciones: requiere_diseno en eventos,
-- control de notificaciones de cumpleaños
-- ============================================================

-- Campo en eventos para disparar tarea de diseño
ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS requiere_diseno    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tarea_diseno_id    UUID REFERENCES tareas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dias_aviso_diseno  INT NOT NULL DEFAULT 7;

-- Control de notificaciones de cumpleaños para no re-enviar
-- cada día mientras la persona esté dentro de la ventana de aviso
CREATE TABLE IF NOT EXISTS notif_cumpleanios_enviadas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id  UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  anio        INT NOT NULL,
  enviado_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (persona_id, anio)
);

ALTER TABLE notif_cumpleanios_enviadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_cumple_all" ON notif_cumpleanios_enviadas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
