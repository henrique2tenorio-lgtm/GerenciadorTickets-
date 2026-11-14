function validateRequiredString(val, fieldName, minLength = 1, maxLength = 255) {
  if (typeof val !== 'string') {
    return `O campo "${fieldName}" deve ser um texto.`;
  }
  const trimmed = val.trim();
  if (trimmed.length < minLength) {
    return `O campo "${fieldName}" deve ter no mínimo ${minLength} caracteres.`;
  }
  if (trimmed.length > maxLength) {
    return `O campo "${fieldName}" não pode exceder ${maxLength} caracteres.`;
  }
  return null;
}

function validateIntegerId(val, paramName = 'id') {
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0) {
    return `O parâmetro "${paramName}" deve ser um identificador inteiro positivo válido.`;
  }
  return null;
}

const VALID_STATUSES = ['Aberto', 'Em andamento', 'Resolvido', 'Concluído'];
const VALID_ROLES = ['admin', 'tecnico', 'usuario'];

function validateStatus(status) {
  if (!status || !VALID_STATUSES.includes(status)) {
    return `Status inválido. Deve ser um dos seguintes: ${VALID_STATUSES.join(', ')}.`;
  }
  return null;
}

function validateRole(role) {
  if (!role || !VALID_ROLES.includes(role)) {
    return `Perfil inválido. Deve ser um dos seguintes: ${VALID_ROLES.join(', ')}.`;
  }
  return null;
}

module.exports = {
  validateRequiredString,
  validateIntegerId,
  validateStatus,
  validateRole,
  VALID_STATUSES,
  VALID_ROLES
};

