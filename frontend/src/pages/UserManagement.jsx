import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, KeyRound, Power, PowerOff, Search, 
  RefreshCw, CheckCircle, AlertCircle, ShieldAlert, X 
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/RoleBadge';
import { ConfirmModal } from '../components/ConfirmModal';

export function UserManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newPerfil, setNewPerfil] = useState('usuario');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState('');

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetError, setResetError] = useState('');

  // Toggle Active Confirm Modal
  const [toggleUserTarget, setToggleUserTarget] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (roleFilter) params.append('perfil', roleFilter);

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message || 'Erro ao listar usuários.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateError('');

    try {
      await api.post('/users', {
        nome: newNome.trim(),
        login: newLogin.trim(),
        senha: newSenha,
        perfil: newPerfil
      });

      setSuccessMsg(`Usuário "${newLogin}" cadastrado com sucesso!`);
      setShowCreateModal(false);
      setNewNome('');
      setNewLogin('');
      setNewSenha('');
      setNewPerfil('usuario');
      fetchUsers();
    } catch (err) {
      setCreateError(err.message || 'Erro ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!targetUser) return;

    setResettingPassword(true);
    setResetError('');

    try {
      await api.post(`/users/${targetUser.id}/reset-password`, {
        nova_senha: tempPassword
      });

      setSuccessMsg(`Senha temporária definida para o usuário "${targetUser.login}".`);
      setShowResetModal(false);
      setTargetUser(null);
      setTempPassword('');
    } catch (err) {
      setResetError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setResettingPassword(false);
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async () => {
    if (!toggleUserTarget) return;

    const newAtivo = toggleUserTarget.ativo === 1 ? 0 : 1;
    try {
      await api.patch(`/users/${toggleUserTarget.id}/status`, {
        ativo: newAtivo
      });

      setSuccessMsg(`Usuário "${toggleUserTarget.login}" ${newAtivo === 1 ? 'ativado' : 'desativado'} com sucesso.`);
      setToggleUserTarget(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Erro ao alterar status do usuário.');
      setToggleUserTarget(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={24} className="text-primary" /> Gestão de Usuários
          </h1>
          <p className="page-subtitle">
            Crie novos usuários, gerencie níveis de acesso (Admin, Técnico, Usuário), redefina senhas e altere status.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            className="btn btn-primary"
            onClick={() => {
              setShowCreateModal(true);
              setCreateError('');
            }}
          >
            <UserPlus size={16} /> Novo Usuário
          </button>
          <button className="btn btn-secondary" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success mb-4">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="table-controls-card mb-4">
        <div className="flex gap-2 flex-wrap flex-1">
          <div className="search-box flex-1" style={{ minWidth: 240 }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="search-input"
              placeholder="Buscar por nome ou login..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="form-select w-auto"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Todos os perfis</option>
            <option value="admin">Administrador</option>
            <option value="tecnico">Técnico</option>
            <option value="usuario">Usuário</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex-center p-12">
            <RefreshCw className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome Completo</th>
                  <th>Login</th>
                  <th>Perfil de Acesso</th>
                  <th>Status</th>
                  <th>Cadastrado em</th>
                  <th>Chamados (Criados / Atribuídos)</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="font-medium">{u.nome}</div>
                        {isCurrent && (
                          <span className="badge badge-default text-xs mt-0.5">Sua conta atual</span>
                        )}
                      </td>
                      <td>
                        <code className="code-tag">{u.login}</code>
                      </td>
                      <td>
                        <RoleBadge role={u.perfil} />
                      </td>
                      <td>
                        {u.ativo === 1 ? (
                          <span className="badge badge-resolvido">
                            <span className="badge-dot" /> Ativo
                          </span>
                        ) : (
                          <span className="badge badge-danger">
                            <span className="badge-dot" /> Inativo
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-secondary">{u.created_at}</span>
                      </td>
                      <td>
                        <span className="text-xs text-secondary">
                          {u.tickets_criados || 0} criados • {u.tickets_atribuidos || 0} atribuídos
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Reset Password Button */}
                          <button 
                            className="btn btn-secondary btn-xs"
                            title="Definir nova senha temporária"
                            onClick={() => {
                              setTargetUser(u);
                              setTempPassword('');
                              setResetError('');
                              setShowResetModal(true);
                            }}
                          >
                            <KeyRound size={13} /> Senha
                          </button>

                          {/* Toggle Active Button (cannot toggle self) */}
                          <button 
                            className={`btn btn-xs ${u.ativo === 1 ? 'btn-danger-outline' : 'btn-success-outline'}`}
                            disabled={isCurrent}
                            title={isCurrent ? 'Não é possível desativar sua própria conta' : (u.ativo === 1 ? 'Desativar usuário' : 'Ativar usuário')}
                            onClick={() => setToggleUserTarget(u)}
                          >
                            {u.ativo === 1 ? <PowerOff size={13} /> : <Power size={13} />}
                            {u.ativo === 1 ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVO USUÁRIO */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-box modal-md">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <UserPlus size={20} className="text-primary" /> Cadastrar Novo Usuário
              </h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                {createError && (
                  <div className="alert alert-error mb-4">
                    <AlertCircle size={18} />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nome Completo <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: João da Silva"
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Login Único <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: joaosilva"
                    value={newLogin}
                    onChange={(e) => setNewLogin(e.target.value)}
                    required
                    minLength={3}
                  />
                  <span className="input-hint">Será utilizado para acessar o sistema.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Senha Inicial <span className="text-danger">*</span></label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Mínimo de 6 caracteres"
                    value={newSenha}
                    onChange={(e) => setNewSenha(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Perfil de Acesso (Nível de Permissão) <span className="text-danger">*</span></label>
                  <select 
                    className="form-select"
                    value={newPerfil}
                    onChange={(e) => setNewPerfil(e.target.value)}
                    required
                  >
                    <option value="usuario">Usuário (Cria e acompanha chamados próprios)</option>
                    <option value="tecnico">Técnico (Assume chamados e presta suporte)</option>
                    <option value="admin">Administrador (Controle total, relatórios e usuários)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creatingUser}
                >
                  {creatingUser ? 'Salvando...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REDEFINIR SENHA */}
      {showResetModal && targetUser && (
        <div className="modal-backdrop">
          <div className="modal-box modal-sm">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <KeyRound size={20} className="text-primary" /> Redefinir Senha
              </h3>
              <button className="btn-close" onClick={() => setShowResetModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p className="text-secondary text-sm mb-3">
                  Defina uma nova senha temporária para o usuário <strong>{targetUser.nome}</strong> (<code>{targetUser.login}</code>).
                </p>

                {resetError && (
                  <div className="alert alert-error mb-4">
                    <AlertCircle size={18} />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nova Senha Temporária <span className="text-danger">*</span></label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Mínimo de 6 caracteres"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <span className="input-hint">Qualquer sessão ativa do usuário será finalizada.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowResetModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={resettingPassword || !tempPassword}
                >
                  {resettingPassword ? 'Atualizando...' : 'Definir Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: ATIVAR/DESATIVAR USUÁRIO */}
      <ConfirmModal 
        isOpen={!!toggleUserTarget}
        title={toggleUserTarget?.ativo === 1 ? 'Desativar Usuário' : 'Ativar Usuário'}
        message={`Deseja realmente ${toggleUserTarget?.ativo === 1 ? 'desativar' : 'ativar'} o acesso do usuário "${toggleUserTarget?.login}" (${toggleUserTarget?.nome})?`}
        confirmText={toggleUserTarget?.ativo === 1 ? 'Sim, desativar' : 'Sim, ativar'}
        cancelText="Cancelar"
        isDestructive={toggleUserTarget?.ativo === 1}
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleUserTarget(null)}
      />
    </div>
  );
}

