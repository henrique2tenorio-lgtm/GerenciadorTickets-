import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Lock, User, AlertCircle, CheckCircle, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password reset request state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoginInput, setResetLoginInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetFeedback, setResetFeedback] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate('/tickets');
    } catch (err) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    if (!resetLoginInput.trim()) return;

    setResetLoading(true);
    setResetFeedback({ type: '', text: '' });

    try {
      const res = await api.post('/auth/request-password-reset', {
        login: resetLoginInput.trim()
      });
      setResetFeedback({
        type: 'success',
        text: res.message || 'Solicitação registrada com sucesso! Os administradores foram notificados.'
      });
      setResetLoginInput('');
    } catch (err) {
      setResetFeedback({
        type: 'error',
        text: err.message || 'Erro ao enviar solicitação.'
      });
    } finally {
      setResetLoading(false);
    }
  };

  const fillQuickCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon-big">
            <Headphones size={32} />
          </div>
          <h1 className="login-title">HelpDesk</h1>
          <p className="login-subtitle">Sistema Gerenciador de Tickets</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              Usuário / Login
            </label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input 
                id="login-username"
                type="text" 
                className="form-input" 
                placeholder="Ex: admin, tecnico, usuario" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Senha
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input 
                id="login-password"
                type="password" 
                className="form-input" 
                placeholder="Sua senha" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="login-footer-links">
          <button 
            type="button" 
            className="link-btn" 
            onClick={() => {
              setShowResetModal(true);
              setResetFeedback({ type: '', text: '' });
              setResetLoginInput('');
            }}
          >
            <KeyRound size={15} /> Solicitar troca de senha
          </button>
        </div>

        {/* Quick Demo Credentials Panel */}
        <div className="demo-credentials-box">
          <span className="demo-title">Contas de Teste Pré-configuradas:</span>
          <div className="demo-buttons-row">
            <button 
              type="button" 
              className="demo-badge-btn badge-role-admin" 
              onClick={() => fillQuickCredentials('admin', 'admin123')}
            >
              Admin (admin)
            </button>
            <button 
              type="button" 
              className="demo-badge-btn badge-role-tecnico" 
              onClick={() => fillQuickCredentials('tecnico', 'tecnico123')}
            >
              Técnico (tecnico)
            </button>
            <button 
              type="button" 
              className="demo-badge-btn badge-role-usuario" 
              onClick={() => fillQuickCredentials('usuario', 'usuario123')}
            >
              Usuário (usuario)
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Solicitar Troca de Senha */}
      {showResetModal && (
        <div className="modal-backdrop">
          <div className="modal-box modal-sm">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <KeyRound size={20} className="text-primary" /> Solicitar Troca de Senha
              </h3>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowResetModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleRequestPasswordReset}>
              <div className="modal-body">
                <p className="text-secondary text-sm mb-4">
                  Informe o seu usuário de acesso. Uma notificação será enviada a todos os administradores para que possam redefinir sua senha.
                </p>

                {resetFeedback.text && (
                  <div className={`alert ${resetFeedback.type === 'success' ? 'alert-success' : 'alert-error'} mb-3`}>
                    {resetFeedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{resetFeedback.text}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Seu Usuário (Login)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Digite seu login" 
                    value={resetLoginInput}
                    onChange={(e) => setResetLoginInput(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowResetModal(false)}
                >
                  Fechar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={resetLoading || !resetLoginInput.trim()}
                >
                  {resetLoading ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

