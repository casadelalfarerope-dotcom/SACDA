-- =============================================================
-- FASE 4: Finanzas, Inventario y Solicitudes de Venta
-- =============================================================

-- ===== 5.9 FINANZAS =====

CREATE TABLE aportes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id      uuid        NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
  tipo            text        NOT NULL CHECK (tipo IN ('ofrenda','diezmo','pacto','otro')),
  monto           numeric(12,2) NOT NULL CHECK (monto > 0),
  fecha           date        NOT NULL,
  concepto        text,
  registrado_por  uuid        REFERENCES cuentas(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gastos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto        text        NOT NULL,
  monto           numeric(12,2) NOT NULL CHECK (monto > 0),
  fecha           date        NOT NULL,
  categoria       text        NOT NULL DEFAULT 'otros',
  descripcion     text,
  registrado_por  uuid        REFERENCES cuentas(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE actividades_financieras (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  fecha       date        NOT NULL,
  descripcion text,
  evento_id   uuid        REFERENCES eventos(id) ON DELETE SET NULL,
  created_by  uuid        REFERENCES cuentas(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE actividad_movimientos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id    uuid        NOT NULL REFERENCES actividades_financieras(id) ON DELETE CASCADE,
  tipo            text        NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  concepto        text        NOT NULL,
  monto           numeric(12,2) NOT NULL CHECK (monto > 0),
  fecha           date        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ===== 5.10 INVENTARIO =====

CREATE TABLE bienes (
  id                           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                       text        NOT NULL,
  descripcion                  text,
  categoria                    text        NOT NULL DEFAULT 'otro'
                               CHECK (categoria IN ('instrumento','equipo_audio','equipo_video','mobiliario','otro')),
  numero_serie                 text,
  fecha_compra                 date,
  valor_compra                 numeric(12,2),
  vida_util_anios              int,
  estado                       text        NOT NULL DEFAULT 'bueno'
                               CHECK (estado IN ('bueno','regular','malo','baja')),
  proximo_mantenimiento        date,
  intervalo_mantenimiento_dias int,
  ubicacion                    text,
  notas                        text,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mantenimiento_historial (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id        uuid        NOT NULL REFERENCES bienes(id) ON DELETE CASCADE,
  fecha          date        NOT NULL,
  descripcion    text        NOT NULL,
  costo          numeric(12,2),
  realizado_por  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ===== TRIGGERS =====

CREATE TRIGGER trg_actividades_updated_at
  BEFORE UPDATE ON actividades_financieras
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TRIGGER trg_bienes_updated_at
  BEFORE UPDATE ON bienes
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- ===== RLS =====

ALTER TABLE aportes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades_financieras   ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividad_movimientos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimiento_historial   ENABLE ROW LEVEL SECURITY;

-- Lectura: autenticados
CREATE POLICY "aportes_read"                 ON aportes                 FOR SELECT TO authenticated USING (true);
CREATE POLICY "gastos_read"                  ON gastos                  FOR SELECT TO authenticated USING (true);
CREATE POLICY "actividades_financieras_read" ON actividades_financieras FOR SELECT TO authenticated USING (true);
CREATE POLICY "actividad_movimientos_read"   ON actividad_movimientos   FOR SELECT TO authenticated USING (true);
CREATE POLICY "bienes_read"                  ON bienes                  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mantenimiento_historial_read" ON mantenimiento_historial FOR SELECT TO authenticated USING (true);

-- Escritura: autenticados (permisos finos en la app)
CREATE POLICY "aportes_write"                 ON aportes                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "gastos_write"                  ON gastos                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "actividades_financieras_write" ON actividades_financieras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "actividad_movimientos_write"   ON actividad_movimientos   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bienes_write"                  ON bienes                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mantenimiento_historial_write" ON mantenimiento_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
