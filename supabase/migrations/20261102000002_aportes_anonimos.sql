-- =============================================================
-- Aportes anónimos: sobres sin nombre (no tienen persona)
-- =============================================================
ALTER TABLE aportes ALTER COLUMN persona_id DROP NOT NULL;
