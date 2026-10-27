-- =============================================================
-- Varios líderes y ayudantes por ministerio (como admins de WhatsApp)
-- =============================================================
-- El rol de cada integrante va en grupo_miembros.rol_en_grupo:
--   'lider'    → todos los permisos del ministerio (todos iguales)
--   'ayudante' → lo operativo: agenda, pasar lista, programar y publicar turnos
--   NULL       → integrante
-- grupos.encargado_id queda como "líder de contacto" (solo informativo); su
-- persona también es líder en grupo_miembros.
-- El líder del ministerio padre sigue liderando sus subgrupos.

-- 1. Limpiar valores antiguos y pasar al líder actual como integrante líder.
UPDATE grupo_miembros SET rol_en_grupo = NULL WHERE rol_en_grupo IS NOT NULL AND rol_en_grupo NOT IN ('lider', 'ayudante');
ALTER TABLE grupo_miembros ADD CONSTRAINT grupo_miembros_rol_check CHECK (rol_en_grupo IS NULL OR rol_en_grupo IN ('lider', 'ayudante'));

INSERT INTO grupo_miembros (grupo_id, persona_id, rol_en_grupo, activo)
SELECT id, encargado_id, 'lider', true FROM grupos WHERE encargado_id IS NOT NULL
ON CONFLICT (grupo_id, persona_id) DO UPDATE SET rol_en_grupo = 'lider', activo = true;

-- 2. Funciones de permisos.
-- ¿p_persona es líder directo del ministerio? (líder de contacto o rol líder)
CREATE OR REPLACE FUNCTION lidera_grupo(p_grupo UUID, p_persona UUID)
RETURNS BOOLEAN AS $$
  SELECT p_persona IS NOT NULL AND (
    EXISTS (SELECT 1 FROM grupos WHERE id = p_grupo AND encargado_id = p_persona)
    OR EXISTS (SELECT 1 FROM grupo_miembros WHERE grupo_id = p_grupo AND persona_id = p_persona AND activo AND rol_en_grupo = 'lider')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Líder del ministerio o de su ministerio padre: todos los permisos.
CREATE OR REPLACE FUNCTION es_lider_o_padre(p_grupo UUID)
RETURNS BOOLEAN AS $$
  SELECT lidera_grupo(p_grupo, auth_persona_id())
    OR EXISTS (SELECT 1 FROM grupos g WHERE g.id = p_grupo AND g.grupo_padre_id IS NOT NULL AND lidera_grupo(g.grupo_padre_id, auth_persona_id()))
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Líder o ayudante: permisos operativos (agenda, lista, turnos).
CREATE OR REPLACE FUNCTION es_gestor_de(p_grupo UUID)
RETURNS BOOLEAN AS $$
  SELECT es_lider_o_padre(p_grupo)
    OR EXISTS (SELECT 1 FROM grupo_miembros WHERE grupo_id = p_grupo AND persona_id = auth_persona_id() AND activo AND rol_en_grupo = 'ayudante')
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION es_gestor_de_puesto(p_puesto UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM roles_servicio r WHERE r.id = p_puesto AND es_gestor_de(r.grupo_id))
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ¿Lidera o ayuda en algún ministerio? (ve los programas para llenar su parte)
CREATE OR REPLACE FUNCTION es_algun_lider()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM grupos WHERE encargado_id = auth_persona_id() AND activo)
    OR EXISTS (SELECT 1 FROM grupo_miembros WHERE persona_id = auth_persona_id() AND activo AND rol_en_grupo IN ('lider', 'ayudante'))
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION es_lider_de_tarea(p_tarea UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM tareas t WHERE t.id = p_tarea AND t.grupo_id IS NOT NULL AND es_lider_o_padre(t.grupo_id))
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION es_lider_de_fondo(p_fondo UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM fondos f WHERE f.id = p_fondo AND f.grupo_id IS NOT NULL AND es_lider_o_padre(f.grupo_id))
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION gestiona_evento_ministerio(p_evento UUID)
RETURNS BOOLEAN AS $$
  SELECT tiene_permiso('ministerios', 'editar') OR EXISTS (
    SELECT 1 FROM eventos e WHERE e.id = p_evento AND e.grupo_id IS NOT NULL AND es_gestor_de(e.grupo_id)
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Turnos: los ayudantes también asignan y publican.
DROP POLICY IF EXISTS "programa_ministerios_cambios" ON programa_ministerios;
CREATE POLICY "programa_ministerios_cambios" ON programa_ministerios FOR ALL
  USING (tiene_permiso('servidores', 'editar') OR es_gestor_de(grupo_id))
  WITH CHECK (tiene_permiso('servidores', 'editar') OR es_gestor_de(grupo_id));

DROP POLICY IF EXISTS "asignaciones_insert" ON programa_asignaciones;
DROP POLICY IF EXISTS "asignaciones_update" ON programa_asignaciones;
DROP POLICY IF EXISTS "asignaciones_delete" ON programa_asignaciones;
CREATE POLICY "asignaciones_insert" ON programa_asignaciones FOR INSERT
  WITH CHECK (tiene_permiso('servidores', 'crear') OR es_gestor_de_puesto(rol_servicio_id));
CREATE POLICY "asignaciones_update" ON programa_asignaciones FOR UPDATE
  USING (tiene_permiso('servidores', 'editar') OR es_gestor_de_puesto(rol_servicio_id) OR persona_id = auth_persona_id());
CREATE POLICY "asignaciones_delete" ON programa_asignaciones FOR DELETE
  USING (tiene_permiso('servidores', 'eliminar') OR es_gestor_de_puesto(rol_servicio_id));

CREATE OR REPLACE FUNCTION fn_asignacion_solo_material()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT tiene_permiso('servidores', 'editar')
     AND NOT es_gestor_de_puesto(OLD.rol_servicio_id) THEN
    IF NEW.programa_id IS DISTINCT FROM OLD.programa_id
      OR NEW.rol_servicio_id IS DISTINCT FROM OLD.rol_servicio_id
      OR NEW.persona_id IS DISTINCT FROM OLD.persona_id
      OR NEW.notas IS DISTINCT FROM OLD.notas THEN
      RAISE EXCEPTION 'Solo puedes subir el material de tu turno';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
