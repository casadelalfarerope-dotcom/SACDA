-- ============================================================
-- SACDA — Fase 1: Base del sistema
-- ============================================================

-- Tipos enumerados
CREATE TYPE estado_persona AS ENUM ('activo', 'inactivo', 'visita');
CREATE TYPE tipo_ceremonia AS ENUM ('bautismo', 'dedicacion', 'boda');
CREATE TYPE estado_seguimiento AS ENUM ('pendiente', 'contactado', 'regular', 'inactivo');
CREATE TYPE estado_ausencia AS ENUM ('pendiente', 'contactado', 'resuelto');
CREATE TYPE accion_auditoria AS ENUM ('insert', 'update', 'delete');
CREATE TYPE canal_notificacion AS ENUM ('in_app', 'correo', 'whatsapp');

-- ------------------------------------------------------------
-- 1. PERSONAS (registro central — no requiere cuenta de acceso)
-- ------------------------------------------------------------
CREATE TABLE personas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo  TEXT NOT NULL,
  dni              TEXT UNIQUE,
  fecha_nacimiento DATE,
  telefono         TEXT,
  email            TEXT,
  direccion        TEXT,
  ministerio       TEXT,
  estado           estado_persona NOT NULL DEFAULT 'activo',
  foto_url         TEXT,
  notas            TEXT,
  created_by       UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_personas_estado      ON personas(estado);
CREATE INDEX idx_personas_dni         ON personas(dni) WHERE dni IS NOT NULL;
CREATE INDEX idx_personas_nacimiento  ON personas(fecha_nacimiento) WHERE fecha_nacimiento IS NOT NULL;

-- ------------------------------------------------------------
-- 2. CUENTAS (vincula una persona a auth.users — opcional)
-- ------------------------------------------------------------
CREATE TABLE cuentas (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id  UUID NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,
  activa      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cuentas_persona ON cuentas(persona_id);

-- ------------------------------------------------------------
-- 3. ROLES (catálogo de roles del sistema)
-- ------------------------------------------------------------
CREATE TABLE roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL UNIQUE,
  descripcion  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles iniciales del sistema
INSERT INTO roles (nombre, descripcion) VALUES
  ('administrador',     'Acceso total al sistema'),
  ('pastor',            'Liderazgo pastoral'),
  ('tesorero',          'Gestión de finanzas'),
  ('lider',             'Líder de ministerio o grupo'),
  ('servidor',          'Servidor en el culto'),
  ('multimedia',        'Encargado de multimedia y proyección'),
  ('diseniador',        'Diseño gráfico'),
  ('coordinador',       'Coordinador de servicios'),
  ('academico',         'Gestión de Academia de Líderes'),
  ('impresiones',       'Encargado de impresiones'),
  ('limpieza',          'Equipo de limpieza');

-- ------------------------------------------------------------
-- 4. ROLES ASIGNADOS (persona ↔ rol, many-to-many)
-- ------------------------------------------------------------
CREATE TABLE roles_asignados (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id    UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  rol_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  asignado_por  UUID REFERENCES personas(id) ON DELETE SET NULL,
  fecha_inicio  DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin     DATE,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (persona_id, rol_id)
);

CREATE INDEX idx_roles_asignados_persona ON roles_asignados(persona_id);
CREATE INDEX idx_roles_asignados_rol     ON roles_asignados(rol_id);

-- ------------------------------------------------------------
-- 5. PERMISOS POR MÓDULO
-- ------------------------------------------------------------
CREATE TABLE permisos_modulo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id          UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  modulo          TEXT NOT NULL,
  puede_ver       BOOLEAN NOT NULL DEFAULT false,
  puede_crear     BOOLEAN NOT NULL DEFAULT false,
  puede_editar    BOOLEAN NOT NULL DEFAULT false,
  puede_eliminar  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (rol_id, modulo)
);

CREATE INDEX idx_permisos_rol ON permisos_modulo(rol_id);

-- Permisos por defecto: administrador tiene todo
INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, m.modulo, true, true, true, true
FROM roles r
CROSS JOIN (
  VALUES ('congregantes'), ('miembros'), ('ministerios'), ('calendario'),
         ('notificaciones'), ('servidores'), ('capacitacion'), ('diseno'),
         ('finanzas'), ('inventario'), ('ventas'), ('academia'), ('roles')
) AS m(modulo)
WHERE r.nombre = 'administrador';

-- Pastor ve todo pero no puede eliminar en finanzas
INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, m.modulo,
  true,
  CASE WHEN m.modulo IN ('finanzas', 'roles') THEN false ELSE true END,
  CASE WHEN m.modulo = 'roles' THEN false ELSE true END,
  false
