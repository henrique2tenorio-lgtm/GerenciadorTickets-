import React from 'react';

export function RoleBadge({ role }) {
  const config = {
    admin: { label: 'Administrador', className: 'badge-role-admin' },
    tecnico: { label: 'Técnico', className: 'badge-role-tecnico' },
    usuario: { label: 'Usuário', className: 'badge-role-usuario' }
  };

  const item = config[role] || { label: role, className: 'badge-default' };

  return (
    <span className={`badge ${item.className}`}>
      {item.label}
    </span>
  );
}

