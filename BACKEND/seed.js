const mysql = require('mysql2');
const crypto = require('crypto');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  multipleStatements: true
});

const promisePool = pool.promise();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function uuid() {
  return crypto.randomUUID();
}

async function seedDatabase() {
  try {
    console.log('Reading schema...');
    const fs = require('fs');
    const schema = fs.readFileSync('./BACKEND/schema.sql', 'utf8');

    console.log('Creating database and tables...');
    await promisePool.query(schema);
    console.log('Database schema created successfully.');

    console.log('Connecting to civic_watch database...');
    const civicPool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'civic_watch',
      multipleStatements: true
    });
    const civicPromisePool = civicPool.promise();

    console.log('Seeding users...');
    const users = [
      {
        id: uuid(),
        username: 'admin',
        email: 'admin@civicwatch.local',
        name: 'Elizabeth Macharia',
        password_hash: hashPassword('admin123'),
        role: 'admin',
        phone: '+254712345678'
      },
      {
        id: uuid(),
        username: 'publicworks',
        email: 'publicworks@civicwatch.local',
        name: 'James Omondi',
        password_hash: hashPassword('dept123'),
        role: 'department',
        phone: '+254723456789'
      },
      {
        id: uuid(),
        username: 'citizen1',
        email: 'citizen1@example.com',
        name: 'Mary Wanjiku',
        password_hash: hashPassword('citizen123'),
        role: 'citizen',
        phone: '+254734567890'
      },
      {
        id: uuid(),
        username: 'citizen2',
        email: 'citizen2@example.com',
        name: 'David Kamau',
        password_hash: hashPassword('citizen123'),
        role: 'citizen',
        phone: '+254745678901'
      }
    ];

    for (const user of users) {
      await civicPromisePool.query(
        'INSERT INTO users (id, username, email, name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=username',
        [user.id, user.username, user.email, user.name, user.password_hash, user.role, user.phone]
      );
    }
    console.log(`Seeded ${users.length} users.`);

    console.log('Seeding departments...');
    const departments = [
      {
        id: uuid(),
        name: 'Nairobi City Public Works',
        description: 'Roads, lighting and sanitation services'
      },
      {
        id: uuid(),
        name: 'County Health Department',
        description: 'Public health and sanitation inspections'
      },
      {
        id: uuid(),
        name: 'Nairobi Water & Sewerage Company',
        description: 'Water supply and sewerage management'
      },
      {
        id: uuid(),
        name: 'Nairobi Metropolitan Services',
        description: 'City planning and zoning regulations'
      }
    ];

    for (const dept of departments) {
      await civicPromisePool.query(
        'INSERT INTO departments (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=name',
        [dept.id, dept.name, dept.description]
      );
    }
    console.log(`Seeded ${departments.length} departments.`);

    console.log('Seeding sample reports...');
    const [deptRows] = await civicPromisePool.query('SELECT id FROM departments LIMIT 2');
    const [userRows] = await civicPromisePool.query('SELECT id FROM users WHERE role="citizen" LIMIT 2');

    if (deptRows.length > 0 && userRows.length > 0) {
      const reports = [
        {
          id: uuid(),
          title: 'Broken Street Light at Kenyatta Avenue',
          description: 'Street light at Kenyatta Avenue junction has been non-functional for 3 days',
          user_id: userRows[0].id,
          department_id: deptRows[0].id,
          status: 'Pending',
          location: 'Kenyatta Avenue Junction'
        },
        {
          id: uuid(),
          title: 'Illegal Dumping near Uhuru Park',
          description: 'Large pile of garbage dumped near Uhuru Park entrance',
          user_id: userRows[1].id,
          department_id: deptRows[0].id,
          status: 'In Progress',
          location: 'Uhuru Park Area'
        },
        {
          id: uuid(),
          title: 'Pothole on Thika Road',
          description: 'Deep pothole causing traffic hazards on Thika Road near Garden City Mall',
          user_id: userRows[0].id,
          department_id: deptRows[0].id,
          status: 'Resolved',
          location: 'Thika Road, Garden City'
        }
      ];

      for (const report of reports) {
        await civicPromisePool.query(
          'INSERT INTO reports (id, title, description, user_id, department_id, status, location) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=title',
          [report.id, report.title, report.description, report.user_id, report.department_id, report.status, report.location]
        );
      }
      console.log(`Seeded ${reports.length} reports.`);
    }

    console.log('Seeding notifications...');
    const [allUsers] = await civicPromisePool.query('SELECT id FROM users');
    const notifications = [
      {
        id: uuid(),
        message: 'Welcome to CivicWatch! Report issues in your community.',
        user_id: allUsers[0]?.id
      },
      {
        id: uuid(),
        message: 'Your report has been received and is being processed.',
        user_id: allUsers[1]?.id
      }
    ];

    for (const notif of notifications) {
      if (notif.user_id) {
        await civicPromisePool.query(
          'INSERT INTO notifications (id, message, user_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE message=message',
          [notif.id, notif.message, notif.user_id]
        );
      }
    }
    console.log(`Seeded ${notifications.length} notifications.`);

    console.log('Seeding content pages...');
    const content = [
      {
        id: uuid(),
        title: 'About Us',
        body: 'CivicWatch is a community-driven platform for reporting and tracking civic issues.',
        slug: 'about'
      },
      {
        id: uuid(),
        title: 'How It Works',
        body: 'Submit reports, track progress, and help improve your community.',
        slug: 'how-it-works'
      }
    ];

    for (const page of content) {
      await civicPromisePool.query(
        'INSERT INTO content (id, title, body, slug) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=title',
        [page.id, page.title, page.body, page.slug]
      );
    }
    console.log(`Seeded ${content.length} content pages.`);

    console.log('Seeding locations...');
    const locations = [
      {
        id: uuid(),
        name: 'Nairobi CBD',
        address: 'Kenyatta Avenue, Nairobi Central',
        latitude: -1.286389,
        longitude: 36.817223
      },
      {
        id: uuid(),
        name: 'Uhuru Park',
        address: 'Uhuru Highway, Nairobi',
        latitude: -1.290000,
        longitude: 36.820000
      }
    ];

    for (const loc of locations) {
      await civicPromisePool.query(
        'INSERT INTO locations (id, name, address, latitude, longitude) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=name',
        [loc.id, loc.name, loc.address, loc.latitude, loc.longitude]
      );
    }
    console.log(`Seeded ${locations.length} locations.`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDefault credentials:');
    console.log('  Admin: username=admin, password=admin123');
    console.log('  Department: username=publicworks, password=dept123');
    console.log('  Citizen: username=citizen1, password=citizen123');

    await civicPool.end();
    await pool.end();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
