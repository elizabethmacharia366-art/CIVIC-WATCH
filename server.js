const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const frontend = path.join(root, 'FRONTEND');
const storeFile = path.join(root, 'data', 'store.json');
const initialStore = {
  users: [],
  reports: [],
  tasks: [],
  departments: [{ id: 'public-works', name: 'Public Works', description: 'Roads, lighting and sanitation' }],
  notifications: [],
  feedback: [],
  locations: []
};
let store = loadStore();
ensureSeedUsers();
const tokens = new Map();

function loadStore() {
  try { return { ...initialStore, ...JSON.parse(fs.readFileSync(storeFile, 'utf8')) }; }
  catch { return structuredClone(initialStore); }
}
function ensureSeedUsers() {
  const configuredUsers = [
    { id: 'admin', username: process.env.CIVIC_ADMIN_USERNAME, password: process.env.CIVIC_ADMIN_PASSWORD, role: 'admin', name: 'Administrator' },
    { id: 'department', username: process.env.CIVIC_DEPARTMENT_USERNAME, password: process.env.CIVIC_DEPARTMENT_PASSWORD, role: 'department', name: 'Public Works' }
  ].filter(user => user.username && user.password);
  for (const seed of configuredUsers) {
    if (!store.users.some(user => user.username === seed.username)) store.users.push(structuredClone(seed));
  }
  saveStore();
}
function saveStore() {
  fs.mkdirSync(path.dirname(storeFile), { recursive: true });
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(value));
}
function id() { return crypto.randomUUID(); }
function userFor(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return tokens.get(token) || null;
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });
}
function sanitizeUser(user) { const { password, ...safe } = user; return safe; }
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
  if (resource === 'register' && method === 'POST') {
    const username = input.username || input.email;
    if (!username || !input.password) return json(res, 400, { error: 'Username and password are required' });
    if (store.users.some(u => u.username === username)) return json(res, 409, { error: 'Username already exists' });
    const user = { id: id(), username, email: input.email || username, name: input.name || username, password: input.password, role: input.role || (role === 'citizens' ? 'citizen' : 'department') };
    store.users.push(user); saveStore(); return json(res, 201, { token: createToken(user), user: sanitizeUser(user) });
  }
  if (resource === 'login' && method === 'POST') {
    const username = input.username || input.email;
    const user = store.users.find(u => u.username === username && u.password === input.password);
    if (!user) return json(res, 401, { error: 'Invalid credentials' });
    return json(res, 200, { token: createToken(user), user: sanitizeUser(user) });
  }
  if (resource === 'current-user') return current ? json(res, 200, sanitizeUser(current)) : json(res, 401, { error: 'Sign in required' });
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
  if (resource === 'tasks' || (parts[1] === 'tasks')) return collection(req, res, input, store.tasks, 'tasks', current);
  if (resource === 'notifications' || pathname === '/api/notifications') return collection(req, res, input, store.notifications, 'notifications', current);
  if (resource === 'feedback') { if (method === 'POST') { store.feedback.push({ id: id(), ...input, userId: current?.id, createdAt: new Date().toISOString() }); saveStore(); } return json(res, 200, store.feedback); }
  if (pathname === '/api/locations') { if (method === 'POST') { store.locations.push({ id: id(), ...input }); saveStore(); } return json(res, 200, store.locations); }
  if (resource === 'users') return collection(req, res, input, store.users, 'users', current, true);
  return json(res, 404, { error: 'API route not found' });
}
function createToken(user) { const token = crypto.randomBytes(24).toString('hex'); tokens.set(token, user); return token; }
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
function serveFile(res, pathname) {
  let requested = pathname === '/' ? '/.HTML/PUBLIC.HTML' : pathname;
  // The original pages live in the hidden `.HTML` directory. Keep their
  // short, user-facing URLs working as well as the on-disk paths.
  if (/^\/(ADMIN\.HTML|DEPARTMENT\.HTML|CITIZEN\.HTML)\//.test(requested)) {
    requested = `/.HTML${requested}`;
  }
  let file = path.resolve(frontend, `.${requested}`);
  // PUBLIC.HTML refers to its image assets from the site root.
  if (!fs.existsSync(file) && requested.split('/').filter(Boolean).length === 1) {
    file = path.resolve(frontend, `.HTML/${requested}`);
  }
  if (!file.startsWith(frontend) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(res, 404, { error: 'Not found' });
  const isHtml = path.extname(file).toLowerCase() === '.html';
  const type = isHtml ? 'text/html' : path.extname(file).toLowerCase() === '.js' ? 'application/javascript' : path.extname(file).toLowerCase() === '.json' ? 'application/json' : path.extname(file).toLowerCase() === '.png' ? 'image/png' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
  if (isHtml) {
    const html = fs.readFileSync(file, 'utf8').replace('</head>', '  <link rel="stylesheet" href="/styles/app.css">\n</head>');
    return res.end(html);
  }
  fs.createReadStream(file).pipe(res);
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  try { if (pathname.startsWith('/api/')) await api(req, res, pathname); else serveFile(res, pathname); }
  catch (error) { json(res, 500, { error: error.message }); }
});
server.listen(process.env.PORT || 3000, () => console.log('CivicWatch running at http://localhost:3000'));
