import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  BarChart3, Clock, CheckCircle, AlertCircle, RefreshCw, 
  Filter, Calendar, UserCheck, Inbox, Eye, Search 
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export function Reports() {
  const { onOpenTicket } = useOutletContext() || {};

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (techFilter) params.append('tecnico_id', techFilter);
      if (startDate) params.append('data_inicio', startDate);
      if (endDate) params.append('data_fim', endDate);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.get(`/reports/dashboard?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Erro ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, techFilter, startDate, endDate, searchTerm]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleResetFilters = () => {
    setStatusFilter('');
    setTechFilter('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const statusResumo = data?.resumo_status || {
    'Aberto': 0, 'Em andamento': 0, 'Resolvido': 0, 'Concluído': 0, total: 0
  };

  const tempoMedio = data?.tempo_medio_resolucao || {
    formatado: 'N/A', total_resolvidos: 0
  };

  return (
    <div className="page-container">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 size={24} className="text-primary" /> Relatório de Acompanhamento
          </h1>
          <p className="page-subtitle">
            Métricas de desempenho, distribuição de chamados por técnico e tempo médio de resolução.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchReport} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar Métricas
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* TOP METRICS CARDS */}
      <div className="metrics-grid mb-6">
        <div className="metric-card">
          <span className="metric-label">Total de Tickets</span>
          <div className="metric-val">{statusResumo.total}</div>
          <span className="metric-sub text-muted">Cadastrados no sistema</span>
        </div>

        <div className="metric-card metric-aberto">
          <span className="metric-label">Abertos / Novos</span>
          <div className="metric-val text-primary">{statusResumo['Aberto']}</div>
          <span className="metric-sub text-muted">Aguardando atendimento</span>
        </div>

        <div className="metric-card metric-andamento">
          <span className="metric-label">Em Andamento</span>
          <div className="metric-val text-warning">{statusResumo['Em andamento']}</div>
          <span className="metric-sub text-muted">Em atendimento técnico</span>
        </div>

        <div className="metric-card metric-resolvido">
          <span className="metric-label">Resolvidos / Concluídos</span>
          <div className="metric-val text-success">
            {statusResumo['Resolvido'] + statusResumo['Concluído']}
          </div>
          <span className="metric-sub text-muted">Chamados solucionados</span>
        </div>

        <div className="metric-card metric-highlight">
          <span className="metric-label flex items-center gap-1">
            <Clock size={16} /> Tempo Médio de Resolução
          </span>
          <div className="metric-val text-accent">{tempoMedio.formatado}</div>
          <span className="metric-sub text-muted">
            Baseado em {tempoMedio.total_resolvidos} ticket(s) resolvido(s)
          </span>
        </div>
      </div>

      {/* TECHNICIANS DISTRIBUTION SECTION */}
      <div className="card mb-6">
        <h3 className="section-subtitle flex items-center gap-2 mb-3">
          <UserCheck size={18} /> Distribuição de Carga por Técnico
        </h3>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Técnico</th>
                <th>Total Atribuídos</th>
                <th>Em Aberto / Andamento</th>
                <th>Resolvidos / Concluídos</th>
                <th>Taxa de Resolução</th>
              </tr>
            </thead>
            <tbody>
              {data?.resumo_tecnicos?.tecnicos?.map((tec) => {
                const total = tec.total_atribuidos || 0;
                const finalizados = tec.finalizados || 0;
                const taxa = total > 0 ? Math.round((finalizados / total) * 100) : 0;
                return (
                  <tr key={tec.id}>
                    <td>
                      <strong>{tec.nome}</strong> ({tec.login})
                    </td>
                    <td>{total}</td>
                    <td>
                      <span className="badge badge-andamento">{tec.em_aberto || 0}</span>
                    </td>
                    <td>
                      <span className="badge badge-resolvido">{finalizados}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${taxa}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{taxa}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td>
                  <strong className="text-muted flex items-center gap-1">
                    <Inbox size={15} /> Sem Técnico (Aguardando Atribuição)
                  </strong>
                </td>
                <td colSpan={4}>
                  <span className="badge badge-aberto">
                    {data?.resumo_tecnicos?.sem_tecnico || 0} ticket(s) sem responsável
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FILTERABLE TICKETS TABLE */}
      <div className="card mb-6">
        <div className="flex-between flex-wrap gap-3 mb-4">
          <h3 className="section-subtitle flex items-center gap-2">
            <Filter size={18} /> Tabela Detalhada de Acompanhamento
          </h3>

          <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
            Limpar Filtros
          </button>
        </div>

        {/* Filters Controls Row */}
        <div className="filter-controls-row mb-4">
          <div className="filter-item">
            <label className="filter-label">Status</label>
            <select 
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="Aberto">Aberto</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-label">Técnico</label>
            <select 
              className="form-select form-select-sm"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
            >
              <option value="">Todos os técnicos</option>
              <option value="unassigned">Sem técnico (Não atribuídos)</option>
              {data?.resumo_tecnicos?.tecnicos?.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-label">Data Início</label>
            <input 
              type="date" 
              className="form-input form-input-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label className="filter-label">Data Fim</label>
            <input 
              type="date" 
              className="form-input form-input-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="filter-item flex-1">
            <label className="filter-label">Busca Geral</label>
            <div className="search-box">
              <Search size={15} className="search-icon" />
              <input 
                type="text" 
                className="search-input"
                placeholder="Título, solicitante ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Título</th>
                <th>Status</th>
                <th>Solicitante</th>
                <th>Técnico</th>
                <th>Criado Em</th>
                <th>Tempo Resolução</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data?.tabela_tickets?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-6 text-muted italic">
                    Nenhum ticket encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                data?.tabela_tickets?.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="ticket-id-tag">#{t.id}</span>
                    </td>
                    <td>
                      <div className="font-medium">{t.titulo}</div>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>{t.usuario_nome}</td>
                    <td>
                      {t.tecnico_nome ? (
                        <span className="text-primary">{t.tecnico_nome}</span>
                      ) : (
                        <span className="text-muted text-xs italic">Sem técnico</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-secondary">{t.created_at}</span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-accent">{t.tempo_resolucao}</span>
                    </td>
                    <td className="text-right">
                      {onOpenTicket && (
                        <button 
                          className="btn btn-secondary btn-xs"
                          onClick={() => onOpenTicket(t.id)}
                        >
                          <Eye size={13} /> Abrir
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

