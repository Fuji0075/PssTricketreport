const statusLabel = { open: 'Open', 'in-progress': 'In Progress', 'on-hold': 'On Hold', done: 'Done' };

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatDateTime(str) {
  if (!str) return '-';
  return str.replace('T', ' ').slice(0, 16);
}

function toDateTimeLocal(str) {
  if (!str) return '';
  return str.replace(' ', 'T').slice(0, 16);
}

// Today's date in Thailand's timezone — used as the default for date pickers
// regardless of the viewer's own device timezone/clock setting.
function todayThaiDateStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

// ---- Lightbox (view attachments without leaving the page) ----
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxImg = document.getElementById('lightbox-img');

function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt || '';
  lightboxOverlay.style.display = 'flex';
}

function closeLightbox() {
  lightboxOverlay.style.display = 'none';
  lightboxImg.src = '';
}

document.addEventListener('click', (e) => {
  const img = e.target.closest('.lightbox-img');
  if (img) {
    e.preventDefault();
    openLightbox(img.dataset.full || img.src, img.alt);
  }
});

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
lightboxOverlay.addEventListener('click', (e) => {
  if (e.target === lightboxOverlay) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightboxOverlay.style.display === 'flex') closeLightbox();
});

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
          #${t.id} · ผู้รับผิดชอบ: ${escapeHtml(t.assignee || '-')}${t.company ? ` · ${escapeHtml(t.company)}` : ''} · priority: ${t.priority}
          · อัปเดตล่าสุด: ${formatDateTime(t.updated_at)}
        </p>
        ${t.description ? `<p>${escapeHtml(t.description)}</p>` : ''}
        ${(t.attachments && t.attachments.length) ? `
          <div class="attachment-thumbs">
            ${t.attachments.map((a) => `<img src="uploads/${a.filename}" alt="${escapeHtml(a.original_name)}" class="thumb lightbox-img" data-full="uploads/${a.filename}" />`).join('')}
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
    company: document.getElementById('company').value,
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
    document.getElementById('company').value = t.company || '';
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
summaryDateInput.value = todayThaiDateStr();

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function ticketTime(createdAt) {
  return String(createdAt || '').slice(11, 16);
}

// One line of ticket metadata shown right under the title: when it was
// opened and, if available, the weather snapshot captured at that time.
function ticketMetaLine(t) {
  const parts = [];
  const time = ticketTime(t.created_at);
  if (time) parts.push(`🕐 เปิดเมื่อ ${time} น.`);
  if (t.weather_snapshot) parts.push(`🌤️ ${t.weather_snapshot}`);
  return parts.join(' · ');
}

function buildDailySummaryText(data) {
  const d = new Date(`${data.date}T00:00:00`);
  const beYear = (d.getFullYear() + 543) % 100;
  const header = `วันที่ ${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${beYear}`;

  const notesByTicket = {};
  (data.notes || []).forEach((n) => {
    (notesByTicket[n.ticket_id] = notesByTicket[n.ticket_id] || []).push(n.note);
  });

  const tickets = [...(data.touchedTickets || [])].sort((a, b) => a.id - b.id);

  const lines = [header, ''];
  tickets.forEach((t, i) => {
    lines.push(`${i + 1}. ${t.title}`);
    const metaLine = ticketMetaLine(t);
    if (metaLine) lines.push(metaLine);
    const noteLines = notesByTicket[t.id];
    if (noteLines && noteLines.length) {
      noteLines.forEach((n) => lines.push(`- ${n}`));
    } else if (t.description) {
      lines.push(`- ${t.description}`);
    }
    lines.push('');
  });

  if (tickets.length === 0) lines.push('(ไม่มี ticket ที่มีความเคลื่อนไหววันนี้)');

  return lines.join('\n').trim();
}

async function loadSummary() {
  const date = summaryDateInput.value;
  const res = await fetch(`/api/summary/daily?date=${date}`);
  const data = await res.json();
  const el = document.getElementById('summary-result');

  const statusCountMap = {};
  data.overallStatusCounts.forEach((s) => { statusCountMap[s.status] = s.count; });

  const summaryText = buildDailySummaryText(data);

  el.innerHTML = `
    <div class="card">
      <h3>📋 สรุปสำหรับแจ้งในไลน์</h3>
      <textarea id="summary-text-output" readonly class="summary-text-output">${escapeHtml(summaryText)}</textarea>
      <div class="form-row" style="margin-top:8px;">
        <button type="button" id="copy-summary-btn">คัดลอกข้อความ</button>
        <button type="button" id="send-discord-btn" style="display:none;">ส่งไป Discord</button>
      </div>
    </div>

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

  document.getElementById('copy-summary-btn').addEventListener('click', () => {
    const textarea = document.getElementById('summary-text-output');
    const btn = document.getElementById('copy-summary-btn');
    navigator.clipboard.writeText(textarea.value).then(() => {
      const original = btn.textContent;
      btn.textContent = '✓ คัดลอกแล้ว';
      setTimeout(() => { btn.textContent = original; }, 1500);
    }).catch(() => {
      textarea.select();
      document.execCommand('copy');
    });
  });

  const discordBtn = document.getElementById('send-discord-btn');
  fetch('/api/discord/status').then((r) => r.json()).then((s) => {
    if (s.configured) discordBtn.style.display = '';
  }).catch(() => {});

  discordBtn.addEventListener('click', async () => {
    discordBtn.disabled = true;
    const original = discordBtn.textContent;
    discordBtn.textContent = 'กำลังส่ง...';
    try {
      const res = await fetch('/api/discord/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error();
      discordBtn.textContent = '✓ ส่งแล้ว';
    } catch {
      discordBtn.textContent = '✗ ส่งไม่สำเร็จ';
    }
    setTimeout(() => { discordBtn.textContent = original; discordBtn.disabled = false; }, 2000);
  });
}

document.getElementById('load-summary').addEventListener('click', loadSummary);

// ---- Branch summary (per company/site, same data as Daily Summary grouped by company) ----
const branchSummaryDateInput = document.getElementById('branch-summary-date');
branchSummaryDateInput.value = todayThaiDateStr();

async function loadBranchSummary() {
  const date = branchSummaryDateInput.value;
  const res = await fetch(`/api/summary/daily?date=${date}`);
  const data = await res.json();
  const el = document.getElementById('branch-summary-result');

  const groups = {};
  (data.touchedTickets || []).forEach((t) => {
    const key = (t.company || '').trim() || 'ไม่ระบุบริษัท/สาขา';
    (groups[key] = groups[key] || []).push(t);
  });

  const branchNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'th'));

  if (branchNames.length === 0) {
    el.innerHTML = '<div class="card"><div class="empty">ไม่มี ticket ที่มีความเคลื่อนไหววันนี้</div></div>';
    return;
  }

  el.innerHTML = branchNames.map((name, idx) => {
    const branchTickets = groups[name];
    const branchTicketIds = new Set(branchTickets.map((t) => t.id));
    const branchNotes = (data.notes || []).filter((n) => branchTicketIds.has(n.ticket_id));
    const branchText = buildDailySummaryText({ date: data.date, touchedTickets: branchTickets, notes: branchNotes });
    const statusCounts = {};
    branchTickets.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

    return `
      <div class="card">
        <h3>🏬 ${escapeHtml(name)} <span class="hint">(${branchTickets.length} ticket)</span></h3>
        <p>
          <span class="badge open">Open</span> ${statusCounts.open || 0}
          <span class="badge in-progress">In Progress</span> ${statusCounts['in-progress'] || 0}
          <span class="badge on-hold">On Hold</span> ${statusCounts['on-hold'] || 0}
          <span class="badge done">Done</span> ${statusCounts.done || 0}
        </p>
        <textarea readonly class="summary-text-output branch-summary-text" data-branch-idx="${idx}">${escapeHtml(branchText)}</textarea>
        <div class="form-row" style="margin-top:8px;">
          <button type="button" class="copy-branch-summary-btn" data-branch-idx="${idx}">คัดลอกข้อความ</button>
        </div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('.copy-branch-summary-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const textarea = el.querySelector(`.branch-summary-text[data-branch-idx="${btn.dataset.branchIdx}"]`);
      navigator.clipboard.writeText(textarea.value).then(() => {
        const original = btn.textContent;
        btn.textContent = '✓ คัดลอกแล้ว';
        setTimeout(() => { btn.textContent = original; }, 1500);
      }).catch(() => {
        textarea.select();
        document.execCommand('copy');
      });
    });
  });
}

document.getElementById('load-branch-summary').addEventListener('click', loadBranchSummary);

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
const PROGRAM_OPTIONS = ['AnyDesk', 'PSS GO'];

function programSlug(program) {
  return String(program || 'AnyDesk').toLowerCase().replace(/\s+/g, '-');
}

async function loadAnydesk() {
  const q = document.getElementById('anydesk-search').value;
  const res = await fetch(`/api/anydesk${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const stores = await res.json();
  window.__allAnydeskStores = stores;
  const el = document.getElementById('anydesk-list');
  if (stores.length === 0) {
    el.innerHTML = '<div class="empty">ไม่พบสาขา</div>';
    return;
  }
  el.innerHTML = stores.map((s) => `
    <div class="card anydesk-card" data-store-id="${s.id}">
      <div class="anydesk-card-header">
        <h4>${escapeHtml(s.name)}</h4>
        <span class="program-badge program-${programSlug(s.program)}">${escapeHtml(s.program || 'AnyDesk')}</span>
      </div>
      ${s.note ? `<p class="hint">${escapeHtml(s.note)}</p>` : ''}
      <div class="anydesk-devices">
        ${s.devices.map((d) => `
          <div class="anydesk-device">
            <span>${escapeHtml(d.label)}</span>
            <code>${escapeHtml(d.device_id)}</code>
            <button class="secondary copy-btn" data-value="${escapeHtml(d.device_id)}">คัดลอก</button>
            <button class="secondary device-edit-btn" data-device-id="${d.id}" data-store-id="${s.id}" title="แก้ไข">✎</button>
            <button class="secondary device-delete-btn" data-device-id="${d.id}" data-store-id="${s.id}" title="ลบ">×</button>
          </div>
        `).join('') || '<span class="hint">ไม่มี ID</span>'}
      </div>
      <div class="anydesk-card-actions">
        <button class="secondary anydesk-add-device-btn" data-store-id="${s.id}">+ อุปกรณ์</button>
        <button class="secondary anydesk-edit-store-btn" data-store-id="${s.id}">แก้ไขสาขา</button>
        <button class="secondary anydesk-delete-store-btn" data-store-id="${s.id}">ลบสาขา</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('anydesk-search').addEventListener('input', () => {
  clearTimeout(window.__anydeskDebounce);
  window.__anydeskDebounce = setTimeout(loadAnydesk, 200);
});

document.getElementById('anydesk-list').addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('.copy-btn');
  const deviceEditBtn = e.target.closest('.device-edit-btn');
  const deviceDeleteBtn = e.target.closest('.device-delete-btn');
  const addDeviceBtn = e.target.closest('.anydesk-add-device-btn');
  const editStoreBtn = e.target.closest('.anydesk-edit-store-btn');
  const deleteStoreBtn = e.target.closest('.anydesk-delete-store-btn');

  if (copyBtn) {
    const value = copyBtn.dataset.value;
    navigator.clipboard.writeText(value).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = 'คัดลอกแล้ว!';
      setTimeout(() => { copyBtn.textContent = original; }, 1200);
    }).catch(() => alert(`ID: ${value}`));
    return;
  }

  if (deviceEditBtn) {
    const label = prompt('ชื่ออุปกรณ์ (เช่น Admin, Entry, Exit):');
    if (label === null) return;
    const deviceId = prompt('AnyDesk ID:');
    if (deviceId === null) return;
    if (!label.trim() || !deviceId.trim()) return;
    await fetch(`/api/anydesk/devices/${deviceEditBtn.dataset.deviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), device_id: deviceId.trim() }),
    });
    loadAnydesk();
    return;
  }

  if (deviceDeleteBtn) {
    if (!confirm('ยืนยันลบอุปกรณ์นี้?')) return;
    await fetch(`/api/anydesk/devices/${deviceDeleteBtn.dataset.deviceId}`, { method: 'DELETE' });
    loadAnydesk();
    return;
  }

  if (addDeviceBtn) {
    const label = prompt('ชื่ออุปกรณ์ (เช่น Admin, Entry, Exit):');
    if (!label || !label.trim()) return;
    const deviceId = prompt('AnyDesk ID:');
    if (!deviceId || !deviceId.trim()) return;
    await fetch(`/api/anydesk/${addDeviceBtn.dataset.storeId}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), device_id: deviceId.trim() }),
    });
    loadAnydesk();
    return;
  }

  if (editStoreBtn) {
    const stores = window.__allAnydeskStores || [];
    const store = stores.find((s) => String(s.id) === editStoreBtn.dataset.storeId);
    if (store) openAnydeskStoreModal(store);
    return;
  }

  if (deleteStoreBtn) {
    if (!confirm('ยืนยันลบสาขานี้ทั้งหมด (รวมอุปกรณ์ทุกชิ้น)?')) return;
    await fetch(`/api/anydesk/${deleteStoreBtn.dataset.storeId}`, { method: 'DELETE' });
    loadAnydesk();
  }
});

document.getElementById('anydesk-add-btn').addEventListener('click', () => openAnydeskStoreModal(null));

function openAnydeskStoreModal(store) {
  const isEdit = !!store;
  currentModalTicketId = null;
  document.querySelector('.modal').classList.remove('modal-wide');
  modalBody.innerHTML = `
    <h3>${isEdit ? `แก้ไขสาขา: ${escapeHtml(store.name)}` : 'เพิ่มสาขาใหม่'}</h3>
    <div class="form-row">
      <input type="text" id="anydesk-modal-name" placeholder="ชื่อสาขา *" value="${isEdit ? escapeHtml(store.name) : ''}" />
    </div>
    <div class="form-row">
      <select id="anydesk-modal-program">
        ${PROGRAM_OPTIONS.map((p) => `<option value="${p}" ${isEdit && store.program === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <input type="text" id="anydesk-modal-note" placeholder="หมายเหตุ (ถ้ามี)" value="${isEdit ? escapeHtml(store.note || '') : ''}" />
    </div>
    <p class="hint">โปรแกรม = แอปที่ต้องเปิดเพื่อรีโมทเข้าสาขานี้ (AnyDesk ปกติ หรือ PSS GO)</p>
    <div class="form-row">
      <input type="text" id="anydesk-modal-weather-location" placeholder="คำค้นหาสภาพอากาศ (ถ้าชื่อสาขาหาที่ตั้งไม่เจอ)" value="${isEdit ? escapeHtml(store.weather_location || '') : ''}" />
    </div>
    <p class="hint">ปกติระบบตัดคำหลัง "โรบินสัน" มาค้นหาสภาพอากาศให้อัตโนมัติ แต่ถ้าชื่อสาขาเป็นชื่อถนน/ย่าน (เช่น "ราชพฤกษ์") มักหาที่ตั้งไม่เจอ ใส่ชื่ออำเภอ/จังหวัดที่ถูกต้องตรงนี้แทนได้</p>
    <div class="form-row">
      <button id="anydesk-modal-save-btn">${isEdit ? 'บันทึก' : 'สร้างสาขา'}</button>
    </div>
  `;
  modalOverlay.style.display = 'flex';

  document.getElementById('anydesk-modal-save-btn').onclick = async () => {
    const name = document.getElementById('anydesk-modal-name').value.trim();
    if (!name) {
      alert('กรุณากรอกชื่อสาขา');
      return;
    }
    const payload = {
      name,
      program: document.getElementById('anydesk-modal-program').value,
      note: document.getElementById('anydesk-modal-note').value.trim(),
      weather_location: document.getElementById('anydesk-modal-weather-location').value.trim(),
    };
    const url = isEdit ? `/api/anydesk/${store.id}` : '/api/anydesk';
    const method = isEdit ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error || 'เกิดข้อผิดพลาด');
      return;
    }
    closeModal();
    loadAnydesk();
    loadCompanyOptions();
  };
}

// ---- Dashboard (Kanban) ----
const STATUS_ORDER = ['open', 'in-progress', 'on-hold', 'done'];
// What the quick action button on a card does next: open→in-progress→done,
// while on-hold is a side-state you pause into and resume out of.
const ADVANCE_MAP = { open: 'in-progress', 'in-progress': 'done', 'on-hold': 'in-progress' };
let dashboardFilter = 'all';

async function loadDashboard() {
  const res = await fetch('/api/tickets');
  const tickets = await res.json();
  window.__allTickets = tickets;
  renderDashboardStats(tickets);
  renderBoard(tickets);
}

function renderDashboardStats(tickets) {
  const counts = { open: 0, 'in-progress': 0, 'on-hold': 0, done: 0 };
  tickets.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
  const stats = [
    { key: 'all', label: 'ทั้งหมด', count: tickets.length },
    { key: 'open', label: 'Open', count: counts.open || 0 },
    { key: 'in-progress', label: 'In Progress', count: counts['in-progress'] || 0 },
    { key: 'on-hold', label: 'On Hold', count: counts['on-hold'] || 0 },
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
  const nextStatus = ADVANCE_MAP[t.status];
  const advanceLabel = t.status === 'on-hold' ? '▶ กลับมาทำ' : (nextStatus ? `→ ${statusLabel[nextStatus]}` : '');
  const showHold = t.status === 'open' || t.status === 'in-progress';
  const cover = (t.attachments && t.attachments.length) ? t.attachments[0] : null;
  return `
    <div class="board-card" data-id="${t.id}">
      ${cover ? `<img src="uploads/${cover.filename}" class="card-cover lightbox-img" data-full="uploads/${cover.filename}" alt="${escapeHtml(cover.original_name || '')}" />` : ''}
      <p class="card-title">${escapeHtml(t.title)}</p>
      ${t.company ? `<p class="card-company">🏢 ${escapeHtml(t.company)}</p>` : ''}
      <p class="card-meta">
        <span><span class="priority-dot priority-${t.priority}"></span>#${t.id} ${escapeHtml(t.assignee || '-')}</span>
        <span>${formatDateTime(t.updated_at).slice(5)}</span>
      </p>
      <div class="board-card-actions">
        ${nextStatus ? `<button class="advance-btn" data-id="${t.id}" data-next="${nextStatus}">${advanceLabel}</button>` : ''}
        ${showHold ? `<button class="hold-btn" data-id="${t.id}" title="พักงาน รอช่าง">‖ พัก</button>` : ''}
        <button class="delete-card-btn" data-id="${t.id}">ลบ</button>
      </div>
    </div>
  `;
}

document.getElementById('board').addEventListener('click', async (e) => {
  const advanceBtn = e.target.closest('.advance-btn');
  const holdBtn = e.target.closest('.hold-btn');
  const deleteBtn = e.target.closest('.delete-card-btn');
  const coverImg = e.target.closest('.card-cover');
  const card = e.target.closest('.board-card');

  if (coverImg) {
    // Let the document-level lightbox handler show the photo, but don't
    // also open the ticket detail modal underneath it.
    return;
  }

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

  if (holdBtn) {
    e.stopPropagation();
    await fetch(`/api/tickets/${holdBtn.dataset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'on-hold' }),
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

function openCreateTicketModal() {
  currentModalTicketId = null;
  document.querySelector('.modal').classList.remove('modal-wide');
  modalBody.innerHTML = `
    <h3>เพิ่ม Ticket ใหม่</h3>
    <div class="form-row">
      <input type="text" id="modal-new-title" placeholder="หัวข้อ ticket *" />
      <input type="text" id="modal-new-assignee" placeholder="ผู้รับผิดชอบ" />
    </div>
    <div class="form-row">
      <input type="text" id="modal-new-company" placeholder="บริษัท / สาขา" list="company-options" />
      <select id="modal-new-status">
        ${STATUS_ORDER.map((s) => `<option value="${s}">${statusLabel[s]}</option>`).join('')}
      </select>
      <select id="modal-new-priority">
        ${['low', 'medium', 'high', 'urgent'].map((p) => `<option value="${p}" ${p === 'medium' ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <textarea id="modal-new-description" placeholder="รายละเอียด"></textarea>
    </div>
    <div class="form-row" style="align-items:center; gap:10px;">
      <label for="modal-new-created-at" style="flex:0 0 auto; font-size:0.85rem; color:var(--muted);">🕐 วันที่/เวลาเหตุการณ์</label>
      <input type="datetime-local" id="modal-new-created-at" class="field-value" style="flex:1;" />
    </div>
    <p class="hint">ไม่ระบุ = ใช้เวลาปัจจุบัน ถ้าระบุ จะดึงสภาพอากาศ ณ วันที่/เวลานั้นมาบันทึกให้ (กรณีย้อนหลังแจ้งเหตุ)</p>
    <p class="hint">สร้าง ticket ก่อน แล้วค่อยแนบรูป (วาง Ctrl+V ได้) ในขั้นถัดไป</p>
    <div class="form-row">
      <button id="modal-create-btn">สร้าง Ticket</button>
    </div>
  `;
  modalOverlay.style.display = 'flex';

  document.getElementById('modal-create-btn').onclick = async () => {
    const title = document.getElementById('modal-new-title').value.trim();
    if (!title) {
      alert('กรุณากรอกหัวข้อ ticket');
      return;
    }
    const payload = {
      title,
      assignee: document.getElementById('modal-new-assignee').value,
      company: document.getElementById('modal-new-company').value,
      status: document.getElementById('modal-new-status').value,
      priority: document.getElementById('modal-new-priority').value,
      description: document.getElementById('modal-new-description').value,
    };
    const createdAtValue = document.getElementById('modal-new-created-at').value;
    if (createdAtValue) payload.created_at = createdAtValue;

    const createBtn = document.getElementById('modal-create-btn');
    const originalLabel = createBtn.textContent;
    createBtn.textContent = createdAtValue ? 'กำลังเช็คสภาพอากาศ...' : 'กำลังสร้าง...';
    createBtn.disabled = true;

    const r = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    createBtn.textContent = originalLabel;
    createBtn.disabled = false;
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error || 'เกิดข้อผิดพลาด');
      return;
    }
    const created = await r.json();
    refreshAll();
    openTicketModal(created.id);
  };
}

document.getElementById('dashboard-add-btn').addEventListener('click', openCreateTicketModal);

const STATUS_COLOR_VAR = { open: '--open', 'in-progress': '--progress', 'on-hold': '--hold', done: '--done' };

function paintStatusSelect(selectEl) {
  const varName = STATUS_COLOR_VAR[selectEl.value] || '--muted';
  selectEl.style.background = `var(${varName})`;
  selectEl.style.color = selectEl.value === 'in-progress' ? '#3a2c00' : '#fff';
}

async function openTicketModal(id) {
  const res = await fetch(`/api/tickets/${id}`);
  if (!res.ok) return;
  const t = await res.json();
  document.querySelector('.modal').classList.add('modal-wide');
  modalBody.innerHTML = `
    <div class="task-view">
      <div class="task-main">
        <div class="task-breadcrumb">Ticket #${t.id} <span id="modal-save-status" class="save-status"></span></div>
        <textarea id="modal-title" class="task-title-input" rows="1" placeholder="หัวข้อ">${escapeHtml(t.title)}</textarea>

        <div class="field-grid">
          <div class="field-row">
            <span class="field-label">🚦 Status</span>
            <select id="modal-status" class="status-select">
              ${STATUS_ORDER.map((s) => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${statusLabel[s]}</option>`).join('')}
            </select>
          </div>
          <div class="field-row">
            <span class="field-label">👤 ผู้รับผิดชอบ</span>
            <input type="text" id="modal-assignee" class="field-value" value="${escapeHtml(t.assignee || '')}" placeholder="ยังไม่ระบุ" />
          </div>
          <div class="field-row">
            <span class="field-label">🏢 บริษัท/สาขา</span>
            <input type="text" id="modal-company" class="field-value" value="${escapeHtml(t.company || '')}" placeholder="ยังไม่ระบุ" list="company-options" />
          </div>
          <div class="field-row">
            <span class="field-label">🚩 Priority</span>
            <select id="modal-priority" class="field-value">
              ${['low', 'medium', 'high', 'urgent'].map((p) => `<option value="${p}" ${p === t.priority ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="field-row">
            <span class="field-label">🕐 สร้างเมื่อ</span>
            <input type="datetime-local" id="modal-created-at" class="field-value" value="${toDateTimeLocal(t.created_at)}" />
          </div>
          <div class="field-row">
            <span class="field-label">✏️ อัปเดตล่าสุด</span>
            <span class="field-static" id="modal-updated-at">${formatDateTime(t.updated_at)}</span>
          </div>
          ${t.weather_snapshot ? `
            <div class="field-row">
              <span class="field-label">🌤️ อากาศตอนเปิด</span>
              <span class="field-static">${escapeHtml(t.weather_snapshot)}</span>
            </div>
          ` : ''}
        </div>

        <div class="task-description">
          <label>รายละเอียด</label>
          <textarea id="modal-description" placeholder="เพิ่มรายละเอียด...">${escapeHtml(t.description || '')}</textarea>
        </div>

        <div class="task-kb-suggest">
          <div class="kb-suggest-header">
            <label>💡 คำแนะนำจากระบบ</label>
            <button type="button" class="secondary" id="modal-kb-recommend-btn">ค้นหาคำแนะนำ</button>
          </div>
          <div id="modal-kb-result"></div>
        </div>

        <div class="task-attachments">
          <label>รูปภาพ</label>
          <div class="attachment-thumbs" id="modal-attachments">
            ${(t.attachments || []).map((a) => `
              <span style="position:relative;display:inline-block;">
                <img src="uploads/${a.filename}" class="thumb lightbox-img" alt="${escapeHtml(a.original_name)}" data-full="uploads/${a.filename}" />
                <button class="secondary modal-delete-attachment" data-id="${a.id}" style="position:absolute;top:-6px;right:-6px;padding:0 5px;border-radius:50%;">×</button>
              </span>
            `).join('') || '<span class="hint">ยังไม่มีรูป</span>'}
          </div>
          <div class="form-row" style="align-items:center; margin-top:8px;">
            <button type="button" class="secondary" id="modal-photo-btn">+ เพิ่มรูป</button>
            <span class="hint">หรือวางรูปที่ก็อปมา (Ctrl+V) ได้เลย</span>
          </div>
          <div id="modal-paste-status" class="hint"></div>
        </div>

        <div class="task-main-actions">
          <button type="button" class="secondary" id="modal-delete-btn">ลบ Ticket</button>
        </div>
      </div>

      <div class="task-activity">
        <div class="activity-header">Activity</div>
        <div class="activity-thread" id="modal-chat-thread">
          ${(t.notes || []).slice().reverse().map((n) => `
            <div class="activity-item">
              <div class="activity-avatar">🎫</div>
              <div class="activity-content">
                <div class="activity-meta">
                  <strong>คุณ</strong> · <span class="activity-time">${formatDateTime(n.created_at)}</span>
                  <button type="button" class="activity-note-edit" data-note-id="${n.id}" title="แก้ไข">✎</button>
                  <button type="button" class="activity-note-delete" data-note-id="${n.id}" title="ลบ">×</button>
                </div>
                <div class="activity-text">${escapeHtml(n.note)}</div>
              </div>
            </div>
          `).join('') || '<div class="empty">ยังไม่มีความเคลื่อนไหว พิมพ์ด้านล่างเพื่อบันทึก</div>'}
        </div>
        <div class="activity-input">
          <input type="text" id="modal-note-input" placeholder="Write a comment..." />
          <button type="button" id="modal-add-note-btn">Send</button>
        </div>
      </div>
    </div>
  `;
  modalOverlay.style.display = 'flex';
  const chatThreadEl = document.getElementById('modal-chat-thread');
  if (chatThreadEl) chatThreadEl.scrollTop = chatThreadEl.scrollHeight;
  currentModalTicketId = t.id;

  const statusSelectEl = document.getElementById('modal-status');
  paintStatusSelect(statusSelectEl);

  const titleTextarea = document.getElementById('modal-title');
  const autoGrow = () => { titleTextarea.style.height = 'auto'; titleTextarea.style.height = `${titleTextarea.scrollHeight}px`; };
  autoGrow();
  titleTextarea.addEventListener('input', autoGrow);

  // Auto-save: status/priority/date save immediately on change, text
  // fields save on blur, so switching cards or clicking away never loses
  // an edit and never requires an explicit "save" click.
  const autoSave = () => autoSaveTicket(t.id);
  statusSelectEl.addEventListener('change', () => { paintStatusSelect(statusSelectEl); autoSave(); });
  document.getElementById('modal-priority').addEventListener('change', autoSave);
  document.getElementById('modal-created-at').addEventListener('change', autoSave);
  titleTextarea.addEventListener('blur', autoSave);
  document.getElementById('modal-assignee').addEventListener('blur', autoSave);
  document.getElementById('modal-company').addEventListener('blur', autoSave);
  document.getElementById('modal-description').addEventListener('blur', autoSave);

  document.getElementById('modal-kb-recommend-btn').onclick = () => loadKbRecommendation(t);

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
      await uploadAttachment(t.id, input.files[0]);
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

  modalBody.querySelectorAll('.activity-note-edit').forEach((btn) => {
    btn.onclick = async () => {
      const existingNote = (t.notes || []).find((n) => String(n.id) === btn.dataset.noteId);
      const updated = prompt('แก้ไขข้อความ:', existingNote ? existingNote.note : '');
      if (updated === null || !updated.trim()) return;
      const r = await fetch(`/api/tickets/${t.id}/notes/${btn.dataset.noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: updated.trim() }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(err.error || 'เกิดข้อผิดพลาด');
        return;
      }
      openTicketModal(t.id);
    };
  });

  modalBody.querySelectorAll('.activity-note-delete').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('ยืนยันลบข้อความนี้?')) return;
      await fetch(`/api/tickets/${t.id}/notes/${btn.dataset.noteId}`, { method: 'DELETE' });
      openTicketModal(t.id);
      refreshAll();
    };
  });
}

function closeModal() {
  modalOverlay.style.display = 'none';
  modalBody.innerHTML = '';
  document.querySelector('.modal').classList.remove('modal-wide');
  currentModalTicketId = null;
}

document.getElementById('modal-close').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

async function uploadAttachment(ticketId, file) {
  const statusEl = document.getElementById('modal-paste-status');
  if (statusEl) statusEl.textContent = 'กำลังอัปโหลดรูป...';
  const formData = new FormData();
  formData.append('image', file);
  const r = await fetch(`/api/tickets/${ticketId}/attachments`, { method: 'POST', body: formData });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    alert(err.error || 'อัปโหลดรูปไม่สำเร็จ');
    if (statusEl) statusEl.textContent = '';
    return;
  }
  openTicketModal(ticketId);
  refreshAll();
}

// Allow pasting a screenshot (Ctrl+V) directly into the ticket modal.
let currentModalTicketId = null;
document.addEventListener('paste', (e) => {
  if (!currentModalTicketId || modalOverlay.style.display !== 'flex') return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) uploadAttachment(currentModalTicketId, file);
      return;
    }
  }
});

function refreshAll() {
  loadTickets();
  loadDashboard();
  loadPendingBanner();
  loadCompanyOptions();
}

async function autoSaveTicket(ticketId) {
  const createdAtField = document.getElementById('modal-created-at');
  const statusEl = document.getElementById('modal-save-status');
  if (!createdAtField || !createdAtField.value) return;

  const payload = {
    title: document.getElementById('modal-title').value,
    assignee: document.getElementById('modal-assignee').value,
    company: document.getElementById('modal-company').value,
    status: document.getElementById('modal-status').value,
    priority: document.getElementById('modal-priority').value,
    description: document.getElementById('modal-description').value,
    created_at: createdAtField.value,
  };

  if (statusEl) statusEl.textContent = 'กำลังบันทึก...';
  const r = await fetch(`/api/tickets/${ticketId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    if (statusEl) statusEl.textContent = '';
    alert(err.error || 'บันทึกไม่สำเร็จ');
    return;
  }
  const updated = await r.json();
  if (statusEl) {
    statusEl.textContent = '✓ บันทึกแล้ว';
    setTimeout(() => { if (statusEl && statusEl.textContent === '✓ บันทึกแล้ว') statusEl.textContent = ''; }, 1500);
  }
  const updatedAtEl = document.getElementById('modal-updated-at');
  if (updatedAtEl) updatedAtEl.textContent = formatDateTime(updated.updated_at);

  // Refresh board/list/banner in the background without touching the
  // currently open modal, so the user's cursor/focus isn't disrupted.
  loadTickets();
  loadDashboard();
  loadPendingBanner();
  loadCompanyOptions();
}

// ---- Knowledge Base ----
async function loadKb() {
  const q = document.getElementById('kb-search').value;
  const res = await fetch(`/api/kb${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const articles = await res.json();
  window.__allKb = articles;
  const el = document.getElementById('kb-list');
  if (articles.length === 0) {
    el.innerHTML = '<div class="empty">ยังไม่มีบทความ Knowledge Base — เพิ่มปัญหาที่เคยเจอไว้ ระบบจะแนะนำให้อัตโนมัติตอนเปิด ticket ใหม่</div>';
    return;
  }
  el.innerHTML = articles.map((a) => `
    <div class="card kb-card" data-id="${a.id}">
      <h4 style="margin:0 0 6px">${escapeHtml(a.title)}</h4>
      ${a.problem ? `<p class="hint"><strong>อาการ:</strong> ${escapeHtml(a.problem)}</p>` : ''}
      <p class="kb-solution">${escapeHtml(a.solution).replace(/\n/g, '<br>')}</p>
      ${a.tags ? `<p class="hint">🏷️ ${escapeHtml(a.tags)}</p>` : ''}
      <div class="kb-card-actions">
        <button class="secondary kb-edit-btn" data-id="${a.id}">แก้ไข</button>
        <button class="secondary kb-delete-btn" data-id="${a.id}">ลบ</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('kb-search').addEventListener('input', () => {
  clearTimeout(window.__kbDebounce);
  window.__kbDebounce = setTimeout(loadKb, 200);
});

document.getElementById('kb-list').addEventListener('click', async (e) => {
  const editBtn = e.target.closest('.kb-edit-btn');
  const deleteBtn = e.target.closest('.kb-delete-btn');

  if (editBtn) {
    const article = (window.__allKb || []).find((a) => String(a.id) === editBtn.dataset.id);
    if (article) openKbModal(article);
    return;
  }

  if (deleteBtn) {
    if (!confirm('ยืนยันลบบทความนี้?')) return;
    await fetch(`/api/kb/${deleteBtn.dataset.id}`, { method: 'DELETE' });
    loadKb();
  }
});

document.getElementById('kb-add-btn').addEventListener('click', () => openKbModal(null));

function openKbModal(article) {
  const isEdit = !!article;
  currentModalTicketId = null;
  document.querySelector('.modal').classList.remove('modal-wide');
  modalBody.innerHTML = `
    <h3>${isEdit ? 'แก้ไขบทความ' : 'เพิ่มบทความใหม่'}</h3>
    <div class="form-row">
      <input type="text" id="kb-modal-title" placeholder="หัวข้อปัญหา *" value="${isEdit ? escapeHtml(article.title) : ''}" />
    </div>
    <div class="form-row">
      <textarea id="kb-modal-problem" placeholder="อาการ / สิ่งที่พบ">${isEdit ? escapeHtml(article.problem || '') : ''}</textarea>
    </div>
    <div class="form-row">
      <textarea id="kb-modal-solution" placeholder="วิธีแก้ไข (ขั้นตอน) *">${isEdit ? escapeHtml(article.solution) : ''}</textarea>
    </div>
    <div class="form-row">
      <input type="text" id="kb-modal-tags" placeholder="แท็ก (คั่นด้วยจุลภาค เช่น printer, network)" value="${isEdit ? escapeHtml(article.tags || '') : ''}" />
    </div>
    <div class="form-row">
      <button id="kb-modal-save-btn">${isEdit ? 'บันทึก' : 'เพิ่มบทความ'}</button>
    </div>
  `;
  modalOverlay.style.display = 'flex';

  document.getElementById('kb-modal-save-btn').onclick = async () => {
    const title = document.getElementById('kb-modal-title').value.trim();
    const solution = document.getElementById('kb-modal-solution').value.trim();
    if (!title || !solution) {
      alert('กรุณากรอกหัวข้อและวิธีแก้ไข');
      return;
    }
    const payload = {
      title,
      problem: document.getElementById('kb-modal-problem').value.trim(),
      solution,
      tags: document.getElementById('kb-modal-tags').value.trim(),
    };
    const url = isEdit ? `/api/kb/${article.id}` : '/api/kb';
    const method = isEdit ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error || 'เกิดข้อผิดพลาด');
      return;
    }
    closeModal();
    loadKb();
  };
}

async function loadKbRecommendation(ticket) {
  const resultEl = document.getElementById('modal-kb-result');
  if (!resultEl) return;
  const title = document.getElementById('modal-title').value;
  const description = document.getElementById('modal-description').value;
  resultEl.innerHTML = '<p class="hint">กำลังค้นหาคำแนะนำ...</p>';
  const res = await fetch('/api/kb/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) {
    resultEl.innerHTML = '<p class="hint">ค้นหาคำแนะนำไม่สำเร็จ</p>';
    return;
  }
  const data = await res.json();
  let html = '';
  if (data.aiAnswer) {
    html += `
      <div class="kb-ai-answer">
        <div class="kb-ai-label">🤖 คำแนะนำจาก AI</div>
        <div class="kb-ai-text">${escapeHtml(data.aiAnswer).replace(/\n/g, '<br>')}</div>
      </div>
    `;
  } else if (!data.aiAvailable) {
    html += `<p class="hint">ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY — แสดงเฉพาะบทความที่ใกล้เคียงจาก Knowledge Base ด้านล่าง (ตั้งค่า env var นี้เพื่อให้ AI ช่วยสรุปคำแนะนำ)</p>`;
  }
  if (data.matches && data.matches.length) {
    html += `<div class="kb-matches">${data.matches.map((m) => `
      <div class="kb-match-item">
        <div class="kb-match-title">${escapeHtml(m.title)}</div>
        <div class="kb-match-solution">${escapeHtml(m.solution).replace(/\n/g, '<br>')}</div>
      </div>
    `).join('')}</div>`;
  } else if (!data.aiAnswer) {
    html += '<p class="empty">ไม่พบบทความที่เกี่ยวข้องใน Knowledge Base ลองเพิ่มบทความใหม่หลังจากแก้ปัญหานี้ได้แล้ว</p>';
  }
  resultEl.innerHTML = html;
}

// ---- Company autocomplete (AnyDesk branch names + any company name
// already typed on a past ticket, so a brand-new name you type once is
// remembered as a suggestion from then on) ----
async function loadCompanyOptions() {
  const [storesRes, companiesRes] = await Promise.all([
    fetch('/api/anydesk'),
    fetch('/api/tickets/meta/companies'),
  ]);
  const stores = await storesRes.json();
  const pastCompanies = await companiesRes.json();
  const names = new Set([...stores.map((s) => s.name), ...pastCompanies]);
  const datalist = document.getElementById('company-options');
  datalist.innerHTML = [...names].sort().map((n) => `<option value="${escapeHtml(n)}"></option>`).join('');
}

// ---- Pending work banner ----
async function loadPendingBanner() {
  const res = await fetch('/api/summary/pending?staleDays=2');
  const data = await res.json();
  const banner = document.getElementById('pending-banner');
  const dot = document.getElementById('sidebar-pending-dot');
  if (data.count === 0) {
    banner.style.display = 'none';
    dot.style.display = 'none';
    return;
  }
  dot.style.display = 'inline-block';
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
loadKb();
loadCompanyOptions();
loadPendingBanner();
