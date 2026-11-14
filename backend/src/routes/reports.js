const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/roles');

router.use(authMiddleware);
router.use(requireAdmin);

// Helper to format minutes into human readable text (ex: 2h 15min)
function formatDuration(minutes) {
  if (minutes === null || isNaN(minutes) || minutes < 0) return 'N/A';
  const mins = Math.round(minutes);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours < 24) {
    return `${hours}h ${remainingMins}min`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

// GET /api/reports/dashboard - Metrics and filterable table (Admin only)
router.get('/dashboard', (req, res) => {
  try {
    const { status, tecnico_id, data_inicio, data_fim, search } = req.query;

    // 1. Total por status
    const statusRows = db.prepare(`
      SELECT status, COUNT(*) AS total
      FROM tickets
      WHERE deleted_at IS NULL
      GROUP BY status
    `).all();

    const statusCounts = {
      'Aberto': 0,
      'Em andamento': 0,
      'Resolvido': 0,
      'Concluído': 0,
      total: 0
    };

    statusRows.forEach(row => {
      if (statusCounts[row.status] !== undefined) {
        statusCounts[row.status] = row.total;
      }
      statusCounts.total += row.total;
    });

    // 2. Total por técnico
    const techRows = db.prepare(`
      SELECT 
        u.id, 
        u.nome, 
        u.login,
        COUNT(t.id) AS total_atribuidos,
        SUM(CASE WHEN t.status IN ('Aberto', 'Em andamento') THEN 1 ELSE 0 END) AS em_aberto,
        SUM(CASE WHEN t.status IN ('Resolvido', 'Concluído') THEN 1 ELSE 0 END) AS finalizados
      FROM users u
      LEFT JOIN tickets t ON t.tecnico_id = u.id AND t.deleted_at IS NULL
      WHERE u.perfil IN ('tecnico', 'admin') AND u.ativo = 1
      GROUP BY u.id
      ORDER BY total_atribuidos DESC, u.nome ASC
    `).all();

    const unassignedCount = db.prepare(`
      SELECT COUNT(*) AS total
      FROM tickets
      WHERE tecnico_id IS NULL AND deleted_at IS NULL
    `).get().total;

    // 3. Tempo médio de resolução (Average resolution time)
    // Find resolution event from ticket_history or fallback to updated_at for Resolvido/Concluido
    const resolutionTimes = db.prepare(`
      SELECT 
        t.id,
        t.created_at,
        COALESCE(
          (SELECT MIN(h.created_at) FROM ticket_history h WHERE h.ticket_id = t.id AND h.status_novo IN ('Resolvido', 'Concluído')),
          t.updated_at
        ) AS resolved_at,
        (
          strftime('%s', COALESCE(
            (SELECT MIN(h.created_at) FROM ticket_history h WHERE h.ticket_id = t.id AND h.status_novo IN ('Resolvido', 'Concluído')),
            t.updated_at
          )) - strftime('%s', t.created_at)
        ) / 60.0 AS duration_minutes
      FROM tickets t
      WHERE t.status IN ('Resolvido', 'Concluído') AND t.deleted_at IS NULL
    `).all();

    let avgResolutionMinutes = null;
    let avgResolutionFormatted = 'Nenhum ticket resolvido ainda';

    if (resolutionTimes.length > 0) {
      const validDurations = resolutionTimes
        .map(r => r.duration_minutes)
        .filter(d => d !== null && d >= 0);

      if (validDurations.length > 0) {
        const sumMinutes = validDurations.reduce((acc, curr) => acc + curr, 0);
        avgResolutionMinutes = Math.round(sumMinutes / validDurations.length);
        avgResolutionFormatted = formatDuration(avgResolutionMinutes);
      }
    }

    // 4. Tickets por período (daily trend for last 30 days or filtered range)
    let periodQuery = `
      SELECT date(created_at) as data, COUNT(*) as criados,
             SUM(CASE WHEN status IN ('Resolvido', 'Concluído') THEN 1 ELSE 0 END) as resolvidos
      FROM tickets
      WHERE deleted_at IS NULL
    `;
    const periodParams = [];

    if (data_inicio) {
      periodQuery += ` AND date(created_at) >= date(?)`;
      periodParams.push(data_inicio);
    }
    if (data_fim) {
      periodQuery += ` AND date(created_at) <= date(?)`;
      periodParams.push(data_fim);
    }

    periodQuery += ` GROUP BY date(created_at) ORDER BY date(created_at) ASC`;
    const periodTrend = db.prepare(periodQuery).all(...periodParams);

    // 5. Tabela filtrável de tickets
    let tableQuery = `
      SELECT 
        t.id,
        t.titulo,
        t.status,
        t.created_at,
        t.updated_at,
        u.nome AS usuario_nome,
        tec.nome AS tecnico_nome,
        (
          SELECT MIN(h.created_at)
          FROM ticket_history h
          WHERE h.ticket_id = t.id AND h.status_novo IN ('Resolvido', 'Concluído')
        ) AS resolucao_data
      FROM tickets t
      JOIN users u ON t.usuario_id = u.id
      LEFT JOIN users tec ON t.tecnico_id = tec.id
      WHERE t.deleted_at IS NULL
    `;
    const tableParams = [];

    if (status) {
      tableQuery += ` AND t.status = ?`;
      tableParams.push(status);
    }

    if (tecnico_id === 'unassigned') {
      tableQuery += ` AND t.tecnico_id IS NULL`;
    } else if (tecnico_id) {
      tableQuery += ` AND t.tecnico_id = ?`;
      tableParams.push(tecnico_id);
    }

    if (data_inicio) {
      tableQuery += ` AND date(t.created_at) >= date(?)`;
      tableParams.push(data_inicio);
    }

    if (data_fim) {
      tableQuery += ` AND date(t.created_at) <= date(?)`;
      tableParams.push(data_fim);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      tableQuery += ` AND (t.titulo LIKE ? OR t.descricao LIKE ? OR u.nome LIKE ? OR tec.nome LIKE ?)`;
      tableParams.push(term, term, term, term);
    }

    tableQuery += ` ORDER BY t.created_at DESC`;

    const ticketsList = db.prepare(tableQuery).all(...tableParams).map(t => {
      let tempoResolucao = '-';
      if ((t.status === 'Resolvido' || t.status === 'Concluído') && (t.resolucao_data || t.updated_at)) {
        const resolvedDate = new Date(t.resolucao_data || t.updated_at);
        const createdDate = new Date(t.created_at);
        const diffMinutes = Math.max(0, Math.round((resolvedDate - createdDate) / (1000 * 60)));
        tempoResolucao = formatDuration(diffMinutes);
      }
      return {
        ...t,
        tempo_resolucao: tempoResolucao
      };
    });

    return res.json({
      resumo_status: statusCounts,
      resumo_tecnicos: {
        tecnicos: techRows,
        sem_tecnico: unassignedCount
      },
      tempo_medio_resolucao: {
        minutos: avgResolutionMinutes,
        formatado: avgResolutionFormatted,
        total_resolvidos: resolutionTimes.length
      },
      tendencia_periodo: periodTrend,
      tabela_tickets: ticketsList
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: 'Erro interno ao gerar relatório gerencial.' });
  }
});

module.exports = router;

