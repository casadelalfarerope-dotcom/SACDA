-- =============================================================
-- Google Calendar (opción C): la cuenta de Google de la iglesia
-- crea los eventos e invita a cada hermano que lo pidió.
-- =============================================================

-- 1. Eventos presenciales, virtuales o mixtos, con enlace de reunión.
ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS modalidad TEXT NOT NULL DEFAULT 'presencial'
    CHECK (modalidad IN ('presencial', 'virtual', 'mixto')),
  ADD COLUMN IF NOT EXISTS enlace_reunion TEXT,          -- Meet, Zoom u otro (pegado a mano)
  ADD COLUMN IF NOT EXISTS crear_meet BOOLEAN NOT NULL DEFAULT false,  -- Google genera el Meet
  ADD COLUMN IF NOT EXISTS sincronizar_google BOOLEAN NOT NULL DEFAULT true;

-- 2. Conexión con la cuenta de Google de la iglesia (una sola fila).
-- Sin políticas: solo el servidor (service role) la lee y escribe.
CREATE TABLE IF NOT EXISTS google_conexion (
  id             INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  correo         TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  calendario_id  TEXT,                 -- calendario "Casa del Alfarero" dentro de esa cuenta
  conectado_por  UUID REFERENCES personas(id) ON DELETE SET NULL,
  ultima_sync    TIMESTAMPTZ,
  ultimo_error   TEXT,
  bloqueo        TIMESTAMPTZ,          -- evita dos sincronizaciones a la vez
  pendiente      BOOLEAN NOT NULL DEFAULT false,  -- hubo cambios durante una sincronización
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE google_conexion ENABLE ROW LEVEL SECURITY;

-- 3. Qué evento del sistema corresponde a qué evento de Google.
-- clave: 'ev:<evento>:<fecha>' (un día de un evento), 'tu:<asignación>' (turno),
--        'se:<sesión>' (Academia). huella: resumen de los datos enviados.
CREATE TABLE IF NOT EXISTS google_sync (
  clave            TEXT PRIMARY KEY,
  google_event_id  TEXT NOT NULL,
  fecha            DATE NOT NULL,
  huella           TEXT NOT NULL,
  enlace_meet      TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_google_sync_fecha ON google_sync(fecha);
ALTER TABLE google_sync ENABLE ROW LEVEL SECURITY;
-- El enlace de Meet generado se muestra en la app a quien ve el calendario.
CREATE POLICY google_sync_select ON google_sync FOR SELECT TO authenticated USING (true);

-- 4. Preferencias de cada hermano (desde su configuración).
-- tipos: 'cultos', 'especiales', 'ministerio', 'turnos', 'academia'
CREATE TABLE IF NOT EXISTS google_preferencias (
  persona_id  UUID PRIMARY KEY REFERENCES personas(id) ON DELETE CASCADE,
  activo      BOOLEAN NOT NULL DEFAULT false,
  correo      TEXT,
  tipos       TEXT[] NOT NULL DEFAULT ARRAY['cultos', 'especiales', 'ministerio', 'turnos', 'academia'],
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE google_preferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY google_pref_propia ON google_preferencias FOR ALL TO authenticated
  USING (persona_id = auth_persona_id()) WITH CHECK (persona_id = auth_persona_id());
