const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middlewares/auth');
const { requireRole, requireAdmin, requireTecnicoOrAdmin } = require('../middlewares/roles');
const { validateRequiredString, validateIntegerId, validateStatus, VALID_STATUSES } = require('../middlewares/validator');
const { notifyUser, notifyAdmins, notifyTechnicians } = require('../utils/notifications');

const STATUS_ORDER = {
  'Aberto': 1,
  'Em andamento': 2,
  'Resolvido': 3,
  'Concluído': 4
};

// All routes require authentication
router.use(authMiddleware);

// GET /api/tickets - List tickets based on user role and filters
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT t.*, 
             u.nome AS usuario_nome, 
             u.login AS usuario_login,
             tec.nome AS tecnico_nome,
             tec.login AS tecnico_login,
             (SELECT COUNT(*) FROM ticket_comments c WHERE c.ticket_id = t.id) AS total_comentarios
      FROM tickets t
      JOIN users u ON t.usuario_id = u.id
      LEFT JOIN users tec ON t.tecnico_id = tec.id
      WHERE t.deleted_at IS NULL
    `;
    const params = [];

    // Filter by role
    if (req.user.perfil === 'usuario') {
      query += ` AND t.usuario_id = ?`;
      params.push(req.user.id);
    } else if (req.user.perfil === 'tecnico') {
      // Técnico sees only assigned tickets and unassigned tickets
      query += ` AND (t.tecnico_id = ? OR t.tecnico_id IS NULL)`;
      params.push(req.user.id);
    }
    // Admin sees all non-deleted tickets

    // Filter by status if provided
    if (status && VALID_STATUSES.includes(status)) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    // Filter by search term
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (t.titulo LIKE ? OR t.descricao LIKE ? OR u.nome LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY t.created_at DESC`;

    const tickets = db.prepare(query).all(...params);
    return res.json({ tickets });
  } catch (error) {
    console.error('Erro ao listar tickets:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar tickets.' });
  }
});

// GET /api/tickets/unassigned - List tickets without a technician (Admin and Técnico)
router.get('/unassigned', requireTecnicoOrAdmin, (req, res) => {
  try {
    const tickets = db.prepare(`
      SELECT t.*, 
             u.nome AS usuario_nome, 
             u.login AS usuario_login,
             (SELECT COUNT(*) FROM ticket_comments c WHERE c.ticket_id = t.id) AS total_comentarios
      FROM tickets t
      JOIN users u ON t.usuario_id = u.id
      WHERE t.tecnico_id IS NULL AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
    `).all();

    return res.json({ tickets });
  } catch (error) {
    console.error('Erro ao buscar tickets sem técnico:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar tickets novos.' });
  }
});

// GET /api/tickets/:id - Single ticket details
router.get('/:id', (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const ticketId = parseInt(req.params.id, 10);

  try {
    const ticket = db.prepare(`
      SELECT t.*, 
             u.nome AS usuario_nome, 
             u.login AS usuario_login,
             tec.nome AS tecnico_nome,
             tec.login AS tecnico_login
      FROM tickets t
      JOIN users u ON t.usuario_id = u.id
      LEFT JOIN users tec ON t.tecnico_id = tec.id
      WHERE t.id = ? AND t.deleted_at IS NULL
    `).get(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado ou já excluído.' });
    }

    // Role-based authorization check
    if (req.user.perfil === 'usuario' && ticket.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado. Você só pode visualizar seus próprios tickets.' });
    }

    if (req.user.perfil === 'tecnico' && ticket.tecnico_id !== null && ticket.tecnico_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado. Este ticket está atribuído a outro técnico.' });
    }

    // Fetch comments
    const comments = db.prepare(`
      SELECT c.*, u.nome AS autor_nome, u.perfil AS autor_perfil, u.login AS autor_login
      FROM ticket_comments c
      JOIN users u ON c.autor_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `).all(ticketId);

    // Fetch status history
    const history = db.prepare(`
      SELECT h.*, u.nome AS user_nome, u.perfil AS user_perfil
      FROM ticket_history h
      JOIN users u ON h.user_id = u.id
      WHERE h.ticket_id = ?
      ORDER BY h.created_at ASC
    `).all(ticketId);

    return res.json({
      ticket,
      comments,
      history
    });
  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    return res.status(500).json({ error: 'Erro interno ao obter ticket.' });
  }
});

