const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const frontend = path.join(root, 'FRONTEND');
const dataDir = process.env.VERCEL ? '/tmp' : path.join(root, 'data');
const storeFile = path.join(dataDir, 'store.json');
const seedStoreFile = path.join(root, 'data', 'store.json');
const initialStore = {
  users: [],
  reports: [],
  tasks: [],
  departments: [{ id: 'public-works', name: 'Public Works', description: 'Roads, lighting and sanitation' }],
  notifications: [],
  content: [],
  feedback: [],
  locations: []
};
let store = loadStore();
ensureSeedUsers();
upgradePasswordStorage();
const sessionSecret = process.env.CIVIC_SESSION_SECRET || 'civicwatch_default_session_secret_key_2026';
const sessionLifetimeSeconds = 8 * 60 * 60;

function loadStore() {
  try {
    if (fs.existsSync(storeFile)) {
      return { ...initialStore, ...JSON.parse(fs.readFileSync(storeFile, 'utf8')) };
    }
    if (fs.existsSync(seedStoreFile)) {
      return { ...initialStore, ...JSON.parse(fs.readFileSync(seedStoreFile, 'utf8')) };
    }
    return structuredClone(initialStore);
  } catch {
    return structuredClone(initialStore);
  }
}
function ensureSeedUsers() {
  const defaultSeeds = [
    { id: 'admin', username: process.env.CIVIC_ADMIN_USERNAME || 'admin', password: process.env.CIVIC_ADMIN_PASSWORD || 'admin123', role: 'admin', name: 'Elizabeth Macharia', email: 'admin@civicwatch.local' },
    { id: 'department', username: process.env.CIVIC_DEPARTMENT_USERNAME || 'publicworks', password: process.env.CIVIC_DEPARTMENT_PASSWORD || 'dept123', role: 'department', name: 'James Omondi', email: 'publicworks@civicwatch.local' },
    { id: 'citizen1', username: process.env.CIVIC_CITIZEN_USERNAME || 'citizen1', password: process.env.CIVIC_CITIZEN_PASSWORD || 'citizen123', role: 'citizen', name: 'Mary Wanjiku', email: 'citizen1@example.com' }
  ];
  for (const seed of defaultSeeds) {
    let existing = store.users.find(user => user.username.toLowerCase() === seed.username.toLowerCase() || user.id === seed.id);
    if (!existing) {
      existing = { id: seed.id, username: seed.username, email: seed.email, name: seed.name, role: seed.role, passwordHash: hashPassword(seed.password) };
      store.users.push(existing);
    } else if (!existing.passwordHash && seed.password) {
      existing.passwordHash = hashPassword(seed.password);
    }
  }
  saveStore();
}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  const [salt, hash] = passwordHash.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}
function upgradePasswordStorage() {
  let changed = false;
  for (const user of store.users) {
    if (user.password && !user.passwordHash) {
      user.passwordHash = hashPassword(user.password);
      delete user.password;
      changed = true;
    }
  }
  if (changed) saveStore();
}
function saveStore() {
  try {
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Failed to save store:', err.message);
  }
}
function json(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', ...headers });
  res.end(JSON.stringify(value));
}
function id() { return crypto.randomUUID(); }
function tokenFromRequest(req) {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (bearer) return bearer;
  return (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('cw_session='))?.slice('cw_session='.length) || '';
}
function userFor(req) {
  const [encoded, signature] = tokenFromRequest(req).split('.');
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac('sha256', sessionSecret).update(encoded).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    const user = store.users.find(candidate => candidate.id === session.id);
    return user?.role === session.role ? user : null;
  } catch { return null; }
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}
function sanitizeUser(user) { const { password, passwordHash, ...safe } = user; return safe; }
function stats() { return { users: store.users.length, reports: store.reports.length, pendingReports: store.reports.filter(r => r.status !== 'Resolved').length }; }

