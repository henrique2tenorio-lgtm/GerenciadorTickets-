import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  Ticket, Search, PlusCircle, RefreshCw, MessageSquare, 
  Clock, User, UserCheck, AlertCircle, Eye 
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export function MyTickets() {
  const { user, isAdmin, isTecnico, isUsuario } = useAuth();
  const { onOpenTicket, refreshTrigger } = useOutletContext() || {};

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/tickets?${params.toString()}`);
      setTickets(res.tickets || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar tickets.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, refreshTrigger]);

  const getPageTitle = () => {
    if (isAdmin) return 'Todos os Tickets do Sistema';
    if (isTecnico) return 'Meus Tickets Atribuídos';
    return 'Meus Tickets Solicitados';
  };

  const getPageSubtitle = () => {
    if (isAdmin) return 'Visão geral de todos os tickets abertos no sistema.';
    if (isTecnico) return 'Tickets atribuídos a você para atendimento e tickets sem responsável.';
    return 'Acompanhe o status e as respostas dos seus chamados de suporte.';
  };

  const statusTabs = [
    { label: 'Todos', value: '' },
    { label: 'Aberto', value: 'Aberto' },
    { label: 'Em andamento', value: 'Em andamento' },
    { label: 'Resolvido', value: 'Resolvido' },
    { label: 'Concluído', value: 'Concluído' }
  ];

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Ticket size={24} className="text-primary" /> {getPageTitle()}
          </h1>
          <p className="page-subtitle">{getPageSubtitle()}</p>
        </div>

        <div className="flex gap-2">
          <Link to="/tickets/novo" className="btn btn-primary">
            <PlusCircle size={16} /> Novo Ticket
          </Link>
          <button className="btn btn-secondary" onClick={fetchTickets} disabled={loading} title="Recarregar">
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

      {/* Filter and Search Bar */}
      <div className="table-controls-card mb-4">
        <div className="status-tabs-row">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              className={`status-tab ${statusFilter === tab.value ? 'status-tab-active' : ''}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="search-box">
          <Search size={17} className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="Buscar por título, descrição ou solicitante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tickets Table / List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex-center p-12">
            <RefreshCw className="animate-spin text-primary" size={32} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state-card">
            <Ticket size={48} className="text-muted mb-3" />
            <h3 className="empty-title">Nenhum ticket encontrado</h3>
            <p className="empty-text">
              {searchQuery || statusFilter 
                ? 'Nenhum ticket corresponde aos filtros selecionados.' 
                : 'Você ainda não possui nenhum ticket registrado.'}
            </p>
            <Link to="/tickets/novo" className="btn btn-primary btn-sm mt-3">
              <PlusCircle size={15} /> Cadastrar um Ticket
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Solicitante</th>
                  <th>Técnico</th>
                  <th>Data de Abertura</th>
                  <th>Comentários</th>
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr 
                    key={t.id} 
                    className="clickable-row"
                    onClick={() => onOpenTicket && onOpenTicket(t.id)}
                  >
                    <td>
                      <span className="ticket-id-tag">#{t.id}</span>
                    </td>
                    <td>
                      <div className="ticket-table-title font-medium">{t.titulo}</div>
                      <div className="ticket-table-desc text-muted truncate max-w-xs">{t.descricao}</div>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-sm">
                        <User size={14} className="text-muted" /> {t.usuario_nome}
                      </span>
                    </td>
                    <td>
                      {t.tecnico_nome ? (
                        <span className="flex items-center gap-1 text-sm text-primary">
                          <UserCheck size={14} /> {t.tecnico_nome}
                        </span>
                      ) : (
                        <span className="text-muted text-xs italic">Sem técnico</span>
                      )}
                    </td>
                    <td>
                      <span className="text-secondary text-xs flex items-center gap-1">
                        <Clock size={13} /> {t.created_at}
                      </span>
                    </td>
                    <td>
                      <span className="comment-count-badge">
                        <MessageSquare size={13} /> {t.total_comentarios || 0}
                      </span>
                    </td>
                    <td className="text-right">
                      <button 
                        className="btn btn-secondary btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenTicket) onOpenTicket(t.id);
                        }}
                      >
                        <Eye size={14} /> Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

