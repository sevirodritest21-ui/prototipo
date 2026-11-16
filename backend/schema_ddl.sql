IF OBJECT_ID('campus', 'U') IS NULL
CREATE TABLE [campus] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [nombre] NVARCHAR(100) NOT NULL,
    [cubiculas_fisicos] INT NULL
);

IF OBJECT_ID('campus_institucional', 'U') IS NULL
CREATE TABLE [campus_institucional] (
    [camp_codigo_campus] INT NOT NULL,
    [camp_campus] NVARCHAR(100) NOT NULL,
    [camp_direccion] NVARCHAR(255) NULL,
    [camp_vigente] VARCHAR(10) NULL,
    [camp_fecha_registro] DATETIME2 NULL,
    [camp_usuario] NVARCHAR(50) NULL,
    PRIMARY KEY ([camp_codigo_campus])
);

IF OBJECT_ID('carrera_campus', 'U') IS NULL
CREATE TABLE [carrera_campus] (
    [carr_codigo] INT NOT NULL,
    [camp_codigo] INT NOT NULL,
    [usuario_mod] NVARCHAR(50) NULL,
    [fecha_mod] DATETIME2 NULL,
    PRIMARY KEY ([camp_codigo], [carr_codigo])
);

IF OBJECT_ID('carrera_programa', 'U') IS NULL
CREATE TABLE [carrera_programa] (
    [carr_codigo] INT NOT NULL,
    [tcar_codigo] INT NULL,
    [clac_codigo] INT NULL,
    [carr_nombre] NVARCHAR(150) NOT NULL,
    [uaca_codigo] INT NULL,
    [uaca_codigo_dicta] VARCHAR(50) NULL,
    [usuario_mod] NVARCHAR(50) NULL,
    [fecha_mod] DATETIME2 NULL,
    PRIMARY KEY ([carr_codigo])
);

IF OBJECT_ID('cubiculos', 'U') IS NULL
CREATE TABLE [cubiculos] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [codigo] NVARCHAR(20) NOT NULL,
    [campus_id] INT NOT NULL,
    [estado] NVARCHAR(20) NULL
);

IF OBJECT_ID('usuarios', 'U') IS NULL
CREATE TABLE [usuarios] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [hashed_password] NVARCHAR(255) NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [rol] NVARCHAR(50) NULL,
    [created_at] DATETIME2 NULL,
    [rut] NVARCHAR(50) NULL,
    [idmatricula] NVARCHAR(50) NULL,
    [carrera] NVARCHAR(150) NULL,
    [terminos_aceptados] BIT DEFAULT 0,
    [fecha_terminos] DATETIME2 NULL
);

IF OBJECT_ID('estudiante', 'U') IS NULL
CREATE TABLE [estudiante] (
    [estd_rut] INT NOT NULL,
    [estd_dv] VARCHAR(2) NOT NULL,
    [estd_paterno] NVARCHAR(100) NOT NULL,
    [estd_materno] NVARCHAR(100) NULL,
    [estd_nombre1] NVARCHAR(100) NOT NULL,
    [estd_nombre2] NVARCHAR(100) NULL,
    [sexo_codigo] INT NULL,
    [estd_fecha_nac] DATETIME2 NULL,
    [estd_email_inst] NVARCHAR(150) NULL,
    [carrera] NVARCHAR(150) NULL,
    PRIMARY KEY ([estd_rut])
);

IF OBJECT_ID('estudiante_carrera', 'U') IS NULL
CREATE TABLE [estudiante_carrera] (
    [estu_registro] BIGINT NOT NULL,
    [estd_rut] INT NOT NULL,
    [estd_dv] VARCHAR(2) NOT NULL,
    [carr_codigo] INT NOT NULL,
    [plan_codigo] INT NULL,
    [men_codigo] INT NULL,
    [salu_codigo] INT NOT NULL,
    [ving_codigo] INT NULL,
    [estu_anho_ing] INT NULL,
    [estu_semestre_ing] INT NULL,
    [timp_codigo] INT NULL,
    [usuario_mod] NVARCHAR(50) NULL,
    [fecha_mod] DATETIME2 NULL,
    PRIMARY KEY ([estu_registro])
);

