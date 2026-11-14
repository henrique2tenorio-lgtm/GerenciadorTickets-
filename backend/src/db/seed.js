const bcrypt = require('bcrypt');
const { db, initDatabase } = require('./database');

function seed() {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const tecnicoPassword = process.env.TECNICO_PASSWORD || 'tecnico123';
  const usuarioPassword = process.env.USUARIO_PASSWORD || 'usuario123';

  if (userCount === 0) {
    console.log('--- SEEDING INITIAL USERS ---');
    const adminHash = bcrypt.hashSync(adminPassword, 10);
    const tecnicoHash = bcrypt.hashSync(tecnicoPassword, 10);
    const usuarioHash = bcrypt.hashSync(usuarioPassword, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (nome, login, senha_hash, perfil, ativo)
      VALUES (?, ?, ?, ?, 1)
    `);

    const adminResult = insertUser.run('Administrador do Sistema', 'admin', adminHash, 'admin');
    const tecnicoResult = insertUser.run('Carlos Técnico', 'tecnico', tecnicoHash, 'tecnico');
    const usuarioResult = insertUser.run('Maria Usuária', 'usuario', usuarioHash, 'usuario');

    console.log(`[SEED] Admin criado: login: 'admin' | senha: '${adminPassword}'`);
    console.log(`[SEED] Técnico criado: login: 'tecnico' | senha: '${tecnicoPassword}'`);
    console.log(`[SEED] Usuário criado: login: 'usuario' | senha: '${usuarioPassword}'`);

    const adminId = adminResult.lastInsertRowid;
    const tecnicoId = tecnicoResult.lastInsertRowid;
    const usuarioId = usuarioResult.lastInsertRowid;

    // Seed test tickets
    console.log('--- SEEDING TEST TICKETS ---');

    // Ticket 1: Aberto, sem técnico
    const t1 = db.prepare(`
      INSERT INTO tickets (titulo, descricao, status, usuario_id, tecnico_id, created_at, updated_at)
      VALUES (?, ?, 'Aberto', ?, NULL, datetime('now', '-2 hours', 'localtime'), datetime('now', '-2 hours', 'localtime'))
    `).run(
      'Falha de conexão com a impressora do 2º andar',
      'A impressora em rede do setor financeiro não responde aos comandos de impressão desde hoje de manhã. Apresenta erro offline.',
      usuarioId
    );

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Novo', 'Aberto', 'Abertura do ticket', datetime('now', '-2 hours', 'localtime'))
    `).run(t1.lastInsertRowid, usuarioId);

    // Ticket 2: Em andamento, com Carlos Técnico
    const t2 = db.prepare(`
      INSERT INTO tickets (titulo, descricao, status, usuario_id, tecnico_id, created_at, updated_at)
      VALUES (?, ?, 'Em andamento', ?, ?, datetime('now', '-1 day', 'localtime'), datetime('now', '-4 hours', 'localtime'))
    `).run(
      'Acesso lento ao sistema de ERP',
      'As telas de consulta de pedidos estão demorando mais de 1 minuto para carregar os relatórios diários.',
      usuarioId,
      tecnicoId
    );

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Novo', 'Aberto', 'Abertura do ticket', datetime('now', '-1 day', 'localtime'))
    `).run(t2.lastInsertRowid, usuarioId);

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Aberto', 'Em andamento', 'Técnico assumiu o ticket e iniciou verificação', datetime('now', '-4 hours', 'localtime'))
    `).run(t2.lastInsertRowid, tecnicoId);

    db.prepare(`
      INSERT INTO ticket_comments (ticket_id, autor_id, mensagem, created_at)
      VALUES (?, ?, ?, datetime('now', '-4 hours', 'localtime'))
    `).run(t2.lastInsertRowid, tecnicoId, 'Iniciei a análise nos servidores de banco de dados e conexão de rede.');

    db.prepare(`
      INSERT INTO ticket_comments (ticket_id, autor_id, mensagem, created_at)
      VALUES (?, ?, ?, datetime('now', '-3 hours', 'localtime'))
    `).run(t2.lastInsertRowid, usuarioId, 'Obrigada pelo retorno rápido, Carlos!');

    // Ticket 3: Resolvido
    const t3 = db.prepare(`
      INSERT INTO tickets (titulo, descricao, status, usuario_id, tecnico_id, created_at, updated_at)
      VALUES (?, ?, 'Resolvido', ?, ?, datetime('now', '-2 days', 'localtime'), datetime('now', '-1 day', 'localtime'))
    `).run(
      'Instalação de certificado digital na máquina recepção',
      'Certificado A1 expirou e precisa ser reinstalado no navegador Chrome.',
      usuarioId,
      tecnicoId
    );

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Novo', 'Aberto', 'Abertura do ticket', datetime('now', '-2 days', 'localtime'))
    `).run(t3.lastInsertRowid, usuarioId);

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Aberto', 'Em andamento', 'Instalação em andamento', datetime('now', '-1 day', '-2 hours', 'localtime'))
    `).run(t3.lastInsertRowid, tecnicoId);

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Em andamento', 'Resolvido', 'Certificado instalado e testado com sucesso', datetime('now', '-1 day', 'localtime'))
    `).run(t3.lastInsertRowid, tecnicoId);

    db.prepare(`
      INSERT INTO ticket_comments (ticket_id, autor_id, mensagem, created_at)
      VALUES (?, ?, ?, datetime('now', '-1 day', 'localtime'))
    `).run(t3.lastInsertRowid, tecnicoId, 'Certificado instalado com sucesso. Teste realizado no portal e-CAC.');

    // Ticket 4: Concluído
    const t4 = db.prepare(`
      INSERT INTO tickets (titulo, descricao, status, usuario_id, tecnico_id, created_at, updated_at)
      VALUES (?, ?, 'Concluído', ?, ?, datetime('now', '-3 days', 'localtime'), datetime('now', '-2 days', 'localtime'))
    `).run(
      'Troca de toner da impressora fiscal',
      'Toner preto com nível crítico avisando necessidade de troca.',
      usuarioId,
      tecnicoId
    );

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Novo', 'Aberto', 'Abertura do ticket', datetime('now', '-3 days', 'localtime'))
    `).run(t4.lastInsertRowid, usuarioId);

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Aberto', 'Em andamento', 'Solicitação de suprimento atendida', datetime('now', '-2 days', '-4 hours', 'localtime'))
    `).run(t4.lastInsertRowid, tecnicoId);

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Em andamento', 'Resolvido', 'Toner substituído', datetime('now', '-2 days', '-1 hour', 'localtime'))
    `).run(t4.lastInsertRowid, tecnicoId);

    db.prepare(`
      INSERT INTO ticket_history (ticket_id, user_id, status_anterior, status_novo, observacao, created_at)
      VALUES (?, ?, 'Resolvido', 'Concluído', 'Solução confirmada e ticket finalizado', datetime('now', '-2 days', 'localtime'))
    `).run(t4.lastInsertRowid, tecnicoId);

    // Initial notification for admin and tecnico
    db.prepare(`
      INSERT INTO notifications (user_id, tipo, mensagem, ticket_id, lida, created_at)
      VALUES (?, 'novo_ticket', ?, ?, 0, datetime('now', '-2 hours', 'localtime'))
    `).run(adminId, 'Novo ticket #1 criado por Maria Usuária: Falha de conexão com a impressora do 2º andar', t1.lastInsertRowid);

    db.prepare(`
      INSERT INTO notifications (user_id, tipo, mensagem, ticket_id, lida, created_at)
      VALUES (?, 'novo_ticket_sem_tecnico', ?, ?, 0, datetime('now', '-2 hours', 'localtime'))
    `).run(tecnicoId, 'Novo ticket sem técnico #1: Falha de conexão com a impressora do 2º andar', t1.lastInsertRowid);

    console.log('[SEED] Dados de teste semeados com sucesso!');
  } else {
    // If admin exists, log admin credentials reminder
    console.log(`[SEED] Usuário admin já existente. Credenciais padrão: admin / ${adminPassword}`);
  }
}

module.exports = { seed };

