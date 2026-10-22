-- Correcciones encontradas en las pruebas del 22-10-2026.

-- 1. cuentas y roles tenían RLS activo sin políticas de lectura: ningún usuario
--    podía leer su propia cuenta ni el catálogo de roles.
CREATE POLICY "cuentas_select_propia" ON cuentas
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "cuentas_select_admin" ON cuentas
  FOR SELECT USING (tiene_permiso('roles', 'ver'));

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. El código guarda notificaciones con un enlace y con tipos que no existían,
--    así que todas las inserciones fallaban.
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS url TEXT;

ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'tarea_asignada';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'tarea_aprobada';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'tarea_rechazada';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'arte_distribuido';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'cumpleanios_proximo';

NOTIFY pgrst, 'reload schema';
