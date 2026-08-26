(() => {
  const role = document.body.dataset.role;
  const apiRole = role === 'citizen' ? 'citizens' : role === 'department' ? 'departments' : 'admin';
  const form = document.getElementById('profileForm');
  const message = document.getElementById('profileMessage');
  const setMessage = (text, error = false) => { message.textContent = text; message.style.color = error ? '#ff9d9d' : '#38df8a'; };
  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` });

  async function loadProfile() {
    const response = await fetch(`/api/${apiRole}/profile`, { headers: auth() });
    if (!response.ok) { location.assign(`/login.html?role=${role}`); return; }
    const user = await response.json();
    document.getElementById('profileRole').textContent = user.role;
    document.getElementById('profileUsername').textContent = user.username;
    form.name.value = user.name || '';
    form.email.value = user.email || '';
    form.phone.value = user.phone || '';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const response = await fetch(`/api/${apiRole}/profile`, { method: 'PATCH', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || 'Unable to update profile.', true);
    localStorage.setItem('currentUser', JSON.stringify(result));
    setMessage('Profile saved successfully.');
  });
  loadProfile();
})();
