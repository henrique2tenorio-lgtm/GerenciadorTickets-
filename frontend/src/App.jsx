import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { CreateTicket } from './pages/CreateTicket';
import { NewTickets } from './pages/NewTickets';
import { MyTickets } from './pages/MyTickets';
import { Reports } from './pages/Reports';
import { UserManagement } from './pages/UserManagement';
import { RefreshCw } from 'lucide-react';

  function ProtectedRoute({ children, allowedRoles }) {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="flex-center h-screen bg-slate-50">
          <RefreshCw className="animate-spin text-primary" size={36} />
        </div>
      );
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.perfil)) {
      return <Navigate to="/tickets" replace />;
    }

    return children;
  }

  function PublicRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="flex-center h-screen bg-slate-50">
          <RefreshCw className="animate-spin text-primary" size={36} />
        </div>
      );
    }

    if (isAuthenticated) {
      return <Navigate to="/tickets" replace />;
    }

    return children;
  }

  export default function App() {
    return (
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <Routes>
                {/* Public Login Route */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />

                {/* Authenticated Application Routes inside Layout */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* Default redirect to /tickets */}
                  <Route index element={<Navigate to="/tickets" replace />} />

                  {/* 1. Cadastro de ticket (Todos os perfis) */}
                  <Route path="tickets/novo" element={<CreateTicket />} />

                {/* 2. Novos tickets (Admin e Técnico) */}
                <Route
                  path="tickets/novos"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'tecnico']}>
                      <NewTickets />
                    </ProtectedRoute>
                  }
                />

                {/* 3. Meus tickets (Todos os perfis) */}
                <Route path="tickets" element={<MyTickets />} />

                {/* 4. Relatório de acompanhamento (Admin somente) */}
                <Route
                  path="relatorios"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />

                {/* 5. Gestão de usuários (Admin somente) */}
                <Route
                  path="usuarios"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/tickets" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter >
  );
  }