// POST /api/tickets - Create ticket (all roles)
router.post('/', (req, res) => {
  const { titulo, descricao } = req.body;

  const errTitulo = validateRequiredString(titulo, 'título', 3, 150);
  if (errTitulo) return res.status(400).json({ error: errTitulo });

  const errDesc = validateRequiredString(descricao, 'descrição', 5, 4000);
  if (errDesc) return res.status(400).json({ error: errDesc });

  try {
    const insertStmt = db.prepare(`
      INSERT INTO tickets (titulo, descricao, status, usuario_id, tecnico_id, created_at, updated_at)
      VALUES (?, ?, 'Aberto', ?, NULL, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);

    const result = insertStmt.run(titulo.trim(), descricao.trim(), req.user.id);
    const ticketId = result.lastInsertRowid;

    // Log history
    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Novo', 'Aberto', 'Abertura do ticket', datetime('now', 'localtime'))
    `).run(ticketId, req.user.id);

    // Notifications:
    // Admin: novo ticket criado
    notifyAdmins(
      'novo_ticket',
      `Novo ticket #${ticketId} criado por ${req.user.nome}: ${titulo.trim()}`,
      ticketId
    );

    // Técnico: novo ticket sem responsável
    notifyTechnicians(
      'novo_ticket_sem_tecnico',
      `Novo ticket sem técnico #${ticketId}: ${titulo.trim()}`,
      ticketId
    );

    return res.status(201).json({
      message: 'Ticket cadastrado com sucesso!',
      ticketId
    });
  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar ticket.' });
  }
});

// PATCH /api/tickets/:id/assume - Atomic assumption of ticket without technician
router.patch('/:id/assume', requireTecnicoOrAdmin, (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const ticketId = parseInt(req.params.id, 10);

  try {
    // Atomic update checking tecnico_id IS NULL and deleted_at IS NULL
    const stmt = db.prepare(`
      UPDATE tickets
      SET tecnico_id = ?, 
          status = CASE WHEN status = 'Aberto' THEN 'Em andamento' ELSE status END,
          updated_at = datetime('now', 'localtime')
      WHERE id = ? AND tecnico_id IS NULL AND deleted_at IS NULL
    `);

    const result = stmt.run(req.user.id, ticketId);

    if (result.changes === 0) {
      return res.status(409).json({
        error: 'Ticket já assumido por outro técnico ou não está mais disponível.'
      });
    }

    // Get updated ticket to know previous and new status
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

    // Log in history
    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Aberto', ?, ?, datetime('now', 'localtime'))
    `).run(ticketId, req.user.id, ticket.status, `Ticket assumido por ${req.user.nome}`);

    // Notify ticket author
    notifyUser(
      ticket.usuario_id,
      'ticket_assumido',
      `Seu ticket #${ticketId} foi assumido pelo técnico ${req.user.nome}.`,
      ticketId
    );

    return res.json({
      message: 'Ticket assumido com sucesso!',
      ticket
    });
  } catch (error) {
    console.error('Erro ao assumir ticket:', error);
    return res.status(500).json({ error: 'Erro interno ao assumir ticket.' });
  }
});

// PATCH /api/tickets/:id/status - Change ticket status
router.patch('/:id/status', (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const ticketId = parseInt(req.params.id, 10);
  const { status, observacao } = req.body;

  const errStatus = validateStatus(status);
  if (errStatus) return res.status(400).json({ error: errStatus });

  // Users cannot change status
  if (req.user.perfil === 'usuario') {
    return res.status(403).json({ error: 'Usuários não possuem permissão para alterar o status do ticket.' });
  }

  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado ou já excluído.' });
    }

    // Technician rules
    if (req.user.perfil === 'tecnico') {
      if (ticket.tecnico_id !== req.user.id) {
        return res.status(403).json({ error: 'Você só pode alterar o status de tickets atribuídos a você.' });
      }

      const currentOrder = STATUS_ORDER[ticket.status];
      const newOrder = STATUS_ORDER[status];

      // Técnico can only progress forward (Aberto -> Em andamento -> Resolvido -> Concluído)
      if (newOrder <= currentOrder) {
        return res.status(400).json({
          error: `Técnico não pode retroceder o status do ticket (atual: "${ticket.status}", solicitado: "${status}").`
        });
      }
    }

    // Admin can change status freely (including backward)
    const oldStatus = ticket.status;
    db.prepare(`
      UPDATE tickets
      SET status = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(status, ticketId);

    // History record
    const obsText = observacao ? observacao.trim() : `Status alterado de "${oldStatus}" para "${status}" por ${req.user.nome}`;
    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(ticketId, req.user.id, oldStatus, status, obsText);

    // Notify ticket author on solution / conclusion or any status change
    notifyUser(
      ticket.usuario_id,
      'status_ticket',
      `O status do seu ticket #${ticketId} foi atualizado para "${status}".`,
      ticketId
    );

    return res.json({
      message: `Status atualizado com sucesso para "${status}".`,
      novoStatus: status
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar status do ticket.' });
  }
});

