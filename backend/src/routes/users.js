const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../db/database');
const { authMiddleware } = require('../middlewares/auth');
const { requireAdmin, requireTecnicoOrAdmin } = require('../middlewares/roles');
const { validateRequiredString, validateIntegerId, validateRole, VALID_ROLES } = require('../middlewares/validator');

router.use(authMiddleware);

// GET /api/users/technicians - List active technicians for assignment dropdowns
router.get('/technicians', requireTecnicoOrAdmin, (req, res) => {
  try {
    const technicians = db.prepare(`
      SELECT id, nome, login, perfil
      FROM users
      WHERE perfil IN ('tecnico', 'admin') AND ativo = 1
      ORDER BY nome ASC
    `).all();
    return res.json({ technicians });
  } catch (error) {
    console.error('Erro ao listar técnicos:', error);
    return res.status(500).json({ error: 'Erro ao listar técnicos.' });
  }
});

// GET /api/users - List all users (Admin only)
router.get('/', requireAdmin, (req, res) => {
  try {
    const { search, perfil, ativo } = req.query;
    let query = `
      SELECT id, nome, login, perfil, ativo, created_at,
             (SELECT COUNT(*) FROM tickets WHERE usuario_id = users.id AND deleted_at IS NULL) AS tickets_criados,
             (SELECT COUNT(*) FROM tickets WHERE tecnico_id = users.id AND deleted_at IS NULL) AS tickets_atribuidos
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (nome LIKE ? OR login LIKE ?)`;
      params.push(term, term);
    }

    if (perfil && VALID_ROLES.includes(perfil)) {
      query += ` AND perfil = ?`;
      params.push(perfil);
    }

    if (ativo !== undefined && ativo !== '') {
      query += ` AND ativo = ?`;
      params.push(Number(ativo));
    }

    query += ` ORDER BY created_at DESC`;

    const users = db.prepare(query).all(...params);
    return res.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// POST /api/users - Create user (Admin only)
router.post('/', requireAdmin, (req, res) => {
  const { nome, login, senha, perfil } = req.body;

  const errNome = validateRequiredString(nome, 'nome', 2, 100);
  if (errNome) return res.status(400).json({ error: errNome });

  const errLogin = validateRequiredString(login, 'login', 3, 30);
  if (errLogin) return res.status(400).json({ error: errLogin });

  const errSenha = validateRequiredString(senha, 'senha inicial', 6, 100);
  if (errSenha) return res.status(400).json({ error: errSenha });

  const errPerfil = validateRole(perfil);
  if (errPerfil) return res.status(400).json({ error: errPerfil });

  const normalizedLogin = login.trim().toLowerCase();

  try {
    const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(normalizedLogin);
    if (existing) {
      return res.status(409).json({ error: `Já existe um usuário cadastrado com o login "${normalizedLogin}".` });
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const result = db.prepare(`
      INSERT INTO users (nome, login, senha_hash, perfil, ativo, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now', 'localtime'))
    `).run(nome.trim(), normalizedLogin, senhaHash, perfil);

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      user: {
        id: result.lastInsertRowid,
        nome: nome.trim(),
        login: normalizedLogin,
        perfil,
        ativo: 1
      }
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

// PATCH /api/users/:id/status - Toggle active/inactive (Admin only)
router.patch('/:id/status', requireAdmin, (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const userId = parseInt(req.params.id, 10);
  const { ativo } = req.body;

  if (ativo !== 0 && ativo !== 1 && ativo !== true && ativo !== false) {
    return res.status(400).json({ error: 'O campo "ativo" deve ser 0 (inativo) ou 1 (ativo).' });
  }

  const newStatus = (ativo === 1 || ativo === true) ? 1 : 0;

  // Cannot deactivate self
  if (userId === req.user.id && newStatus === 0) {
    return res.status(400).json({ error: 'Você não pode desativar o seu próprio usuário de administrador.' });
  }

  try {
    const user = db.prepare('SELECT id, nome, login, ativo FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    db.prepare('UPDATE users SET ativo = ? WHERE id = ?').run(newStatus, userId);

    // If deactivated, kill user's active sessions
    if (newStatus === 0) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    }

    return res.json({
      message: `Usuário ${newStatus === 1 ? 'ativado' : 'desativado'} com sucesso!`,
      ativo: newStatus
    });
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    return res.status(500).json({ error: 'Erro ao alterar status do usuário.' });
  }
});

// POST /api/users/:id/reset-password - Reset password with temp password (Admin only)
router.post('/:id/reset-password', requireAdmin, (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const userId = parseInt(req.params.id, 10);
  const { nova_senha } = req.body;

  const errSenha = validateRequiredString(nova_senha, 'nova senha temporária', 6, 100);
  if (errSenha) return res.status(400).json({ error: errSenha });

  try {
    const user = db.prepare('SELECT id, nome, login FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const senhaHash = bcrypt.hashSync(nova_senha, 10);
    db.prepare('UPDATE users SET senha_hash = ? WHERE id = ?').run(senhaHash, userId);

    // Terminate existing sessions so user must log in with new password
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

    return res.json({
      message: `Senha redefinida com sucesso para o usuário "${user.login}". As sessões ativas foram finalizadas.`
    });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ error: 'Erro ao redefinir senha do usuário.' });
  }
});

module.exports = router;

