const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const db = require('./database');
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const activityRoutes = require('./routes/activities');
const pointsRoutes = require('./routes/points');
const noticeRoutes = require('./routes/notices');
const adminRoutes = require('./routes/admin');
const partyDevelopmentRoutes = require('./routes/partyDevelopment');
const volunteerServiceRoutes = require('./routes/volunteerService');
const branchMeetingRoutes = require('./routes/branchMeetings');
const partyTransferRoutes = require('./routes/partyTransfer');
const democraticReviewRoutes = require('./routes/democraticReview');

const app = express();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const materialsDir = path.join(uploadDir, 'materials');
if (!fs.existsSync(materialsDir)) {
  fs.mkdirSync(materialsDir, { recursive: true });
}

app.set('materialsDir', materialsDir);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务器运行正常', data: { timestamp: new Date().toISOString() } });
});

app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/party-development', partyDevelopmentRoutes);
app.use('/api/volunteer-service', volunteerServiceRoutes);
app.use('/api/branch-meetings', branchMeetingRoutes);
app.use('/api/party-transfer', partyTransferRoutes);
app.use('/api/democratic-review', democraticReviewRoutes);

app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
});

async function start() {
  try {
    await db.initDatabase();
  } catch (e) {
    console.error('数据库初始化异常：', e.message);
  }

  app.listen(config.port, () => {
    const dbMode = db.useMySQL ? 'MySQL' : 'JSON 文件';
    console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   党建平台后端服务已启动                                  ║
  ║                                                          ║
  ║   服务地址: http://localhost:${config.port}                       ║
  ║   API 前缀: /api                                         ║
  ║   数据库: ${dbMode}                                      ║
  ║                                                          ║
  ║   默认管理员账号: admin / admin123                       ║
  ║   默认普通用户账号: zhangsan / user123                   ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
  });
}

start();
