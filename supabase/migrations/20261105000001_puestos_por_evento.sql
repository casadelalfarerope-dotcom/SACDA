-- =============================================================
-- Eventos del ministerio (Parte 2): puestos y turnos propios
-- =============================================================
-- 1. Un puesto con evento_id solo existe en ese evento del ministerio
--    (p. ej. "Limpieza del sábado: 3 personas, rota"). Sin evento_id es un
--    puesto de los cultos, como hasta ahora.
-- 2. programas.grupo_id marca los programas de eventos del ministerio, para
--    no mezclarlos con los cultos de la iglesia.
-- 3. El líder del ministerio padre también lidera sus subgrupos (p. ej. el
--    líder de Alabanza puede programar a la Banda).

ALTER TABLE roles_servicio ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_roles_servicio_evento ON roles_servicio(evento_id);

ALTER TABLE programas ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_programas_grupo ON programas(grupo_id);

CREATE OR REPLACE FUNCTION es_lider_de(p_grupo UUID)
RETURNS BOOLEAN AS $$
  SELECT es_lider_o_padre(p_grupo)
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION es_lider_de_puesto(p_puesto UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM roles_servicio r WHERE r.id = p_puesto AND es_lider_o_padre(r.grupo_id))
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
