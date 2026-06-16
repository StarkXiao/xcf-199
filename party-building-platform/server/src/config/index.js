require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'party-building-platform-secret-key',
  jwtExpiresIn: '7d',
  pageSize: 10,
  db: {
    useMySQL: process.env.DB_TYPE !== 'json',
    strictMySQL: process.env.DB_TYPE === 'mysql',
    mysql: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'party_building',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }
  }
};