async function api(req, res, pathname) {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }); return res.end(); }
  const parts = pathname.split('/').filter(Boolean);
  const method = req.method;
  const current = userFor(req);
  const input = ['POST', 'PUT', 'PATCH'].includes(method) ? await body(req) : {};
  const role = parts[1];
  const resource = parts[2];

  if (pathname === '/api/health') return json(res, 200, { ok: true });
  if ((resource === 'register' || role === 'register' || pathname === '/api/register' || pathname === '/api/auth/register') && method === 'POST') {
    const isAllowed = !role || ['citizens', 'citizen', 'auth', 'users', 'register'].includes(role);
    if (!isAllowed) return json(res, 403, { error: 'Only citizen self-registration is allowed' });
    const rawUsername = (input.username || input.email || '').trim();
    const password = input.password;
    if (!rawUsername || !password) return json(res, 400, { error: 'Username and password are required' });
    const email = (input.email || rawUsername).trim();
    const name = (input.name || rawUsername).trim();
    if (store.users.some(u => u.username.toLowerCase() === rawUsername.toLowerCase() || (u.email && u.email.toLowerCase() === email.toLowerCase()))) {
      return json(res, 409, { error: 'An account with that username or email already exists' });
    }
    const user = { id: id(), username: rawUsername, email, name, passwordHash: hashPassword(password), role: 'citizen' };
    store.users.push(user); saveStore();
    const token = createToken(user);
    return json(res, 201, { token, user: sanitizeUser(user) }, sessionCookie(token));
  }
  if (resource === 'login' && method === 'POST') {
    const rawUsername = (input.username || input.email || '').trim();
    const expectedRole = (role === 'citizens' || role === 'citizen') ? 'citizen' : (role === 'departments' || role === 'department') ? 'department' : (role === 'admins' || role === 'admin') ? 'admin' : role;
    if (!['admin', 'department', 'citizen'].includes(expectedRole)) return json(res, 404, { error: 'Login route not found' });
    const user = store.users.find(u => (u.username.toLowerCase() === rawUsername.toLowerCase() || (u.email && u.email.toLowerCase() === rawUsername.toLowerCase())) && u.role === expectedRole && verifyPassword(input.password, u.passwordHash));
    if (!user) return json(res, 401, { error: 'Invalid credentials' });
    const token = createToken(user);
    return json(res, 200, { token, user: sanitizeUser(user) }, sessionCookie(token));
  }
  if (pathname === '/api/logout' && method === 'POST') return json(res, 200, { success: true }, { 'Set-Cookie': 'cw_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  if (resource === 'current-user') return current ? json(res, 200, sanitizeUser(current)) : json(res, 401, { error: 'Sign in required' });
  if (!current) return json(res, 401, { error: 'Sign in required' });
  if ((role === 'admin' || role === 'admins') && current.role !== 'admin') return json(res, 403, { error: 'Administrator access required' });
  if ((role === 'citizens' || role === 'citizen') && current.role !== 'citizen') return json(res, 403, { error: 'Citizen access required' });
  if ((role === 'departments' || role === 'department') && !['admin', 'department'].includes(current.role)) return json(res, 403, { error: 'Department access required' });
  if (resource === 'profile') {
    if (method === 'GET') return json(res, 200, sanitizeUser(current));
    if (!['PUT', 'PATCH'].includes(method)) return json(res, 405, { error: 'Method not allowed' });
    const updates = {};
    for (const key of ['name', 'email', 'phone']) {
      if (typeof input[key] === 'string') updates[key] = input[key].trim();
    }
    if (updates.email && !/^\S+@\S+\.\S+$/.test(updates.email)) return json(res, 400, { error: 'Enter a valid email address' });
    Object.assign(current, updates);
    saveStore();
    return json(res, 200, sanitizeUser(current));
  }
  if (resource === 'dashboard') {
    const pendingReviews = store.reports.filter(report => !['Resolved', 'Approved', 'Rejected'].includes(report.status)).length;
    return json(res, 200, {
      ...stats(),
      totalUsers: store.users.length,
      activeSubmissions: pendingReviews,
      departmentCount: store.departments.length,
      pendingReviews,
      systemHealth: 'Operational',
      userGrowth: '+0%',
      recentReports: store.reports.slice(-5),
      recentTasks: store.tasks.slice(-5)
    });
  }
  if (pathname === '/api/analytics/stats' || pathname === '/api/statistics/department') return json(res, 200, stats());
  if (pathname === '/api/departments' && method === 'GET') return json(res, 200, store.departments);
  if (pathname === '/api/departments' && method === 'POST') { const item = { id: id(), ...input }; store.departments.push(item); saveStore(); return json(res, 201, item); }
  if (parts[1] === 'departments' && parts[2] && !resource.match(/^(register|login|current-user|dashboard)$/)) {
    const item = store.departments.find(d => d.id === parts[2]); return item ? json(res, 200, item) : json(res, 404, { error: 'Department not found' });
  }
  if (resource === 'reports' || (parts[1] === 'reports')) return collection(req, res, input, store.reports, 'reports', current);

  if (resource === 'submissions') return collection(req, res, input, store.reports, 'submissions', current);
  if (resource === 'tasks' || (parts[1] === 'tasks')) return collection(req, res, input, store.tasks, 'tasks', current);
  if (resource === 'notifications' || pathname === '/api/notifications') return collection(req, res, input, store.notifications, 'notifications', current);
  if (resource === 'content') return collection(req, res, input, store.content, 'content', current);
  if (resource === 'feedback') { if (method === 'POST') { store.feedback.push({ id: id(), ...input, userId: current?.id, createdAt: new Date().toISOString() }); saveStore(); } return json(res, 200, store.feedback); }
  if (pathname === '/api/locations') { if (method === 'POST') { store.locations.push({ id: id(), ...input }); saveStore(); } return json(res, 200, store.locations); }
  if (resource === 'users') return collection(req, res, input, store.users, 'users', current, true);
  return json(res, 404, { error: 'API route not found' });
}
function createToken(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds })).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function sessionCookie(token) { return { 'Set-Cookie': `cw_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionLifetimeSeconds}` }; }
function collection(req, res, input, items, name, current, hidePasswords = false) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const segments = pathname.split('/').filter(Boolean);
  const itemId = segments.length > 3 ? segments[3] : null;
  if (req.method === 'GET' && !itemId) return json(res, 200, hidePasswords ? items.map(sanitizeUser) : items);
  if (req.method === 'POST' && !itemId) { const item = { id: id(), ...input, userId: input.userId || current?.id, status: input.status || 'Pending', createdAt: new Date().toISOString() }; items.push(item); saveStore(); return json(res, 201, hidePasswords ? sanitizeUser(item) : item); }
  const item = items.find(x => x.id === itemId);
  if (!item) return json(res, 404, { error: `${name.slice(0, -1)} not found` });
  if (req.method === 'DELETE') { items.splice(items.indexOf(item), 1); saveStore(); return json(res, 204, {}); }
  if (req.method === 'PUT' || req.method === 'PATCH' || segments.length > 4) { Object.assign(item, input, segments[4] === 'approve' ? { status: 'Approved' } : segments[4] === 'reject' ? { status: 'Rejected' } : {}); saveStore(); return json(res, 200, hidePasswords ? sanitizeUser(item) : item); }
  return json(res, 200, hidePasswords ? sanitizeUser(item) : item);
}
function serveFile(req, res, pathname) {
  let requested = pathname === '/' ? '/.HTML/PUBLIC.HTML' : pathname;

  if (/^\/(ADMIN\.HTML|DEPARTMENT\.HTML|CITIZEN\.HTML)$/i.test(requested)) {
    requested = `/.HTML${requested}`;
  }
  let file = path.resolve(frontend, `.${requested}`);

  if (!fs.existsSync(file) && requested.split('/').filter(Boolean).length === 1) {
    file = path.resolve(frontend, `.HTML/${requested}`);
  }
  if (!file.startsWith(frontend) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(res, 404, { error: 'Not found' });
  const isHtml = path.extname(file).toLowerCase() === '.html';
  const roleMatch = file.match(/\/(ADMIN|DEPARTMENT|CITIZEN)\.HTML(?:\/|$)/i);
  if (isHtml && roleMatch) {
    const requiredRole = roleMatch[1].toLowerCase();
    const user = userFor(req);
    if (!user || user.role !== requiredRole) {
      res.writeHead(302, { Location: `/login.html?role=${requiredRole}` });
      return res.end();
    }
  }
  const type = isHtml ? 'text/html' : path.extname(file).toLowerCase() === '.js' ? 'application/javascript' : path.extname(file).toLowerCase() === '.json' ? 'application/json' : path.extname(file).toLowerCase() === '.png' ? 'image/png' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
  if (isHtml) {
    const html = fs.readFileSync(file, 'utf8').replace('</head>', '  <link rel="stylesheet" href="/styles/app.css">\n  <link rel="stylesheet" href="/styles/system.css">\n</head>');
    return res.end(html);
  }
  fs.createReadStream(file).pipe(res);
}

async function requestHandler(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  try { if (pathname.startsWith('/api/')) await api(req, res, pathname); else serveFile(req, res, pathname); }
  catch (error) { json(res, 500, { error: error.message }); }
}

const server = http.createServer(requestHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`CivicWatch running at http://localhost:${PORT}`));
}

module.exports = requestHandler;
