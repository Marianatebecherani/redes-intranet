-- Dados iniciais da Redes Intranet (fictícios).
-- Todos os usuários iniciais usam a senha padrão "capivara", armazenada apenas como hash bcrypt (custo 10).
-- Pode ser executado novamente: registros existentes são mantidos.

SET NAMES utf8mb4;

INSERT IGNORE INTO usuarios (username, nome, senha_hash, perfil) VALUES
    ('mariana',  'Mariana',  '$2b$10$n0v.pApchzfGzbhHrE6dJuHpegFqQTZyMFnPZfqyGI2H/.tsqi7ga', 'admin'),
    ('jean',     'Jean',     '$2b$10$8xPuZ34OGLspMHA8eGMSne/F3mjZ51G0umbhhX03dm8hQnHvtDF7W', 'admin'),
    ('fulano',   'Fulano',   '$2b$10$XzlIW5xhAo5INspuHt4OI.YjEgTCsHM7Kh2hu63iPxQEh.l4QN5Li', 'usuario'),
    ('sicrano',  'Sicrano',  '$2b$10$6N8NQYFORGL/dJ/GSgeBhunP0pDUWFMnW9Oi1zmOdQaYDnseHqmiO', 'usuario'),
    ('beltrano', 'Beltrano', '$2b$10$/HYkrcrKKHVIKuW1LgHd4O05VARV6sv.zmfDwD7eJtiGBxZTeYxIS', 'usuario');

INSERT INTO colaboradores (nome, setor, cargo, ramal, email, usuario_id)
SELECT dados.nome, dados.setor, dados.cargo, dados.ramal, dados.email, u.id
FROM (
    SELECT 'mariana' AS username, 'Mariana' AS nome, 'Tecnologia' AS setor, 'Administradora de redes' AS cargo, '2001' AS ramal, 'mariana@intranet.local' AS email
    UNION ALL SELECT 'jean',     'Jean',     'Tecnologia', 'Administrador de sistemas', '2002', 'jean@intranet.local'
    UNION ALL SELECT 'fulano',   'Fulano',   'Financeiro', 'Analista financeiro',       '3001', 'fulano@intranet.local'
    UNION ALL SELECT 'sicrano',  'Sicrano',  'Comercial',  'Vendedor',                  '4001', 'sicrano@intranet.local'
    UNION ALL SELECT 'beltrano', 'Beltrano', 'Recursos Humanos', 'Analista de RH',      '5001', 'beltrano@intranet.local'
) AS dados
JOIN usuarios u ON u.username = dados.username
LEFT JOIN colaboradores c ON c.usuario_id = u.id
WHERE c.id IS NULL;

INSERT INTO comunicados (titulo, conteudo, autor_id)
SELECT 'Bem-vindos à intranet',
       'Esta é a nova intranet da equipe. Use o menu para acessar comunicados, o diretório de colaboradores e as pastas compartilhadas.',
       u.id
FROM usuarios u
WHERE u.username = 'mariana'
  AND NOT EXISTS (SELECT 1 FROM comunicados WHERE titulo = 'Bem-vindos à intranet');
