async function loadInvoices() {
  const res = await fetch('/api/invoices');
  const invoices = await res.json();

  const section = document.getElementById('list-section');
  section.innerHTML = invoices.map(inv => `
    <div class="invoice ${inv.canceled ? 'canceled' : ''}">
      <strong>Számla szám:</strong> ${inv.number}<br>
      <strong>Kiállító:</strong> ${inv.issuerName}<br>
      <strong>Vevő:</strong> ${inv.clientName}<br>
      <strong>Dátum:</strong> ${inv.date}<br>
      <strong>Végösszeg:</strong> ${inv.total} Ft + ÁFA (${inv.vat}%)<br>
      <button onclick="cancelInvoice(${inv.id})" ${inv.canceled ? 'disabled' : ''}>Stornó</button>
      <button onclick="editInvoice(${inv.id})" ${inv.canceled ? 'disabled' : ''}>Szerkesztés</button>
    </div>
  `).join('');
  
  document.getElementById('form-section').innerHTML = '';
}


async function editInvoice(id) {
  const res = await fetch(`/api/invoices/${id}`);
  if (!res.ok) {
    alert('Hiba a számla betöltésekor');
    return;
  }
  const invoice = await res.json();

  const clientsRes = await fetch('/api/clients');
  const clients = await clientsRes.json();

  const section = document.getElementById('form-section');
  section.innerHTML = `
    <form onsubmit="submitInvoiceEdit(event, ${id})">
      <select name="issuerId" required>
        <option value="">-- Kiállító --</option>
        ${clients.map(c => `<option value="${c.id}" ${c.id === invoice.issuerId ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
      <select name="clientId" required>
        <option value="">-- Vevő --</option>
        ${clients.map(c => `<option value="${c.id}" ${c.id === invoice.clientId ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
      <input name="number" placeholder="Számla szám pl. SZ-2025-001" value="${invoice.number}" required />
      <input name="date" type="text" placeholder="Számla kelte (YYYY-MM-DD)" value="${invoice.date}" required />
      <input name="fulfillmentDate" type="text" placeholder="Teljesítés dátuma (YYYY-MM-DD)" value="${invoice.fulfillmentDate}" required />
      <input name="dueDate" type="text" placeholder="Fizetési határidő (YYYY-MM-DD)" value="${invoice.dueDate}" required />
      <input name="total" type="number" placeholder="Végösszeg (nettó összeg Ft)" value="${invoice.total}" required />
      <input name="vat" type="number" placeholder="ÁFA kulcs (%) pl. 27" value="${invoice.vat}" required />
      <button type="submit">Mentés</button>
      <button type="button" onclick="loadInvoices()">Mégse</button>
    </form>
  `;

  document.getElementById('list-section').innerHTML = '';
}


function showInvoiceForm() {
  fetch('/api/clients')
    .then(res => res.json())
    .then(clients => {
      const section = document.getElementById('form-section');
      section.innerHTML = `
        <form onsubmit="submitInvoice(event)">
          <select name="issuerId" required>
            <option value="">-- Kiállító --</option>
            ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
          <select name="clientId" required>
            <option value="">-- Vevő --</option>
            ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
          <input name="number" placeholder="Számla szám pl. SZ-2025-001" required />
          <input name="date" type="text" placeholder="Számla kelte (YYYY-MM-DD)" required />
          <input name="fulfillmentDate" type="text" placeholder="Teljesítés dátuma (YYYY-MM-DD)" required />
          <input name="dueDate" type="text" placeholder="Fizetési határidő (YYYY-MM-DD)" required />
          <input name="total" type="number" placeholder="Végösszeg (nettó összeg Ft)" required />
          <input name="vat" type="number" placeholder="ÁFA kulcs (%) pl. 27" required />
          <button type="submit">Mentés</button>
          <button type="button" onclick="loadInvoices()">Mégse</button>
        </form>
      `;
      document.getElementById('list-section').innerHTML = '';
    });
}


function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function submitInvoice(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.number || /^\s*$/.test(data.number)) {
    alert('A számla számát ki kell tölteni!');
    return;
  }
  if (/^-/.test(data.number)) {
    alert('A számla száma nem lehet negatív!');
    return;
  }

  if (!isValidDate(data.date)) {
    alert('A számla kelte nem megfelelő formátumú (YYYY-MM-DD)!');
    return;
  }
  if (!isValidDate(data.fulfillmentDate)) {
    alert('A teljesítés dátuma nem megfelelő formátumú (YYYY-MM-DD)!');
    return;
  }
  if (!isValidDate(data.dueDate)) {
    alert('A fizetési határidő nem megfelelő formátumú (YYYY-MM-DD)!');
    return;
  }

  fetch('/api/invoices', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(res => {
    if (res.ok) {
      loadInvoices();
      form.reset();
    }
    else res.text().then(alert);
  });
}

function submitInvoiceEdit(e, id) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.number || /^\s*$/.test(data.number)) {
    alert('A számla számát ki kell tölteni!');
    return;
  }
  if (/^-/.test(data.number)) {
    alert('A számla száma nem lehet negatív!');
    return;
  }
  const isValidDate = dateStr => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (!isValidDate(data.date)) {
    alert('A számla kelte nem megfelelő formátumú (YYYY-MM-DD)!');
    return;
  }
  if (!isValidDate(data.fulfillmentDate)) {
    alert('A teljesítés dátuma nem megfelelő formátumú (YYYY-MM-DD)!');
    return;
  }
  if (!isValidDate(data.dueDate)) {
    alert('A fizetési határidő nem megfelelő formátumú (YYYY-MM-DD)!');
    return;
  }
  if (Number(data.total) < 0) {
    alert('A végösszeg nem lehet negatív!');
    return;
  }
  if (Number(data.vat) < 0) {
    alert('Az ÁFA kulcs nem lehet negatív!');
    return;
  }

  fetch(`/api/invoices/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(res => {
    if (res.ok) {
      loadInvoices();
      document.getElementById('form-section').innerHTML = '';
    } else {
      res.text().then(alert);
    }
  });
}


function showClientForm() {
  const section = document.getElementById('form-section');
  section.innerHTML = `
    <form onsubmit="submitClient(event)">
      <input name="name" placeholder="Név" required />
      <input name="address" placeholder="Cím" required />
      <input name="taxNumber" placeholder="Adószám" required />
      <button type="submit">Mentés</button>
    </form>`;
}

function submitClient(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  fetch('/api/clients', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(res => {
    if (res.ok) alert('Kiállító mentve');
    else res.text().then(alert);
  });
}

function cancelInvoice(id) {
  if (!confirm('Biztos stornózod ezt a számlát?')) return;
  fetch(`/api/invoices/${id}/cancel`, { method: 'POST' })
    .then(res => {
      if (res.ok) loadInvoices();
      else res.text().then(alert);
    });
}

async function showDeleteClients() {
  const res = await fetch('/api/clients');
  const clients = await res.json();

  const listSection = document.getElementById('list-section');
  const formSection = document.getElementById('form-section');

  listSection.innerHTML = clients.map(c => `
    <div class="client">
      <strong>${c.name}</strong> (${c.taxNumber})<br>
      ${c.address}<br>
      <button onclick="deleteClient(${c.id})">Törlés</button>
    </div>
  `).join('');

  formSection.innerHTML = '';
}

async function deleteClient(id) {
  if (!confirm('Biztos törölni szeretnéd ezt az ügyfelet?')) return;

  const res = await fetch(`/api/clients/${id}`, {
    method: 'DELETE'
  });

  if (res.ok) {
    alert('Ügyfél törölve');
    showDeleteClients(); 
  } else {
    const msg = await res.text();
    alert(msg);
  }
}

