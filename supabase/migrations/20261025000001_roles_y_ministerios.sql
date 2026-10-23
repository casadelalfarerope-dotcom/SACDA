-- =============================================================
-- Parte 1: roles del sistema y ministerios
-- =============================================================
-- Los roles quedan solo para el acceso al panel de administración:
--   administrador · coordinacion · tesoreria · academico
-- Dónde sirve cada persona se define por los ministerios (grupos) a los
-- que pertenece; "estudiante" se deduce de estar inscrito en un curso.

-- ---------- Ministerios con clave para las automatizaciones ----------

-- La clave permite al sistema encontrar un ministerio aunque cambie su nombre
-- (p. ej. Diseño recibe los cumpleaños; Multimedia e Impresiones, el arte aprobado).
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS clave TEXT UNIQUE;

UPDATE grupos SET clave = 'diseno'      WHERE nombre = 'Diseño Gráfico' AND grupo_padre_id IS NULL;
UPDATE grupos SET clave = 'multimedia'  WHERE nombre = 'Multimedia'     AND grupo_padre_id IS NULL;
UPDATE grupos SET clave = 'impresiones' WHERE nombre = 'Impresiones'    AND grupo_padre_id IS NULL;
UPDATE grupos SET clave = 'limpieza'    WHERE nombre = 'Limpieza'       AND grupo_padre_id IS NULL;
UPDATE grupos SET clave = 'alabanza'    WHERE nombre = 'Ministerio de Alabanza' AND grupo_padre_id IS NULL;

-- El Ministerio de Servicio (lo que se ve en el púlpito) aún no existía.
INSERT INTO grupos (nombre, descripcion, tipo, clave)
SELECT 'Ministerio de Servicio', 'Dirección, predicación, ofrenda y lectura en el culto', 'servicio', 'servicio'
WHERE NOT EXISTS (SELECT 1 FROM grupos WHERE clave = 'servicio');

-- ¿La persona actual integra el ministerio con esta clave (o es su líder)?
CREATE OR REPLACE FUNCTION en_ministerio(p_clave TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM grupos g
    WHERE g.clave = p_clave AND g.activo
      AND (g.encargado_id = auth_persona_id()
           OR EXISTS (SELECT 1 FROM grupo_miembros gm
                      WHERE gm.grupo_id = g.id AND gm.persona_id = auth_persona_id() AND gm.activo))
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ---------- Pasar los roles de servicio a sus ministerios ----------

INSERT INTO grupo_miembros (grupo_id, persona_id, activo)
SELECT g.id, ra.persona_id, true
FROM roles_asignados ra
JOIN roles r ON r.id = ra.rol_id
JOIN grupos g ON g.clave = CASE r.nombre
  WHEN 'multimedia'  THEN 'multimedia'
  WHEN 'diseniador'  THEN 'diseno'
  WHEN 'impresiones' THEN 'impresiones'
  WHEN 'limpieza'    THEN 'limpieza'
END
WHERE ra.activo
ON CONFLICT (grupo_id, persona_id) DO UPDATE SET activo = true;

-- ---------- Roles del sistema ----------

INSERT INTO roles (nombre, descripcion) VALUES
  ('coordinacion', 'Pastor: ministerios y líderes, calendario, programación de cultos, congregantes, seguimiento y ventas')
ON CONFLICT (nombre) DO NOTHING;

UPDATE roles SET nombre = 'tesoreria', descripcion = 'Finanzas: aportes, gastos, actividades y reportes'
WHERE nombre = 'tesorero';
UPDATE roles SET descripcion = 'Acceso total al sistema, incluidos inventario y roles' WHERE nombre = 'administrador';
UPDATE roles SET descripcion = 'Academia: cursos, clases, exámenes y notas' WHERE nombre = 'academico';

-- Quien era pastor pasa a Coordinación.
INSERT INTO roles_asignados (persona_id, rol_id, activo)
SELECT ra.persona_id, (SELECT id FROM roles WHERE nombre = 'coordinacion'), true
FROM roles_asignados ra JOIN roles r ON r.id = ra.rol_id
WHERE r.nombre = 'pastor' AND ra.activo
ON CONFLICT (persona_id, rol_id) DO UPDATE SET activo = true;

-- Se eliminan los demás roles (sus asignaciones y permisos se borran en cascada).
DELETE FROM roles WHERE nombre NOT IN ('administrador', 'coordinacion', 'tesoreria', 'academico');

-- ---------- Permisos por módulo ----------

DELETE FROM permisos_modulo
WHERE rol_id IN (SELECT id FROM roles WHERE nombre IN ('coordinacion', 'tesoreria', 'academico'));

-- Coordinación (ver, crear, editar, eliminar)
INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, m.modulo, m.v, m.c, m.e, m.d
FROM roles r CROSS JOIN (VALUES
  ('congregantes',   true, true, true, false),
  ('miembros',       true, true, true, true),
  ('ministerios',    true, true, true, true),
  ('calendario',     true, true, true, true),
  ('servidores',     true, true, true, true),
  ('ventas',         true, true, true, true),
  ('diseno',         true, true, true, false),
  ('capacitacion',   true, true, true, true),
  ('notificaciones', true, true, false, false)
) AS m(modulo, v, c, e, d)
WHERE r.nombre = 'coordinacion';

-- Tesorería: Finanzas y la lista de congregantes (para registrar aportes)
INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, m.modulo, m.v, m.c, m.e, m.d
FROM roles r CROSS JOIN (VALUES
  ('finanzas',     true, true, true, true),
  ('congregantes', true, false, false, false)
) AS m(modulo, v, c, e, d)
WHERE r.nombre = 'tesoreria';

-- Académico: Academia y la lista de congregantes (para inscribir alumnos)
INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, m.modulo, m.v, m.c, m.e, m.d
FROM roles r CROSS JOIN (VALUES
  ('academia',     true, true, true, true),
  ('congregantes', true, false, false, false)
) AS m(modulo, v, c, e, d)
WHERE r.nombre = 'academico';

-- ---------- Seguridad que dependía de los roles eliminados ----------

DROP POLICY IF EXISTS "distribuciones_select" ON tarea_distribuciones;
DROP POLICY IF EXISTS "distribuciones_update" ON tarea_distribuciones;
CREATE POLICY "distribuciones_select" ON tarea_distribuciones FOR SELECT USING (
  tiene_permiso('diseno', 'ver') OR en_ministerio(destino)
);
CREATE POLICY "distribuciones_update" ON tarea_distribuciones FOR UPDATE
  USING (tiene_permiso('diseno', 'editar') OR en_ministerio(destino))
  WITH CHECK (tiene_permiso('diseno', 'editar') OR en_ministerio(destino));

DROP FUNCTION IF EXISTS tiene_rol(TEXT);
