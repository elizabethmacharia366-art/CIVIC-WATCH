(() => {
  const api = '/api/admin';
  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` });
  const notify = message => {
    const element = document.createElement('p');
    element.className = 'admin-message';
    element.textContent = message;
    element.style.cssText = 'color:#37df88;font-weight:bold;text-align:center;';
    document.querySelector('main')?.prepend(element);
    setTimeout(() => element.remove(), 3500);
  };

  document.getElementById('contentForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const response = await fetch(`${api}/content`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    notify(response.ok ? 'Content published.' : 'Unable to publish content.');
    if (response.ok) event.currentTarget.reset();
  });

  document.getElementById('notificationForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const response = await fetch(`${api}/notifications`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    notify(response.ok ? 'Notification sent.' : 'Unable to send notification.');
    if (response.ok) event.currentTarget.reset();
  });

  const rows = document.getElementById('submissionRows');
  if (rows) {
    const loadSubmissions = async () => {
      const response = await fetch(`${api}/submissions`, { headers: auth() });
      if (!response.ok) return notify('Unable to load submissions.');
      const submissions = await response.json();
      rows.innerHTML = submissions.map(submission => `<tr>
        <td>${submission.id.slice(0, 8)}</td><td>${submission.title || 'Untitled report'}</td>
        <td>${submission.category || 'General'}</td><td>${new Date(submission.createdAt).toLocaleDateString()}</td>
        <td>${submission.status}</td><td>
          <button data-action="approve" data-id="${submission.id}">Approve</button>
          <button data-action="reject" data-id="${submission.id}">Reject</button>
          <button data-action="resolve" data-id="${submission.id}">Resolve</button>
        </td></tr>`).join('') || '<tr><td colspan="6">No submissions yet.</td></tr>';
    };
    rows.addEventListener('click', async event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const status = button.dataset.action === 'resolve' ? 'Resolved' : undefined;
      const response = await fetch(`${api}/submissions/${button.dataset.id}/${button.dataset.action}`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(status ? { status } : {}) });
      notify(response.ok ? `Submission ${button.dataset.action}d.` : 'Unable to update submission.');
      if (response.ok) loadSubmissions();
    });
    loadSubmissions();
  }
})();
