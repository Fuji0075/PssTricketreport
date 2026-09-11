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
  refreshAll();
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
    refreshAll();
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
      refreshAll();
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
    refreshAll();
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
  refreshAll();
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

// ---- Dashboard (Kanban) ----
const STATUS_ORDER = ['open', 'in-progress', 'done'];
let dashboardFilter = 'all';

async function loadDashboard() {
  const res = await fetch('/api/tickets');
  const tickets = await res.json();
  window.__allTickets = tickets;
  renderDashboardStats(tickets);
  renderBoard(tickets);
}

function renderDashboardStats(tickets) {
  const counts = { open: 0, 'in-progress': 0, done: 0 };
  tickets.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
  const stats = [
    { key: 'all', label: 'ทั้งหมด', count: tickets.length },
    { key: 'open', label: 'Open', count: counts.open || 0 },
    { key: 'in-progress', label: 'In Progress', count: counts['in-progress'] || 0 },
    { key: 'done', label: 'Done', count: counts.done || 0 },
  ];
  const el = document.getElementById('dashboard-stats');
  el.innerHTML = stats.map((s) => `
    <div class="dashboard-stat ${dashboardFilter === s.key ? 'active' : ''}" data-key="${s.key}">
      <span class="num">${s.count}</span>
      <span class="label">${escapeHtml(s.label)}</span>
    </div>
  `).join('');
}

document.getElementById('dashboard-stats').addEventListener('click', (e) => {
  const card = e.target.closest('.dashboard-stat');
  if (!card) return;
  dashboardFilter = card.dataset.key;
  renderDashboardStats(window.__allTickets || []);
  renderBoard(window.__allTickets || []);
});

function renderBoard(tickets) {
  const board = document.getElementById('board');
  const visible = dashboardFilter === 'all' ? tickets : tickets.filter((t) => t.status === dashboardFilter);

  board.innerHTML = STATUS_ORDER.map((status) => {
    const columnTickets = visible.filter((t) => t.status === status)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return `
      <div class="board-column" data-status="${status}">
        <div class="board-column-header">
          <span>${statusLabel[status]}</span>
          <span class="board-column-count">${columnTickets.length}</span>
        </div>
        ${columnTickets.length ? columnTickets.map((t) => renderBoardCard(t)).join('') : '<div class="board-empty">ไม่มี ticket</div>'}
      </div>
    `;
  }).join('');
}

function renderBoardCard(t) {
  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(t.status) + 1];
  return `
    <div class="board-card" data-id="${t.id}">
      <p class="card-title">${escapeHtml(t.title)}</p>
      <p class="card-meta">
        <span><span class="priority-dot priority-${t.priority}"></span>#${t.id} ${escapeHtml(t.assignee || '-')}</span>
        <span>${formatDateTime(t.updated_at).slice(5)}</span>
      </p>
      <div class="board-card-actions">
        ${nextStatus ? `<button class="advance-btn" data-id="${t.id}" data-next="${nextStatus}">→ ${statusLabel[nextStatus]}</button>` : ''}
        <button class="delete-card-btn" data-id="${t.id}">ลบ</button>
      </div>
    </div>
  `;
}

