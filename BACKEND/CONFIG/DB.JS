const mysql = require('mysql2');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'civic_watch',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
const promisePool = pool.promise();
promisePool.getConnection()
  .then(conn => {
    console.log('Connected to XAMPP MySQL');
    conn.release();
  })
  .catch(err => {
    console.error('DB connection failed:', err.message);
  });
module.exports = promisePool;
