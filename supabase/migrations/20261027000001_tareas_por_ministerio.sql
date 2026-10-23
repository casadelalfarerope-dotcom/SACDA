-- =============================================================
-- Parte 4: tareas y capacitación dentro de cada ministerio
-- =============================================================
-- · Cada tarea (de diseño u otra) y cada tutorial pertenece a un ministerio.
-- · El líder de ese ministerio crea, asigna, aprueba o rechaza sus tareas y
--   publica sus tutoriales (antes solo podía el administrador).
-- · Las solicitudes de venta siguen siendo de Coordinación (sin ministerio).

ALTER TABLE tareas     ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL;
ALTER TABLE tutoriales ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tareas_grupo     ON tareas(grupo_id);
CREATE INDEX IF NOT EXISTS idx_tutoriales_grupo ON tutoriales(grupo_id);

-- Las tareas de diseño existentes pasan a Diseño Gráfico.
UPDATE tareas SET grupo_id = (SELECT id FROM grupos WHERE clave = 'diseno')
WHERE tipo = 'diseno' AND grupo_id IS NULL;

-- Los tutoriales toman el ministerio de su puesto.
UPDATE tutoriales t SET grupo_id = r.grupo_id
FROM roles_servicio r WHERE r.id = t.rol_servicio_id AND t.grupo_id IS NULL;

-- ¿La persona actual lidera el ministerio de esta tarea?
CREATE OR REPLACE FUNCTION es_lider_de_tarea(p_tarea UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tareas t JOIN grupos g ON g.id = t.grupo_id
    WHERE t.id = p_tarea AND g.encargado_id = auth_persona_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ---------- Tareas ----------

DROP POLICY IF EXISTS "tareas_select" ON tareas;
DROP POLICY IF EXISTS "tareas_insert" ON tareas;
DROP POLICY IF EXISTS "tareas_update" ON tareas;
DROP POLICY IF EXISTS "tareas_delete" ON tareas;

CREATE POLICY "tareas_select" ON tareas FOR SELECT USING (
  tiene_permiso(modulo_de_tarea(tipo), 'ver')
  OR asignado_id = auth_persona_id()
  OR solicitante_id = auth.uid()
  OR es_lider_de(grupo_id)
);
CREATE POLICY "tareas_insert" ON tareas FOR INSERT WITH CHECK (
  tiene_permiso(modulo_de_tarea(tipo), 'crear')
  OR (tipo <> 'solicitud_venta' AND es_lider_de(grupo_id))
  OR (tipo = 'solicitud_venta' AND solicitante_id = auth.uid() AND estado = 'pendiente'
      AND aprobado_por IS NULL AND fecha_aprobacion IS NULL)
);
CREATE POLICY "tareas_update" ON tareas FOR UPDATE USING (
  tiene_permiso(modulo_de_tarea(tipo), 'editar') OR es_lider_de(grupo_id) OR asignado_id = auth_persona_id()
);
CREATE POLICY "tareas_delete" ON tareas FOR DELETE USING (
  tiene_permiso(modulo_de_tarea(tipo), 'eliminar') OR es_lider_de(grupo_id)
);

-- El asignado (si no es encargado ni líder) solo puede avanzar su tarea.
CREATE OR REPLACE FUNCTION fn_tarea_solo_avance()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT tiene_permiso(modulo_de_tarea(OLD.tipo), 'editar')
     AND NOT es_lider_de(OLD.grupo_id) THEN
    IF NEW.estado NOT IN ('en_progreso', 'entregado')
      OR OLD.estado NOT IN ('pendiente', 'en_progreso', 'rechazado')
      OR NEW.tipo IS DISTINCT FROM OLD.tipo
      OR NEW.titulo IS DISTINCT FROM OLD.titulo
      OR NEW.descripcion IS DISTINCT FROM OLD.descripcion
      OR NEW.solicitante_id IS DISTINCT FROM OLD.solicitante_id
      OR NEW.asignado_id IS DISTINCT FROM OLD.asignado_id
      OR NEW.grupo_id IS DISTINCT FROM OLD.grupo_id
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

-- Entregas y distribución: también el líder del ministerio de la tarea.
DROP POLICY IF EXISTS "entregas_insert"  ON tarea_entregas;
DROP POLICY IF EXISTS "entregas_cambios" ON tarea_entregas;
DROP POLICY IF EXISTS "entregas_delete"  ON tarea_entregas;
CREATE POLICY "entregas_insert" ON tarea_entregas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tareas t WHERE t.id = tarea_id
    AND (t.asignado_id = auth_persona_id() OR tiene_permiso(modulo_de_tarea(t.tipo), 'editar') OR es_lider_de(t.grupo_id)))
);
CREATE POLICY "entregas_cambios" ON tarea_entregas FOR UPDATE USING (
  tiene_permiso('diseno', 'editar') OR es_lider_de_tarea(tarea_id)
);
CREATE POLICY "entregas_delete" ON tarea_entregas FOR DELETE USING (
  tiene_permiso('diseno', 'eliminar') OR es_lider_de_tarea(tarea_id)
);

DROP POLICY IF EXISTS "distribuciones_select" ON tarea_distribuciones;
DROP POLICY IF EXISTS "distribuciones_insert" ON tarea_distribuciones;
CREATE POLICY "distribuciones_select" ON tarea_distribuciones FOR SELECT USING (
  tiene_permiso('diseno', 'ver') OR en_ministerio(destino) OR es_lider_de_tarea(tarea_id)
);
CREATE POLICY "distribuciones_insert" ON tarea_distribuciones FOR INSERT WITH CHECK (
  tiene_permiso('diseno', 'editar') OR es_lider_de_tarea(tarea_id)
);

-- ---------- Tutoriales ----------

DROP POLICY IF EXISTS "tutoriales_select" ON tutoriales;
DROP POLICY IF EXISTS "tutoriales_insert" ON tutoriales;
DROP POLICY IF EXISTS "tutoriales_update" ON tutoriales;
DROP POLICY IF EXISTS "tutoriales_delete" ON tutoriales;
CREATE POLICY "tutoriales_select" ON tutoriales FOR SELECT
  USING (publicado OR tiene_permiso('capacitacion', 'ver') OR es_lider_de(grupo_id));
CREATE POLICY "tutoriales_insert" ON tutoriales FOR INSERT
  WITH CHECK (tiene_permiso('capacitacion', 'crear') OR es_lider_de(grupo_id));
CREATE POLICY "tutoriales_update" ON tutoriales FOR UPDATE
  USING (tiene_permiso('capacitacion', 'editar') OR es_lider_de(grupo_id))
  WITH CHECK (tiene_permiso('capacitacion', 'editar') OR es_lider_de(grupo_id));
CREATE POLICY "tutoriales_delete" ON tutoriales FOR DELETE
  USING (tiene_permiso('capacitacion', 'eliminar') OR es_lider_de(grupo_id));
