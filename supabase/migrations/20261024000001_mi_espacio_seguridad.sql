-- =============================================================
-- Mi espacio: seguridad por fila para servidores y estudiantes
-- =============================================================
-- Hasta ahora las tablas de las fases 3 y 4 permitían leer y escribir a
-- cualquier usuario con cuenta (los permisos se revisaban solo en la app).
-- Como servidores y estudiantes tendrán cuenta, cada tabla pasa a exigir:
--   · permiso del módulo (panel de permisos), o
--   · que el registro sea de la propia persona.

-- ---------- Helpers ----------

-- Módulo de permisos que corresponde a cada tipo de tarea.
CREATE OR REPLACE FUNCTION modulo_de_tarea(p_tipo TEXT)
RETURNS TEXT AS $$
  SELECT CASE p_tipo
    WHEN 'solicitud_venta' THEN 'ventas'
    WHEN 'capacitacion'    THEN 'capacitacion'
    ELSE 'diseno'
  END
$$ LANGUAGE sql IMMUTABLE;

-- ¿La persona actual tiene este rol (activo y vigente)?
CREATE OR REPLACE FUNCTION tiene_rol(p_rol TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM roles_asignados ra JOIN roles r ON r.id = ra.rol_id
    WHERE ra.persona_id = auth_persona_id() AND ra.activo = true
      AND (ra.fecha_fin IS NULL OR ra.fecha_fin >= CURRENT_DATE)
      AND r.nombre = p_rol
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------- Ficha personal ----------

-- Cada persona puede leer su propia ficha (además de quien tiene permiso).
CREATE POLICY "personas_select_propia" ON personas
  FOR SELECT USING (id = auth_persona_id());

-- Edición propia solo de datos de contacto y foto; nombre, DNI, fecha de
-- nacimiento, ministerio y estado los cambia un líder.
CREATE OR REPLACE FUNCTION actualizar_mi_contacto(
  p_telefono TEXT, p_email TEXT, p_direccion TEXT, p_foto_url TEXT
) RETURNS VOID AS $$
BEGIN
  IF auth_persona_id() IS NULL THEN
    RAISE EXCEPTION 'No tienes una ficha vinculada a tu cuenta';
  END IF;
  UPDATE personas SET
    telefono  = NULLIF(trim(p_telefono), ''),
    email     = NULLIF(trim(p_email), ''),
    direccion = NULLIF(trim(p_direccion), ''),
    foto_url  = NULLIF(trim(p_foto_url), '')
  WHERE id = auth_persona_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION actualizar_mi_contacto(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION actualizar_mi_contacto(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ---------- Finanzas ----------

DROP POLICY "aportes_read"                  ON aportes;
DROP POLICY "aportes_write"                 ON aportes;
DROP POLICY "gastos_read"                   ON gastos;
DROP POLICY "gastos_write"                  ON gastos;
DROP POLICY "actividades_financieras_read"  ON actividades_financieras;
DROP POLICY "actividades_financieras_write" ON actividades_financieras;
DROP POLICY "actividad_movimientos_read"    ON actividad_movimientos;
DROP POLICY "actividad_movimientos_write"   ON actividad_movimientos;

-- Cada persona ve sus propios aportes; solo lectura.
CREATE POLICY "aportes_select" ON aportes FOR SELECT
  USING (tiene_permiso('finanzas', 'ver') OR persona_id = auth_persona_id());
CREATE POLICY "aportes_insert" ON aportes FOR INSERT WITH CHECK (tiene_permiso('finanzas', 'crear'));
CREATE POLICY "aportes_update" ON aportes FOR UPDATE USING (tiene_permiso('finanzas', 'editar'));
CREATE POLICY "aportes_delete" ON aportes FOR DELETE USING (tiene_permiso('finanzas', 'eliminar'));

CREATE POLICY "gastos_select" ON gastos FOR SELECT USING (tiene_permiso('finanzas', 'ver'));
CREATE POLICY "gastos_insert" ON gastos FOR INSERT WITH CHECK (tiene_permiso('finanzas', 'crear'));
CREATE POLICY "gastos_update" ON gastos FOR UPDATE USING (tiene_permiso('finanzas', 'editar'));
CREATE POLICY "gastos_delete" ON gastos FOR DELETE USING (tiene_permiso('finanzas', 'eliminar'));

CREATE POLICY "actividades_select" ON actividades_financieras FOR SELECT USING (tiene_permiso('finanzas', 'ver'));
CREATE POLICY "actividades_insert" ON actividades_financieras FOR INSERT WITH CHECK (tiene_permiso('finanzas', 'crear'));
CREATE POLICY "actividades_update" ON actividades_financieras FOR UPDATE USING (tiene_permiso('finanzas', 'editar'));
CREATE POLICY "actividades_delete" ON actividades_financieras FOR DELETE USING (tiene_permiso('finanzas', 'eliminar'));

CREATE POLICY "movimientos_select" ON actividad_movimientos FOR SELECT USING (tiene_permiso('finanzas', 'ver'));
CREATE POLICY "movimientos_insert" ON actividad_movimientos FOR INSERT WITH CHECK (tiene_permiso('finanzas', 'crear'));
CREATE POLICY "movimientos_update" ON actividad_movimientos FOR UPDATE USING (tiene_permiso('finanzas', 'editar'));
CREATE POLICY "movimientos_delete" ON actividad_movimientos FOR DELETE USING (tiene_permiso('finanzas', 'eliminar'));

-- ---------- Inventario ----------

DROP POLICY IF EXISTS "bienes_read"                  ON bienes;
DROP POLICY IF EXISTS "bienes_write"                 ON bienes;
DROP POLICY IF EXISTS "mantenimiento_historial_read"  ON mantenimiento_historial;
DROP POLICY IF EXISTS "mantenimiento_historial_write" ON mantenimiento_historial;

CREATE POLICY "bienes_select" ON bienes FOR SELECT USING (tiene_permiso('inventario', 'ver'));
CREATE POLICY "bienes_insert" ON bienes FOR INSERT WITH CHECK (tiene_permiso('inventario', 'crear'));
CREATE POLICY "bienes_update" ON bienes FOR UPDATE USING (tiene_permiso('inventario', 'editar'));
CREATE POLICY "bienes_delete" ON bienes FOR DELETE USING (tiene_permiso('inventario', 'eliminar'));

CREATE POLICY "mantenimiento_select" ON mantenimiento_historial FOR SELECT USING (tiene_permiso('inventario', 'ver'));
CREATE POLICY "mantenimiento_insert" ON mantenimiento_historial FOR INSERT WITH CHECK (tiene_permiso('inventario', 'crear'));
CREATE POLICY "mantenimiento_update" ON mantenimiento_historial FOR UPDATE USING (tiene_permiso('inventario', 'editar'));
CREATE POLICY "mantenimiento_delete" ON mantenimiento_historial FOR DELETE USING (tiene_permiso('inventario', 'eliminar'));

-- ---------- Servidores ----------

DROP POLICY "programas_read"               ON programas;
DROP POLICY "programas_write"              ON programas;
DROP POLICY "programa_asignaciones_read"   ON programa_asignaciones;
DROP POLICY "programa_asignaciones_write"  ON programa_asignaciones;
DROP POLICY "rotacion_configuracion_read"  ON rotacion_configuracion;
DROP POLICY "rotacion_configuracion_write" ON rotacion_configuracion;
DROP POLICY "rotacion_miembros_read"       ON rotacion_miembros;
DROP POLICY "rotacion_miembros_write"      ON rotacion_miembros;
DROP POLICY "roles_servicio_write"         ON roles_servicio;
-- "roles_servicio_read" se mantiene: es un catálogo sin datos personales.

CREATE POLICY "roles_servicio_insert" ON roles_servicio FOR INSERT WITH CHECK (tiene_permiso('servidores', 'crear'));
CREATE POLICY "roles_servicio_update" ON roles_servicio FOR UPDATE USING (tiene_permiso('servidores', 'editar'));
CREATE POLICY "roles_servicio_delete" ON roles_servicio FOR DELETE USING (tiene_permiso('servidores', 'eliminar'));

-- El servidor ve los programas publicados donde le toca servir.
CREATE POLICY "programas_select" ON programas FOR SELECT USING (
  tiene_permiso('servidores', 'ver')
  OR (estado = 'publicado' AND EXISTS (
    SELECT 1 FROM programa_asignaciones pa
    WHERE pa.programa_id = programas.id AND pa.persona_id = auth_persona_id()))
);
CREATE POLICY "programas_insert" ON programas FOR INSERT WITH CHECK (tiene_permiso('servidores', 'crear'));
CREATE POLICY "programas_update" ON programas FOR UPDATE USING (tiene_permiso('servidores', 'editar'));
CREATE POLICY "programas_delete" ON programas FOR DELETE USING (tiene_permiso('servidores', 'eliminar'));

-- Ve sus propios turnos y sube su material (el trigger de abajo impide
-- que cambie otra cosa).
CREATE POLICY "asignaciones_select" ON programa_asignaciones FOR SELECT
  USING (tiene_permiso('servidores', 'ver') OR persona_id = auth_persona_id());
CREATE POLICY "asignaciones_insert" ON programa_asignaciones FOR INSERT WITH CHECK (tiene_permiso('servidores', 'crear'));
CREATE POLICY "asignaciones_update" ON programa_asignaciones FOR UPDATE
  USING (tiene_permiso('servidores', 'editar') OR persona_id = auth_persona_id());
CREATE POLICY "asignaciones_delete" ON programa_asignaciones FOR DELETE USING (tiene_permiso('servidores', 'eliminar'));

CREATE OR REPLACE FUNCTION fn_asignacion_solo_material()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT tiene_permiso('servidores', 'editar') THEN
    IF NEW.programa_id IS DISTINCT FROM OLD.programa_id
      OR NEW.rol_servicio_id IS DISTINCT FROM OLD.rol_servicio_id
      OR NEW.persona_id IS DISTINCT FROM OLD.persona_id
      OR NEW.notas IS DISTINCT FROM OLD.notas THEN
      RAISE EXCEPTION 'Solo puedes subir el material de tu turno';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asignacion_solo_material
  BEFORE UPDATE ON programa_asignaciones
  FOR EACH ROW EXECUTE FUNCTION fn_asignacion_solo_material();

CREATE POLICY "rotacion_configuracion_select" ON rotacion_configuracion FOR SELECT USING (tiene_permiso('servidores', 'ver'));
CREATE POLICY "rotacion_configuracion_cambios" ON rotacion_configuracion FOR ALL
  USING (tiene_permiso('servidores', 'editar')) WITH CHECK (tiene_permiso('servidores', 'editar'));
CREATE POLICY "rotacion_miembros_select" ON rotacion_miembros FOR SELECT USING (tiene_permiso('servidores', 'ver'));
CREATE POLICY "rotacion_miembros_cambios" ON rotacion_miembros FOR ALL
  USING (tiene_permiso('servidores', 'editar')) WITH CHECK (tiene_permiso('servidores', 'editar'));

-- ---------- Capacitación ----------

DROP POLICY "tutoriales_read"         ON tutoriales;
DROP POLICY "tutoriales_write"        ON tutoriales;
DROP POLICY "tutorial_progreso_read"  ON tutorial_progreso;
DROP POLICY "tutorial_progreso_write" ON tutorial_progreso;

CREATE POLICY "tutoriales_select" ON tutoriales FOR SELECT
  USING (publicado OR tiene_permiso('capacitacion', 'ver'));
CREATE POLICY "tutoriales_insert" ON tutoriales FOR INSERT WITH CHECK (tiene_permiso('capacitacion', 'crear'));
CREATE POLICY "tutoriales_update" ON tutoriales FOR UPDATE USING (tiene_permiso('capacitacion', 'editar'));
CREATE POLICY "tutoriales_delete" ON tutoriales FOR DELETE USING (tiene_permiso('capacitacion', 'eliminar'));

-- Cada persona marca su propio avance.
CREATE POLICY "progreso_select" ON tutorial_progreso FOR SELECT
  USING (tiene_permiso('capacitacion', 'ver') OR persona_id = auth_persona_id());
CREATE POLICY "progreso_propio" ON tutorial_progreso FOR ALL
  USING (persona_id = auth_persona_id() OR tiene_permiso('capacitacion', 'editar'))
  WITH CHECK (persona_id = auth_persona_id() OR tiene_permiso('capacitacion', 'editar'));

-- ---------- Tareas, solicitudes de venta y entregas ----------

DROP POLICY "tareas_read"                ON tareas;
DROP POLICY "tareas_write"               ON tareas;
DROP POLICY "tarea_entregas_read"        ON tarea_entregas;
DROP POLICY "tarea_entregas_write"       ON tarea_entregas;
DROP POLICY "tarea_distribuciones_read"  ON tarea_distribuciones;
DROP POLICY "tarea_distribuciones_write" ON tarea_distribuciones;

-- Ve las tareas que le asignaron y las solicitudes que hizo.
CREATE POLICY "tareas_select" ON tareas FOR SELECT USING (
  tiene_permiso(modulo_de_tarea(tipo), 'ver')
  OR asignado_id = auth_persona_id()
  OR solicitante_id = auth.uid()
);
-- Cualquiera con cuenta puede pedir una venta (queda pendiente); el resto
-- de tareas solo las crea quien tiene permiso.
CREATE POLICY "tareas_insert" ON tareas FOR INSERT WITH CHECK (
  tiene_permiso(modulo_de_tarea(tipo), 'crear')
  OR (tipo = 'solicitud_venta' AND solicitante_id = auth.uid() AND estado = 'pendiente'
      AND aprobado_por IS NULL AND fecha_aprobacion IS NULL)
);
CREATE POLICY "tareas_update" ON tareas FOR UPDATE USING (
  tiene_permiso(modulo_de_tarea(tipo), 'editar') OR asignado_id = auth_persona_id()
);
CREATE POLICY "tareas_delete" ON tareas FOR DELETE USING (tiene_permiso(modulo_de_tarea(tipo), 'eliminar'));

-- Quien solo es el asignado puede avanzar su tarea a "en progreso" o
-- "entregado", nunca aprobarla ni cambiar sus datos.
CREATE OR REPLACE FUNCTION fn_tarea_solo_avance()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT tiene_permiso(modulo_de_tarea(OLD.tipo), 'editar') THEN
    IF NEW.estado NOT IN ('en_progreso', 'entregado')
      OR OLD.estado NOT IN ('pendiente', 'en_progreso', 'rechazado')
      OR NEW.tipo IS DISTINCT FROM OLD.tipo
      OR NEW.titulo IS DISTINCT FROM OLD.titulo
      OR NEW.descripcion IS DISTINCT FROM OLD.descripcion
      OR NEW.solicitante_id IS DISTINCT FROM OLD.solicitante_id
      OR NEW.asignado_id IS DISTINCT FROM OLD.asignado_id
      OR NEW.evento_id IS DISTINCT FROM OLD.evento_id
      OR NEW.fecha_limite IS DISTINCT FROM OLD.fecha_limite
      OR NEW.aprobado_por IS DISTINCT FROM OLD.aprobado_por
      OR NEW.fecha_aprobacion IS DISTINCT FROM OLD.fecha_aprobacion
      OR NEW.feedback_rechazo IS DISTINCT FROM OLD.feedback_rechazo THEN
      RAISE EXCEPTION 'Solo puedes marcar tu tarea como en progreso o entregada';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tarea_solo_avance
  BEFORE UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION fn_tarea_solo_avance();

-- Entregas: las ve quien ve la tarea; las crea el asignado o un encargado.
CREATE POLICY "entregas_select" ON tarea_entregas FOR SELECT
  USING (EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_id));
CREATE POLICY "entregas_insert" ON tarea_entregas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_id
    AND (t.asignado_id = auth_persona_id() OR tiene_permiso(modulo_de_tarea(t.tipo), 'editar')))
);
CREATE POLICY "entregas_cambios" ON tarea_entregas FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_id AND tiene_permiso(modulo_de_tarea(t.tipo), 'editar'))
);
CREATE POLICY "entregas_delete" ON tarea_entregas FOR DELETE USING (
  EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_id AND tiene_permiso(modulo_de_tarea(t.tipo), 'eliminar'))
);

-- Distribuciones: las ve y confirma el equipo de destino (Multimedia o
-- Impresiones); las crea el encargado al aprobar.
CREATE POLICY "distribuciones_select" ON tarea_distribuciones FOR SELECT USING (
  tiene_permiso('diseno', 'ver') OR tiene_rol(destino)
);
CREATE POLICY "distribuciones_insert" ON tarea_distribuciones FOR INSERT WITH CHECK (tiene_permiso('diseno', 'editar'));
CREATE POLICY "distribuciones_update" ON tarea_distribuciones FOR UPDATE
  USING (tiene_permiso('diseno', 'editar') OR tiene_rol(destino))
  WITH CHECK (tiene_permiso('diseno', 'editar') OR tiene_rol(destino));
CREATE POLICY "distribuciones_delete" ON tarea_distribuciones FOR DELETE USING (tiene_permiso('diseno', 'eliminar'));

-- ---------- Control interno de cumpleaños ----------
-- Solo lo usa el servidor (cliente de servicio, que ignora RLS).
DROP POLICY "notif_cumple_all" ON notif_cumpleanios_enviadas;
CREATE POLICY "notif_cumple_select" ON notif_cumpleanios_enviadas FOR SELECT USING (tiene_permiso('miembros', 'ver'));
