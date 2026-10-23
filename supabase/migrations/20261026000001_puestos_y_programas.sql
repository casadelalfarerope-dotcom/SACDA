-- =============================================================
-- Parte 2: puestos de cada ministerio y programas automáticos
-- =============================================================
-- · Los "roles de servicio" pasan a ser puestos de un ministerio
--   (Predicación → Servicio, Sonido → Multimedia…), con cuántas personas
--   llevan y si se rotan o son fijos.
-- · Hay un programa por cada culto del calendario (próximos 3 meses), que
--   el sistema crea solo; cada ministerio llena y publica su parte.
-- · El líder de un ministerio programa solo los puestos de su ministerio.

-- ---------- Puestos ----------

ALTER TABLE roles_servicio
  ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS modo TEXT NOT NULL DEFAULT 'rotativo' CHECK (modo IN ('fijo', 'rotativo'));

CREATE INDEX IF NOT EXISTS idx_roles_servicio_grupo ON roles_servicio(grupo_id);

-- Los puestos actuales pasan a su ministerio.
UPDATE roles_servicio SET grupo_id = (SELECT id FROM grupos WHERE clave = 'servicio')
  WHERE nombre IN ('Predicación', 'Acomodadores');
UPDATE roles_servicio SET grupo_id = (SELECT id FROM grupos WHERE clave = 'alabanza')
  WHERE nombre = 'Alabanza';
UPDATE roles_servicio SET grupo_id = (SELECT id FROM grupos WHERE clave = 'multimedia')
  WHERE nombre IN ('Multimedia', 'Sonido', 'Transmisión', 'Cámaras');
UPDATE roles_servicio SET nombre = 'Proyección', descripcion = 'Letras y diapositivas en pantalla'
  WHERE nombre = 'Multimedia';
UPDATE roles_servicio SET grupo_id = (SELECT id FROM grupos WHERE clave = 'limpieza'), cantidad = 2
  WHERE nombre = 'Limpieza';

-- Puestos que faltaban en el Ministerio de Servicio.
INSERT INTO roles_servicio (nombre, descripcion, color, grupo_id, orden)
SELECT v.nombre, v.descripcion, '#7c3aed', (SELECT id FROM grupos WHERE clave = 'servicio'), v.orden
FROM (VALUES
  ('Dirección del culto', 'Conduce el orden del culto', 0),
  ('Lectura bíblica',     'Lee el pasaje del día',      2),
  ('Palabra de ofrenda',  'Palabra antes de la ofrenda', 3)
) AS v(nombre, descripcion, orden)
WHERE NOT EXISTS (SELECT 1 FROM roles_servicio r WHERE r.nombre = v.nombre);

