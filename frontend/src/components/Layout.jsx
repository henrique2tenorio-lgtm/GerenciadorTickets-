import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TicketDetailModal } from './TicketDetailModal';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOpenTicket = (ticketId) => {
    setActiveTicketId(ticketId);
  };

  const handleCloseTicket = () => {
    setActiveTicketId(null);
  };

  const handleTicketUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main-area">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          onSelectTicket={handleOpenTicket}
        />

        <main className="app-content-body custom-scrollbar">
          {/* We pass down context to child routes so they can open ticket details or listen to updates */}
          <Outlet context={{ onOpenTicket: handleOpenTicket, refreshTrigger }} />
        </main>
      </div>

      {activeTicketId && (
        <TicketDetailModal 
          ticketId={activeTicketId}
          onClose={handleCloseTicket}
          onUpdated={handleTicketUpdated}
        />
      )}
    </div>
  );
}

