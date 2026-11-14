const { db } = require('../db/database');

function notifyUser(userId, tipo, mensagem, ticketId = null) {
  if (!userId) return;
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, tipo, mensagem, ticket_id, lida, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now', 'localtime'))
    `).run(userId, tipo, mensagem, ticketId);
  } catch (error) {
    console.error('Erro ao criar notificação para o usuário:', error);
  }
}

function notifyAdmins(tipo, mensagem, ticketId = null) {
  try {
    const admins = db.prepare(`SELECT id FROM users WHERE perfil = 'admin' AND ativo = 1`).all();
    const insertStmt = db.prepare(`
      INSERT INTO notifications (user_id, tipo, mensagem, ticket_id, lida, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now', 'localtime'))
    `);
    const insertMany = db.transaction((adminList) => {
      for (const admin of adminList) {
        insertStmt.run(admin.id, tipo, mensagem, ticketId);
      }
    });
    insertMany(admins);
  } catch (error) {
    console.error('Erro ao notificar administradores:', error);
  }
}

function notifyTechnicians(tipo, mensagem, ticketId = null) {
  try {
    const technicians = db.prepare(`SELECT id FROM users WHERE perfil = 'tecnico' AND ativo = 1`).all();
    const insertStmt = db.prepare(`
      INSERT INTO notifications (user_id, tipo, mensagem, ticket_id, lida, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now', 'localtime'))
    `);
    const insertMany = db.transaction((techList) => {
      for (const tech of techList) {
        insertStmt.run(tech.id, tipo, mensagem, ticketId);
      }
    });
    insertMany(technicians);
  } catch (error) {
    console.error('Erro ao notificar técnicos:', error);
  }
}

module.exports = {
  notifyUser,
  notifyAdmins,
  notifyTechnicians
};

