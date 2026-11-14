import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Send, UserCheck, ShieldAlert, Trash2, Clock, CheckCircle, 
  MessageSquare, User, RefreshCw, AlertCircle, ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { RoleBadge } from './RoleBadge';
import { ConfirmModal } from './ConfirmModal';

export function TicketDetailModal({ ticketId, onClose, onUpdated }) {
  const { user, isAdmin, isTecnico, isUsuario } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Comment input state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status and Tech change state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [statusRemark, setStatusRemark] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  // Delete modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/tickets/${ticketId}`);
      setTicket(data.ticket);
      setComments(data.comments || []);
      setHistory(data.history || []);
      setSelectedStatus(data.ticket.status);
      setSelectedTech(data.ticket.tecnico_id ? String(data.ticket.tecnico_id) : '');
    } catch (err) {
      setError(err.message || 'Erro ao carregar detalhes do ticket.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Load technicians list if admin
  useEffect(() => {
    if (isAdmin) {
      api.get('/users/technicians')
        .then(res => setTechnicians(res.technicians || []))
        .catch(err => console.error('Erro ao carregar técnicos:', err));
    }
  }, [isAdmin]);

  // Handle Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    setActionSuccess('');
    setError('');
    try {
      const res = await api.post(`/tickets/${ticketId}/comments`, {
        mensagem: newComment.trim()
      });
      setComments(prev => [...prev, res.comment]);
      setNewComment('');
      setActionSuccess('Comentário enviado com sucesso!');
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar comentário.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Assume Ticket (Técnico / Admin)
  const handleAssumeTicket = async () => {
    setSavingAction(true);
    setError('');
    setActionSuccess('');
    try {
      await api.patch(`/tickets/${ticketId}/assume`);
      setActionSuccess('Você assumiu este ticket com sucesso!');
      await loadTicket();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || 'Erro ao assumir ticket.');
    } finally {
      setSavingAction(false);
    }
  };

  // Handle Status Change (Admin can change freely; Técnico forward only)
  const handleStatusChange = async (targetStatus) => {
    setSavingAction(true);
    setError('');
    setActionSuccess('');
    try {
      await api.patch(`/tickets/${ticketId}/status`, {
        status: targetStatus,
        observacao: statusRemark.trim() || undefined
      });
      setStatusRemark('');
      setActionSuccess(`Status alterado com sucesso para "${targetStatus}"!`);
      await loadTicket();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || 'Erro ao alterar status.');
    } finally {
      setSavingAction(false);
    }
  };

  // Handle Technician Reassign (Admin only)
  const handleReassignTech = async () => {
    setSavingAction(true);
    setError('');
    setActionSuccess('');
    try {
      await api.patch(`/tickets/${ticketId}/reassign`, {
        tecnico_id: selectedTech ? parseInt(selectedTech, 10) : null
      });
      setActionSuccess('Técnico responsável atualizado com sucesso!');
      await loadTicket();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message || 'Erro ao reatribuir técnico.');
    } finally {
      setSavingAction(false);
    }
  };

  // Handle Soft Delete Ticket (Admin only)
  const handleDeleteTicket = async () => {
    try {
      await api.delete(`/tickets/${ticketId}`);
      setShowDeleteConfirm(false);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao excluir ticket.');
      setShowDeleteConfirm(false);
    }
  };

  if (!ticketId) return null;

  return (
    <>
      <div className="modal-backdrop">
        <div className="modal-box modal-ticket-detail">
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <span className="ticket-id-tag">#{ticketId}</span>
              <h2 className="modal-title">{ticket ? ticket.titulo : 'Carregando...'}</h2>
            </div>
            <button className="btn-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-body custom-scrollbar">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="alert alert-success">
                <CheckCircle size={18} />
                <span>{actionSuccess}</span>
              </div>
            )}

            {loading ? (
              <div className="flex-center p-8">
                <RefreshCw className="animate-spin text-primary" size={32} />
              </div>
            ) : ticket ? (
              <div className="ticket-detail-grid">
                {/* Meta info bar */}
                <div className="ticket-meta-card">
                  <div className="meta-item">
                    <span className="meta-label">Status Atual</span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Solicitante (Usuário)</span>
                    <span className="meta-value font-medium flex items-center gap-1">
                      <User size={15} /> {ticket.usuario_nome}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Técnico Responsável</span>
                    <span className="meta-value font-medium">
                      {ticket.tecnico_nome ? (
                        <span className="text-primary flex items-center gap-1">
                          <UserCheck size={15} /> {ticket.tecnico_nome}
                        </span>
                      ) : (
                        <span className="text-muted italic">Sem técnico atribuído</span>
                      )}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Data de Abertura</span>
                    <span className="meta-value flex items-center gap-1 text-secondary">
                      <Clock size={14} /> {ticket.created_at}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="ticket-section">
                  <h4 className="section-subtitle">Descrição do Problema</h4>
                  <div className="ticket-description-box">
                    {ticket.descricao}
                  </div>
                </div>

                {/* ACTION PANEL PER PROFILE */}
                <div className="ticket-section actions-panel-box">
                  <h4 className="section-subtitle flex items-center gap-2">
                    <ShieldAlert size={16} /> Ações Permitidas para seu Perfil ({user?.perfil})
                  </h4>

                  {/* ADMIN ACTIONS */}
                  {isAdmin && (
                    <div className="admin-actions-grid">
                      {/* Change Status Freely */}
                      <div className="action-control">
                        <label className="input-label">Alterar Status (Livre)</label>
                        <div className="flex gap-2">
                          <select 
                            className="form-select"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                          >
                            <option value="Aberto">Aberto</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Resolvido">Resolvido</option>
                            <option value="Concluído">Concluído</option>
                          </select>
                          <button 
                            className="btn btn-primary"
                            disabled={savingAction || selectedStatus === ticket.status}
                            onClick={() => handleStatusChange(selectedStatus)}
                          >
                            Salvar Status
                          </button>
                        </div>
                      </div>

                      {/* Reassign Technician */}
                      <div className="action-control">
                        <label className="input-label">Reatribuir Técnico</label>
                        <div className="flex gap-2">
                          <select 
                            className="form-select"
                            value={selectedTech}
                            onChange={(e) => setSelectedTech(e.target.value)}
                          >
                            <option value="">-- Sem Técnico (Desvincular) --</option>
                            {technicians.map(t => (
                              <option key={t.id} value={t.id}>{t.nome} ({t.login})</option>
                            ))}
                          </select>
                          <button 
                            className="btn btn-secondary"
                            disabled={savingAction}
                            onClick={handleReassignTech}
                          >
                            Reatribuir
                          </button>
                        </div>
                      </div>

                      {/* Delete Ticket Button */}
                      <div className="action-control-delete">
                        <button 
                          className="btn btn-danger-outline"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 size={16} /> Excluir Ticket (Lógico)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TÉCNICO ACTIONS */}
                  {isTecnico && (
                    <div className="tecnico-actions">
                      {/* If ticket has no tech, allow assuming */}
                      {!ticket.tecnico_id && (
                        <div className="assume-card">
                          <p className="text-secondary text-sm mb-2">Este ticket ainda não tem responsável.</p>
                          <button 
                            className="btn btn-primary"
                            disabled={savingAction}
                            onClick={handleAssumeTicket}
                          >
                            <UserCheck size={16} /> Assumir este Ticket
                          </button>
                        </div>
                      )}

                      {/* If ticket is assigned to current tech, show forward status controls */}
                      {ticket.tecnico_id === user.id && (
                        <div className="forward-status-progression">
                          <p className="text-secondary text-sm mb-2">Avançar fluxo de atendimento (apenas para frente):</p>
                          <div className="flex gap-2 flex-wrap">
                            {ticket.status === 'Aberto' && (
                              <button 
                                className="btn btn-warning"
                                disabled={savingAction}
                                onClick={() => handleStatusChange('Em andamento')}
                              >
                                Iniciar Atendimento (Em andamento)
                              </button>
                            )}

                            {ticket.status === 'Em andamento' && (
                              <button 
                                className="btn btn-success"
                                disabled={savingAction}
                                onClick={() => handleStatusChange('Resolvido')}
                              >
                                Marcar como Resolvido
                              </button>
                            )}

                            {ticket.status === 'Resolvido' && (
                              <button 
                                className="btn btn-primary"
                                disabled={savingAction}
                                onClick={() => handleStatusChange('Concluído')}
                              >
                                <CheckCircle size={16} /> Confirmar Solução (Concluído)
                              </button>
                            )}

                            {ticket.status === 'Concluído' && (
                              <span className="badge badge-concluido p-2">
                                <CheckCircle size={15} /> Ticket finalizado e concluído
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {ticket.tecnico_id && ticket.tecnico_id !== user.id && (
                        <p className="text-muted text-sm italic">
                          Ticket atribuído a outro técnico ({ticket.tecnico_nome}). Apenas visualização.
                        </p>
                      )}
                    </div>
                  )}

                  {/* USUÁRIO ACTIONS */}
                  {isUsuario && (
                    <p className="text-secondary text-sm">
                      Você pode acompanhar o andamento e adicionar comentários abaixo para interagir com o suporte.
                    </p>
                  )}
                </div>

                {/* STATUS HISTORY TIMELINE */}
                <div className="ticket-section">
                  <h4 className="section-subtitle flex items-center gap-2">
                    <Clock size={16} /> Histórico de Mudanças de Status
                  </h4>
                  <div className="history-timeline">
                    {history.length === 0 ? (
                      <p className="text-muted text-sm italic">Nenhuma mudança de status registrada.</p>
                    ) : (
                      history.map((h) => (
                        <div key={h.id} className="history-entry">
                          <div className="history-bullet" />
                          <div className="history-content">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="history-user">{h.user_nome}</span>
                              <RoleBadge role={h.user_perfil} />
                              <span className="history-transition">
                                {h.status_anterior} <ArrowRight size={12} className="inline" /> <strong>{h.status_novo}</strong>
                              </span>
                              <span className="history-date">{h.created_at}</span>
                            </div>
                            {h.observacao && <p className="history-obs">{h.observacao}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COMMENTS SECTION */}
                <div className="ticket-section">
                  <h4 className="section-subtitle flex items-center gap-2">
                    <MessageSquare size={16} /> Comentários ({comments.length})
                  </h4>

                  <div className="comments-list">
                    {comments.length === 0 ? (
                      <p className="text-muted text-sm italic p-4 text-center">Nenhum comentário adicionado ainda.</p>
                    ) : (
                      comments.map((c) => (
                        <div 
                          key={c.id} 
                          className={`comment-bubble ${c.autor_id === user.id ? 'comment-mine' : 'comment-other'}`}
                        >
                          <div className="comment-header">
                            <span className="comment-author">{c.autor_nome}</span>
                            <RoleBadge role={c.autor_perfil} />
                            <span className="comment-time">{c.created_at}</span>
                          </div>
                          <div className="comment-text">{c.mensagem}</div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add comment form */}
                  <form onSubmit={handleAddComment} className="comment-form">
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Escreva uma resposta ou comentário sobre o ticket..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      required
                    />
                    <div className="flex justify-end mt-2">
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={submittingComment || !newComment.trim()}
                      >
                        <Send size={15} /> {submittingComment ? 'Enviando...' : 'Enviar Comentário'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal for soft delete */}
      <ConfirmModal 
        isOpen={showDeleteConfirm}
        title="Excluir Ticket"
        message={`Tem certeza que deseja excluir o ticket #${ticketId}? Esta ação removerá o ticket das listagens gerais.`}
        confirmText="Sim, excluir ticket"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleDeleteTicket}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