document.getElementById('board').addEventListener('click', async (e) => {
  const advanceBtn = e.target.closest('.advance-btn');
  const deleteBtn = e.target.closest('.delete-card-btn');
  const card = e.target.closest('.board-card');

  if (advanceBtn) {
    e.stopPropagation();
    await fetch(`/api/tickets/${advanceBtn.dataset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: advanceBtn.dataset.next }),
    });
    refreshAll();
    return;
  }

  if (deleteBtn) {
    e.stopPropagation();
    if (!confirm('ยืนยันลบ ticket นี้?')) return;
    await fetch(`/api/tickets/${deleteBtn.dataset.id}`, { method: 'DELETE' });
    refreshAll();
    return;
  }

  if (card) {
    openTicketModal(card.dataset.id);
  }
});

// ---- Ticket detail modal ----
const modalOverlay = document.getElementById('ticket-modal-overlay');
const modalBody = document.getElementById('modal-body');

async function openTicketModal(id) {
  const res = await fetch(`/api/tickets/${id}`);
  if (!res.ok) return;
  const t = await res.json();
  modalBody.innerHTML = `
    <h3>Ticket #${t.id}</h3>
    <div class="form-row">
      <input type="text" id="modal-title" value="${escapeHtml(t.title)}" placeholder="หัวข้อ" />
      <input type="text" id="modal-assignee" value="${escapeHtml(t.assignee || '')}" placeholder="ผู้รับผิดชอบ" />
    </div>
    <div class="form-row">
      <select id="modal-status">
        ${STATUS_ORDER.map((s) => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${statusLabel[s]}</option>`).join('')}
      </select>
      <select id="modal-priority">
        ${['low', 'medium', 'high', 'urgent'].map((p) => `<option value="${p}" ${p === t.priority ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <textarea id="modal-description" placeholder="รายละเอียด">${escapeHtml(t.description || '')}</textarea>
    </div>
    <div class="form-row">
      <button id="modal-save-btn">บันทึก</button>
      <button type="button" class="secondary" id="modal-delete-btn">ลบ Ticket</button>
    </div>

    <div class="card">
      <h4 style="margin-top:0">รูปภาพ</h4>
      <div class="attachment-thumbs">
        ${(t.attachments || []).map((a) => `
          <span style="position:relative;display:inline-block;">
            <a href="uploads/${a.filename}" target="_blank"><img src="uploads/${a.filename}" class="thumb" alt="${escapeHtml(a.original_name)}" /></a>
            <button class="secondary modal-delete-attachment" data-id="${a.id}" style="position:absolute;top:-6px;right:-6px;padding:0 5px;border-radius:50%;">×</button>
          </span>
        `).join('') || '<span class="hint">ยังไม่มีรูป</span>'}
      </div>
      <button type="button" class="secondary" id="modal-photo-btn" style="margin-top:8px">+ เพิ่มรูป</button>
    </div>

    <div class="card">
      <h4 style="margin-top:0">บันทึกงานที่ทำ</h4>
      <div class="form-row">
        <input type="text" id="modal-note-input" placeholder="พิมพ์สิ่งที่ทำ แล้วกด Enter หรือกดปุ่ม" />
        <button type="button" id="modal-add-note-btn">เพิ่มบันทึก</button>
      </div>
      ${(t.notes || []).map((n) => `
        <div class="note-item">
          <div>${escapeHtml(n.note)}</div>
          <div class="ticket-meta">${formatDateTime(n.created_at)}</div>
        </div>
      `).join('') || '<div class="empty">ยังไม่มีบันทึก</div>'}
    </div>
  `;
  modalOverlay.style.display = 'flex';

  document.getElementById('modal-save-btn').onclick = async () => {
    const payload = {
      title: document.getElementById('modal-title').value,
      assignee: document.getElementById('modal-assignee').value,
      status: document.getElementById('modal-status').value,
      priority: document.getElementById('modal-priority').value,
      description: document.getElementById('modal-description').value,
    };
    const r = await fetch(`/api/tickets/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error || 'เกิดข้อผิดพลาด');
      return;
    }
    closeModal();
    refreshAll();
  };

  document.getElementById('modal-delete-btn').onclick = async () => {
    if (!confirm('ยืนยันลบ ticket นี้?')) return;
    await fetch(`/api/tickets/${t.id}`, { method: 'DELETE' });
    closeModal();
    refreshAll();
  };

  document.getElementById('modal-photo-btn').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (!input.files.length) return;
      const formData = new FormData();
      formData.append('image', input.files[0]);
      const r = await fetch(`/api/tickets/${t.id}/attachments`, { method: 'POST', body: formData });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(err.error || 'อัปโหลดรูปไม่สำเร็จ');
        return;
      }
      openTicketModal(t.id);
      refreshAll();
    };
    input.click();
  };

  modalBody.querySelectorAll('.modal-delete-attachment').forEach((btn) => {
    btn.onclick = async () => {
      await fetch(`/api/tickets/${t.id}/attachments/${btn.dataset.id}`, { method: 'DELETE' });
      openTicketModal(t.id);
      refreshAll();
    };
  });

  const addNote = async () => {
    const input = document.getElementById('modal-note-input');
    const note = input.value.trim();
    if (!note) return;
    const r = await fetch(`/api/tickets/${t.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error || 'เกิดข้อผิดพลาด');
      return;
    }
    openTicketModal(t.id);
    refreshAll();
  };
  document.getElementById('modal-add-note-btn').onclick = addNote;
  document.getElementById('modal-note-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addNote(); }
  });
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalBody.innerHTML = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

function refreshAll() {
  loadTickets();
  loadDashboard();
  loadPendingBanner();
}

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
loadDashboard();
loadSummary();
loadAnydesk();
loadPendingBanner();
