const statusLabel = { open: 'Open', 'in-progress': 'In Progress', done: 'Done' };

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatDateTime(str) {
  if (!str) return '-';
  return str.replace('T', ' ').slice(0, 16);
}

// ---- Tabs ----
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---- Tickets ----
const ticketForm = document.getElementById('ticket-form');
const ticketIdField = document.getElementById('ticket-id');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit');

async function loadTickets() {
  const status = document.getElementById('filter-status').value;
  const url = status ? `/api/tickets?status=${encodeURIComponent(status)}` : '/api/tickets';
  const res = await fetch(url);
  const tickets = await res.json();
  const list = document.getElementById('ticket-list');
  if (tickets.length === 0) {
    list.innerHTML = '<div class="empty">ยังไม่มี ticket</div>';
    return;
  }
  list.innerHTML = tickets.map((t) => `
    <div class="ticket" data-id="${t.id}">
      <div class="ticket-main">
        <p class="ticket-title">
          <span class="badge ${t.status}">${statusLabel[t.status]}</span>
          ${escapeHtml(t.title)}
        </p>
        <p class="ticket-meta">
          #${t.id} · ผู้รับผิดชอบ: ${escapeHtml(t.assignee || '-')} · priority: ${t.priority}
          · อัปเดตล่าสุด: ${formatDateTime(t.updated_at)}
        </p>
        ${t.description ? `<p>${escapeHtml(t.description)}</p>` : ''}
        ${(t.attachments && t.attachments.length) ? `
          <div class="attachment-thumbs">
            ${t.attachments.map((a) => `<a href="uploads/${a.filename}" target="_blank"><img src="uploads/${a.filename}" alt="${escapeHtml(a.original_name)}" class="thumb" /></a>`).join('')}
          </div>` : ''}
      </div>
      <div class="ticket-actions">
        <button class="secondary edit-btn" data-id="${t.id}">แก้ไข</button>
        <button class="secondary note-btn" data-id="${t.id}">+ Note</button>
        <button class="secondary photo-btn" data-id="${t.id}">+ รูป</button>
        <button class="secondary delete-btn" data-id="${t.id}">ลบ</button>
      </div>
    </div>
  `).join('');
}

ticketForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    assignee: document.getElementById('assignee').value,
    status: document.getElementById('status').value,
    priority: document.getElementById('priority').value,
  };
  const id = ticketIdField.value;
  const url = id ? `/api/tickets/${id}` : '/api/tickets';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || 'เกิดข้อผิดพลาด');
    return;
  }
  resetForm();
  loadTickets();
});

function resetForm() {
  ticketForm.reset();
  ticketIdField.value = '';
  formTitle.textContent = 'เพิ่ม Ticket ใหม่';
  submitBtn.textContent = 'บันทึก Ticket';
  cancelEditBtn.style.display = 'none';
}

cancelEditBtn.addEventListener('click', resetForm);

