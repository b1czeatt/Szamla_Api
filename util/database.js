
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/szamlakezelo.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    taxNumber TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,
    issuerId INTEGER NOT NULL,
    clientId INTEGER NOT NULL,
    date TEXT NOT NULL,
    fulfillmentDate TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    total REAL NOT NULL,
    vat INTEGER NOT NULL,
    canceled INTEGER DEFAULT 0,
    FOREIGN KEY (issuerId) REFERENCES clients(id),
    FOREIGN KEY (clientId) REFERENCES clients(id)
  );
`);

const existingClients = db.prepare('SELECT COUNT(*) AS count FROM clients').get();
if (existingClients.count === 0) {
  const insertClient = db.prepare('INSERT INTO clients (name, address, taxNumber) VALUES (?, ?, ?)');
  insertClient.run('Teszt Cég Kft.', 'Budapest, Fő utca 1.', '12345678-1-42');
  insertClient.run('Minta Bt.', 'Debrecen, Kossuth u. 5.', '87654321-2-34');
  insertClient.run('Demo Zrt.', 'Szeged, Petőfi tér 3.', '23456789-3-56');
}

const existingInvoices = db.prepare('SELECT COUNT(*) AS count FROM invoices').get();
if (existingInvoices.count === 0) {
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (number, issuerId, clientId, date, fulfillmentDate, dueDate, total, vat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const issuerId = db.prepare("SELECT id FROM clients WHERE name = 'Teszt Cég Kft.'").get().id;
  const clients = db.prepare("SELECT id FROM clients WHERE name != 'Teszt Cég Kft.'").all();

  let count = 1;
  for (const client of clients) {
    for (let i = 0; i < 3; i++) {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10);
      insertInvoice.run(
        `SZAMLA-2025-${count}`,
        issuerId,
        client.id,
        dateStr,
        dateStr,
        dateStr,
        10000 + count * 1000,
        27
      );
      count++;
    }
  }
}

module.exports = db;