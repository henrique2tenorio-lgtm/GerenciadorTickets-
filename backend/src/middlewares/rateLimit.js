const { db } = require('../db/database');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(login) {
  if (!login) return { allowed: true };

  const record = db.prepare('SELECT * FROM login_attempts WHERE login = ?').get(login.trim().toLowerCase());
  if (!record) return { allowed: true };

  const now = Date.now();

  // If locked
  if (record.locked_until && record.locked_until > now) {
    const waitMs = record.locked_until - now;
    const waitMinutes = Math.ceil(waitMs / (60 * 1000));
    return {
      allowed: false,
      waitMinutes,
      message: `Muitas tentativas inválidas. Conta temporariamente bloqueada. Tente novamente em ${waitMinutes} minuto(s).`
    };
  }

  // If lockout or window has expired, reset
  if (now - record.last_attempt > LOCKOUT_TIME_MS) {
    db.prepare('DELETE FROM login_attempts WHERE login = ?').run(login.trim().toLowerCase());
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(login) {
  if (!login) return;
  const normalizedLogin = login.trim().toLowerCase();
  const now = Date.now();

  const record = db.prepare('SELECT * FROM login_attempts WHERE login = ?').get(normalizedLogin);

  if (!record || (now - record.last_attempt > LOCKOUT_TIME_MS)) {
    db.prepare(`
      INSERT OR REPLACE INTO login_attempts (login, attempts, last_attempt, locked_until)
      VALUES (?, 1, ?, 0)
    `).run(normalizedLogin, now);
  } else {
    const newAttempts = record.attempts + 1;
    let lockedUntil = 0;
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = now + LOCKOUT_TIME_MS;
    }
    db.prepare(`
      UPDATE login_attempts
      SET attempts = ?, last_attempt = ?, locked_until = ?
      WHERE login = ?
    `).run(newAttempts, now, lockedUntil, normalizedLogin);
  }
}

function resetLoginAttempts(login) {
  if (!login) return;
  const normalizedLogin = login.trim().toLowerCase();
  db.prepare('DELETE FROM login_attempts WHERE login = ?').run(normalizedLogin);
}

module.exports = {
  checkLoginRateLimit,
  recordFailedAttempt,
  resetLoginAttempts
};