document.getElementById('ticket-list').addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('delete-btn')) {
    if (!confirm('ยืนยันลบ ticket นี้?')) return;
    await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
    loadTickets();
    return;
  }

  if (e.target.classList.contains('edit-btn')) {
    const res = await fetch(`/api/tickets/${id}`);
    const t = await res.json();
    ticketIdField.value = t.id;
    document.getElementById('title').value = t.title;
    document.getElementById('description').value = t.description || '';
    document.getElementById('assignee').value = t.assignee || '';
    document.getElementById('status').value = t.status;
    document.getElementById('priority').value = t.priority;
    formTitle.textContent = `แก้ไข Ticket #${t.id}`;
    submitBtn.textContent = 'บันทึกการแก้ไข';
    cancelEditBtn.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (e.target.classList.contains('photo-btn')) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (!input.files.length) return;
      const formData = new FormData();
      formData.append('image', input.files[0]);
      const res = await fetch(`/api/tickets/${id}/attachments`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'อัปโหลดรูปไม่สำเร็จ');
        return;
      }
      loadTickets();
    };
    input.click();
    return;
  }

  if (e.target.classList.contains('note-btn')) {
    const note = prompt('บันทึกสิ่งที่ทำวันนี้สำหรับ ticket นี้:');
    if (!note || !note.trim()) return;
    const res = await fetch(`/api/tickets/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'เกิดข้อผิดพลาด');
      return;
    }
    loadTickets();
  }
});

document.getElementById('filter-status').addEventListener('change', loadTickets);
document.getElementById('refresh-tickets').addEventListener('click', loadTickets);

// ---- Summary ----
const summaryDateInput = document.getElementById('summary-date');
summaryDateInput.value = new Date().toISOString().slice(0, 10);

async function loadSummary() {
  const date = summaryDateInput.value;
  const res = await fetch(`/api/summary/daily?date=${date}`);
  const data = await res.json();
  const el = document.getElementById('summary-result');

  const statusCountMap = {};
  data.overallStatusCounts.forEach((s) => { statusCountMap[s.status] = s.count; });

  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat"><span class="num">${data.createdCount}</span><span class="label">Ticket ใหม่</span></div>
      <div class="stat"><span class="num">${data.resolvedCount}</span><span class="label">ปิดงานแล้ว</span></div>
      <div class="stat"><span class="num">${data.notesCount}</span><span class="label">บันทึกงานที่ทำ</span></div>
      <div class="stat"><span class="num">${data.touchedTickets.length}</span><span class="label">Ticket ที่มีความเคลื่อนไหว</span></div>
    </div>

    <div class="card">
      <h3>ภาพรวมสถานะทั้งหมด</h3>
      <p>
        <span class="badge open">Open</span> ${statusCountMap.open || 0}
        <span class="badge in-progress">In Progress</span> ${statusCountMap['in-progress'] || 0}
        <span class="badge done">Done</span> ${statusCountMap.done || 0}
      </p>
    </div>

    <div class="card">
      <h3>Ticket ที่สร้างใหม่วันนี้ (${data.created.length})</h3>
      ${data.created.length ? data.created.map((t) => `
        <div class="ticket"><div class="ticket-main">
          <p class="ticket-title"><span class="badge ${t.status}">${statusLabel[t.status]}</span> ${escapeHtml(t.title)}</p>
          <p class="ticket-meta">#${t.id} · ผู้รับผิดชอบ: ${escapeHtml(t.assignee || '-')}</p>
        </div></div>`).join('') : '<div class="empty">ไม่มี</div>'}
    </div>

    <div class="card">
      <h3>Ticket ที่ปิดวันนี้ (${data.resolved.length})</h3>
      ${data.resolved.length ? data.resolved.map((t) => `
        <div class="ticket"><div class="ticket-main">
          <p class="ticket-title"><span class="badge ${t.status}">${statusLabel[t.status]}</span> ${escapeHtml(t.title)}</p>
          <p class="ticket-meta">#${t.id} · ผู้รับผิดชอบ: ${escapeHtml(t.assignee || '-')}</p>
        </div></div>`).join('') : '<div class="empty">ไม่มี</div>'}
    </div>

    <div class="card">
      <h3>บันทึกงานที่ทำวันนี้ (${data.notes.length})</h3>
      ${data.notes.length ? data.notes.map((n) => `
        <div class="note-item">
          <strong>#${n.ticket_id} ${escapeHtml(n.ticket_title)}</strong>
          <span class="badge ${n.ticket_status}">${statusLabel[n.ticket_status]}</span>
          <div>${escapeHtml(n.note)}</div>
          <div class="ticket-meta">${formatDateTime(n.created_at)}</div>
        </div>`).join('') : '<div class="empty">ไม่มีบันทึก</div>'}
    </div>
  `;
}

document.getElementById('load-summary').addEventListener('click', loadSummary);

// ---- Import ----
document.getElementById('import-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('import-file');
  const resultEl = document.getElementById('import-result');
  if (!fileInput.files.length) {
    resultEl.innerHTML = '<p class="hint">กรุณาเลือกไฟล์ก่อน</p>';
    return;
  }
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  const res = await fetch('/api/tickets/import', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) {
    resultEl.innerHTML = `<p class="hint">เกิดข้อผิดพลาด: ${escapeHtml(data.error || '')}</p>`;
    return;
  }
  resultEl.innerHTML = `<p>นำเข้าสำเร็จ ${data.imported} รายการ${data.errors.length ? `, ผิดพลาด ${data.errors.length} รายการ` : ''}</p>`;
  loadTickets();
});

// ---- AnyDesk directory ----
async function loadAnydesk() {
  const q = document.getElementById('anydesk-search').value;
  const res = await fetch(`/api/anydesk${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const stores = await res.json();
  const el = document.getElementById('anydesk-list');
  if (stores.length === 0) {
    el.innerHTML = '<div class="empty">ไม่พบสาขา</div>';
    return;
  }
  el.innerHTML = stores.map((s) => `
    <div class="card">
      <h4 style="margin:0 0 6px">${escapeHtml(s.name)}</h4>
      ${s.note ? `<p class="hint">${escapeHtml(s.note)}</p>` : ''}
      <div class="anydesk-devices">
        ${s.devices.map((d) => `
          <div class="anydesk-device">
            <span>${escapeHtml(d.label)}</span>
            <code>${escapeHtml(d.device_id)}</code>
            <button class="secondary copy-btn" data-value="${escapeHtml(d.device_id)}">คัดลอก</button>
          </div>
        `).join('') || '<span class="hint">ไม่มี ID</span>'}
      </div>
    </div>
  `).join('');
}

document.getElementById('anydesk-search').addEventListener('input', () => {
  clearTimeout(window.__anydeskDebounce);
  window.__anydeskDebounce = setTimeout(loadAnydesk, 200);
});

document.getElementById('anydesk-list').addEventListener('click', (e) => {
  if (e.target.classList.contains('copy-btn')) {
    const value = e.target.dataset.value;
    navigator.clipboard.writeText(value).then(() => {
      const original = e.target.textContent;
      e.target.textContent = 'คัดลอกแล้ว!';
      setTimeout(() => { e.target.textContent = original; }, 1200);
    }).catch(() => alert(`ID: ${value}`));
  }
});

// ---- Pending work banner ----
async function loadPendingBanner() {
  const res = await fetch('/api/summary/pending?staleDays=2');
  const data = await res.json();
  const banner = document.getElementById('pending-banner');
  if (data.count === 0) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'block';
  banner.innerHTML = `
    <strong>⚠ มี ${data.count} ticket ที่ค้างอยู่เกิน ${data.staleDays} วัน</strong>
    <ul style="margin:8px 0 0; padding-left:20px;">
      ${data.tickets.slice(0, 5).map((t) => `
        <li>#${t.id} ${escapeHtml(t.title)} — <span class="badge ${t.status}">${statusLabel[t.status]}</span> ค้างมา ${t.days_stale} วัน</li>
      `).join('')}
      ${data.tickets.length > 5 ? `<li>และอีก ${data.tickets.length - 5} รายการ...</li>` : ''}
    </ul>
  `;
}

// ---- Init ----
loadTickets();
loadSummary();
loadAnydesk();
loadPendingBanner();
