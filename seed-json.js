const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, 'data');
const storeFile = path.join(dataDir, 'store.json');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function uuid() {
  return crypto.randomUUID();
}

const initialStore = {
  users: [
    {
      id: 'admin',
      username: 'admin',
      email: 'admin@civicwatch.local',
      name: 'Elizabeth Macharia',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      phone: '+254712345678'
    },
    {
      id: 'department',
      username: 'publicworks',
      email: 'publicworks@civicwatch.local',
      name: 'James Omondi',
      passwordHash: hashPassword('dept123'),
      role: 'department',
      phone: '+254723456789'
    },
    {
      id: uuid(),
      username: 'citizen1',
      email: 'citizen1@example.com',
      name: 'Mary Wanjiku',
      passwordHash: hashPassword('citizen123'),
      role: 'citizen',
      phone: '+254734567890'
    },
    {
      id: uuid(),
      username: 'citizen2',
      email: 'citizen2@example.com',
      name: 'David Kamau',
      passwordHash: hashPassword('citizen123'),
      role: 'citizen',
      phone: '+254745678901'
    }
  ],
  reports: [],
  tasks: [],
  departments: [
    { id: 'public-works', name: 'Nairobi City Public Works', description: 'Roads, lighting and sanitation services' },
    { id: 'health', name: 'County Health Department', description: 'Public health and sanitation inspections' },
    { id: 'water', name: 'Nairobi Water & Sewerage Company', description: 'Water supply and sewerage management' },
    { id: 'planning', name: 'Nairobi Metropolitan Services', description: 'City planning and zoning regulations' }
  ],
  notifications: [],
  content: [],
  feedback: [],
  locations: []
};

// Create data directory if it doesn't exist
fs.mkdirSync(dataDir, { recursive: true });

// Write the store file
fs.writeFileSync(storeFile, JSON.stringify(initialStore, null, 2));

console.log('JSON store seeded successfully!');
console.log('\nDefault credentials:');
console.log('  Admin: username=admin, password=admin123');
console.log('  Department: username=publicworks, password=dept123');
console.log('  Citizen: username=citizen1, password=citizen123');
