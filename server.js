
const express = require('express');
const db = require('./util/database');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));


app.get('/api/invoices', (req, res) => {
  const invoices = db.prepare(`
    SELECT invoices.*, c1.name AS issuerName, c2.name AS clientName
    FROM invoices
    JOIN clients c1 ON invoices.issuerId = c1.id
    JOIN clients c2 ON invoices.clientId = c2.id
  `).all();
  res.json(invoices);
});

app.get('/api/invoices/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).send('Érvénytelen azonosító');
  }
  const invoice = db.prepare(`
    SELECT invoices.*, c1.name AS issuerName, c2.name AS clientName
    FROM invoices
    JOIN clients c1 ON invoices.issuerId = c1.id
    JOIN clients c2 ON invoices.clientId = c2.id
    WHERE invoices.id = ?
  `).get(id);
  
  if (!invoice) {
    return res.status(404).send('Számla nem található');
  }
  res.json(invoice);
});


app.get('/api/clients', (req, res) => {
  const clients = db.prepare('SELECT * FROM clients').all();
  res.json(clients);
});

app.post('/api/clients', (req, res) => {
  const { name, address, taxNumber } = req.body;
  if (!name || !address || !taxNumber) {
    return res.status(400).send('Hiányzó mező!');
  }
  try {
    db.prepare(`
      INSERT INTO clients (name, address, taxNumber)
      VALUES (?, ?, ?)
    `).run(name, address, taxNumber);
    res.sendStatus(200);
  } catch (err) {
    res.status(400).send('Név vagy adószám már létezik!');
  }
});

app.post('/api/invoices', (req, res) => {
  const { number, issuerId, clientId, date, fulfillmentDate, dueDate, total, vat } = req.body;
  if (!number || !issuerId || !clientId || !date || !fulfillmentDate || !dueDate || !total || !vat) {
    return res.status(400).send('Minden mező kitöltése kötelező!');
  }
  try {
    db.prepare(`
      INSERT INTO invoices (number, issuerId, clientId, date, fulfillmentDate, dueDate, total, vat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(number, issuerId, clientId, date, fulfillmentDate, dueDate, total, vat);
    res.sendStatus(200);
  } catch (err) {
    res.status(400).send('A számlaszám már létezik!');
  }
});


app.post('/api/invoices/:id/cancel', (req, res) => {
  const id = req.params.id;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!invoice) return res.status(404).send('Számla nem található.');
  if (invoice.canceled) return res.status(400).send('Számla már stornózva.');
  db.prepare('UPDATE invoices SET canceled = 1 WHERE id = ?').run(id);
  res.sendStatus(200);
});


app.put('/api/invoices/:id', (req, res) => {
  const id = req.params.id;
  const { number, issuerId, clientId, date, fulfillmentDate, dueDate, total, vat } = req.body;

  if (!number || /^\s*$/.test(number)) {
    return res.status(400).send('A számla számát ki kell tölteni!');
  }
  if (/^-/.test(number)) {
    return res.status(400).send('A számla száma nem lehet negatív!');
  }
  if (!issuerId || !clientId || !date || !fulfillmentDate || !dueDate || !total || !vat) {
    return res.status(400).send('Minden mezőt ki kell tölteni!');
  }
  const isValidDate = dateStr => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (!isValidDate(date) || !isValidDate(fulfillmentDate) || !isValidDate(dueDate)) {
    return res.status(400).send('Dátumok nem megfelelő formátumúak (YYYY-MM-DD)!');
  }
  if (Number(total) < 0) {
    return res.status(400).send('A végösszeg nem lehet negatív!');
  }
  if (Number(vat) < 0) {
    return res.status(400).send('Az ÁFA kulcs nem lehet negatív!');
  }

  const existingInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!existingInvoice) {
    return res.status(404).send('Számla nem található');
  }
  const stmt = db.prepare(`
    UPDATE invoices SET
      number = ?,
      issuerId = ?,
      clientId = ?,
      date = ?,
      fulfillmentDate = ?,
      dueDate = ?,
      total = ?,
      vat = ?
    WHERE id = ?
  `);
  stmt.run(number, issuerId, clientId, date, fulfillmentDate, dueDate, total, vat, id);

  res.sendStatus(200);
});

app.delete('/api/clients/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) return res.status(400).send('Érvénytelen ID');

  const hasInvoices = db.prepare(`
    SELECT COUNT(*) AS count FROM invoices WHERE issuerId = ? OR clientId = ?
  `).get(id, id);

  if (hasInvoices.count > 0) {
    return res.status(400).send('Nem törölhető, mert van hozzárendelt számla.');
  }

  const info = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).send('Ügyfél nem található.');
  }

  res.sendStatus(200);
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Szerver fut: http://localhost:${PORT}`);
});