IF OBJECT_ID('situacion_alumno', 'U') IS NULL
CREATE TABLE [situacion_alumno] (
    [salu_codigo] INT NOT NULL,
    [salu_nombre] NVARCHAR(100) NOT NULL,
    PRIMARY KEY ([salu_codigo])
);

IF OBJECT_ID('sesiones', 'U') IS NULL
CREATE TABLE [sesiones] (
    [session_id] NVARCHAR(255) NOT NULL,
    [rut] NVARCHAR(50) NOT NULL,
    [nombre] NVARCHAR(150) NULL,
    [updated_at] DATETIME2 NULL,
    PRIMARY KEY ([session_id])
);

IF OBJECT_ID('dias_bloqueados', 'U') IS NULL
CREATE TABLE [dias_bloqueados] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [fecha] DATE NOT NULL,
    [motivo] NVARCHAR(255) NULL,
    [campus_id] INT NULL,
    [creado_por] NVARCHAR(255) NULL,
    [created_at] DATETIME2 NULL
);

IF OBJECT_ID('cubiculos_mantenimiento', 'U') IS NULL
CREATE TABLE [cubiculos_mantenimiento] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [cubiculo_id] INT NOT NULL,
    [fecha] DATE NOT NULL,
    [motivo] NVARCHAR(255) NULL,
    [creado_por] NVARCHAR(255) NULL,
    [created_at] DATETIME2 NULL
);

IF OBJECT_ID('reservas', 'U') IS NULL
CREATE TABLE [reservas] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [rut] NVARCHAR(50) NOT NULL,
    [fecha] DATE NOT NULL,
    [hora] TIME NOT NULL,
    [session_id] NVARCHAR(255) NULL,
    [created_at] DATETIME2 NULL,
    [campus_id] INT NULL,
    [cubiculo_id] INT NULL,
    [carrera] NVARCHAR(150) NULL
);

IF OBJECT_ID('reserva_acompanantes', 'U') IS NULL
CREATE TABLE [reserva_acompanantes] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [reserva_id] INT NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [rut] NVARCHAR(50) NOT NULL
);

IF OBJECT_ID('historial_reservas', 'U') IS NULL
CREATE TABLE [historial_reservas] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [reserva_id] INT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [rut] NVARCHAR(50) NOT NULL,
    [campus_id] INT NULL,
    [fecha] DATE NOT NULL,
    [hora] NVARCHAR(50) NOT NULL,
    [estado] NVARCHAR(50) NULL,
    [fecha_registro] DATETIME2 NULL,
    [carrera] NVARCHAR(150) NULL
);

IF OBJECT_ID('incidencias_cubiculos', 'U') IS NULL
CREATE TABLE [incidencias_cubiculos] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [cubiculo_id] INT NOT NULL,
    [reserva_id] INT NULL,
    [estudiante_rut] NVARCHAR(50) NULL,
    [estudiante_nombre] NVARCHAR(150) NULL,
    [categoria] NVARCHAR(100) NULL,
    [descripcion] NVARCHAR(MAX) NOT NULL,
    [estado] NVARCHAR(50) NULL,
    [solucion] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 NULL
);

IF OBJECT_ID('anuncios_cms', 'U') IS NULL
CREATE TABLE [anuncios_cms] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [titulo] NVARCHAR(255) NOT NULL,
    [subtitulo] NVARCHAR(MAX) NULL,
    [badge] NVARCHAR(100) NULL,
    [boton_texto] NVARCHAR(100) NULL,
    [boton_link] NVARCHAR(255) NULL,
    [color_fondo] NVARCHAR(100) NULL,
    [orden] INT NULL
);

