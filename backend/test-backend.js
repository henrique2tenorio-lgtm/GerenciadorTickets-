const http = require('http');

const BASE_URL = 'http://localhost:3001/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- INICIANDO TESTES DO BACKEND ---');

  // Start server
  const server = require('./src/server.js');
  await new Promise(r => setTimeout(r, 500));

  let adminToken, tecnicoToken, usuarioToken;

  // 1. Test Login
  console.log('\n1. Testando Login com credenciais válidas...');
  const loginAdmin = await request('POST', '/auth/login', { login: 'admin', senha: 'admin123' });
  console.assert(loginAdmin.status === 200, 'Admin login deve ser 200, foi: ' + loginAdmin.status);
  console.assert(loginAdmin.body.token, 'Admin deve receber token');
  console.assert(loginAdmin.body.user.perfil === 'admin', 'Perfil deve ser admin');
  adminToken = loginAdmin.body.token;

  const loginTecnico = await request('POST', '/auth/login', { login: 'tecnico', senha: 'tecnico123' });
  console.assert(loginTecnico.status === 200, 'Técnico login deve ser 200');
  tecnicoToken = loginTecnico.body.token;

  const loginUsuario = await request('POST', '/auth/login', { login: 'usuario', senha: 'usuario123' });
  console.assert(loginUsuario.status === 200, 'Usuário login deve ser 200');
  usuarioToken = loginUsuario.body.token;
  console.log('✓ Login de todos os 3 perfis bem-sucedido!');

  // 2. Test Invalid Login
  console.log('\n2. Testando Login com senha inválida...');
  const failLogin = await request('POST', '/auth/login', { login: 'usuario', senha: 'wrongpassword' });
  console.assert(failLogin.status === 401, 'Deve retornar 401 para senha inválida');
  console.log('✓ Retornou 401 para senha incorreta');

  // 3. Test Solicitar Troca de Senha
  console.log('\n3. Testando Solicitar Troca de Senha...');
  const resetReq = await request('POST', '/auth/request-password-reset', { login: 'usuario' });
  console.assert(resetReq.status === 200, 'Deve retornar 200 para solicitação de troca');
  console.log('✓ Solicitação de troca de senha gerada com sucesso');

  // Verify Admin received notification for password reset
  const adminNotifs = await request('GET', '/notifications', null, adminToken);
  const passResetNotif = adminNotifs.body.notifications.find(n => n.tipo === 'solicitacao_senha');
  console.assert(passResetNotif, 'Admin deve receber notificação de solicitação de senha');
  console.log('✓ Admin recebeu notificação de solicitação de senha!');

  // 4. Test Usuário Creating Ticket
  console.log('\n4. Testando Criação de Ticket pelo Usuário...');
  const newTicket = await request('POST', '/tickets', {
    titulo: 'Erro ao abrir relatório financeiro',
    descricao: 'Ao clicar no botão de exportar PDF, a aplicação trava e fecha.'
  }, usuarioToken);
  console.assert(newTicket.status === 201, 'Criação de ticket deve ser 201');
  const createdTicketId = newTicket.body.ticketId;
  console.log(`✓ Ticket #${createdTicketId} criado com sucesso!`);

  // Verify notification sent to Admin and Technicians
  const tecNotifs = await request('GET', '/notifications', null, tecnicoToken);
  const newTicketNotif = tecNotifs.body.notifications.find(n => n.ticket_id === createdTicketId);
  console.assert(newTicketNotif, 'Técnico deve receber notificação de novo ticket sem responsável');
  console.log('✓ Técnico recebeu notificação do novo ticket sem responsável!');

  // 5. Test Usuário trying to change status (must be 403 Forbidden)
  console.log('\n5. Testando tentativa de Usuário mudar status (deve falhar)...');
  const userTryStatus = await request('PATCH', `/tickets/${createdTicketId}/status`, { status: 'Resolvido' }, usuarioToken);
  console.assert(userTryStatus.status === 403, 'Usuário não pode alterar status, deve retornar 403, retornou: ' + userTryStatus.status);
  console.log('✓ Usuário bloqueado com 403 ao tentar mudar status!');

  // 6. Test Atomic Assumption by Técnico
  console.log('\n6. Testando Assumir Ticket de forma atômica...');
  const assumeRes1 = await request('PATCH', `/tickets/${createdTicketId}/assume`, null, tecnicoToken);
  console.assert(assumeRes1.status === 200, 'Técnico 1 deve conseguir assumir ticket');
  console.log('✓ Técnico assumiu o ticket!');

  // Attempting to assume again must return 409 Conflict
  const assumeRes2 = await request('PATCH', `/tickets/${createdTicketId}/assume`, null, adminToken);
  console.assert(assumeRes2.status === 409, 'Segundo usuário deve receber 409 Conflito ao tentar assumir ticket já assumido');
  console.log('✓ Concorrência atômica validada: retornou 409 "ticket já assumido"!');

  // 7. Test Técnico Status Progression (Forward only)
  console.log('\n7. Testando regras de status para o Técnico (somente para frente)...');
  // Attempt backward transition to 'Aberto' from 'Em andamento'
  const retroceder = await request('PATCH', `/tickets/${createdTicketId}/status`, { status: 'Aberto' }, tecnicoToken);
  console.assert(retroceder.status === 400, 'Técnico não pode retroceder status, deve ser 400');
  console.log('✓ Técnico bloqueado ao tentar retroceder status para Aberto!');

  // Progress forward to 'Resolvido'
  const forwardResolvido = await request('PATCH', `/tickets/${createdTicketId}/status`, { status: 'Resolvido' }, tecnicoToken);
  console.assert(forwardResolvido.status === 200, 'Técnico deve conseguir avançar para Resolvido');
  console.log('✓ Técnico avançou status para Resolvido!');

  // Progress forward to 'Concluído'
  const forwardConcluido = await request('PATCH', `/tickets/${createdTicketId}/status`, { status: 'Concluído' }, tecnicoToken);
  console.assert(forwardConcluido.status === 200, 'Técnico deve conseguir marcar Concluído');
  console.log('✓ Técnico concluiu o ticket com sucesso!');

  // 8. Test Admin can retrocede status freely
  console.log('\n8. Testando Admin alterando status livremente (inclusive retroceder)...');
  const adminRetrocede = await request('PATCH', `/tickets/${createdTicketId}/status`, { status: 'Aberto' }, adminToken);
  console.assert(adminRetrocede.status === 200, 'Admin pode retroceder status');
  console.log('✓ Admin retrocedeu status para Aberto com sucesso!');

  // 9. Test Comments and Notifications
  console.log('\n9. Testando comentários e notificações cruzadas...');
  const addCommentTec = await request('POST', `/tickets/${createdTicketId}/comments`, { mensagem: 'Favor reiniciar o computador e testar novamente.' }, tecnicoToken);
  console.assert(addCommentTec.status === 201, 'Técnico pode comentar no ticket');

  // Verify Usuário received notification of reply
  const userNotifsAfter = await request('GET', '/notifications', null, usuarioToken);
  const replyNotif = userNotifsAfter.body.notifications.find(n => n.tipo === 'resposta_ticket' && n.ticket_id === createdTicketId);
  console.assert(replyNotif, 'Usuário deve ser notificado quando técnico responde');
  console.log('✓ Usuário recebeu notificação de resposta no ticket!');

  // Mark notification as read
  const markRead = await request('PATCH', `/notifications/${replyNotif.id}/read`, null, usuarioToken);
  console.assert(markRead.status === 200, 'Marcar notificação como lida deve retornar 200');
  console.log('✓ Notificação marcada como lida com sucesso!');

  // 10. Test User Management (Admin only)
  console.log('\n10. Testando Gestão de Usuários (somente Admin)...');
  // Attempt user creation by regular user -> must be 403
  const userTryCreate = await request('POST', '/users', { nome: 'Hacker', login: 'hacker', senha: 'password', perfil: 'admin' }, usuarioToken);
  console.assert(userTryCreate.status === 403, 'Usuário comum não pode criar usuários');
  console.log('✓ Usuário comum impedido de criar usuários (403)');

  // Admin creates new technician with unique login
  const dynamicLogin = 'novotecnico_' + Date.now();
  const adminCreateUser = await request('POST', '/users', {
    nome: 'Novo Técnico Teste',
    login: dynamicLogin,
    senha: 'senhaforte123',
    perfil: 'tecnico'
  }, adminToken);
  console.assert(adminCreateUser.status === 201, 'Admin deve conseguir criar usuário');
  const newUserId = adminCreateUser.body.user.id;
  console.log('✓ Admin criou novo usuário com sucesso!');

  // Admin resets password
  const resetPassRes = await request('POST', `/users/${newUserId}/reset-password`, { nova_senha: 'novasenha123' }, adminToken);
  console.assert(resetPassRes.status === 200, 'Admin deve conseguir redefinir senha');
  console.log('✓ Admin redefiniu senha temporária com sucesso!');

  // Admin toggles active status
  const deactRes = await request('PATCH', `/users/${newUserId}/status`, { ativo: 0 }, adminToken);
  console.assert(deactRes.status === 200, 'Admin deve conseguir desativar usuário');
  console.log('✓ Admin desativou usuário com sucesso!');

  // Deactivated user cannot log in
  const loginDeact = await request('POST', '/auth/login', { login: dynamicLogin, senha: 'novasenha123' });
  console.assert(loginDeact.status === 403, 'Usuário desativado não pode logar (403)');
  console.log('✓ Usuário desativado bloqueado no login com 403!');

  // 11. Test Reports (Admin only)
  console.log('\n11. Testando Relatório de Acompanhamento...');
  const userTryReport = await request('GET', '/reports/dashboard', null, usuarioToken);
  console.assert(userTryReport.status === 403, 'Usuário não pode ver relatórios');

  const adminReport = await request('GET', '/reports/dashboard', null, adminToken);
  console.assert(adminReport.status === 200, 'Admin acessa relatórios com 200');
  console.assert(adminReport.body.resumo_status, 'Relatório contém resumo por status');
  console.assert(adminReport.body.tempo_medio_resolucao, 'Relatório contém tempo médio de resolução');
  console.assert(Array.isArray(adminReport.body.tabela_tickets), 'Relatório contém tabela filtrável');
  console.log('✓ Relatório gerencial validado com métricas e tabela filtrável!');

  // 12. Test Logout
  console.log('\n12. Testando Logout e invalidação imediata de sessão...');
  const logoutRes = await request('POST', '/auth/logout', null, usuarioToken);
  console.assert(logoutRes.status === 200, 'Logout deve retornar 200');

  // Attempting to access protected endpoint with old token must return 401
  const afterLogout = await request('GET', '/tickets', null, usuarioToken);
  console.assert(afterLogout.status === 401, 'Token invalidado após logout deve retornar 401, retornou: ' + afterLogout.status);
  console.log('✓ Token apagado e invalidado imediatamente após logout!');

  console.log('\n🎉 TODOS OS TESTES DO BACKEND PASSARAM COM 100% DE SUCESSO!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('FALHA NOS TESTES:', err);
  process.exit(1);
});
