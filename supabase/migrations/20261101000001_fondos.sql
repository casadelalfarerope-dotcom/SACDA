-- =============================================================
-- Fondos: dinero apartado para un ministerio o una meta
-- =============================================================
-- El "Fondo General" no es una fila: es todo lo que no tiene fondo_id.
-- Cada fondo tiene saldo propio:
--   aportes y actividades del fondo + ingresos sueltos
--   − gastos del fondo − egresos sueltos
-- Los ingresos/egresos sueltos (fondo_movimientos) los registran Tesorería
-- o el líder del ministerio dueño del fondo, sin aprobación.
-- Un traspaso es un movimiento con traspaso = true. Si va entre dos fondos son
-- dos filas con el mismo traspaso_id; si una punta es el Fondo General, es una
-- sola fila y el General se ajusta al revés.
-- El saldo puede quedar en negativo (adelantos), la app solo avisa.

CREATE TABLE fondos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  grupo_id    UUID REFERENCES grupos(id) ON DELETE SET NULL,   -- ministerio dueño (opcional)
  meta        NUMERIC(12,2) CHECK (meta IS NULL OR meta > 0),  -- monto objetivo (opcional)
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fondos_grupo ON fondos(grupo_id);
CREATE TRIGGER trg_fondos_updated BEFORE UPDATE ON fondos FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TABLE fondo_movimientos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fondo_id       UUID NOT NULL REFERENCES fondos(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  concepto       TEXT NOT NULL,
  monto          NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha          DATE NOT NULL,
  traspaso       BOOLEAN NOT NULL DEFAULT false,
  traspaso_id    UUID,
  registrado_por UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fondo_mov_fondo ON fondo_movimientos(fondo_id, fecha);

ALTER TABLE aportes                 ADD COLUMN fondo_id UUID REFERENCES fondos(id) ON DELETE SET NULL;
ALTER TABLE gastos                  ADD COLUMN fondo_id UUID REFERENCES fondos(id) ON DELETE SET NULL;
ALTER TABLE actividades_financieras ADD COLUMN fondo_id UUID REFERENCES fondos(id) ON DELETE SET NULL;

-- Auditoría: el dinero de los fondos queda registrado (quién cambió qué).
CREATE TRIGGER trg_auditoria_fondos AFTER INSERT OR UPDATE OR DELETE ON fondos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_fondo_movimientos AFTER INSERT OR UPDATE OR DELETE ON fondo_movimientos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

-- ¿La persona actual lidera el ministerio dueño del fondo?
CREATE OR REPLACE FUNCTION es_lider_de_fondo(p_fondo UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM fondos f JOIN grupos g ON g.id = f.grupo_id
    WHERE f.id = p_fondo AND g.encargado_id = auth_persona_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

ALTER TABLE fondos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fondo_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fondos_select" ON fondos FOR SELECT
  USING (tiene_permiso('finanzas', 'ver') OR es_lider_de(grupo_id));
CREATE POLICY "fondos_insert" ON fondos FOR INSERT WITH CHECK (tiene_permiso('finanzas', 'crear'));
CREATE POLICY "fondos_update" ON fondos FOR UPDATE USING (tiene_permiso('finanzas', 'editar'));
CREATE POLICY "fondos_delete" ON fondos FOR DELETE USING (tiene_permiso('finanzas', 'eliminar'));

CREATE POLICY "fondo_mov_select" ON fondo_movimientos FOR SELECT
  USING (tiene_permiso('finanzas', 'ver') OR es_lider_de_fondo(fondo_id));
-- El líder registra ingresos y egresos de su fondo; los traspasos son de Tesorería.
CREATE POLICY "fondo_mov_insert" ON fondo_movimientos FOR INSERT
  WITH CHECK (tiene_permiso('finanzas', 'crear') OR (es_lider_de_fondo(fondo_id) AND NOT traspaso));
-- El líder solo corrige o borra lo que él mismo registró.
CREATE POLICY "fondo_mov_update" ON fondo_movimientos FOR UPDATE
  USING (tiene_permiso('finanzas', 'editar') OR (es_lider_de_fondo(fondo_id) AND NOT traspaso AND registrado_por = auth_persona_id()));
CREATE POLICY "fondo_mov_delete" ON fondo_movimientos FOR DELETE
  USING (tiene_permiso('finanzas', 'eliminar') OR (es_lider_de_fondo(fondo_id) AND NOT traspaso AND registrado_por = auth_persona_id()));
