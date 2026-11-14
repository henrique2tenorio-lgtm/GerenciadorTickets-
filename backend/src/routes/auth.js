const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { db } = require('../db/database');
const { authMiddleware } = require('../middlewares/auth');
const { checkLoginRateLimit, recordFailedAttempt, resetLoginAttempts } = require('../middlewares/rateLimit');
const { validateRequiredString } = require('../middlewares/validator');
const { notifyAdmins } = require('../utils/notifications');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { login, senha } = req.body;

  const errLogin = validateRequiredString(login, 'usuário / login', 2, 50);
  if (errLogin) {
    return res.status(400).json({ error: errLogin });
  }

  const errSenha = validateRequiredString(senha, 'senha', 1, 100);
  if (errSenha) {
    return res.status(400).json({ error: errSenha });
  }

  const normalizedLogin = login.trim().toLowerCase();

  // Check rate limit (5 attempts / 15 min)
  const rateLimitCheck = checkLoginRateLimit(normalizedLogin);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ error: rateLimitCheck.message });
  }

  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(normalizedLogin);

  if (!user) {
    recordFailedAttempt(normalizedLogin);
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  if (user.ativo !== 1) {
    return res.status(403).json({ error: 'Conta de usuário desativada. Entre em contato com um administrador.' });
  }

  const passwordMatch = bcrypt.compareSync(senha, user.senha_hash);
  if (!passwordMatch) {
    recordFailedAttempt(normalizedLogin);
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  // Reset failed attempts on success
  resetLoginAttempts(normalizedLogin);

  // Generate opaque random token (8 hours validity)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, datetime('now', 'localtime'), ?)
  `).run(token, user.id, expiresAt);

  return res.json({
    message: 'Login realizado com sucesso.',
    token,
    user: {
      id: user.id,
      nome: user.nome,
      login: user.login,
      perfil: user.perfil
    }
  });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    return res.json({ message: 'Logout realizado com sucesso. Sessão encerrada.' });
  } catch (error) {
    console.error('Erro ao efetuar logout:', error);
    return res.status(500).json({ error: 'Erro ao encerrar sessão.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

// POST /api/auth/request-password-reset
router.post('/request-password-reset', (req, res) => {
  const { login } = req.body;
  const errLogin = validateRequiredString(login, 'usuário / login', 2, 50);
  if (errLogin) {
    return res.status(400).json({ error: errLogin });
  }

  const normalizedLogin = login.trim().toLowerCase();
  const user = db.prepare('SELECT id, nome, login, ativo FROM users WHERE login = ?').get(normalizedLogin);

  if (user && user.ativo === 1) {
    notifyAdmins(
      'solicitacao_senha',
      `O usuário "${user.login}" (${user.nome}) solicitou a troca de sua senha.`,
      null
    );
  }

  // Always return user-friendly response
  return res.json({
    message: 'Solicitação registrada. Todos os administradores foram notificados para verificar sua senha.'
  });
});

module.exports = router;