IF OBJECT_ID('tarjetas_cms', 'U') IS NULL
CREATE TABLE [tarjetas_cms] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [icono] NVARCHAR(100) NULL,
    [titulo] NVARCHAR(255) NOT NULL,
    [descripcion] NVARCHAR(MAX) NULL,
    [link_texto] NVARCHAR(100) NULL,
    [link_url] NVARCHAR(255) NULL,
    [orden] INT NULL
);

IF OBJECT_ID('faqs_cms', 'U') IS NULL
CREATE TABLE [faqs_cms] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [pregunta] NVARCHAR(MAX) NOT NULL,
    [respuesta] NVARCHAR(MAX) NOT NULL,
    [categoria] NVARCHAR(100) NULL,
    [orden] INT NULL
);

IF OBJECT_ID('contacto_mensajes', 'U') IS NULL
CREATE TABLE [contacto_mensajes] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [rut] NVARCHAR(50) NULL,
    [asunto] NVARCHAR(255) NULL,
    [mensaje] NVARCHAR(MAX) NOT NULL,
    [estado] NVARCHAR(50) NULL,
    [created_at] DATETIME2 NULL
);

IF OBJECT_ID('solicitudes_talleres', 'U') IS NULL
CREATE TABLE [solicitudes_talleres] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [taller] NVARCHAR(255) NOT NULL,
    [nombre] NVARCHAR(150) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [rut] NVARCHAR(50) NOT NULL,
    [carrera] NVARCHAR(150) NOT NULL,
    [modalidad] NVARCHAR(50) NOT NULL,
    [participantes] NVARCHAR(50) NOT NULL,
    [estado] NVARCHAR(50) NULL,
    [observaciones] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 NULL
);

IF OBJECT_ID('estadisticas_reservas_carrera', 'U') IS NULL
CREATE TABLE [estadisticas_reservas_carrera] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [reserva_id] INT NULL,
    [carrera] NVARCHAR(150) NOT NULL,
    [campus_id] INT NULL,
    [fecha] DATE NULL,
    [created_at] DATETIME2 NULL
);

IF OBJECT_ID('rate_limits', 'U') IS NULL
CREATE TABLE [rate_limits] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [key] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 NULL
);

IF OBJECT_ID('n8n_chat_histories', 'U') IS NULL
CREATE TABLE [n8n_chat_histories] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [session_id] NVARCHAR(255) NOT NULL,
    [message] NVARCHAR(MAX) NOT NULL
);

IF OBJECT_ID('configuracion_ia', 'U') IS NULL
CREATE TABLE [configuracion_ia] (
    [id] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [provider] NVARCHAR(60) NOT NULL,
    [base_url] NVARCHAR(500) NOT NULL,
    [model] NVARCHAR(150) NOT NULL,
    [credential_id] NVARCHAR(100) NULL,
    [n8n_api_base] NVARCHAR(500) NULL,
    [n8n_api_key] NVARCHAR(1000) NULL,
    [updated_by] NVARCHAR(255) NULL,
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'rls')
    EXEC('CREATE SCHEMA [rls]');

IF OBJECT_ID('rls.Pol_Seguridad_Filas_UCT', 'SP') IS NOT NULL
    DROP SECURITY POLICY [rls].[Pol_Seguridad_Filas_UCT];

IF OBJECT_ID('rls.fn_predicado_acceso_reservas', 'IF') IS NOT NULL
    DROP FUNCTION [rls].[fn_predicado_acceso_reservas];

IF OBJECT_ID('rls.fn_predicado_acceso_historial', 'IF') IS NOT NULL
    DROP FUNCTION [rls].[fn_predicado_acceso_historial];

IF OBJECT_ID('rls.fn_predicado_acceso_talleres', 'IF') IS NOT NULL
    DROP FUNCTION [rls].[fn_predicado_acceso_talleres];

