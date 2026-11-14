import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  PlusCircle, Inbox, Ticket, BarChart3, Users, 
  Headphones, X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isTecnico, isTecnicoOrAdmin } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="sidebar-mobile-overlay" onClick={onClose} />}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-box">
          <div className="brand-logo-icon">
            <Headphones size={22} />
          </div>
          <div className="brand-texts">
            <h1 className="brand-title">HelpDesk</h1>
            <span className="brand-subtitle">Gestão de Tickets</span>
          </div>
          <button className="btn-sidebar-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">PRINCIPAL</div>

          {/* 1. Cadastro de ticket: todos os perfis */}
          <NavLink 
            to="/tickets/novo" 
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            onClick={onClose}
          >
            <PlusCircle size={19} />
            <span>Cadastrar Ticket</span>
          </NavLink>

          {/* 2. Novos tickets: Admin e Técnico */}
          {isTecnicoOrAdmin && (
            <NavLink 
              to="/tickets/novos" 
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              onClick={onClose}
            >
              <Inbox size={19} />
              <span>Novos Tickets</span>
            </NavLink>
          )}

          {/* 3. Meus tickets: todos os perfis */}
          <NavLink 
            to="/tickets" 
            end
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            onClick={onClose}
          >
            <Ticket size={19} />
            <span>Meus Tickets</span>
          </NavLink>

          {/* ADMIN ONLY SECTIONS */}
          {isAdmin && (
            <>
              <div className="nav-group-label mt-4">ADMINISTRAÇÃO</div>

              {/* 4. Relatório de acompanhamento: somente Admin */}
              <NavLink 
                to="/relatorios" 
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                onClick={onClose}
              >
                <BarChart3 size={19} />
                <span>Relatórios</span>
              </NavLink>

              {/* 5. Gestão de usuários: somente Admin */}
              <NavLink 
                to="/usuarios" 
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                onClick={onClose}
              >
                <Users size={19} />
                <span>Gestão de Usuários</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className="footer-version">HelpDesk v1.0 • Produção</span>
        </div>
      </aside>
    </>
  );
}

