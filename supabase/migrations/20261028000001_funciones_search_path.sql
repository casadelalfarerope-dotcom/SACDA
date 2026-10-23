-- =============================================================
-- Funciones con esquema fijo
-- =============================================================
-- Al revocar un acceso, Supabase borra el usuario desde su esquema interno
-- (auth); eso borra la fila de cuentas y dispara la auditoría y otros
-- disparadores. Sin un search_path fijo, esas funciones no encontraban las
-- tablas (auditoria, cuentas…) y la eliminación fallaba.

ALTER FUNCTION fn_auditoria()                SET search_path = public;
ALTER FUNCTION fn_updated_at()               SET search_path = public;
ALTER FUNCTION fn_tarea_solo_avance()        SET search_path = public;
ALTER FUNCTION fn_asignacion_solo_material() SET search_path = public;
ALTER FUNCTION auth_persona_id()             SET search_path = public;
ALTER FUNCTION tiene_permiso(TEXT, TEXT)     SET search_path = public;
ALTER FUNCTION modulo_de_tarea(TEXT)         SET search_path = public;
