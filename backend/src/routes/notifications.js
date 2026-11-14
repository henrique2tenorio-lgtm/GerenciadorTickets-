const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middlewares/auth');
const { validateIntegerId } = require('../middlewares/validator');

router.use(authMiddleware);

// GET /api/notifications - List user's notifications + unread count
router.get('/', (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT n.*
      FROM notifications n
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(req.user.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND lida = 0
    `).get(req.user.id).count;

    return res.json({
      notifications,
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return res.status(500).json({ error: 'Erro ao carregar notificações.' });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const notifId = parseInt(req.params.id, 10);

  try {
    const result = db.prepare(`
      UPDATE notifications
      SET lida = 1
      WHERE id = ? AND user_id = ?
    `).run(notifId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    return res.json({ message: 'Notificação marcada como lida.' });
  } catch (error) {
    console.error('Erro ao marcar notificação:', error);
    return res.status(500).json({ error: 'Erro ao marcar notificação como lida.' });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications
      SET lida = 1
      WHERE user_id = ? AND lida = 0
    `).run(req.user.id);

    return res.json({ message: 'Todas as notificações foram marcadas como lidas.' });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações:', error);
    return res.status(500).json({ error: 'Erro ao marcar notificações.' });
  }
});

module.exports = router;

