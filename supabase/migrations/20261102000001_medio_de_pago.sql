-- =============================================================
-- Medio de pago: efectivo (físico) o digital (Yape, Plin, etc.)
-- =============================================================
-- Lo registrado antes de esta migración queda como efectivo.
-- "Físico" = efectivo; todo lo demás es digital.

ALTER TABLE aportes               ADD COLUMN medio TEXT NOT NULL DEFAULT 'efectivo';
ALTER TABLE gastos                ADD COLUMN medio TEXT NOT NULL DEFAULT 'efectivo';
ALTER TABLE actividad_movimientos ADD COLUMN medio TEXT NOT NULL DEFAULT 'efectivo';
ALTER TABLE fondo_movimientos     ADD COLUMN medio TEXT NOT NULL DEFAULT 'efectivo';

ALTER TABLE aportes               ADD CONSTRAINT aportes_medio_check               CHECK (medio IN ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta', 'otro'));
ALTER TABLE gastos                ADD CONSTRAINT gastos_medio_check                CHECK (medio IN ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta', 'otro'));
ALTER TABLE actividad_movimientos ADD CONSTRAINT actividad_movimientos_medio_check CHECK (medio IN ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta', 'otro'));
ALTER TABLE fondo_movimientos     ADD CONSTRAINT fondo_movimientos_medio_check     CHECK (medio IN ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta', 'otro'));
