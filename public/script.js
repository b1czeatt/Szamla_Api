function numberToHungarianWords(num) {
  if (typeof num !== 'number' || !Number.isFinite(num)) return '';
  if (num === 0) return 'nulla';

  const ones = ['', 'egy', 'kettő', 'három', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc'];
  const teens = ['tíz', 'tizenegy', 'tizenkettő', 'tizenhárom', 'tizennégy', 'tizenöt', 'tizenhat', 'tizenhét', 'tizennyolc', 'tizenkilenc'];
  const tens = ['', '', 'húsz', 'harminc', 'negyven', 'ötven', 'hatvan', 'hetven', 'nyolcvan', 'kilencven'];
  const thousands = ['', 'ezer', 'millió', 'milliárd'];

  function threeDigitToWords(n) {
    let result = '';
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundred > 0) {
      if (hundred === 1) result += 'száz';
      else result += ones[hundred] + 'száz';
    }

    if (remainder > 0) {
      if (remainder < 10) {
        result += ones[remainder];
      } else if (remainder >= 10 && remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const ten = Math.floor(remainder / 10);
        const one = remainder % 10;

        if (ten === 2) {
          result += 'huszon';
          if (one > 0) result += ones[one];
        } else {
          result += tens[ten];
          if (one > 0) result += ones[one];
        }
      }
    }

    return result;
  }

  let words = '';
  let groupIndex = 0;

  while (num > 0) {
    const threeDigits = num % 1000;

    if (threeDigits !== 0) {
      let prefix = '';

      if (groupIndex === 1) {
        if (threeDigits === 1) prefix = 'ezer';
        else prefix = threeDigitToWords(threeDigits) + 'ezer';
        if (words) prefix += '-';
      } else if (groupIndex > 1) {
        prefix = threeDigitToWords(threeDigits) + thousands[groupIndex];
        if (words) prefix += '-';
      } else {
        prefix = threeDigitToWords(threeDigits);
      }

      words = prefix + words;
    }

    num = Math.floor(num / 1000);
    groupIndex++;
  }

  return words || 'nulla';
}


async function loadInvoices() {
  const res = await fetch('/api/invoices');
  const invoices = await res.json();

  const section = document.getElementById('list-section');
  section.innerHTML = invoices.map(inv => {
    const netTotal = Number(inv.total);
    const vatPercent = Number(inv.vat);
    const vatAmount = (netTotal * (vatPercent / 100)).toFixed(2);
    const grossAmount = (netTotal + parseFloat(vatAmount)).toFixed(2);
    const grossRounded = Math.round(grossAmount);
    const grossText = numberToHungarianWords(grossRounded) + ' Ft';

    return `
      <div class="invoice ${inv.canceled ? 'canceled' : ''}" style="border:1px solid #ccc; padding: 15px; margin-bottom: 20px;">
        ${inv.canceled ? '<div style="color:red; font-weight:bold;">STORNÓ</div>' : ''}
        <h2 style="text-align:center;">Számla sorszáma: #${inv.number}</h2>

        <div style="display:flex; justify-content: space-between; margin-bottom: 10px;">
          <div style="width: 48%;">
            <h4>Eladó:</h4>
            <div><strong>${inv.issuerName}</strong></div>
            <div>${inv.issuerAddress || ''}</div>
            <div>Adószám: ${inv.issuerTaxNumber || ''}</div>
          </div>
          <div style="width: 48%; text-align: right;">
            <h4>Vevő:</h4>
            <div><strong>${inv.clientName}</strong></div>
            <div>${inv.clientAddress || ''}</div>
            <div>Adószám: ${inv.clientTaxNumber || ''}</div>
          </div>
        </div>

        <div style="margin-bottom: 10px;">
          <strong>Kelte:</strong> ${inv.date}<br>
          <strong>Teljesítés:</strong> ${inv.fulfillmentDate}<br>
          <strong>Fizetési határidő:</strong> ${inv.dueDate}<br>
          <strong>Fizetési mód:</strong> ${inv.paymentMethod || '-'}
        </div>

        <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="border-bottom: 1px solid #ccc;">
              <th align="left">Megnevezés</th>
              <th align="right">Nettó ár (Ft)</th>
              <th align="right">ÁFA (%)</th>
              <th align="right">Bruttó ár (Ft)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Szolgáltatás</td>
              <td align="right">${netTotal.toFixed(2)}</td>
              <td align="right">${vatPercent}</td>
              <td align="right">${grossAmount}</td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 10px;">
          <div><strong>Nettó összesen:</strong> ${netTotal.toFixed(2)} Ft</div>
          <div><strong>ÁFA összesen:</strong> ${vatAmount} Ft</div>
          <div><strong>Bruttó összesen:</strong> ${grossAmount} Ft</div>
          <div><strong>Fizetendő összeg:</strong> ${grossText} </div>
        </div>

        <div style="margin-top: 10px; text-align: right;">
          <button onclick="cancelInvoice(${inv.id})" ${inv.canceled ? 'disabled' : ''}>Stornó</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('form-section').innerHTML = '';
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

          <select name="paymentMethod" required>
            <option value="">-- Fizetési mód --</option>
            <option value="Átutalás">Átutalás</option>
            <option value="Készpénz">Készpénz</option>
          </select>

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

async function submitInvoice(e) {
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

  const invoiceDate = new Date(data.date);
  const fulfillmentDate = new Date(data.fulfillmentDate);
  const dueDate = new Date(data.dueDate);

  if (invoiceDate < fulfillmentDate) {
    alert('A számla kelte nem lehet korábbi, mint a teljesítés dátuma!');
    return;
  }

  const diffDays = (dueDate - invoiceDate) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) {
    alert('A fizetési határidő nem lehet korábbi, mint a számla kelte!');
    return;
  }
  if (diffDays > 30) {
    alert('A fizetési határidő legfeljebb 30 nappal lehet későbbi a számla keltezésénél!');
    return;
  }

  if (!['Átutalás','Bankkártya', 'Készpénz'].includes(data.paymentMethod)) {
    alert('A fizetési mód csak "Átutalás", "Bankkártya" vagy "Készpénz" lehet!');
    return;
  }

  try {
    const res = await fetch('/api/invoices');
    if (!res.ok) throw new Error('Nem sikerült lekérni a számlákat');
    const invoices = await res.json();

    if (invoices.some(inv => inv.number === data.number)) {
      alert('Ez a számlaszám már létezik!');
      return;
    }
  } catch (err) {
    alert('Hiba történt a számlák ellenőrzése során: ' + err.message);
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

  const namePattern = /^[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ\s\-]+$/;
  if (!data.name || /^\s*$/.test(data.name)) {
    alert('A név megadása kötelező!');
    return;
  }
  if (!namePattern.test(data.name)) {
    alert('A név csak betűket, szóközt és kötőjelet tartalmazhat!');
    return;
  }

  if (!data.address || /^\s*$/.test(data.address)) {
    alert('A cím megadása kötelező!');
    return;
  }

  if (/-\d+/.test(data.address)) {
  alert('A cím nem tartalmazhat negatív számot!');
  return;
}

  const taxPattern = /^\d+$/;
  if (!data.taxNumber || !taxPattern.test(data.taxNumber)) {
    alert('Az adószám csak pozitív szám lehet, és nem lehet üres!');
    return;
  }

  fetch('/api/clients', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(res => {
    if (res.ok) {
      alert('Kiállító mentve');
      form.reset();
      loadInvoices(); 
    } else {
      res.text().then(text => {
        alert('Hiba: ' + text);
      });
    }
  }).catch(err => {
    alert('Hálózati hiba történt: ' + err.message);
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