-- Quiénes pueden ocupar cada puesto y en qué orden rotan. Si está vacío,
-- puede ocuparlo cualquier integrante del ministerio.
CREATE TABLE puesto_candidatos (
  puesto_id  UUID NOT NULL REFERENCES roles_servicio(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  orden      INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (puesto_id, persona_id)
);

-- ---------- Programas creados desde el calendario ----------

ALTER TABLE programas
  ADD COLUMN IF NOT EXISTS fecha_original DATE,
  ADD COLUMN IF NOT EXISTS hora_inicio TIME,
  ADD COLUMN IF NOT EXISTS cancelado BOOLEAN NOT NULL DEFAULT false;

-- Un programa por cada fecha de cada culto (fecha_original no cambia si el
-- culto se mueve a otro día; fecha sí).
CREATE UNIQUE INDEX IF NOT EXISTS uq_programas_culto ON programas(evento_id, fecha_original)
  WHERE evento_id IS NOT NULL AND fecha_original IS NOT NULL;

-- Estado de la parte de cada ministerio en cada programa.
CREATE TABLE programa_ministerios (
  programa_id   UUID NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
  grupo_id      UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  estado        TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado')),
  publicado_por UUID REFERENCES personas(id) ON DELETE SET NULL,
  publicado_at  TIMESTAMPTZ,
  PRIMARY KEY (programa_id, grupo_id)
);

-- ---------- Helpers de liderazgo ----------

-- ¿La persona actual es líder del ministerio dueño de este puesto?
CREATE OR REPLACE FUNCTION es_lider_de_puesto(p_puesto UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM roles_servicio r JOIN grupos g ON g.id = r.grupo_id
    WHERE r.id = p_puesto AND g.encargado_id = auth_persona_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ¿Integra (o lidera) el ministerio dueño de este puesto?
CREATE OR REPLACE FUNCTION en_ministerio_de_puesto(p_puesto UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM roles_servicio r JOIN grupos g ON g.id = r.grupo_id
    WHERE r.id = p_puesto
      AND (g.encargado_id = auth_persona_id()
           OR EXISTS (SELECT 1 FROM grupo_miembros gm
                      WHERE gm.grupo_id = g.id AND gm.persona_id = auth_persona_id() AND gm.activo))
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION es_lider_de(p_grupo UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM grupos WHERE id = p_grupo AND encargado_id = auth_persona_id())
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION es_algun_lider()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM grupos WHERE encargado_id = auth_persona_id() AND activo)
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ---------- Seguridad ----------

ALTER TABLE puesto_candidatos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE programa_ministerios ENABLE ROW LEVEL SECURITY;

-- Puestos: el líder administra los de su ministerio.
DROP POLICY IF EXISTS "roles_servicio_insert" ON roles_servicio;
DROP POLICY IF EXISTS "roles_servicio_update" ON roles_servicio;
DROP POLICY IF EXISTS "roles_servicio_delete" ON roles_servicio;
CREATE POLICY "roles_servicio_insert" ON roles_servicio FOR INSERT
  WITH CHECK (tiene_permiso('servidores', 'crear') OR es_lider_de(grupo_id));
CREATE POLICY "roles_servicio_update" ON roles_servicio FOR UPDATE
  USING (tiene_permiso('servidores', 'editar') OR es_lider_de(grupo_id))
  WITH CHECK (tiene_permiso('servidores', 'editar') OR es_lider_de(grupo_id));
CREATE POLICY "roles_servicio_delete" ON roles_servicio FOR DELETE
  USING (tiene_permiso('servidores', 'eliminar') OR es_lider_de(grupo_id));

CREATE POLICY "candidatos_select" ON puesto_candidatos FOR SELECT
  USING (tiene_permiso('servidores', 'ver') OR en_ministerio_de_puesto(puesto_id));
CREATE POLICY "candidatos_cambios" ON puesto_candidatos FOR ALL
  USING (tiene_permiso('servidores', 'editar') OR es_lider_de_puesto(puesto_id))
  WITH CHECK (tiene_permiso('servidores', 'editar') OR es_lider_de_puesto(puesto_id));

-- Programas: los líderes ven todos los cultos para llenar su parte.
DROP POLICY IF EXISTS "programas_select" ON programas;
CREATE POLICY "programas_select" ON programas FOR SELECT USING (
  tiene_permiso('servidores', 'ver')
  OR es_algun_lider()
  OR (estado = 'publicado' AND EXISTS (
    SELECT 1 FROM programa_asignaciones pa
    WHERE pa.programa_id = programas.id AND pa.persona_id = auth_persona_id()))
  OR EXISTS (
    SELECT 1 FROM programa_ministerios pm
    WHERE pm.programa_id = programas.id AND pm.estado = 'publicado'
      AND EXISTS (SELECT 1 FROM programa_asignaciones pa
                  WHERE pa.programa_id = programas.id AND pa.persona_id = auth_persona_id()))
);

CREATE POLICY "programa_ministerios_select" ON programa_ministerios FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "programa_ministerios_cambios" ON programa_ministerios FOR ALL
  USING (tiene_permiso('servidores', 'editar') OR es_lider_de(grupo_id))
  WITH CHECK (tiene_permiso('servidores', 'editar') OR es_lider_de(grupo_id));

-- Asignaciones: el líder asigna en los puestos de su ministerio; los
-- integrantes ven con quiénes sirven.
DROP POLICY IF EXISTS "asignaciones_select" ON programa_asignaciones;
DROP POLICY IF EXISTS "asignaciones_insert" ON programa_asignaciones;
DROP POLICY IF EXISTS "asignaciones_update" ON programa_asignaciones;
DROP POLICY IF EXISTS "asignaciones_delete" ON programa_asignaciones;
CREATE POLICY "asignaciones_select" ON programa_asignaciones FOR SELECT USING (
  tiene_permiso('servidores', 'ver') OR persona_id = auth_persona_id() OR en_ministerio_de_puesto(rol_servicio_id)
);
CREATE POLICY "asignaciones_insert" ON programa_asignaciones FOR INSERT
  WITH CHECK (tiene_permiso('servidores', 'crear') OR es_lider_de_puesto(rol_servicio_id));
CREATE POLICY "asignaciones_update" ON programa_asignaciones FOR UPDATE
  USING (tiene_permiso('servidores', 'editar') OR es_lider_de_puesto(rol_servicio_id) OR persona_id = auth_persona_id());
CREATE POLICY "asignaciones_delete" ON programa_asignaciones FOR DELETE
  USING (tiene_permiso('servidores', 'eliminar') OR es_lider_de_puesto(rol_servicio_id));

-- El servidor solo cambia el material de su turno; el líder puede más.
CREATE OR REPLACE FUNCTION fn_asignacion_solo_material()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT tiene_permiso('servidores', 'editar')
     AND NOT es_lider_de_puesto(OLD.rol_servicio_id) THEN
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

-- ---------- Limpieza ----------
-- La rotación ahora vive en puesto_candidatos.
DROP TABLE IF EXISTS rotacion_miembros;
DROP TABLE IF EXISTS rotacion_configuracion;