FROM roles r
CROSS JOIN (
  VALUES ('congregantes'), ('miembros'), ('ministerios'), ('calendario'),
         ('notificaciones'), ('servidores'), ('capacitacion'), ('diseno'),
         ('finanzas'), ('inventario'), ('ventas'), ('academia'), ('roles')
) AS m(modulo)
WHERE r.nombre = 'pastor';

-- Tesorero: solo finanzas
INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, 'finanzas', true, true, true, false
FROM roles r WHERE r.nombre = 'tesorero';

INSERT INTO permisos_modulo (rol_id, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, 'congregantes', true, false, false, false
FROM roles r WHERE r.nombre = 'tesorero';

-- ------------------------------------------------------------
-- 6. PREFERENCIAS DE NOTIFICACIÓN
-- ------------------------------------------------------------
CREATE TABLE preferencias_notificacion (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id          UUID NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,
  canal_por_defecto   canal_notificacion NOT NULL DEFAULT 'in_app',
  config              JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 7. CEREMONIAS (bautismos, dedicaciones, bodas)
-- ------------------------------------------------------------
CREATE TABLE ceremonias (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo         tipo_ceremonia NOT NULL,
  fecha        DATE NOT NULL,
  descripcion  TEXT,
  officiante   TEXT,
  created_by   UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ceremonias_fecha ON ceremonias(fecha);
CREATE INDEX idx_ceremonias_tipo  ON ceremonias(tipo);

-- Personas participantes en cada ceremonia
CREATE TABLE ceremonia_personas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremonia_id     UUID NOT NULL REFERENCES ceremonias(id) ON DELETE CASCADE,
  persona_id       UUID REFERENCES personas(id) ON DELETE SET NULL,
  nombre_externo   TEXT,
  rol_en_ceremonia TEXT NOT NULL,
  CONSTRAINT chk_persona_o_externo CHECK (
    persona_id IS NOT NULL OR nombre_externo IS NOT NULL
  )
);

CREATE INDEX idx_ceremonia_personas_ceremonia ON ceremonia_personas(ceremonia_id);
CREATE INDEX idx_ceremonia_personas_persona   ON ceremonia_personas(persona_id) WHERE persona_id IS NOT NULL;

-- ------------------------------------------------------------
-- 8. SEGUIMIENTO DE VISITAS / NUEVOS CONVERTIDOS
-- ------------------------------------------------------------
CREATE TABLE seguimiento_visitas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id            UUID NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,
  fecha_primera_visita  DATE NOT NULL,
  referido_por          UUID REFERENCES personas(id) ON DELETE SET NULL,
  seguimiento_por       UUID REFERENCES personas(id) ON DELETE SET NULL,
  volvio                BOOLEAN NOT NULL DEFAULT false,
  estado                estado_seguimiento NOT NULL DEFAULT 'pendiente',
  notas                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitas_estado ON seguimiento_visitas(estado);

-- ------------------------------------------------------------
-- 9. AUSENCIAS
-- ------------------------------------------------------------
CREATE TABLE ausencias (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id        UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  fecha             DATE NOT NULL,
  motivo            TEXT,
  seguimiento_por   UUID REFERENCES personas(id) ON DELETE SET NULL,
  estado            estado_ausencia NOT NULL DEFAULT 'pendiente',
  created_by        UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ausencias_persona ON ausencias(persona_id);
CREATE INDEX idx_ausencias_fecha   ON ausencias(fecha);
CREATE INDEX idx_ausencias_estado  ON ausencias(estado);

-- ------------------------------------------------------------
-- 10. AUDITORÍA (con trigger automático)
-- ------------------------------------------------------------
CREATE TABLE auditoria (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla_afectada   TEXT NOT NULL,
  registro_id      UUID NOT NULL,
  accion           accion_auditoria NOT NULL,
  datos_antes      JSONB,
  datos_despues    JSONB,
  realizado_por    UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_tabla     ON auditoria(tabla_afectada);
CREATE INDEX idx_auditoria_registro  ON auditoria(registro_id);
CREATE INDEX idx_auditoria_fecha     ON auditoria(created_at);

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  usuario_id UUID;
BEGIN
  BEGIN
    usuario_id := (current_setting('app.usuario_id', true))::UUID;
  EXCEPTION WHEN OTHERS THEN
    usuario_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (tabla_afectada, registro_id, accion, datos_despues, realizado_por)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', to_jsonb(NEW), usuario_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (tabla_afectada, registro_id, accion, datos_antes, datos_despues, realizado_por)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), usuario_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (tabla_afectada, registro_id, accion, datos_antes, realizado_por)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), usuario_id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar auditoría a tablas sensibles
CREATE TRIGGER trg_auditoria_personas
  AFTER INSERT OR UPDATE OR DELETE ON personas
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_cuentas
  AFTER INSERT OR UPDATE OR DELETE ON cuentas
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_roles_asignados
  AFTER INSERT OR UPDATE OR DELETE ON roles_asignados
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updated_personas
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TRIGGER trg_updated_seguimiento
  BEFORE UPDATE ON seguimiento_visitas
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TRIGGER trg_updated_ausencias
  BEFORE UPDATE ON ausencias
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

CREATE TRIGGER trg_updated_preferencias
  BEFORE UPDATE ON preferencias_notificacion
  FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- ------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
ALTER TABLE personas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_asignados           ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_modulo           ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferencias_notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceremonias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceremonia_personas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_visitas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ausencias                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria                 ENABLE ROW LEVEL SECURITY;

-- Función helper: obtiene la persona_id del usuario autenticado actual
CREATE OR REPLACE FUNCTION auth_persona_id()
RETURNS UUID AS $$
  SELECT persona_id FROM cuentas WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función helper: verifica si el usuario tiene un permiso en un módulo
CREATE OR REPLACE FUNCTION tiene_permiso(p_modulo TEXT, p_accion TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM roles_asignados ra
    JOIN permisos_modulo pm ON pm.rol_id = ra.rol_id
    WHERE ra.persona_id = auth_persona_id()
      AND ra.activo = true
      AND (ra.fecha_fin IS NULL OR ra.fecha_fin >= CURRENT_DATE)
      AND pm.modulo = p_modulo
      AND CASE p_accion
            WHEN 'ver'      THEN pm.puede_ver
            WHEN 'crear'    THEN pm.puede_crear
            WHEN 'editar'   THEN pm.puede_editar
            WHEN 'eliminar' THEN pm.puede_eliminar
            ELSE false
          END = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas para personas
CREATE POLICY "personas_select" ON personas
  FOR SELECT USING (tiene_permiso('congregantes', 'ver'));

CREATE POLICY "personas_insert" ON personas
  FOR INSERT WITH CHECK (tiene_permiso('congregantes', 'crear'));

CREATE POLICY "personas_update" ON personas
  FOR UPDATE USING (tiene_permiso('congregantes', 'editar'));

CREATE POLICY "personas_delete" ON personas
  FOR DELETE USING (tiene_permiso('congregantes', 'eliminar'));

-- Cada usuario puede ver/editar sus propias preferencias
CREATE POLICY "preferencias_own" ON preferencias_notificacion
  FOR ALL USING (persona_id = auth_persona_id());

-- Permisos visibles para todos los autenticados (para construir la UI)
CREATE POLICY "permisos_select" ON permisos_modulo
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Roles visibles para usuarios con permiso de gestión
CREATE POLICY "roles_asignados_select" ON roles_asignados
  FOR SELECT USING (tiene_permiso('roles', 'ver') OR persona_id = auth_persona_id());

CREATE POLICY "roles_asignados_insert" ON roles_asignados
  FOR INSERT WITH CHECK (tiene_permiso('roles', 'crear'));

CREATE POLICY "roles_asignados_update" ON roles_asignados
  FOR UPDATE USING (tiene_permiso('roles', 'editar'));

-- Ceremonias
CREATE POLICY "ceremonias_select" ON ceremonias
  FOR SELECT USING (tiene_permiso('miembros', 'ver'));

CREATE POLICY "ceremonias_insert" ON ceremonias
  FOR INSERT WITH CHECK (tiene_permiso('miembros', 'crear'));

CREATE POLICY "ceremonias_update" ON ceremonias
  FOR UPDATE USING (tiene_permiso('miembros', 'editar'));

CREATE POLICY "ceremonia_personas_select" ON ceremonia_personas
  FOR SELECT USING (tiene_permiso('miembros', 'ver'));

CREATE POLICY "ceremonia_personas_all" ON ceremonia_personas
  FOR ALL USING (tiene_permiso('miembros', 'editar'));

-- Visitas y ausencias
CREATE POLICY "visitas_select" ON seguimiento_visitas
  FOR SELECT USING (tiene_permiso('miembros', 'ver'));

CREATE POLICY "visitas_all" ON seguimiento_visitas
  FOR ALL USING (tiene_permiso('miembros', 'editar'));

CREATE POLICY "ausencias_select" ON ausencias
  FOR SELECT USING (tiene_permiso('miembros', 'ver'));

CREATE POLICY "ausencias_all" ON ausencias
  FOR ALL USING (tiene_permiso('miembros', 'editar'));

-- Auditoría: solo lectura para admins
CREATE POLICY "auditoria_select" ON auditoria
  FOR SELECT USING (tiene_permiso('roles', 'ver'));
