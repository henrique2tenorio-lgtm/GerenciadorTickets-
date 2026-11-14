# Sistema Gerenciador de Tickets (Help Desk)

Sistema completo e funcional de gerenciamento de tickets de suporte técnico (Help Desk), construído com arquitetura desacoplada em pastas `/backend` e `/frontend`.

---

## 🛠️ Stack Tecnológica

- **Frontend:** React (JavaScript puro, sem TypeScript), Vite, React Router (`react-router-dom`), Lucide Icons (`lucide-react`).
- **Backend:** Node.js, Express, SQLite via `better-sqlite3`.
- **Segurança:** Senhas criptografadas com `bcrypt`, tokens opacos aleatórios em banco de dados (`crypto.randomBytes`), rate limiting de tentativas de login e validação estrita de entrada em todas as rotas.

---

## 👥 Perfis de Acesso e Regras de Negócio

Todas as regras de autorização são **validadas e protegidas no backend via middleware**; o frontend apenas esconde opções visuais.

### 1. Administrador (`admin`)
- Vê todos os tickets do sistema (excluindo os deletados logicamente).
- Altera o status dos tickets **livremente** (inclusive retrocedendo status).
- Reatribui técnicos responsáveis pelos tickets.
- Apaga tickets através de **exclusão lógica** (`deleted_at`).
- Gestão completa de usuários: cadastra novos usuários com qualquer perfil, redefine senhas temporárias e ativa/desativa contas.
- Recebe notificações automáticas de solicitações de troca de senha e novos tickets criados.

### 2. Técnico (`tecnico`)
- Visualiza apenas tickets atribuídos a ele e tickets novos sem técnico responsável.
- **Assume tickets sem técnico:** implementação **atômica** (`UPDATE ... WHERE tecnico_id IS NULL`). Caso outro técnico tente assumir simultaneamente, a operação retorna HTTP 409 (*Conflict*).
- Responde e comenta nos tickets atribuídos.
- **Progressão de status unidirecional (apenas para frente):** `Aberto` → `Em andamento` → `Resolvido` → `Concluído`. Retroceder status é estritamente bloqueado no backend com HTTP 400.
- Confirma a solução e conclusão do ticket (marca como `Concluído`).

### 3. Usuário (`usuario`)
- Cria seus próprios tickets com título e descrição.
- Visualiza **apenas** os seus chamados.
- Não edita, não altera status e não exclui tickets salvos (bloqueado no backend com HTTP 403).
- Adiciona comentários e interage em seus próprios chamados.
- Recebe notificações em tempo real (sino) quando um técnico ou administrador responder seu ticket.

---

## 🔑 Credenciais de Teste (Seed Inicial)

O banco de dados é automaticamente inicializado e semeado na primeira execução do backend com os seguintes usuários e tickets de exemplo:

| Perfil | Usuário (`login`) | Senha | Nome |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Administrador do Sistema |
| **Técnico** | `tecnico` | `tecnico123` | Carlos Técnico |
| **Usuário** | `usuario` | `usuario123` | Maria Usuária |

*(A senha inicial do administrador também pode ser configurada via variável de ambiente `ADMIN_PASSWORD`)*.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (v18, v20 ou v22+)
- **NPM**

### 1. Navegar até a pasta raiz do projeto:
```bash
cd c:\Users\Aluno\Desktop\Aluno
```

---

### 2. Instalação das Dependências:

Você pode instalar as dependências de todo o projeto com um único comando na raiz:
```bash
npm run postinstall
```

Ou instalar individualmente em cada pasta:
```bash
# Dependências do Backend
cd backend
npm install

# Dependências do Frontend
cd ../frontend
npm install
```

---

### 3. Compilação (Build) do Frontend:

Para validar e gerar a versão otimizada de produção do frontend (verificando módulos e integridade):
```bash
cd frontend
npm run build
```
*(Ou diretamente a partir da raiz: `npm run build`)*.

---

### 4. Inicialização do Backend e do Frontend:

Abra **dois terminais** separados (um para a API e outro para a interface):

#### 💻 Terminal 1 — Backend (API Node.js/Express na porta 3001):
```bash
cd backend
npm start
```
> O backend iniciará em `http://localhost:3001` (API em `http://localhost:3001/api`), inicializará o banco SQLite `helpdesk.db` e exibirá as credenciais de teste no console.

#### 🌐 Terminal 2 — Frontend (Vite / React na porta 5173):
```bash
cd frontend
npm run dev
```
> O frontend iniciará em `http://localhost:5173`. 
> Acesse **`http://localhost:5173`** no seu navegador para utilizar o sistema.

---

### ℹ️ Observações sobre o Console do Navegador

Ao abrir o console do navegador (`F12`):
- A mensagem `Download the React DevTools for a better development experience: https://react.dev/link/react-devtools` é apenas um informativo padrão do React em modo de desenvolvimento (não se trata de erro).
- O arquivo `favicon.ico` já está devidamente configurado em `frontend/public/favicon.ico`.

---

### 🧪 Executar a Suíte de Testes Automatizados de Integração:
O projeto conta com testes automatizados cobrindo autenticação, papéis, bloqueio 403 para usuário, 409 atômico para assumir tickets, progressão apenas para frente do técnico e relatórios:

```bash
cd backend
npm test
```

---

