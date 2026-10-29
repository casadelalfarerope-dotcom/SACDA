-- =============================================================
-- Google Calendar: los cultos y los eventos especiales van en
-- calendarios compartidos ("Casa del Alfarero · Cultos" y
-- "Casa del Alfarero · Eventos especiales"). A cada hermano se le
-- comparte el calendario una sola vez, en vez de invitarlo a cada
-- evento (Google ocultaba esas invitaciones).
-- =============================================================

ALTER TABLE google_conexion
  ADD COLUMN IF NOT EXISTS calendario_cultos     TEXT,
  ADD COLUMN IF NOT EXISTS calendario_especiales TEXT;

-- A quién se compartió cada calendario. Solo lo usa el servidor.
CREATE TABLE IF NOT EXISTS google_compartidos (
  calendario  TEXT NOT NULL,   -- 'cultos' o 'especiales'
  correo      TEXT NOT NULL,
  regla_id    TEXT NOT NULL,   -- id de la regla de acceso en Google
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (calendario, correo)
);
ALTER TABLE google_compartidos ENABLE ROW LEVEL SECURITY;
