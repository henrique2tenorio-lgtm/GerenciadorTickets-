const { db } = require('../db/database');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido ou formato inválido.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token ausente.' });
  }

  try {
    const session = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.nome, u.login, u.perfil, u.ativo
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `).get(token);

    if (!session) {
      return res.status(401).json({ error: 'Sessão inexistente ou inválida. Faça login novamente.' });
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      // Clean up expired session
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    if (session.ativo !== 1) {
      return res.status(403).json({ error: 'Usuário inativo. Entre em contato com o administrador.' });
    }

    req.user = {
      id: session.id,
      nome: session.nome,
      login: session.login,
      perfil: session.perfil,
      ativo: session.ativo
    };
    req.token = token;

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno ao validar autenticação.' });
  }
}

module.exports = { authMiddleware };