EXEC('
CREATE FUNCTION [rls].[fn_predicado_acceso_reservas](@id INT, @rut NVARCHAR(50))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_access
WHERE
    SESSION_CONTEXT(N''rls_enforced'') IS NULL
    OR CAST(SESSION_CONTEXT(N''rls_enforced'') AS VARCHAR(10)) <> ''1''
    OR CAST(SESSION_CONTEXT(N''rls_rol'') AS VARCHAR(50)) = ''admin''
    OR REPLACE(REPLACE(REPLACE(UPPER(ISNULL(@rut, N'''')), N''.'', N''''), N''-'', N''''), N'' '', N'''') = CAST(SESSION_CONTEXT(N''rls_rut'') AS NVARCHAR(50))
    OR EXISTS (
        SELECT 1
        FROM [dbo].[reserva_acompanantes] AS ra
        WHERE ra.[reserva_id] = @id
          AND REPLACE(REPLACE(REPLACE(UPPER(ISNULL(ra.[rut], N'''')), N''.'', N''''), N''-'', N''''), N'' '', N'''') = CAST(SESSION_CONTEXT(N''rls_rut'') AS NVARCHAR(50))
    )
');

EXEC('
CREATE FUNCTION [rls].[fn_predicado_acceso_historial](@rut NVARCHAR(50))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_access
WHERE
    SESSION_CONTEXT(N''rls_enforced'') IS NULL
    OR CAST(SESSION_CONTEXT(N''rls_enforced'') AS VARCHAR(10)) <> ''1''
    OR CAST(SESSION_CONTEXT(N''rls_rol'') AS VARCHAR(50)) = ''admin''
    OR REPLACE(REPLACE(REPLACE(UPPER(ISNULL(@rut, N'''')), N''.'', N''''), N''-'', N''''), N'' '', N'''') = CAST(SESSION_CONTEXT(N''rls_rut'') AS NVARCHAR(50))
');

EXEC('
CREATE FUNCTION [rls].[fn_predicado_acceso_talleres](@rut NVARCHAR(50), @email NVARCHAR(255))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_access
WHERE
    SESSION_CONTEXT(N''rls_enforced'') IS NULL
    OR CAST(SESSION_CONTEXT(N''rls_enforced'') AS VARCHAR(10)) <> ''1''
    OR CAST(SESSION_CONTEXT(N''rls_rol'') AS VARCHAR(50)) = ''admin''
    OR REPLACE(REPLACE(REPLACE(UPPER(ISNULL(@rut, N'''')), N''.'', N''''), N''-'', N''''), N'' '', N'''') = CAST(SESSION_CONTEXT(N''rls_rut'') AS NVARCHAR(50))
    OR LOWER(LTRIM(RTRIM(ISNULL(@email, N'''')))) = LOWER(CAST(SESSION_CONTEXT(N''rls_email'') AS NVARCHAR(255)))
');

EXEC('
CREATE SECURITY POLICY [rls].[Pol_Seguridad_Filas_UCT]
    ADD FILTER PREDICATE [rls].[fn_predicado_acceso_reservas]([id], [rut]) ON [dbo].[reservas],
    ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_reservas]([id], [rut]) ON [dbo].[reservas] AFTER INSERT,
    ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_reservas]([id], [rut]) ON [dbo].[reservas] AFTER UPDATE,
    ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_reservas]([id], [rut]) ON [dbo].[reservas] BEFORE DELETE,
    ADD FILTER PREDICATE [rls].[fn_predicado_acceso_historial]([rut]) ON [dbo].[historial_reservas],
    ADD FILTER PREDICATE [rls].[fn_predicado_acceso_talleres]([rut], [email]) ON [dbo].[solicitudes_talleres],
    ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_talleres]([rut], [email]) ON [dbo].[solicitudes_talleres] AFTER INSERT,
    ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_talleres]([rut], [email]) ON [dbo].[solicitudes_talleres] AFTER UPDATE,
    ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_talleres]([rut], [email]) ON [dbo].[solicitudes_talleres] BEFORE DELETE
WITH (STATE = ON)
');
