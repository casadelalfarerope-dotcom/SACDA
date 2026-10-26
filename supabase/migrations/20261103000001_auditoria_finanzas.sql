-- =============================================================
-- Auditoría de Finanzas: quién creó, cambió o borró cada registro
-- =============================================================
-- 1. La función de auditoría ahora guarda quién hizo el cambio usando la
--    sesión (auth.uid() = id de la cuenta). Antes quedaba vacío.
-- 2. Se aplica a aportes, gastos y actividades (los fondos ya la tenían).

CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  usuario_id UUID;
BEGIN
  BEGIN
    usuario_id := (current_setting('app.usuario_id', true))::UUID;
  EXCEPTION WHEN OTHERS THEN
    usuario_id := NULL;
  END;
  usuario_id := COALESCE(usuario_id, auth.uid());

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (tabla_afectada, registro_id, accion, datos_despues, realizado_por)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', to_jsonb(NEW), usuario_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (tabla_afectada, registro_id, accion, datos_antes, datos_despues, realizado_por)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), usuario_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (tabla_afectada, registro_id, accion, datos_antes, realizado_por)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), usuario_id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_auditoria_aportes AFTER INSERT OR UPDATE OR DELETE ON aportes
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_gastos AFTER INSERT OR UPDATE OR DELETE ON gastos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_actividades_financieras AFTER INSERT OR UPDATE OR DELETE ON actividades_financieras
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_actividad_movimientos AFTER INSERT OR UPDATE OR DELETE ON actividad_movimientos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
