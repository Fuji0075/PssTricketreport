// When a ticket is created with a company/branch set, prefix the title with
// it — "โรบินสัน ฉะเชิงเทรา : เครื่องปริ้นไม่ดูดกระดาษ" — so the branch is
// visible at a glance in lists, the Dashboard board, and the daily summary,
// without the user having to type it into the title themselves every time.
function formatTicketTitle(company, title) {
  const trimmedTitle = String(title || '').trim();
  const trimmedCompany = String(company || '').trim();
  if (!trimmedCompany) return trimmedTitle;
  const prefix = `${trimmedCompany} : `;
  if (trimmedTitle.startsWith(prefix)) return trimmedTitle;
  return `${prefix}${trimmedTitle}`;
}

module.exports = { formatTicketTitle };
