import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Inbox, UserCheck, Eye, RefreshCw, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export function NewTickets() {
  const { onOpenTicket, refreshTrigger } = useOutletContext() || {};
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [assumingId, setAssumingId] = useState(null);

  const fetchUnassigned = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tickets/unassigned');
      setTickets(res.tickets || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar tickets sem técnico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnassigned();
  }, [fetchUnassigned, refreshTrigger]);

  const handleAssume = async (ticketId) => {
    setAssumingId(ticketId);
    setError('');
    setSuccessMsg('');

    try {
      await api.patch(`/tickets/${ticketId}/assume`);
      setSuccessMsg(`Ticket #${ticketId} assumido com sucesso!`);
      // Refresh list
      await fetchUnassigned();
    } catch (err) {
      if (err.status === 409) {
        setError(`Atenção: O ticket #${ticketId} acabou de ser assumido por outro técnico.`);
      } else {
        setError(err.message || 'Erro ao assumir ticket.');
      }
      fetchUnassigned();
    } finally {
      setAssumingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Inbox size={24} className="text-primary" /> Novos Tickets (Sem Técnico)
          </h1>
          <p className="page-subtitle">
            Tickets em aberto aguardando atribuição. O primeiro técnico que assumir ficará responsável.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchUnassigned} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
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

      {loading ? (
        <div className="flex-center p-12">
          <RefreshCw className="animate-spin text-primary" size={32} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state-card">
          <Inbox size={48} className="text-muted mb-3" />
          <h3 className="empty-title">Nenhum ticket pendente</h3>
          <p className="empty-text">Todos os tickets já possuem um técnico responsável ou foram concluídos.</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map((t) => (
            <div key={t.id} className="ticket-card">
              <div className="ticket-card-header">
                <div className="flex items-center gap-2">
                  <span className="ticket-id-tag">#{t.id}</span>
                  <StatusBadge status={t.status} />
                </div>
                <span className="ticket-time flex items-center gap-1">
                  <Clock size={13} /> {t.created_at}
                </span>
              </div>

              <h3 className="ticket-card-title">{t.titulo}</h3>
              <p className="ticket-card-desc">{t.descricao}</p>

              <div className="ticket-card-meta">
                <span className="flex items-center gap-1">
                  <User size={14} className="text-muted" /> Solicitante: <strong>{t.usuario_nome}</strong>
                </span>
              </div>

              <div className="ticket-card-footer">
                <button 
                  className="btn btn-primary btn-sm"
                  disabled={assumingId === t.id}
                  onClick={() => handleAssume(t.id)}
                >
                  <UserCheck size={15} /> {assumingId === t.id ? 'Assumindo...' : 'Assumir'}
                </button>

                {onOpenTicket && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenTicket(t.id)}
                  >
                    <Eye size={15} /> Detalhes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

