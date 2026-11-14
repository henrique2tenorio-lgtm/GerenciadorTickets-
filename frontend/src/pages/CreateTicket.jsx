import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PlusCircle, CheckCircle, AlertCircle, ArrowLeft, Ticket } from 'lucide-react';
import { api } from '../api/client';

export function CreateTicket() {
  const navigate = useNavigate();
  const { onOpenTicket } = useOutletContext() || {};

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTicketId, setCreatedTicketId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/tickets', {
        titulo: titulo.trim(),
        descricao: descricao.trim()
      });

      setCreatedTicketId(res.ticketId);
      setTitulo('');
      setDescricao('');
    } catch (err) {
      setError(err.message || 'Erro ao criar ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cadastrar Novo Ticket</h1>
          <p className="page-subtitle">Descreva detalhadamente a sua solicitação ou problema técnico.</p>
        </div>
      </div>

      <div className="card max-w-2xl">
        {createdTicketId && (
          <div className="alert alert-success mb-6 flex-col items-start gap-3 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={22} className="text-success shrink-0" />
              <span className="font-semibold text-base">
                Ticket #{createdTicketId} registrado com sucesso!
              </span>
            </div>
            <p className="text-sm text-secondary pl-7">
              Os administradores e técnicos disponíveis foram notificados e o atendimento será iniciado em breve.
            </p>
            <div className="flex gap-2 pl-7 mt-1">
              {onOpenTicket && (
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => onOpenTicket(createdTicketId)}
                >
                  <Ticket size={14} /> Ver Detalhes do Ticket
                </button>
              )}
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => setCreatedTicketId(null)}
              >
                Cadastrar Outro
              </button>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => navigate('/tickets')}
              >
                Ir para Meus Tickets
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ticket-create-form">
          <div className="form-group">
            <label className="form-label" htmlFor="ticket-title">
              Título do Ticket <span className="text-danger">*</span>
            </label>
            <input 
              id="ticket-title"
              type="text" 
              className="form-input" 
              placeholder="Ex: Falha ao inicializar o leitor biométrico na recepção"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              minLength={3}
              maxLength={150}
              required
            />
            <span className="input-hint">Resumo curto e objetivo do problema.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ticket-desc">
              Descrição Detalhada <span className="text-danger">*</span>
            </label>
            <textarea 
              id="ticket-desc"
              className="form-textarea" 
              rows={6}
              placeholder="Descreva o que aconteceu, mensagens de erro apresentadas, setor ou equipamento afetado..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              minLength={5}
              maxLength={4000}
              required
            />
            <span className="input-hint">Forneça o máximo de informações úteis para agilizar a resolução.</span>
          </div>

          <div className="form-actions-row">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/tickets')}
            >
              <ArrowLeft size={16} /> Voltar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !titulo.trim() || !descricao.trim()}
            >
              <PlusCircle size={16} /> {loading ? 'Cadastrando...' : 'Criar Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

