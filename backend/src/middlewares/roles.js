function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    if (!allowedRoles.includes(req.user.perfil)) {
      return res.status(403).json({
        error: `Acesso negado. Ação permitida apenas para os perfis: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

const requireAdmin = requireRole('admin');
const requireTecnico = requireRole('tecnico');
const requireTecnicoOrAdmin = requireRole('admin', 'tecnico');

module.exports = {
  requireRole,
  requireAdmin,
  requireTecnico,
  requireTecnicoOrAdmin
};

