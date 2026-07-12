const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'leads.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    business TEXT NOT NULL,
    score INTEGER NOT NULL,
    archetype TEXT NOT NULL,
    answers TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(email)
  )
`);

const upsertLead = db.prepare(`
  INSERT INTO leads (name, email, business, score, archetype, answers)
  VALUES (@name, @email, @business, @score, @archetype, @answers)
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    business = excluded.business,
    score = excluded.score,
    archetype = excluded.archetype,
    answers = excluded.answers,
    created_at = datetime('now')
`);

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/leads', (req, res) => {
  const { name, email, business, score, archetype, answers } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !/^\S+@\S+\.\S+$/.test(cleanEmail) || !String(business || '').trim()) {
    return res.status(400).json({ error: 'Completa nombre, correo vÃ¡lido y tipo de negocio.' });
  }
  if (!Number.isInteger(score) || score < 0 || score > 100 || !archetype || !answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'El diagnÃ³stico recibido no es vÃ¡lido.' });
  }

  upsertLead.run({
    name: String(name).trim().slice(0, 80),
    email: cleanEmail.slice(0, 160),
    business: String(business).trim().slice(0, 120),
    score,
    archetype: String(archetype).slice(0, 80),
    answers: JSON.stringify(answers)
  });

  res.status(201).json({ ok: true, blueprint: buildBlueprint(score, archetype, answers, business) });
});

function buildBlueprint(score, archetype, answers, business) {
  const priorities = [];
  if (answers.identity <= 2) priorities.push('Activa MFA en cuentas administrativas, correo y accesos remotos; elimina autenticaciÃ³n heredada.');
  if (answers.visibility <= 2) priorities.push('Centraliza alertas de identidad y asigna un responsable con un canal de escalamiento 24/7.');
  if (answers.patching <= 2) priorities.push('Levanta un inventario mÃ­nimo de activos expuestos y aplica parches a vulnerabilidades crÃ­ticas explotadas.');
  if (answers.people <= 2) priorities.push('Publica un canal Ãºnico para reportar phishing y comunica una regla de verificaciÃ³n fuera de banda.');
  if (answers.recovery <= 2) priorities.push('AÃ­sla una copia de seguridad y ejecuta una restauraciÃ³n real de un servicio prioritario.');
  if (answers.response <= 2) priorities.push('Define quiÃ©n declara el incidente, quiÃ©n comunica y quiÃ©n autoriza el aislamiento de sistemas.');
  if (!priorities.length) priorities.push('Ejecuta un ejercicio de mesa sorpresa y registra tiempos de detecciÃ³n, decisiÃ³n y recuperaciÃ³n.');
  const vectors = [
    ['Identidad comprometida', answers.identity],
    ['Actividad sin detectar', answers.visibility],
    ['Vulnerabilidad expuesta', answers.patching],
    ['IngenierÃ­a social', answers.people],
    ['RecuperaciÃ³n no validada', answers.recovery],
    ['Respuesta improvisada', answers.response]
  ].sort((a, b) => a[1] - b[1]);
  const primaryVector = vectors[0][0];
  return {
    headline: score >= 75 ? 'Tu defensa genera seÃ±al. Ahora demuÃ©stralo bajo presiÃ³n.' : score >= 50 ? 'La brecha estÃ¡ entre tus controles, no necesariamente dentro de ellos.' : 'Tu prioridad no es sumar herramientas: es recuperar visibilidad y control.',
    formula: primaryVector,
    example: `En ${business}, este vector merece validaciÃ³n primero porque combina la menor madurez declarada con una ruta directa hacia impacto operativo.`,
    priorities: priorities.slice(0, 3),
    experiment: archetype === 'Brecha silenciosa' ? 'Simula una cuenta comprometida y mide cuÃ¡nto tarda el equipo en detectar, escalar y bloquear el acceso.' : archetype === 'Defensa fragmentada' ? 'Ejecuta un ejercicio de mesa de ransomware y registra cada dependencia o decisiÃ³n que no tenga dueÃ±o.' : 'Valida una restauraciÃ³n aislada y una revocaciÃ³n masiva de sesiones; compara los tiempos reales con los objetivos.'
  };
}

if (require.main === module) app.listen(PORT, () => console.log(`Radar disponible en http://localhost:${PORT}`));

module.exports = { app, db };

