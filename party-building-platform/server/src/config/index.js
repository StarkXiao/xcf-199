module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'party-building-platform-secret-key',
  jwtExpiresIn: '7d',
  pageSize: 10
};
