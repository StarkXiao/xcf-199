const db = require('./index');
const bcrypt = require('bcryptjs');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      real_name TEXT NOT NULL,
      phone TEXT,
      branch TEXT,
      role TEXT DEFAULT 'user',
      points INTEGER DEFAULT 0,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      cover_image TEXT,
      author TEXT,
      status TEXT DEFAULT 'published',
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      cover_image TEXT,
      location TEXT,
      start_time DATETIME,
      end_time DATETIME,
      signup_deadline DATETIME,
      max_participants INTEGER,
      points_reward INTEGER DEFAULT 10,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      signed_up_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      UNIQUE(user_id, activity_id)
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      priority INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS points_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT NOT NULL,
      type TEXT DEFAULT 'earn',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      read_duration INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(user_id, article_id)
    );

    CREATE TABLE IF NOT EXISTS party_development (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      current_stage TEXT DEFAULT 'application',
      overall_status TEXT DEFAULT 'in_progress',
      application_date DATETIME,
      activist_date DATETIME,
      candidate_date DATETIME,
      probationary_date DATETIME,
      probation_start_date DATETIME,
      probation_end_date DATETIME,
      formal_date DATETIME,
      branch_secretary TEXT,
      introducer1 TEXT,
      introducer2 TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS party_development_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      development_id INTEGER NOT NULL,
      stage_code TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      start_date DATETIME,
      end_date DATETIME,
      deadline_date DATETIME,
      description TEXT,
      reviewer TEXT,
      review_opinion TEXT,
      review_date DATETIME,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (development_id) REFERENCES party_development(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS party_development_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      development_id INTEGER NOT NULL,
      stage_code TEXT,
      material_name TEXT NOT NULL,
      material_type TEXT,
      file_url TEXT,
      file_size INTEGER,
      uploaded_by INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (development_id) REFERENCES party_development(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS party_development_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      development_id INTEGER NOT NULL,
      stage_code TEXT,
      action_type TEXT NOT NULL,
      action_detail TEXT,
      operator_id INTEGER,
      operator_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (development_id) REFERENCES party_development(id) ON DELETE CASCADE,
      FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS volunteer_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      cover_image TEXT,
      category TEXT,
      location TEXT,
      start_time DATETIME,
      end_time DATETIME,
      signup_deadline DATETIME,
      max_participants INTEGER,
      points_per_hour INTEGER DEFAULT 5,
      service_hours INTEGER DEFAULT 0,
      organizer TEXT,
      contact_person TEXT,
      contact_phone TEXT,
      status TEXT DEFAULT 'recruiting',
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS volunteer_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      apply_reason TEXT,
      skills TEXT,
      reviewed_by INTEGER,
      review_opinion TEXT,
      reviewed_at DATETIME,
      signed_up_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES volunteer_projects(id) ON DELETE CASCADE,
      UNIQUE(user_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS volunteer_service_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signup_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      service_date DATE,
      start_time DATETIME,
      end_time DATETIME,
      actual_hours DECIMAL(4,1) DEFAULT 0,
      task_description TEXT,
      recorded_by INTEGER,
      points_awarded INTEGER DEFAULT 0,
      status TEXT DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (signup_id) REFERENCES volunteer_signups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES volunteer_projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS volunteer_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      rating INTEGER DEFAULT 5,
      content TEXT,
      is_anonymous INTEGER DEFAULT 0,
      reply_content TEXT,
      reply_by INTEGER,
      reply_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES volunteer_projects(id) ON DELETE CASCADE,
      UNIQUE(user_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS branch_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      branch TEXT NOT NULL,
      meeting_type TEXT NOT NULL,
      location TEXT,
      meeting_time DATETIME NOT NULL,
      end_time DATETIME,
      status TEXT DEFAULT 'notified',
      notification_content TEXT,
      minutes_content TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS branch_meeting_agendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      discussion_result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES branch_meetings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS branch_meeting_attendees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      is_required INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES branch_meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(meeting_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS branch_meeting_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      checkin_type TEXT DEFAULT 'onsite',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES branch_meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(meeting_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS branch_meeting_resolutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      agenda_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      result TEXT DEFAULT 'pending',
      vote_for INTEGER DEFAULT 0,
      vote_against INTEGER DEFAULT 0,
      vote_abstain INTEGER DEFAULT 0,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES branch_meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (agenda_id) REFERENCES branch_meeting_agendas(id) ON DELETE SET NULL
    );
  `);

  const adminHash = bcrypt.hashSync('admin123', 10);
  const user1Hash = bcrypt.hashSync('user123', 10);
  const user2Hash = bcrypt.hashSync('123456', 10);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, real_name, phone, branch, role, points, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('admin', adminHash, '系统管理员', '13800000000', '机关第一党支部', 'admin', 580, 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin');
  insertUser.run('zhangsan', user1Hash, '张三', '13800138001', '第一党支部', 'user', 320, 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan');
  insertUser.run('lisi', user2Hash, '李四', '13800138002', '第二党支部', 'user', 256, 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi');
  insertUser.run('wangwu', user2Hash, '王五', '13800138003', '第三党支部', 'user', 410, 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu');
  insertUser.run('zhaoliu', user2Hash, '赵六', '13800138004', '第一党支部', 'user', 178, 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu');

  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles (title, content, category, cover_image, author, status, views)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const articleContents = [
    {
      title: '深入学习贯彻党的二十大精神',
      content: `党的二十大是在全党全国各族人民迈上全面建设社会主义现代化国家新征程、向第二个百年奋斗目标进军的关键时刻召开的一次十分重要的大会。\n\n大会高举中国特色社会主义伟大旗帜，坚持马克思列宁主义、毛泽东思想、邓小平理论、"三个代表"重要思想、科学发展观，全面贯彻新时代中国特色社会主义思想，分析了国际国内形势，提出了党的二十大主题，回顾总结了过去5年的工作和新时代10年的伟大变革，阐述了开辟马克思主义中国化时代化新境界、中国式现代化的中国特色和本质要求等重大问题。\n\n学习贯彻党的二十大精神，要在全面学习上下功夫。只有全面、系统、深入学习，才能完整、准确、全面领会党的二十大精神，对是什么、干什么、怎么干了然于胸，为贯彻落实打下坚实基础。`,
      category: '理论学习',
      cover: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800',
      author: '党建编辑部',
      views: 1256
    },
    {
      title: '习近平新时代中国特色社会主义思想学习纲要',
      content: `习近平新时代中国特色社会主义思想是当代中国马克思主义、二十一世纪马克思主义，是中华文化和中国精神的时代精华，实现了马克思主义中国化新的飞跃。\n\n党的十九大把习近平新时代中国特色社会主义思想确立为我们党必须长期坚持的指导思想，实现了党的指导思想的又一次与时俱进。\n\n这一思想，是对马克思列宁主义、毛泽东思想、邓小平理论、"三个代表"重要思想、科学发展观的继承和发展，是马克思主义中国化最新成果，是党和人民实践经验和集体智慧的结晶，是中国特色社会主义理论体系的重要组成部分，是全党全国人民为实现中华民族伟大复兴而奋斗的行动指南。`,
      category: '理论学习',
      cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      author: '党建编辑部',
      views: 987
    },
    {
      title: '党史学习教育专题：中国共产党的诞生',
      content: `中国共产党诞生于二十世纪二十年代，是近代中国社会及人民革命斗争发展的必然结果。\n\n1921年7月，中国共产党第一次全国代表大会在上海法租界望志路106号（今兴业路76号）开幕。由于会场受到暗探注意和法租界巡捕搜查，最后一天的会议转移到浙江嘉兴南湖的游船上举行。\n\n党的一大确定党的名称为"中国共产党"。大会通过了中国共产党第一个纲领，明确"革命军队必须与无产阶级一起推翻资本家阶级的政权"，"承认无产阶级专政，直到阶级斗争结束"，"消灭资本家私有制"，以及联合第三国际。\n\n中国共产党的成立，是中华民族发展史上开天辟地的大事变，具有伟大而深远的意义。`,
      category: '党史学习',
      cover: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
      author: '党史研究室',
      views: 876
    },
    {
      title: '关于开展"我为群众办实事"实践活动的通知',
      content: `为深入贯彻落实党中央关于党史学习教育的部署要求，推动"我为群众办实事"实践活动走深走实，现就有关事项通知如下：\n\n一、提高政治站位，深刻认识开展实践活动的重要意义\n\n二、聚焦重点任务，切实为群众办实事解难题\n1. 巩固拓展脱贫攻坚成果，全面推进乡村振兴\n2. 保障基本民生需求，补齐民生短板\n3. 深化政务服务改革，优化营商环境\n4. 推进基层治理体系和治理能力现代化\n\n三、加强组织领导，确保实践活动取得实效\n\n各单位要高度重视，精心组织，把"我为群众办实事"实践活动作为党史学习教育的重要内容，切实抓紧抓好抓出成效。`,
      category: '工作通知',
      cover: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      author: '党委办公室',
      views: 543
    },
    {
      title: '学习先进典型：优秀共产党员事迹展播',
      content: `在我们身边，有许许多多的优秀共产党员，他们用实际行动诠释着共产党人的初心和使命。今天，让我们一起学习他们的先进事迹。\n\n**李保国同志**：35年如一日，长期奋战在扶贫攻坚和科技创新第一线，把毕生精力投入到山区生态建设和科技富民事业之中。\n\n**廖俊波同志**：以实际行动践行了对党忠诚、心系群众、忘我工作、无私奉献的优秀品质，用生命诠释了一名共产党员的使命担当。\n\n**黄文秀同志**：放弃大城市的工作机会，毅然回到家乡，在脱贫攻坚第一线倾情投入、奉献自我，用美好青春诠释了共产党人的初心使命。\n\n他们的先进事迹和崇高精神，感人至深、催人奋进，是广大党员干部学习的榜样。`,
      category: '先进典型',
      cover: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
      author: '组织部',
      views: 721
    },
    {
      title: '加强党风廉政建设，推进全面从严治党',
      content: `党风廉政建设和反腐败斗争是党的建设的重大任务。党的十八大以来，以习近平同志为核心的党中央以前所未有的勇气和定力推进全面从严治党，推动新时代全面从严治党取得了历史性、开创性成就，产生了全方位、深层次影响。\n\n加强党风廉政建设，要坚持以下几点：\n\n一、加强思想教育，筑牢拒腐防变思想防线\n二、强化制度建设，把权力关进制度的笼子\n三、严肃监督执纪，保持惩治腐败高压态势\n四、加强作风建设，持续纠治"四风"问题\n\n全面从严治党永远在路上。我们要持之以恒正风肃纪，以零容忍态度惩治腐败，不断增强党自我净化、自我完善、自我革新、自我提高的能力。`,
      category: '廉政建设',
      cover: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800',
      author: '纪检监察室',
      views: 654
    }
  ];

  articleContents.forEach((article, index) => {
    insertArticle.run(article.title, article.content, article.category, article.cover, article.author, 'published', article.views);
  });

  const insertActivity = db.prepare(`
    INSERT OR IGNORE INTO activities (title, description, cover_image, location, start_time, end_time, signup_deadline, max_participants, points_reward, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  };

  const activities = [
    {
      title: '迎"七一"建党节主题党日活动',
      description: '为庆祝中国共产党成立103周年，进一步增强党组织的凝聚力和战斗力，特开展迎"七一"主题党日活动。活动内容包括：重温入党誓词、参观红色教育基地、开展党史知识竞赛等。',
      cover: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
      location: '市党建活动中心',
      start_time: addDays(now, 7),
      end_time: addDays(now, 7),
      signup_deadline: addDays(now, 5),
      max_participants: 50,
      points_reward: 20,
      status: 'upcoming'
    },
    {
      title: '"我为群众办实事"志愿服务活动',
      description: '组织党员志愿者深入社区、深入群众，开展形式多样的志愿服务活动，包括政策咨询、法律援助、健康义诊、义务劳动等，切实为群众办实事、解难题。',
      cover: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
      location: '各社区服务点',
      start_time: addDays(now, 14),
      end_time: addDays(now, 14),
      signup_deadline: addDays(now, 10),
      max_participants: 100,
      points_reward: 15,
      status: 'upcoming'
    },
    {
      title: '党史学习教育专题培训班',
      description: '通过专题授课、现场教学、交流研讨等形式，深入学习党的历史，从党的百年奋斗历程中汲取继续前进的智慧和力量。培训合格者颁发结业证书。',
      cover: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
      location: '市委党校',
      start_time: addDays(now, -3),
      end_time: addDays(now, -1),
      signup_deadline: addDays(now, -5),
      max_participants: 30,
      points_reward: 30,
      status: 'completed'
    },
    {
      title: '春季植树造林公益活动',
      description: '践行"绿水青山就是金山银山"理念，组织党员干部开展春季植树造林活动，为建设美丽家园贡献力量。活动现场提供树苗和工具。',
      cover: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
      location: '生态森林公园',
      start_time: addDays(now, 30),
      end_time: addDays(now, 30),
      signup_deadline: addDays(now, 25),
      max_participants: 80,
      points_reward: 10,
      status: 'upcoming'
    },
    {
      title: '青年党员读书分享会',
      description: '为激发青年党员读书学习热情，搭建交流分享平台，特举办青年党员读书分享会。本期主题：《习近平与大学生朋友们》学习心得分享。',
      cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      location: '市图书馆报告厅',
      start_time: addDays(now, 21),
      end_time: addDays(now, 21),
      signup_deadline: addDays(now, 18),
      max_participants: 40,
      points_reward: 10,
      status: 'upcoming'
    },
    {
      title: '2024年度党员民主生活会',
      description: '按照党章要求和上级党组织部署，召开2024年度党员民主生活会，开展批评与自我批评，加强党性锻炼，提高党员素质。',
      cover: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      location: '各党支部活动室',
      start_time: addDays(now, -15),
      end_time: addDays(now, -15),
      signup_deadline: addDays(now, -20),
      max_participants: 200,
      points_reward: 15,
      status: 'completed'
    }
  ];

  activities.forEach(activity => {
    insertActivity.run(
      activity.title,
      activity.description,
      activity.cover,
      activity.location,
      activity.start_time,
      activity.end_time,
      activity.signup_deadline,
      activity.max_participants,
      activity.points_reward,
      activity.status
    );
  });

  const insertNotice = db.prepare(`
    INSERT OR IGNORE INTO notices (title, content, type, priority, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const notices = [
    {
      title: '关于做好2024年度党员民主评议工作的通知',
      content: '各党支部：根据《中国共产党章程》和上级党组织有关要求，现就做好2024年度党员民主评议工作通知如下：一、评议时间：2024年12月15日-31日；二、评议内容：党员的思想政治、学习情况、工作表现、组织纪律、先锋模范作用等；三、评议程序：学习教育、自我评价、民主评议、组织鉴定、表彰处理。',
      type: '工作通知',
      priority: 3,
      status: 'published'
    },
    {
      title: '关于组织观看红色电影的通知',
      content: '为进一步深化党史学习教育，丰富党员精神文化生活，定于本周五（12月20日）下午2:30在机关一楼大会议室播放红色电影《长津湖》。请各党支部组织党员准时观看。',
      type: '活动通知',
      priority: 2,
      status: 'published'
    },
    {
      title: '关于开展党风廉政建设专项检查的通知',
      content: '为深入推进全面从严治党，加强党风廉政建设，经研究决定，在全系统开展党风廉政建设专项检查。检查时间：2024年12月25日-31日；检查内容：落实党风廉政建设责任制、中央八项规定精神执行情况等。请各单位做好自查自纠工作。',
      type: '廉政通知',
      priority: 3,
      status: 'published'
    },
    {
      title: '关于举办"学习强国"学习标兵评选活动的通知',
      content: '为充分调动广大党员使用"学习强国"学习平台的积极性和主动性，营造"比学赶超"的浓厚学习氛围，决定在全系统开展"学习强国"学习标兵评选活动。评选标准：以平台积分为主要依据，结合学习活跃度等。请各党支部积极推荐。',
      type: '评优通知',
      priority: 1,
      status: 'published'
    },
    {
      title: '关于做好2025年元旦春节期间有关工作的通知',
      content: '各党支部：2025年元旦、春节将至，现就做好节日期间有关工作通知如下：一、严格落实中央八项规定精神，坚决杜绝"节日腐败"；二、做好节日期间值班值守工作；三、关心关爱困难党员和群众；四、抓好安全生产和应急管理工作。',
      type: '节日通知',
      priority: 2,
      status: 'published'
    },
    {
      title: '关于党支部书记培训班的补充通知',
      content: '原定于12月20日举办的党支部书记培训班，因工作安排调整，时间改为12月26日-27日，地点不变。请各党支部书记提前安排好工作，准时参加培训。',
      type: '培训通知',
      priority: 2,
      status: 'published'
    }
  ];

  notices.forEach(notice => {
    insertNotice.run(notice.title, notice.content, notice.type, notice.priority, notice.status);
  });

  const insertPointsRecord = db.prepare(`
    INSERT OR IGNORE INTO points_records (user_id, points, reason, type)
    VALUES (?, ?, ?, ?)
  `);

  const pointRecords = [
    { userId: 2, points: 20, reason: '参加主题党日活动', type: 'earn' },
    { userId: 2, points: 10, reason: '学习文章获得积分', type: 'earn' },
    { userId: 2, points: 30, reason: '党史培训结业', type: 'earn' },
    { userId: 2, points: 15, reason: '参加民主生活会', type: 'earn' },
    { userId: 3, points: 20, reason: '参加主题党日活动', type: 'earn' },
    { userId: 3, points: 10, reason: '学习文章获得积分', type: 'earn' },
    { userId: 3, points: 15, reason: '参加民主生活会', type: 'earn' },
    { userId: 4, points: 20, reason: '参加主题党日活动', type: 'earn' },
    { userId: 4, points: 30, reason: '党史培训结业', type: 'earn' },
    { userId: 4, points: 15, reason: '参加民主生活会', type: 'earn' },
    { userId: 5, points: 20, reason: '参加主题党日活动', type: 'earn' },
    { userId: 5, points: 10, reason: '学习文章获得积分', type: 'earn' }
  ];

  pointRecords.forEach(record => {
    insertPointsRecord.run(record.userId, record.points, record.reason, record.type);
  });

  const insertVolunteerProject = db.prepare(`
    INSERT OR IGNORE INTO volunteer_projects (title, description, cover_image, category, location, start_time, end_time, signup_deadline, max_participants, points_per_hour, service_hours, organizer, contact_person, contact_phone, status, views)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const volunteerProjects = [
    {
      title: '社区环境清洁志愿服务',
      description: '组织志愿者深入社区开展环境清洁活动，清理公共区域垃圾，美化社区环境，倡导文明新风尚。活动内容包括：街道清扫、绿化带清理、小广告清除等。',
      cover: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
      category: '环境保护',
      location: '阳光社区各小区',
      start_time: addDays(now, 5),
      end_time: addDays(now, 5),
      signup_deadline: addDays(now, 3),
      max_participants: 30,
      points_per_hour: 5,
      service_hours: 4,
      organizer: '志愿者协会',
      contact_person: '王老师',
      contact_phone: '13800000001',
      status: 'recruiting',
      views: 156
    },
    {
      title: '关爱老人暖心陪伴服务',
      description: '走进敬老院和社区独居老人家中，为老人提供陪伴聊天、心理慰藉、生活照料等志愿服务，让老人感受社会温暖。',
      cover: 'https://images.unsplash.com/photo-1516307365426-bea591f05011?w=800',
      category: '敬老爱老',
      location: '幸福敬老院',
      start_time: addDays(now, 10),
      end_time: addDays(now, 10),
      signup_deadline: addDays(now, 7),
      max_participants: 20,
      points_per_hour: 6,
      service_hours: 5,
      organizer: '青年志愿者协会',
      contact_person: '李主任',
      contact_phone: '13800000002',
      status: 'recruiting',
      views: 234
    },
    {
      title: '义务支教助学活动',
      description: '组织有教学经验的志愿者前往乡村学校开展义务支教活动，为乡村学生提供学业辅导、兴趣培养、心理疏导等服务。',
      cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
      category: '教育支持',
      location: '希望小学',
      start_time: addDays(now, 20),
      end_time: addDays(now, 22),
      signup_deadline: addDays(now, 15),
      max_participants: 15,
      points_per_hour: 8,
      service_hours: 24,
      organizer: '教育志愿者联盟',
      contact_person: '张老师',
      contact_phone: '13800000003',
      status: 'recruiting',
      views: 312
    },
    {
      title: '图书馆志愿服务',
      description: '在市图书馆开展读者引导、图书整理、阅读推广等志愿服务工作，助力书香城市建设。',
      cover: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800',
      category: '文化服务',
      location: '市图书馆',
      start_time: addDays(now, -5),
      end_time: addDays(now, -2),
      signup_deadline: addDays(now, -8),
      max_participants: 25,
      points_per_hour: 4,
      service_hours: 24,
      organizer: '市图书馆',
      contact_person: '刘馆长',
      contact_phone: '13800000004',
      status: 'completed',
      views: 445
    },
    {
      title: '交通文明劝导志愿服务',
      description: '在主要交通路口开展交通文明劝导活动，引导行人和车辆遵守交通规则，维护交通秩序，提升城市文明形象。',
      cover: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800',
      category: '文明劝导',
      location: '各主要交通路口',
      start_time: addDays(now, 15),
      end_time: addDays(now, 15),
      signup_deadline: addDays(now, 12),
      max_participants: 40,
      points_per_hour: 5,
      service_hours: 6,
      organizer: '文明办',
      contact_person: '陈主任',
      contact_phone: '13800000005',
      status: 'recruiting',
      views: 178
    },
    {
      title: '疫情防控志愿服务',
      description: '协助社区和医疗机构开展疫情防控工作，包括体温检测、信息登记、防疫宣传、物资配送等志愿服务。',
      cover: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
      category: '公共卫生',
      location: '各社区服务站',
      start_time: addDays(now, -10),
      end_time: addDays(now, -6),
      signup_deadline: addDays(now, -12),
      max_participants: 50,
      points_per_hour: 7,
      service_hours: 40,
      organizer: '卫健委',
      contact_person: '周医生',
      contact_phone: '13800000006',
      status: 'completed',
      views: 567
    }
  ];

  volunteerProjects.forEach(project => {
    insertVolunteerProject.run(
      project.title,
      project.description,
      project.cover,
      project.category,
      project.location,
      project.start_time,
      project.end_time,
      project.signup_deadline,
      project.max_participants,
      project.points_per_hour,
      project.service_hours,
      project.organizer,
      project.contact_person,
      project.contact_phone,
      project.status,
      project.views
    );
  });

  const insertVolunteerSignup = db.prepare(`
    INSERT OR IGNORE INTO volunteer_signups (user_id, project_id, status, apply_reason, skills)
    VALUES (?, ?, ?, ?, ?)
  `);

  const volunteerSignups = [
    { userId: 2, projectId: 4, status: 'approved', apply_reason: '热爱阅读，希望为读者服务', skills: '图书分类、读者服务' },
    { userId: 3, projectId: 4, status: 'approved', apply_reason: '想体验图书馆工作', skills: '耐心细致' },
    { userId: 2, projectId: 6, status: 'approved', apply_reason: '疫情防控人人有责', skills: '医学背景' },
    { userId: 4, projectId: 6, status: 'approved', apply_reason: '贡献自己的力量', skills: '沟通能力强' },
    { userId: 5, projectId: 1, status: 'pending', apply_reason: '想为环保出一份力', skills: '体力好' },
    { userId: 3, projectId: 2, status: 'pending', apply_reason: '关爱老人是美德', skills: '耐心、有爱心' }
  ];

  volunteerSignups.forEach(signup => {
    insertVolunteerSignup.run(signup.userId, signup.projectId, signup.status, signup.apply_reason, signup.skills);
  });

  const insertServiceRecord = db.prepare(`
    INSERT OR IGNORE INTO volunteer_service_records (signup_id, user_id, project_id, service_date, start_time, end_time, actual_hours, task_description, recorded_by, points_awarded, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const serviceRecords = [
    { signupId: 1, userId: 2, projectId: 4, serviceDate: addDays(now, -5).slice(0, 10), startTime: addDays(now, -5).slice(0, 10) + ' 09:00:00', endTime: addDays(now, -5).slice(0, 10) + ' 17:00:00', actualHours: 6.0, taskDescription: '图书整理、读者引导', recordedBy: 1, pointsAwarded: 24, status: 'confirmed' },
    { signupId: 1, userId: 2, projectId: 4, serviceDate: addDays(now, -4).slice(0, 10), startTime: addDays(now, -4).slice(0, 10) + ' 09:00:00', endTime: addDays(now, -4).slice(0, 10) + ' 17:00:00', actualHours: 6.0, taskDescription: '阅读推广活动协助', recordedBy: 1, pointsAwarded: 24, status: 'confirmed' },
    { signupId: 2, userId: 3, projectId: 4, serviceDate: addDays(now, -3).slice(0, 10), startTime: addDays(now, -3).slice(0, 10) + ' 09:00:00', endTime: addDays(now, -3).slice(0, 10) + ' 17:00:00', actualHours: 6.0, taskDescription: '图书分类上架', recordedBy: 1, pointsAwarded: 24, status: 'confirmed' },
    { signupId: 3, userId: 2, projectId: 6, serviceDate: addDays(now, -10).slice(0, 10), startTime: addDays(now, -10).slice(0, 10) + ' 08:00:00', endTime: addDays(now, -10).slice(0, 10) + ' 16:00:00', actualHours: 8.0, taskDescription: '体温检测、信息登记', recordedBy: 1, pointsAwarded: 56, status: 'confirmed' },
    { signupId: 3, userId: 2, projectId: 6, serviceDate: addDays(now, -9).slice(0, 10), startTime: addDays(now, -9).slice(0, 10) + ' 08:00:00', endTime: addDays(now, -9).slice(0, 10) + ' 16:00:00', actualHours: 8.0, taskDescription: '防疫宣传、物资配送', recordedBy: 1, pointsAwarded: 56, status: 'confirmed' },
    { signupId: 4, userId: 4, projectId: 6, serviceDate: addDays(now, -8).slice(0, 10), startTime: addDays(now, -8).slice(0, 10) + ' 08:00:00', endTime: addDays(now, -8).slice(0, 10) + ' 16:00:00', actualHours: 8.0, taskDescription: '社区排查、信息统计', recordedBy: 1, pointsAwarded: 56, status: 'confirmed' }
  ];

  serviceRecords.forEach(record => {
    insertServiceRecord.run(record.signupId, record.userId, record.projectId, record.serviceDate, record.startTime, record.endTime, record.actualHours, record.taskDescription, record.recordedBy, record.pointsAwarded, record.status);
  });

  const insertVolunteerReview = db.prepare(`
    INSERT OR IGNORE INTO volunteer_reviews (user_id, project_id, rating, content, is_anonymous)
    VALUES (?, ?, ?, ?, ?)
  `);

  const volunteerReviews = [
    { userId: 2, projectId: 4, rating: 5, content: '非常有意义的活动，图书馆的工作人员很热情，学到了很多图书管理知识。', isAnonymous: 0 },
    { userId: 3, projectId: 4, rating: 4, content: '活动组织得很好，就是时间有点长，希望以后能有更多休息时间。', isAnonymous: 1 },
    { userId: 2, projectId: 6, rating: 5, content: '疫情防控志愿服务很有意义，虽然辛苦但是很有成就感。', isAnonymous: 0 },
    { userId: 4, projectId: 6, rating: 5, content: '感谢组织者的安排，能为疫情防控出一份力感到很自豪。', isAnonymous: 0 }
  ];

  volunteerReviews.forEach(review => {
    insertVolunteerReview.run(review.userId, review.projectId, review.rating, review.content, review.isAnonymous);
  });

  const insertBranchMeeting = db.prepare(`
    INSERT OR IGNORE INTO branch_meetings (id, title, branch, meeting_type, location, meeting_time, end_time, status, notification_content, minutes_content, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const branchMeetings = [
    { id: 1, title: '第一党支部支委会', branch: '第一党支部', type: 'branch_committee', location: '第一党支部活动室', time: addDays(now, 3), endTime: addDays(now, 3), status: 'notified', notification: '请各位支委准时参加本次支委会，讨论本季度党建工作安排。', minutes: '', createdBy: 1 },
    { id: 2, title: '第二党支部党员大会', branch: '第二党支部', type: 'member_congress', location: '综合会议室', time: addDays(now, 7), endTime: addDays(now, 7), status: 'notified', notification: '召开第二党支部全体党员大会，审议年度工作总结和下年度工作计划。', minutes: '', createdBy: 1 },
    { id: 3, title: '第三党支部党小组会', branch: '第三党支部', type: 'group_meeting', location: '第三党支部活动室', time: addDays(now, -5), endTime: addDays(now, -5), status: 'completed', notification: '组织学习党的二十大报告精神。', minutes: '本次党小组会重点学习了党的二十大报告精神，与会党员结合自身工作实际进行了深入讨论。大家一致表示要以党的二十大精神为指引，立足岗位，勇于担当。', createdBy: 1 },
    { id: 4, title: '机关第一党支部党课', branch: '机关第一党支部', type: 'party_lesson', location: '大会议室', time: addDays(now, -10), endTime: addDays(now, -10), status: 'completed', notification: '邀请市委党校老师讲授习近平新时代中国特色社会主义思想专题党课。', minutes: '专题党课由市委党校王教授主讲，围绕习近平新时代中国特色社会主义思想的核心要义、精神实质和实践要求进行了深入解读。全体党员认真听讲，受益匪浅。', createdBy: 1 },
    { id: 5, title: '第一党支部党员大会', branch: '第一党支部', type: 'member_congress', location: '大会议室', time: addDays(now, -20), endTime: addDays(now, -20), status: 'completed', notification: '召开第一党支部党员大会，进行民主评议党员。', minutes: '本次党员大会进行了民主评议党员工作，全体党员逐一进行自我评价和互相评议，最终评选出优秀党员3名，合格党员12名。', createdBy: 1 },
    { id: 6, title: '第二党支部支委会', branch: '第二党支部', type: 'branch_committee', location: '第二党支部活动室', time: addDays(now, 14), endTime: addDays(now, 14), status: 'notified', notification: '讨论研究入党积极分子培养考察事宜。', minutes: '', createdBy: 1 }
  ];

  branchMeetings.forEach(m => {
    insertBranchMeeting.run(m.id, m.title, m.branch, m.type, m.location, m.time, m.endTime, m.status, m.notification, m.minutes, m.createdBy);
  });

  const insertMeetingAgenda = db.prepare(`
    INSERT OR IGNORE INTO branch_meeting_agendas (id, meeting_id, title, content, sort_order, status, discussion_result)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const meetingAgendas = [
    { id: 1, meetingId: 1, title: '本季度党建工作计划审议', content: '审议并通过本季度党建工作计划安排', sortOrder: 1, status: 'pending', result: '' },
    { id: 2, meetingId: 1, title: '入党积极分子培养情况汇报', content: '听取培养联系人关于入党积极分子培养情况的汇报', sortOrder: 2, status: 'pending', result: '' },
    { id: 3, meetingId: 2, title: '年度工作总结审议', content: '审议党支部2024年度工作总结报告', sortOrder: 1, status: 'pending', result: '' },
    { id: 4, meetingId: 2, title: '下年度工作计划讨论', content: '讨论并制定2025年度党支部工作计划', sortOrder: 2, status: 'pending', result: '' },
    { id: 5, meetingId: 3, title: '党的二十大报告精神学习', content: '深入学习党的二十大报告核心要义', sortOrder: 1, status: 'passed', result: '全体党员一致同意深入学习贯彻党的二十大精神' },
    { id: 6, meetingId: 4, title: '习近平新时代中国特色社会主义思想专题学习', content: '系统学习习近平新时代中国特色社会主义思想', sortOrder: 1, status: 'passed', result: '通过集中学习，全体党员对习近平新时代中国特色社会主义思想有了更深入的理解' },
    { id: 7, meetingId: 5, title: '民主评议党员', content: '开展党员民主评议工作', sortOrder: 1, status: 'passed', result: '评选出优秀党员3名，合格党员12名' },
    { id: 8, meetingId: 5, title: '党费收缴情况通报', content: '通报本年度党费收缴使用情况', sortOrder: 2, status: 'passed', result: '党费收缴率达100%，使用情况公开透明' },
    { id: 9, meetingId: 6, title: '入党积极分子培养考察', content: '研究讨论入党积极分子培养考察事宜', sortOrder: 1, status: 'pending', result: '' }
  ];

  meetingAgendas.forEach(a => {
    insertMeetingAgenda.run(a.id, a.meetingId, a.title, a.content, a.sortOrder, a.status, a.result);
  });

  const insertMeetingAttendee = db.prepare(`
    INSERT OR IGNORE INTO branch_meeting_attendees (id, meeting_id, user_id, is_required, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const meetingAttendees = [
    { id: 1, meetingId: 1, userId: 1, isRequired: 1, status: 'confirmed' },
    { id: 2, meetingId: 1, userId: 2, isRequired: 1, status: 'confirmed' },
    { id: 3, meetingId: 1, userId: 5, isRequired: 0, status: 'pending' },
    { id: 4, meetingId: 2, userId: 3, isRequired: 1, status: 'confirmed' },
    { id: 5, meetingId: 2, userId: 4, isRequired: 1, status: 'pending' },
    { id: 6, meetingId: 3, userId: 4, isRequired: 1, status: 'confirmed' },
    { id: 7, meetingId: 3, userId: 3, isRequired: 1, status: 'confirmed' },
    { id: 8, meetingId: 4, userId: 1, isRequired: 1, status: 'confirmed' },
    { id: 9, meetingId: 4, userId: 2, isRequired: 1, status: 'confirmed' },
    { id: 10, meetingId: 4, userId: 5, isRequired: 1, status: 'leave' },
    { id: 11, meetingId: 5, userId: 1, isRequired: 1, status: 'confirmed' },
    { id: 12, meetingId: 5, userId: 2, isRequired: 1, status: 'confirmed' },
    { id: 13, meetingId: 5, userId: 5, isRequired: 1, status: 'confirmed' },
    { id: 14, meetingId: 6, userId: 3, isRequired: 1, status: 'pending' }
  ];

  meetingAttendees.forEach(a => {
    insertMeetingAttendee.run(a.id, a.meetingId, a.userId, a.isRequired, a.status);
  });

  const insertMeetingCheckin = db.prepare(`
    INSERT OR IGNORE INTO branch_meeting_checkins (id, meeting_id, user_id, checkin_time, checkin_type)
    VALUES (?, ?, ?, ?, ?)
  `);

  const meetingCheckins = [
    { id: 1, meetingId: 3, userId: 4, time: addDays(now, -5), type: 'onsite' },
    { id: 2, meetingId: 3, userId: 3, time: addDays(now, -5), type: 'onsite' },
    { id: 3, meetingId: 4, userId: 1, time: addDays(now, -10), type: 'onsite' },
    { id: 4, meetingId: 4, userId: 2, time: addDays(now, -10), type: 'online' },
    { id: 5, meetingId: 5, userId: 1, time: addDays(now, -20), type: 'onsite' },
    { id: 6, meetingId: 5, userId: 2, time: addDays(now, -20), type: 'onsite' },
    { id: 7, meetingId: 5, userId: 5, time: addDays(now, -20), type: 'onsite' }
  ];

  meetingCheckins.forEach(c => {
    insertMeetingCheckin.run(c.id, c.meetingId, c.userId, c.time, c.type);
  });

  const insertMeetingResolution = db.prepare(`
    INSERT OR IGNORE INTO branch_meeting_resolutions (id, meeting_id, agenda_id, title, content, result, vote_for, vote_against, vote_abstain, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const meetingResolutions = [
    { id: 1, meetingId: 3, agendaId: 5, title: '深入学习贯彻党的二十大精神', content: '全体党员深入学习贯彻党的二十大精神，结合实际工作抓好落实', result: 'passed', voteFor: 8, voteAgainst: 0, voteAbstain: 0, resolvedAt: addDays(now, -5) },
    { id: 2, meetingId: 4, agendaId: 6, title: '习近平新时代中国特色社会主义思想学习决议', content: '全体党员深入学习习近平新时代中国特色社会主义思想，持续加强理论武装', result: 'passed', voteFor: 15, voteAgainst: 0, voteAbstain: 1, resolvedAt: addDays(now, -10) },
    { id: 3, meetingId: 5, agendaId: 7, title: '民主评议党员决议', content: '经民主评议，评选出优秀党员3名，合格党员12名', result: 'passed', voteFor: 14, voteAgainst: 0, voteAbstain: 1, resolvedAt: addDays(now, -20) },
    { id: 4, meetingId: 5, agendaId: 8, title: '党费收缴使用情况通报决议', content: '本年度党费收缴率达100%，使用情况公开透明，通过通报', result: 'passed', voteFor: 15, voteAgainst: 0, voteAbstain: 0, resolvedAt: addDays(now, -20) }
  ];

  meetingResolutions.forEach(r => {
    insertMeetingResolution.run(r.id, r.meetingId, r.agendaId, r.title, r.content, r.result, r.voteFor, r.voteAgainst, r.voteAbstain, r.resolvedAt);
  });

  console.log('数据库初始化完成！');
  console.log('默认账号：admin / admin123 （管理员）');
  console.log('默认账号：zhangsan / user123 （普通用户）');
}

initDatabase();
