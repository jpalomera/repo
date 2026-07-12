const assert = require('assert');
const { app, db } = require('../server');

const server = app.listen(0, async () => {
  const port = server.address().port;
  try {
    const payload = { name:'Test Lead', email:'test@example.com', business:'consultorÃ­a', score:62, archetype:'Mucho valor, poca nitidez', answers:{audience:2,promise:2,difference:3,proof:2,friction:3,urgency:3} };
    const response = await fetch(`http://127.0.0.1:${port}/api/leads`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.ok(data.blueprint.priorities.length > 0);
    const row = db.prepare('SELECT * FROM leads WHERE email = ?').get(payload.email);
    assert.equal(row.name, payload.name);
    const invalid = await fetch(`http://127.0.0.1:${port}/api/leads`, { method:'POST', headers:{'content-type':'application/json'}, body:'{}' });
    assert.equal(invalid.status, 400);
    console.log('âœ“ API guarda leads reales y valida entradas');
  } finally {
    db.prepare('DELETE FROM leads WHERE email = ?').run('test@example.com');
    server.close();
  }
});