// PATCH /api/tickets/:id/reassign - Reassign technician (Admin only)
router.patch('/:id/reassign', requireAdmin, (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const ticketId = parseInt(req.params.id, 10);
  const { tecnico_id } = req.body;

  let targetTecnico = null;
  if (tecnico_id !== null && tecnico_id !== undefined && tecnico_id !== '') {
    const errTechId = validateIntegerId(tecnico_id, 'tecnico_id');
    if (errTechId) return res.status(400).json({ error: errTechId });

    targetTecnico = db.prepare('SELECT id, nome, perfil, ativo FROM users WHERE id = ?').get(tecnico_id);
    if (!targetTecnico) {
      return res.status(404).json({ error: 'Técnico selecionado não foi encontrado.' });
    }
    if (targetTecnico.perfil !== 'tecnico' && targetTecnico.perfil !== 'admin') {
      return res.status(400).json({ error: 'O usuário selecionado não possui perfil técnico.' });
    }
    if (targetTecnico.ativo !== 1) {
      return res.status(400).json({ error: 'Não é possível atribuir a um técnico inativo.' });
    }
  }

  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }

    const newTecnicoId = targetTecnico ? targetTecnico.id : null;
    db.prepare(`
      UPDATE tickets
      SET tecnico_id = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newTecnicoId, ticketId);

    // History record
    const obs = targetTecnico
      ? `Técnico reatribuído para ${targetTecnico.nome} pelo administrador ${req.user.nome}`
      : `Técnico desvinculado pelo administrador ${req.user.nome}`;

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(ticketId, req.user.id, ticket.status, ticket.status, obs);

    // Notify newly assigned technician
    if (targetTecnico) {
      notifyUser(
        targetTecnico.id,
        'ticket_atribuido',
        `O ticket #${ticketId} foi atribuído a você pelo administrador ${req.user.nome}.`,
        ticketId
      );
    }

    return res.json({
      message: 'Responsável pelo ticket atualizado com sucesso!',
      tecnico: targetTecnico ? { id: targetTecnico.id, nome: targetTecnico.nome } : null
    });
  } catch (error) {
    console.error('Erro ao reatribuir técnico:', error);
    return res.status(500).json({ error: 'Erro interno ao reatribuir técnico.' });
  }
});

// DELETE /api/tickets/:id - Soft delete ticket (Admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const ticketId = parseInt(req.params.id, 10);

  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado ou já excluído.' });
    }

    db.prepare(`
      UPDATE tickets
      SET deleted_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(ticketId);

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, ?, ?, 'Ticket excluído logicamente pelo administrador', datetime('now', 'localtime'))
    `).run(ticketId, req.user.id, ticket.status, 'Excluído');

    return res.json({ message: 'Ticket excluído com sucesso (exclusão lógica).' });
  } catch (error) {
    console.error('Erro ao excluir ticket:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir ticket.' });
  }
});

// POST /api/tickets/:id/comments - Add comment to ticket
router.post('/:id/comments', (req, res) => {
  const errId = validateIntegerId(req.params.id, 'id');
  if (errId) return res.status(400).json({ error: errId });

  const ticketId = parseInt(req.params.id, 10);
  const { mensagem } = req.body;

  const errMsg = validateRequiredString(mensagem, 'comentário / mensagem', 1, 3000);
  if (errMsg) return res.status(400).json({ error: errMsg });

  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado ou já excluído.' });
    }

    // Role checks:
    // Usuário can only comment on their own ticket
    if (req.user.perfil === 'usuario' && ticket.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode comentar nos seus próprios tickets.' });
    }

    // Técnico can comment on assigned tickets or unassigned tickets
    if (req.user.perfil === 'tecnico' && ticket.tecnico_id !== null && ticket.tecnico_id !== req.user.id) {
      return res.status(403).json({ error: 'Você não pode comentar em um ticket atribuído a outro técnico.' });
    }

    // Insert comment
    const insertComment = db.prepare(`
      INSERT INTO ticket_comments (ticket_id, autor_id, mensagem, created_at)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `);
    const result = insertComment.run(ticketId, req.user.id, mensagem.trim());

    // Update ticket updated_at
    db.prepare(`
      UPDATE tickets
      SET updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(ticketId);

    // Notifications:
    // "Usuário: resposta de técnico/admin no seu ticket."
    if ((req.user.perfil === 'tecnico' || req.user.perfil === 'admin') && ticket.usuario_id !== req.user.id) {
      notifyUser(
        ticket.usuario_id,
        'resposta_ticket',
        `Nova resposta no seu ticket #${ticketId} por ${req.user.nome}.`,
        ticketId
      );
    }

    // "Técnico: comentário do usuário em ticket atribuído a ele."
    if (req.user.perfil === 'usuario' && ticket.tecnico_id) {
      notifyUser(
        ticket.tecnico_id,
        'comentario_usuario',
        `O usuário ${req.user.nome} comentou no ticket #${ticketId}: ${ticket.titulo}.`,
        ticketId
      );
    }

    const comment = db.prepare(`
      SELECT c.*, u.nome AS autor_nome, u.perfil AS autor_perfil, u.login AS autor_login
      FROM ticket_comments c
      JOIN users u ON c.autor_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Comentário adicionado com sucesso!',
      comment
    });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar comentário.' });
  }
});

module.exports = router;

