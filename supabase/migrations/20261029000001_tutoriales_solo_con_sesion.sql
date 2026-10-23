-- Los tutoriales publicados se podían leer sin iniciar sesión.
DROP POLICY IF EXISTS "tutoriales_select" ON tutoriales;
CREATE POLICY "tutoriales_select" ON tutoriales FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (publicado OR tiene_permiso('capacitacion', 'ver') OR es_lider_de(grupo_id))
);
