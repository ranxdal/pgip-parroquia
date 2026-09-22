CREATE EXTENSION IF NOT EXISTS pg_trgm; 
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; 
CREATE SCHEMA IF NOT EXISTS pgip;

CREATE TABLE pgip.usuario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'operador')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pgip.sesion_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    monto_inicial NUMERIC(10,2) NOT NULL,
    monto_final NUMERIC(10,2),
    estado VARCHAR(10) DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
    usuario_id UUID REFERENCES pgip.usuario(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pgip.transaccion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correlativo VARCHAR(20) UNIQUE NOT NULL,
    sesion_caja_id UUID REFERENCES pgip.sesion_caja(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('efectivo', 'transferencia')),
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    descripcion TEXT,
    usuario_id UUID REFERENCES pgip.usuario(id),
    ip_origen VARCHAR(45),
    qr_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pgip.auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla_afectada VARCHAR(50),
    accion VARCHAR(10) CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    registro_id UUID,
    usuario_id UUID REFERENCES pgip.usuario(id),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pgip.feligres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feligres_nombre_trgm
    ON pgip.feligres
    USING GIN ((nombres || ' ' || apellidos) gin_trgm_ops);

CREATE TABLE pgip.sacramento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feligres_id UUID REFERENCES pgip.feligres(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('bautismo', 'confirmacion', 'matrimonio')),
    fecha DATE NOT NULL,
    libro VARCHAR(50),
    folio VARCHAR(20),
    partida VARCHAR(20),
    ministro VARCHAR(100),
    padrino_1 VARCHAR(100),
    padrino_2 VARCHAR(100),
    usuario_id UUID REFERENCES pgip.usuario(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fecha_no_futura CHECK (fecha <= CURRENT_DATE)
);