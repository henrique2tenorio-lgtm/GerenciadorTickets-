import React from 'react';

export function StatusBadge({ status }) {
  const styles = {
    'Aberto': 'badge-aberto',
    'Em andamento': 'badge-andamento',
    'Resolvido': 'badge-resolvido',
    'Concluído': 'badge-concluido'
  };

  const className = styles[status] || 'badge-default';

  return (
    <span className={`badge ${className}`}>
      <span className="badge-dot" />
      {status || 'Desconhecido'}
    </span>
  );
}

