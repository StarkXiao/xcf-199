const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('../config');

const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let useMySQL = config.db.useMySQL;
let pool = null;

let dbData = {
  users: [],
  articles: [],
  activities: [],
  activity_signups: [],
  notices: [],
  points_records: [],
  study_records: [],
  counters: {
    users: 0,
    articles: 0,
    activities: 0,
    activity_signups: 0,
    notices: 0,
    points_records: 0,
    study_records: 0
  }
};

function saveDb() {
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf-8');
}

function loadDb() {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      dbData = JSON.parse(data);
      return true;
    } catch (e) {
      console.error('读取数据库文件失败，使用默认数据', e.message);
    }
  }
  return false;
}

async function initMySQL() {
  try {
    const { host, port, user, password, database } = config.db.mysql;
    const basePool = await mysql.createPool({
      host, port, user, password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    await basePool.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await basePool.end();

    pool = await mysql.createPool(config.db.mysql);
    console.log('MySQL 连接成功');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        real_name VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        branch VARCHAR(200),
        role VARCHAR(20) DEFAULT 'user',
        points INTEGER DEFAULT 0,
        avatar VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        cover_image VARCHAR(500),
        author VARCHAR(100),
        status VARCHAR(20) DEFAULT 'published',
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        cover_image VARCHAR(500),
        location VARCHAR(500),
        start_time DATETIME,
        end_time DATETIME,
        signup_deadline DATETIME,
        max_participants INTEGER,
        points_reward INTEGER DEFAULT 10,
        status VARCHAR(20) DEFAULT 'upcoming',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_signups (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        user_id INTEGER NOT NULL,
        activity_id INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        signed_up_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_signup (user_id, activity_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        priority INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS points_records (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        reason VARCHAR(500) NOT NULL,
        type VARCHAR(20) DEFAULT 'earn',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_records (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        user_id INTEGER NOT NULL,
        article_id INTEGER NOT NULL,
        read_duration INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_study (user_id, article_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      await seedMySQL();
    }
    console.log('MySQL 数据库初始化完成');
    return true;
  } catch (e) {
    console.error('MySQL 连接/初始化失败，回退到 JSON 文件数据库：', e.message);
    useMySQL = false;
    pool = null;
    return false;
  }
}

async function seedMySQL() {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const user1Hash = bcrypt.hashSync('user123', 10);
  const user2Hash = bcrypt.hashSync('123456', 10);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  await pool.query(
    `INSERT INTO users (id, username, password, real_name, phone, branch, role, points, avatar, created_at, updated_at) VALUES
     (1, 'admin', ?, '系统管理员', '13800000000', '机关第一党支部', 'admin', 580, 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', ?, ?),
     (2, 'zhangsan', ?, '张三', '13800138001', '第一党支部', 'user', 320, 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan', ?, ?),
     (3, 'lisi', ?, '李四', '13800138002', '第二党支部', 'user', 256, 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi', ?, ?),
     (4, 'wangwu', ?, '王五', '13800138003', '第三党支部', 'user', 410, 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu', ?, ?),
     (5, 'zhaoliu', ?, '赵六', '13800138004', '第一党支部', 'user', 178, 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu', ?, ?)`,
    [adminHash, now, now, user1Hash, now, now, user2Hash, now, now, user2Hash, now, now, user2Hash, now, now]
  );

  await pool.query(`ALTER TABLE users AUTO_INCREMENT = 6`);

  const articleCovers = [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800'
  ];

  const articles = [
    {
      id: 1, title: '深入学习贯彻党的二十大精神',
      content: '党的二十大是在全党全国各族人民迈上全面建设社会主义现代化国家新征程、向第二个百年奋斗目标进军的关键时刻召开的一次十分重要的大会。\n\n大会高举中国特色社会主义伟大旗帜，坚持马克思列宁主义、毛泽东思想、邓小平理论、"三个代表"重要思想、科学发展观，全面贯彻新时代中国特色社会主义思想，分析了国际国内形势，提出了党的二十大主题，回顾总结了过去5年的工作和新时代10年的伟大变革，阐述了开辟马克思主义中国化时代化新境界、中国式现代化的中国特色和本质要求等重大问题。\n\n学习贯彻党的二十大精神，要在全面学习上下功夫。只有全面、系统、深入学习，才能完整、准确、全面领会党的二十大精神，对是什么、干什么、怎么干了然于胸，为贯彻落实打下坚实基础。',
      category: '理论学习', cover: articleCovers[0], author: '党建编辑部', views: 1256
    },
    {
      id: 2, title: '习近平新时代中国特色社会主义思想学习纲要',
      content: '习近平新时代中国特色社会主义思想是当代中国马克思主义、二十一世纪马克思主义，是中华文化和中国精神的时代精华，实现了马克思主义中国化新的飞跃。\n\n党的十九大把习近平新时代中国特色社会主义思想确立为我们党必须长期坚持的指导思想，实现了党的指导思想的又一次与时俱进。',
      category: '理论学习', cover: articleCovers[1], author: '党建编辑部', views: 987
    },
    {
      id: 3, title: '党史学习教育专题：中国共产党的诞生',
      content: '中国共产党诞生于二十世纪二十年代，是近代中国社会及人民革命斗争发展的必然结果。\n\n1921年7月，中国共产党第一次全国代表大会在上海法租界望志路106号（今兴业路76号）开幕。由于会场受到暗探注意和法租界巡捕搜查，最后一天的会议转移到浙江嘉兴南湖的游船上举行。',
      category: '党史学习', cover: articleCovers[2], author: '党史研究室', views: 876
    },
    {
      id: 4, title: '关于开展"我为群众办实事"实践活动的通知',
      content: '为深入贯彻落实党中央关于党史学习教育的部署要求，推动"我为群众办实事"实践活动走深走实，现就有关事项通知如下：\n\n一、提高政治站位，深刻认识开展实践活动的重要意义\n二、聚焦重点任务，切实为群众办实事解难题',
      category: '工作通知', cover: articleCovers[3], author: '党委办公室', views: 543
    },
    {
      id: 5, title: '学习先进典型：优秀共产党员事迹展播',
      content: '在我们身边，有许许多多的优秀共产党员，他们用实际行动诠释着共产党人的初心和使命。\n\n李保国同志：35年如一日，长期奋战在扶贫攻坚和科技创新第一线。\n廖俊波同志：以实际行动践行了对党忠诚、心系群众、忘我工作、无私奉献的优秀品质。',
      category: '先进典型', cover: articleCovers[4], author: '组织部', views: 721
    },
    {
      id: 6, title: '加强党风廉政建设，推进全面从严治党',
      content: '党风廉政建设和反腐败斗争是党的建设的重大任务。党的十八大以来，以习近平同志为核心的党中央以前所未有的勇气和定力推进全面从严治党。',
      category: '廉政建设', cover: articleCovers[5], author: '纪检监察室', views: 654
    }
  ];

  for (const a of articles) {
    await pool.query(
      `INSERT INTO articles (id, title, content, category, cover_image, author, status, views, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
      [a.id, a.title, a.content, a.category, a.cover, a.author, a.views, now, now]
    );
  }
  await pool.query(`ALTER TABLE articles AUTO_INCREMENT = 7`);

  const activityCovers = [
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800'
  ];

  const addDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  };

  const activities = [
    { id: 1, title: '迎"七一"建党节主题党日活动', location: '市党建活动中心', days: 7, deadline: 5, max: 50, reward: 20, status: 'upcoming', cover: activityCovers[0] },
    { id: 2, title: '"我为群众办实事"志愿服务活动', location: '各社区服务点', days: 14, deadline: 10, max: 100, reward: 15, status: 'upcoming', cover: activityCovers[1] },
    { id: 3, title: '党史学习教育专题培训班', location: '市委党校', days: -3, deadline: -5, max: 30, reward: 30, status: 'completed', cover: activityCovers[2] },
    { id: 4, title: '春季植树造林公益活动', location: '生态森林公园', days: 30, deadline: 25, max: 80, reward: 10, status: 'upcoming', cover: activityCovers[3] },
    { id: 5, title: '青年党员读书分享会', location: '市图书馆报告厅', days: 21, deadline: 18, max: 40, reward: 10, status: 'upcoming', cover: activityCovers[4] },
    { id: 6, title: '2024年度党员民主生活会', location: '各党支部活动室', days: -15, deadline: -20, max: 200, reward: 15, status: 'completed', cover: activityCovers[5] }
  ];

  for (const a of activities) {
    await pool.query(
      `INSERT INTO activities (id, title, description, cover_image, location, start_time, end_time, signup_deadline, max_participants, points_reward, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.title, `关于 ${a.title} 的详细描述...`, a.cover, a.location, addDays(a.days), addDays(a.days), addDays(a.deadline), a.max, a.reward, a.status, now, now]
    );
  }
  await pool.query(`ALTER TABLE activities AUTO_INCREMENT = 7`);

  const signups = [
    [1, 2, 1], [2, 3, 1], [3, 4, 2], [4, 2, 3], [5, 4, 3], [6, 2, 6]
  ];
  for (const s of signups) {
    await pool.query(
      `INSERT INTO activity_signups (id, user_id, activity_id, status, signed_up_at) VALUES (?, ?, ?, ?, ?)`,
      [s[0], s[1], s[2], s[0] === 2 ? 'pending' : 'approved', now]
    );
  }
  await pool.query(`ALTER TABLE activity_signups AUTO_INCREMENT = 7`);

  const notices = [
    { id: 1, title: '关于做好2024年度党员民主评议工作的通知', type: '工作通知', priority: 3 },
    { id: 2, title: '关于组织观看红色电影的通知', type: '活动通知', priority: 2 },
    { id: 3, title: '关于开展党风廉政建设专项检查的通知', type: '廉政通知', priority: 3 },
    { id: 4, title: '关于举办"学习强国"学习标兵评选活动的通知', type: '评优通知', priority: 1 },
    { id: 5, title: '关于做好2025年元旦春节期间有关工作的通知', type: '节日通知', priority: 2 },
    { id: 6, title: '关于党支部书记培训班的补充通知', type: '培训通知', priority: 2 }
  ];
  for (const n of notices) {
    await pool.query(
      `INSERT INTO notices (id, title, content, type, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'published', ?, ?)`,
      [n.id, n.title, `${n.title} 详细内容...`, n.type, n.priority, now, now]
    );
  }
  await pool.query(`ALTER TABLE notices AUTO_INCREMENT = 7`);

  const pointRecords = [
    [1, 2, 20, '参加主题党日活动', 'earn'],
    [2, 2, 10, '学习文章获得积分', 'earn'],
    [3, 2, 30, '党史培训结业', 'earn'],
    [4, 2, 15, '参加民主生活会', 'earn'],
    [5, 3, 20, '参加主题党日活动', 'earn'],
    [6, 3, 10, '学习文章获得积分', 'earn'],
    [7, 3, 15, '参加民主生活会', 'earn'],
    [8, 4, 20, '参加主题党日活动', 'earn'],
    [9, 4, 30, '党史培训结业', 'earn'],
    [10, 4, 15, '参加民主生活会', 'earn'],
    [11, 5, 20, '参加主题党日活动', 'earn'],
    [12, 5, 10, '学习文章获得积分', 'earn']
  ];
  for (const r of pointRecords) {
    await pool.query(
      `INSERT INTO points_records (id, user_id, points, reason, type, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [r[0], r[1], r[2], r[3], r[4], now]
    );
  }
  await pool.query(`ALTER TABLE points_records AUTO_INCREMENT = 13`);

  await pool.query(
    `INSERT INTO study_records (id, user_id, article_id, read_duration, completed, created_at) VALUES
     (1, 2, 1, 120, 1, ?),
     (2, 2, 2, 90, 1, ?)`,
    [now, now]
  );
  await pool.query(`ALTER TABLE study_records AUTO_INCREMENT = 3`);
}

function seedJson() {
  const exists = loadDb();
  if (exists && dbData.users && dbData.users.length > 0) {
    console.log('JSON 数据库已存在，跳过初始化');
    return;
  }

  const adminHash = bcrypt.hashSync('admin123', 10);
  const user1Hash = bcrypt.hashSync('user123', 10);
  const user2Hash = bcrypt.hashSync('123456', 10);
  const now = new Date().toISOString();

  dbData.users = [
    { id: 1, username: 'admin', password: adminHash, real_name: '系统管理员', phone: '13800000000', branch: '机关第一党支部', role: 'admin', points: 580, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', created_at: now, updated_at: now },
    { id: 2, username: 'zhangsan', password: user1Hash, real_name: '张三', phone: '13800138001', branch: '第一党支部', role: 'user', points: 320, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan', created_at: now, updated_at: now },
    { id: 3, username: 'lisi', password: user2Hash, real_name: '李四', phone: '13800138002', branch: '第二党支部', role: 'user', points: 256, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi', created_at: now, updated_at: now },
    { id: 4, username: 'wangwu', password: user2Hash, real_name: '王五', phone: '13800138003', branch: '第三党支部', role: 'user', points: 410, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu', created_at: now, updated_at: now },
    { id: 5, username: 'zhaoliu', password: user2Hash, real_name: '赵六', phone: '13800138004', branch: '第一党支部', role: 'user', points: 178, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu', created_at: now, updated_at: now }
  ];
  dbData.counters.users = 5;

  const articleCovers = [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800'
  ];

  dbData.articles = [
    { id: 1, title: '深入学习贯彻党的二十大精神', content: '党的二十大是在全党全国各族人民迈上全面建设社会主义现代化国家新征程、向第二个百年奋斗目标进军的关键时刻召开的一次十分重要的大会。\n\n大会高举中国特色社会主义伟大旗帜，坚持马克思列宁主义、毛泽东思想、邓小平理论、"三个代表"重要思想、科学发展观，全面贯彻新时代中国特色社会主义思想，分析了国际国内形势，提出了党的二十大主题，回顾总结了过去5年的工作和新时代10年的伟大变革，阐述了开辟马克思主义中国化时代化新境界、中国式现代化的中国特色和本质要求等重大问题。\n\n学习贯彻党的二十大精神，要在全面学习上下功夫。只有全面、系统、深入学习，才能完整、准确、全面领会党的二十大精神，对是什么、干什么、怎么干了然于胸，为贯彻落实打下坚实基础。', category: '理论学习', cover_image: articleCovers[0], author: '党建编辑部', status: 'published', views: 1256, created_at: now, updated_at: now },
    { id: 2, title: '习近平新时代中国特色社会主义思想学习纲要', content: '习近平新时代中国特色社会主义思想是当代中国马克思主义、二十一世纪马克思主义，是中华文化和中国精神的时代精华，实现了马克思主义中国化新的飞跃。\n\n党的十九大把习近平新时代中国特色社会主义思想确立为我们党必须长期坚持的指导思想，实现了党的指导思想的又一次与时俱进。', category: '理论学习', cover_image: articleCovers[1], author: '党建编辑部', status: 'published', views: 987, created_at: now, updated_at: now },
    { id: 3, title: '党史学习教育专题：中国共产党的诞生', content: '中国共产党诞生于二十世纪二十年代，是近代中国社会及人民革命斗争发展的必然结果。\n\n1921年7月，中国共产党第一次全国代表大会在上海法租界望志路106号（今兴业路76号）开幕。由于会场受到暗探注意和法租界巡捕搜查，最后一天的会议转移到浙江嘉兴南湖的游船上举行。', category: '党史学习', cover_image: articleCovers[2], author: '党史研究室', status: 'published', views: 876, created_at: now, updated_at: now },
    { id: 4, title: '关于开展"我为群众办实事"实践活动的通知', content: '为深入贯彻落实党中央关于党史学习教育的部署要求，推动"我为群众办实事"实践活动走深走实，现就有关事项通知如下：\n\n一、提高政治站位，深刻认识开展实践活动的重要意义\n二、聚焦重点任务，切实为群众办实事解难题', category: '工作通知', cover_image: articleCovers[3], author: '党委办公室', status: 'published', views: 543, created_at: now, updated_at: now },
    { id: 5, title: '学习先进典型：优秀共产党员事迹展播', content: '在我们身边，有许许多多的优秀共产党员，他们用实际行动诠释着共产党人的初心和使命。\n\n李保国同志：35年如一日，长期奋战在扶贫攻坚和科技创新第一线。\n廖俊波同志：以实际行动践行了对党忠诚、心系群众、忘我工作、无私奉献的优秀品质。', category: '先进典型', cover_image: articleCovers[4], author: '组织部', status: 'published', views: 721, created_at: now, updated_at: now },
    { id: 6, title: '加强党风廉政建设，推进全面从严治党', content: '党风廉政建设和反腐败斗争是党的建设的重大任务。党的十八大以来，以习近平同志为核心的党中央以前所未有的勇气和定力推进全面从严治党。', category: '廉政建设', cover_image: articleCovers[5], author: '纪检监察室', status: 'published', views: 654, created_at: now, updated_at: now }
  ];
  dbData.counters.articles = 6;

  const activityCovers = [
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800'
  ];

  const addDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  dbData.activities = [
    { id: 1, title: '迎"七一"建党节主题党日活动', description: '关于 迎"七一"建党节主题党日活动 的详细描述...', cover_image: activityCovers[0], location: '市党建活动中心', start_time: addDays(7), end_time: addDays(7), signup_deadline: addDays(5), max_participants: 50, points_reward: 20, status: 'upcoming', created_at: now, updated_at: now },
    { id: 2, title: '"我为群众办实事"志愿服务活动', description: '关于 "我为群众办实事"志愿服务活动 的详细描述...', cover_image: activityCovers[1], location: '各社区服务点', start_time: addDays(14), end_time: addDays(14), signup_deadline: addDays(10), max_participants: 100, points_reward: 15, status: 'upcoming', created_at: now, updated_at: now },
    { id: 3, title: '党史学习教育专题培训班', description: '关于 党史学习教育专题培训班 的详细描述...', cover_image: activityCovers[2], location: '市委党校', start_time: addDays(-3), end_time: addDays(-3), signup_deadline: addDays(-5), max_participants: 30, points_reward: 30, status: 'completed', created_at: now, updated_at: now },
    { id: 4, title: '春季植树造林公益活动', description: '关于 春季植树造林公益活动 的详细描述...', cover_image: activityCovers[3], location: '生态森林公园', start_time: addDays(30), end_time: addDays(30), signup_deadline: addDays(25), max_participants: 80, points_reward: 10, status: 'upcoming', created_at: now, updated_at: now },
    { id: 5, title: '青年党员读书分享会', description: '关于 青年党员读书分享会 的详细描述...', cover_image: activityCovers[4], location: '市图书馆报告厅', start_time: addDays(21), end_time: addDays(21), signup_deadline: addDays(18), max_participants: 40, points_reward: 10, status: 'upcoming', created_at: now, updated_at: now },
    { id: 6, title: '2024年度党员民主生活会', description: '关于 2024年度党员民主生活会 的详细描述...', cover_image: activityCovers[5], location: '各党支部活动室', start_time: addDays(-15), end_time: addDays(-15), signup_deadline: addDays(-20), max_participants: 200, points_reward: 15, status: 'completed', created_at: now, updated_at: now }
  ];
  dbData.counters.activities = 6;

  dbData.activity_signups = [
    { id: 1, user_id: 2, activity_id: 1, status: 'approved', signed_up_at: now },
    { id: 2, user_id: 3, activity_id: 1, status: 'pending', signed_up_at: now },
    { id: 3, user_id: 4, activity_id: 2, status: 'approved', signed_up_at: now },
    { id: 4, user_id: 2, activity_id: 3, status: 'approved', signed_up_at: now },
    { id: 5, user_id: 4, activity_id: 3, status: 'approved', signed_up_at: now },
    { id: 6, user_id: 2, activity_id: 6, status: 'approved', signed_up_at: now }
  ];
  dbData.counters.activity_signups = 6;

  dbData.notices = [
    { id: 1, title: '关于做好2024年度党员民主评议工作的通知', content: '关于做好2024年度党员民主评议工作的通知 详细内容...', type: '工作通知', priority: 3, status: 'published', created_at: now, updated_at: now },
    { id: 2, title: '关于组织观看红色电影的通知', content: '关于组织观看红色电影的通知 详细内容...', type: '活动通知', priority: 2, status: 'published', created_at: now, updated_at: now },
    { id: 3, title: '关于开展党风廉政建设专项检查的通知', content: '关于开展党风廉政建设专项检查的通知 详细内容...', type: '廉政通知', priority: 3, status: 'published', created_at: now, updated_at: now },
    { id: 4, title: '关于举办"学习强国"学习标兵评选活动的通知', content: '关于举办"学习强国"学习标兵评选活动的通知 详细内容...', type: '评优通知', priority: 1, status: 'published', created_at: now, updated_at: now },
    { id: 5, title: '关于做好2025年元旦春节期间有关工作的通知', content: '关于做好2025年元旦春节期间有关工作的通知 详细内容...', type: '节日通知', priority: 2, status: 'published', created_at: now, updated_at: now },
    { id: 6, title: '关于党支部书记培训班的补充通知', content: '关于党支部书记培训班的补充通知 详细内容...', type: '培训通知', priority: 2, status: 'published', created_at: now, updated_at: now }
  ];
  dbData.counters.notices = 6;

  dbData.points_records = [
    { id: 1, user_id: 2, points: 20, reason: '参加主题党日活动', type: 'earn', created_at: now },
    { id: 2, user_id: 2, points: 10, reason: '学习文章获得积分', type: 'earn', created_at: now },
    { id: 3, user_id: 2, points: 30, reason: '党史培训结业', type: 'earn', created_at: now },
    { id: 4, user_id: 2, points: 15, reason: '参加民主生活会', type: 'earn', created_at: now },
    { id: 5, user_id: 3, points: 20, reason: '参加主题党日活动', type: 'earn', created_at: now },
    { id: 6, user_id: 3, points: 10, reason: '学习文章获得积分', type: 'earn', created_at: now },
    { id: 7, user_id: 3, points: 15, reason: '参加民主生活会', type: 'earn', created_at: now },
    { id: 8, user_id: 4, points: 20, reason: '参加主题党日活动', type: 'earn', created_at: now },
    { id: 9, user_id: 4, points: 30, reason: '党史培训结业', type: 'earn', created_at: now },
    { id: 10, user_id: 4, points: 15, reason: '参加民主生活会', type: 'earn', created_at: now },
    { id: 11, user_id: 5, points: 20, reason: '参加主题党日活动', type: 'earn', created_at: now },
    { id: 12, user_id: 5, points: 10, reason: '学习文章获得积分', type: 'earn', created_at: now }
  ];
  dbData.counters.points_records = 12;

  dbData.study_records = [
    { id: 1, user_id: 2, article_id: 1, read_duration: 120, completed: 1, created_at: now },
    { id: 2, user_id: 2, article_id: 2, read_duration: 90, completed: 1, created_at: now }
  ];
  dbData.counters.study_records = 2;

  saveDb();
  console.log('JSON 数据库初始化完成！');
}

async function initDatabase() {
  if (useMySQL) {
    const ok = await initMySQL();
    if (ok) return;
  }
  seedJson();
}

function getNextId(table) {
  dbData.counters[table] = (dbData.counters[table] || 0) + 1;
  return dbData.counters[table];
}

async function getAll(table) {
  if (useMySQL) {
    const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
    return rows;
  }
  return [...dbData[table]];
}

async function getById(table, id) {
  if (useMySQL) {
    const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
    return rows[0] || null;
  }
  return dbData[table].find(item => item.id === id) || null;
}

async function findOne(table, predicate, sql, sqlParams) {
  if (useMySQL) {
    const [rows] = await pool.query(sql, sqlParams);
    return rows[0] || null;
  }
  return dbData[table].find(predicate) || null;
}

async function findMany(table, predicate, sql, sqlParams) {
  if (useMySQL) {
    const [rows] = await pool.query(sql, sqlParams);
    return rows;
  }
  return dbData[table].filter(predicate);
}

async function insert(table, data, sql, sqlParams) {
  if (useMySQL) {
    const [result] = await pool.query(sql, sqlParams);
    return await getById(table, result.insertId);
  }
  const id = getNextId(table);
  const now = new Date().toISOString();
  const record = {
    ...data,
    id,
    created_at: data.created_at || now,
    updated_at: data.updated_at || now
  };
  dbData[table].push(record);
  saveDb();
  return record;
}

async function update(table, id, data, sql, sqlParams) {
  if (useMySQL) {
    if (sql && sqlParams) {
      await pool.query(sql, [...sqlParams, id]);
    }
    return await getById(table, id);
  }
  const idx = dbData[table].findIndex(item => item.id === id);
  if (idx === -1) return null;
  dbData[table][idx] = {
    ...dbData[table][idx],
    ...data,
    id,
    updated_at: new Date().toISOString()
  };
  saveDb();
  return dbData[table][idx];
}

async function remove(table, id, sql) {
  if (useMySQL) {
    await pool.query(sql || `DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    return true;
  }
  const idx = dbData[table].findIndex(item => item.id === id);
  if (idx === -1) return false;
  dbData[table].splice(idx, 1);
  saveDb();
  return true;
}

async function count(table, predicate, sql, sqlParams) {
  if (useMySQL) {
    const [rows] = await pool.query(sql || `SELECT COUNT(*) as c FROM \`${table}\``, sqlParams || []);
    return rows[0].c || rows[0].count || 0;
  }
  if (!predicate) return dbData[table].length;
  return dbData[table].filter(predicate).length;
}

async function exec(sql, params) {
  if (useMySQL) {
    const [rows] = await pool.query(sql, params || []);
    return rows;
  }
  return [];
}

async function paginate(table, opts) {
  let { page = 1, page_size = 10, predicate, sortBy, sortOrder = 'desc', sql, sqlParams, countSql, countParams } = opts;

  if (useMySQL) {
    let total = 0;
    if (countSql) {
      const [rows] = await pool.query(countSql, countParams || []);
      total = rows[0].c || rows[0].count || 0;
    }
    let orderBy = '';
    if (sortBy) {
      orderBy = ` ORDER BY \`${sortBy}\` ${sortOrder.toUpperCase()}`;
    }
    const finalSql = `${sql}${orderBy} LIMIT ${(page - 1) * page_size}, ${page_size}`;
    const [list] = await pool.query(finalSql, sqlParams || []);
    return { list, total, page, page_size };
  }

  let list = [...dbData[table]];
  if (predicate) {
    list = list.filter(predicate);
  }
  if (sortBy) {
    list.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
  }
  const total = list.length;
  const start = (page - 1) * page_size;
  const end = start + page_size;
  const items = list.slice(start, end);
  return { list: items, total, page, page_size };
}

module.exports = {
  initDatabase,
  getAll,
  getById,
  findOne,
  findMany,
  insert,
  update,
  remove,
  count,
  paginate,
  exec,
  get useMySQL() { return useMySQL; }
};
