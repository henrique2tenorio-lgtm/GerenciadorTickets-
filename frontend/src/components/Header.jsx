import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, User, Check, ExternalLink, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { RoleBadge } from './RoleBadge';

export function Header({ onToggleSidebar, onSelectTicket }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif) => {
    if (!notif.lida) {
      markAsRead(notif.id);
    }
    if (notif.ticket_id && onSelectTicket) {
      onSelectTicket(notif.ticket_id);
      setShowNotifications(false);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="btn-mobile-menu" onClick={onToggleSidebar} aria-label="Abrir menu">
          <Menu size={22} />
        </button>
        <span className="app-brand-mobile">HelpDesk</span>
      </div>

      <div className="header-right">
        {/* Notifications Bell */}
        <div className="notifications-wrapper" ref={dropdownRef}>
          <button 
            className="btn-icon bell-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notificações"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="bell-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown shadow-lg">
              <div className="notif-header">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="notif-count-badge">{unreadCount} não lida(s)</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button className="btn-text text-xs" onClick={markAllAsRead}>
                    <Check size={14} className="inline mr-1" /> Marcar lidas
                  </button>
                )}
              </div>

              <div className="notif-list custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Bell size={28} className="text-muted mb-2" />
                    <p className="text-sm text-secondary">Nenhuma notificação no momento.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`notif-item ${!n.lida ? 'notif-unread' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="notif-content">
                        <p className="notif-message">{n.mensagem}</p>
                        <span className="notif-time">{n.created_at}</span>
                      </div>
                      {!n.lida && <span className="notif-dot" title="Não lida" />}
                      {n.ticket_id && (
                        <span className="notif-ticket-link" title="Abrir ticket">
                          <ExternalLink size={14} />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge */}
        <div className="user-profile-badge">
          <div className="user-avatar">
            <User size={18} />
          </div>
          <div className="user-details-text">
            <span className="user-name">{user?.nome || 'Usuário'}</span>
            <RoleBadge role={user?.perfil} />
          </div>
        </div>

        {/* Logout Button */}
        <button className="btn-logout" onClick={logout} title="Encerrar sessão">
          <LogOut size={18} />
          <span className="logout-text">Sair</span>
        </button>
      </div>
    </header>
  );
}