## 🔔 Sistema de Notificações
- Ícone de sino no topo da aplicação com badge numérico de não lidas.
- **Polling automático a cada 30 segundos** para manter o estado sincronizado.
- Marcar notificação individual ou todas como lidas.
- Disparos automáticos:
  - **Usuário:** notificado quando técnico ou admin responde ao chamado dele.
  - **Admin:** notificado quando um usuário solicita troca de senha no login e quando um novo ticket é criado.
  - **Técnico:** notificado quando surge um novo ticket sem responsável e quando o usuário comenta no chamado atribuído a ele.

---

## 🛡️ Segurança e Autenticação

1. **Tokens Opacos:** No login bem-sucedido, um token aleatório criptograficamente seguro (`crypto.randomBytes(32).toString('hex')`) é gerado e registrado na tabela `sessions` com validade de 8 horas.
2. **Revogação Imediata:** A rota `POST /api/auth/logout` remove imediatamente o token da tabela `sessions`. Qualquer requisição posterior com este token recebe HTTP 401.
3. **Rate Limiting de Login:** Limite de 5 tentativas inválidas consecutivas por usuário em um intervalo de 15 minutos. Após exceder, a conta é temporariamente bloqueada com HTTP 429.
4. **Sem Cadastro Público:** Apenas administradores podem criar contas e definir o perfil.
5. **Solicitar Troca de Senha:** Disponível na tela de login, gera notificação direta aos administradores para que definam uma nova senha temporária.

---

## 📊 Telas do Sistema

1. **Login:** Acesso com usuário e senha, link para solicitação de troca de senha e botões rápidos de demonstração.
2. **Cadastrar Ticket:** Formulário para abertura de novos chamados com validação de campos.
3. **Novos Tickets (Admin & Técnico):** Listagem de tickets sem responsável com botão para **Assumir** de forma atômica.
4. **Meus Tickets (Todos):** Listagem com busca textual, abas por status e abertura da tela de detalhes do ticket com comentários e histórico de status.
5. **Relatório de Acompanhamento (Admin):** Métricas de total por status, métricas por técnico, tempo médio de resolução e tabela com filtros por período e técnico.
6. **Gestão de Usuários (Admin):** Cadastro de novos usuários, ativação/desativação e redefinição de senhas temporárias.

---

## 📂 Estrutura de Diretórios

```
Aluno/
├── package.json               # Scripts unificados de inicialização
├── README.md                  # Este documento
├── backend/
│   ├── package.json           # Dependências do Express + better-sqlite3 + bcrypt
│   ├── test-backend.js        # Suíte de testes automatizados do backend
│   └── src/
│       ├── server.js          # Servidor Express e inicialização
│       ├── db/
│       │   ├── database.js    # Conexão SQLite, pragmas WAL e foreign keys
│       │   └── seed.js        # Semeador de usuários e tickets de teste
│       ├── middlewares/
│       │   ├── auth.js        # Validação de token de sessão (8h)
│       │   ├── roles.js       # Controle de acesso baseado em perfis
│       │   ├── rateLimit.js   # Controle de tentativas de login (5 falhas/15m)
│       │   └── validator.js   # Validação de entrada de dados
│       ├── routes/
│       │   ├── auth.js        # Login, logout, me, solicitação de senha
│       │   ├── tickets.js     # CRUD, assumir, avançar status, comentários
│       │   ├── users.js       # Gestão de usuários (Admin)
│       │   ├── notifications.js # Notificações e marcação de lidas
│       │   └── reports.js     # Métricas gerenciais e tempo médio de resolução
│       └── utils/
│           └── notifications.js # Helpers para disparo de notificações
└── frontend/
    ├── package.json           # Dependências do React + Vite + React Router
    ├── vite.config.js         # Configuração Vite com proxy reverso para a API
    ├── index.html             # HTML base
    └── src/
        ├── main.jsx           # Ponto de entrada React
        ├── App.jsx            # Rotas protegidas e configuração geral
        ├── index.css          # Design system completo e responsivo
        ├── api/
        │   └── client.js      # Cliente HTTP com injeção de Bearer token e tratamento 401
        ├── context/
        │   ├── AuthContext.jsx # Estado de autenticação e logout
        │   └── NotificationContext.jsx # Polling de notificações (30s)
        ├── components/
        │   ├── Layout.jsx     # Shell da aplicação (Sidebar + Header + Body)
        │   ├── Header.jsx     # Topo com sino, contador e dados do usuário
        │   ├── Sidebar.jsx    # Menu lateral com controle por perfil
        │   ├── StatusBadge.jsx # Badges de status dos tickets
        │   ├── RoleBadge.jsx   # Badges dos perfis de usuário
        │   ├── ConfirmModal.jsx # Modal reutilizável de confirmação
        │   └── TicketDetailModal.jsx # Modal detalhado do chamado
        └── pages/
            ├── Login.jsx      # Tela de login e solicitar troca de senha
            ├── CreateTicket.jsx # Tela 1: Cadastrar Ticket
            ├── NewTickets.jsx   # Tela 2: Novos Tickets (Assumir)
            ├── MyTickets.jsx    # Tela 3: Meus Tickets
            ├── Reports.jsx      # Tela 4: Relatório de Acompanhamento
            └── UserManagement.jsx # Tela 5: Gestão de Usuários
```

