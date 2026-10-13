-- Estrutura do banco da Redes Intranet.
-- Executado pelo MySQL na primeira inicialização do volume, no banco definido por MYSQL_DATABASE.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL,
    nome          VARCHAR(120) NOT NULL,
    senha_hash    CHAR(60)     NOT NULL,
    perfil        ENUM('admin', 'usuario') NOT NULL DEFAULT 'usuario',
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuarios_username UNIQUE (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS comunicados (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    titulo        VARCHAR(150) NOT NULL,
    conteudo      TEXT         NOT NULL,
    autor_id      INT UNSIGNED NULL,
    criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_comunicados_autor FOREIGN KEY (autor_id)
        REFERENCES usuarios (id) ON DELETE SET NULL,
    INDEX idx_comunicados_criado_em (criado_em)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS colaboradores (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(120) NOT NULL,
    setor         VARCHAR(80)  NOT NULL,
    cargo         VARCHAR(80)  NULL,
    ramal         VARCHAR(10)  NULL,
    email         VARCHAR(150) NULL,
    usuario_id    INT UNSIGNED NULL,
    criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_colaboradores_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_colaboradores_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE SET NULL,
    INDEX idx_colaboradores_nome (nome)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
