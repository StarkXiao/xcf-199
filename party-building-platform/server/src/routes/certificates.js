const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const type = req.query.type;
    const category = req.query.category;
    const status = req.query.status;
    const keyword = req.query.keyword;

    const predicate = cert => {
      if (type && cert.type !== type) return false;
      if (category && cert.category !== category) return false;
      if (status && cert.status !== status) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!String(cert.title || '').toLowerCase().includes(kw) &&
            !String(cert.description || '').toLowerCase().includes(kw) &&
            !String(cert.issuer || '').toLowerCase().includes(kw)) return false;
      }
      return true;
    };

    let sql = 'SELECT * FROM certificates';
    const params = [];
    let countSql = 'SELECT COUNT(*) as c FROM certificates';
    const countParams = [];
    let whereConditions = [];

    if (type) {
      whereConditions.push('type = ?');
      params.push(type);
      countParams.push(type);
    }
    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
      countParams.push(category);
    }
    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
      countParams.push(status);
    }
    if (keyword) {
      whereConditions.push('(title LIKE ? OR description LIKE ? OR issuer LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (whereConditions.length > 0) {
      const whereStr = ' WHERE ' + whereConditions.join(' AND ');
      sql += whereStr;
      countSql += whereStr;
    }

    const result = await db.paginate('certificates', {
      page,
      page_size: pageSize,
      predicate,
      sortBy: 'created_at',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    const list = [];
    for (const cert of result.list) {
      const issuanceCount = await db.count(
        'certificate_issuances',
        i => i.certificate_id === cert.id,
        'SELECT COUNT(*) as c FROM certificate_issuances WHERE certificate_id = ?',
        [cert.id]
      );
      let hasIssued = false;
      if (req.user) {
        const issuance = await db.findOne(
          'certificate_issuances',
          i => i.certificate_id === cert.id && i.user_id === req.user.id,
          'SELECT * FROM certificate_issuances WHERE certificate_id = ? AND user_id = ? LIMIT 1',
          [cert.id, req.user.id]
        );
        hasIssued = issuance ? true : false;
      }
      list.push({
        ...cert,
        issuance_count: issuanceCount,
        has_issued: hasIssued
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: { list, total: result.total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    let categories;
    if (db.useMySQL) {
      categories = await db.exec(
        'SELECT DISTINCT category FROM certificates WHERE category IS NOT NULL AND category != ""'
      );
    } else {
      const certs = await db.getAll('certificates');
      const categorySet = new Set();
      certs.forEach(c => { if (c.category) categorySet.add(c.category); });
      categories = Array.from(categorySet).map(c => ({ category: c }));
    }
    res.json({
      code: 200,
      message: '获取成功',
      data: categories.map(c => c.category)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const certId = parseInt(id);

    const cert = await db.getById('certificates', certId);
    if (!cert) {
      return res.status(404).json({ code: 404, message: '证书不存在' });
    }

    const issuanceCount = await db.count(
      'certificate_issuances',
      i => i.certificate_id === certId,
      'SELECT COUNT(*) as c FROM certificate_issuances WHERE certificate_id = ?',
      [certId]
    );

    let myIssuance = null;
    if (req.user) {
      myIssuance = await db.findOne(
        'certificate_issuances',
        i => i.certificate_id === certId && i.user_id === req.user.id,
        'SELECT * FROM certificate_issuances WHERE certificate_id = ? AND user_id = ? LIMIT 1',
        [certId, req.user.id]
      );
    }

    const creator = await db.getById('users', cert.created_by);

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        ...cert,
        issuance_count: issuanceCount,
        my_issuance: myIssuance,
        creator_name: creator ? creator.real_name : '未知'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/list', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const type = req.query.type;
    const category = req.query.category;
    const userId = req.user.id;

    let issuances;
    let total;

    if (db.useMySQL) {
      let sql = `SELECT i.*, c.title, c.type, c.category, c.description, c.cover_image, 
                        c.certificate_image, c.issuer, c.issue_date, c.points_reward, c.status as cert_status
                 FROM certificate_issuances i
                 INNER JOIN certificates c ON i.certificate_id = c.id
                 WHERE i.user_id = ?`;
      const params = [userId];
      let countSql = 'SELECT COUNT(*) as total FROM certificate_issuances WHERE user_id = ?';
      const countParams = [userId];

      if (type) {
        sql += ' AND c.type = ?';
        params.push(type);
        countSql += ' AND EXISTS (SELECT 1 FROM certificates c WHERE c.id = certificate_issuances.certificate_id AND c.type = ?)';
        countParams.push(type);
      }
      if (category) {
        sql += ' AND c.category = ?';
        params.push(category);
        countSql += ' AND EXISTS (SELECT 1 FROM certificates c WHERE c.id = certificate_issuances.certificate_id AND c.category = ?)';
        countParams.push(category);
      }

      sql += ' ORDER BY i.issue_date DESC LIMIT ?, ?';
      params.push((page - 1) * pageSize, pageSize);

      issuances = await db.exec(sql, params);
      const [cr] = await db.exec(countSql, countParams);
      total = cr.total || 0;
    } else {
      const issuanceRecords = await db.findMany('certificate_issuances', i => {
        if (i.user_id !== userId) return false;
        return true;
      });

      const list = [];
      for (const issuance of issuanceRecords) {
        const cert = await db.getById('certificates', issuance.certificate_id);
        if (cert) {
          if (type && cert.type !== type) continue;
          if (category && cert.category !== category) continue;
          list.push({
            ...issuance,
            title: cert.title,
            type: cert.type,
            category: cert.category,
            description: cert.description,
            cover_image: cert.cover_image,
            certificate_image: cert.certificate_image,
            issuer: cert.issuer,
            issue_date: cert.issue_date,
            points_reward: cert.points_reward,
            cert_status: cert.status
          });
        }
      }
      list.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
      total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      issuances = list.slice(start, end);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: issuances, total, page, page_size: pageSize }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    let totalCertificates, totalHonors, totalPoints;

    if (db.useMySQL) {
      const [tc] = await db.exec(
        "SELECT COUNT(*) as count FROM certificate_issuances i INNER JOIN certificates c ON i.certificate_id = c.id WHERE i.user_id = ? AND c.type = 'certificate'",
        [userId]
      );
      const [th] = await db.exec(
        "SELECT COUNT(*) as count FROM certificate_issuances i INNER JOIN certificates c ON i.certificate_id = c.id WHERE i.user_id = ? AND c.type = 'honor'",
        [userId]
      );
      const [tp] = await db.exec(
        'SELECT COALESCE(SUM(c.points_reward), 0) as total FROM certificate_issuances i INNER JOIN certificates c ON i.certificate_id = c.id WHERE i.user_id = ?',
        [userId]
      );
      totalCertificates = tc.count;
      totalHonors = th.count;
      totalPoints = tp.total;
    } else {
      const issuances = await db.findMany('certificate_issuances', i => i.user_id === userId);
      totalCertificates = 0;
      totalHonors = 0;
      totalPoints = 0;
      for (const issuance of issuances) {
        const cert = await db.getById('certificates', issuance.certificate_id);
        if (cert) {
          if (cert.type === 'certificate') totalCertificates++;
          if (cert.type === 'honor') totalHonors++;
          totalPoints += cert.points_reward || 0;
        }
      }
    }

    const achievementCount = await db.count(
      'user_achievements',
      a => a.user_id === userId,
      'SELECT COUNT(*) as c FROM user_achievements WHERE user_id = ?',
      [userId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        total_certificates: totalCertificates,
        total_honors: totalHonors,
        total_points: totalPoints,
        total_achievements: achievementCount
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/achievements', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id) : (req.user ? req.user.id : null);
    if (!userId) {
      return res.status(400).json({ code: 400, message: '请指定用户' });
    }

    let achievements;
    if (db.useMySQL) {
      achievements = await db.exec(
        'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC',
        [userId]
      );
    } else {
      achievements = await db.findMany('user_achievements', a => a.user_id === userId);
      achievements.sort((a, b) => {
        if ((a.sort_order || 0) !== (b.sort_order || 0)) return (a.sort_order || 0) - (b.sort_order || 0);
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }

    const user = await db.getById('users', userId);

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: achievements,
        user: user ? { id: user.id, real_name: user.real_name, avatar: user.avatar, branch: user.branch } : null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/achievements', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, type, description, achievement_date, cover_image, attachment_url, is_public, sort_order } = req.body;

    if (!title || !type) {
      return res.status(400).json({ code: 400, message: '标题和类型不能为空' });
    }

    const achievement = await db.insert(
      'user_achievements',
      {
        user_id: userId,
        title,
        type,
        description: description || '',
        achievement_date: achievement_date || null,
        cover_image: cover_image || '',
        attachment_url: attachment_url || '',
        is_public: is_public !== undefined ? is_public : 1,
        sort_order: sort_order || 0
      },
      'INSERT INTO user_achievements (user_id, title, type, description, achievement_date, cover_image, attachment_url, is_public, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, type, description || '', achievement_date || null, cover_image || '', attachment_url || '', is_public !== undefined ? is_public : 1, sort_order || 0]
    );

    res.json({ code: 200, message: '创建成功', data: achievement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/achievements/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const achievementId = parseInt(id);
    const userId = req.user.id;

    const achievement = await db.getById('user_achievements', achievementId);

    if (!achievement) {
      return res.status(404).json({ code: 404, message: '成果不存在' });
    }

    if (achievement.user_id !== userId) {
      return res.status(403).json({ code: 403, message: '无权限修改' });
    }

    const d = req.body;

    const updated = await db.update(
      'user_achievements',
      achievementId,
      {},
      `UPDATE user_achievements SET 
        title = ?, type = ?, description = ?, achievement_date = ?,
        cover_image = ?, attachment_url = ?, is_public = ?, sort_order = ?
      WHERE id = ?`,
      [
        d.title || achievement.title,
        d.type || achievement.type,
        d.description !== undefined ? d.description : achievement.description,
        d.achievement_date !== undefined ? d.achievement_date : achievement.achievement_date,
        d.cover_image !== undefined ? d.cover_image : achievement.cover_image,
        d.attachment_url !== undefined ? d.attachment_url : achievement.attachment_url,
        d.is_public !== undefined ? d.is_public : achievement.is_public,
        d.sort_order !== undefined ? d.sort_order : achievement.sort_order,
        achievementId
      ]
    );

    res.json({ code: 200, message: '更新成功', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/achievements/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const achievementId = parseInt(id);
    const userId = req.user.id;

    const achievement = await db.getById('user_achievements', achievementId);

    if (!achievement) {
      return res.status(404).json({ code: 404, message: '成果不存在' });
    }

    if (achievement.user_id !== userId) {
      return res.status(403).json({ code: 403, message: '无权限删除' });
    }

    await db.remove('user_achievements', achievementId);

    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const d = req.body;
    if (!d.title || !d.category || !d.issuer) {
      return res.status(400).json({ code: 400, message: '标题、分类和颁发单位不能为空' });
    }

    const cert = await db.insert(
      'certificates',
      {
        title: d.title,
        type: d.type || 'certificate',
        category: d.category,
        description: d.description || '',
        cover_image: d.cover_image || '',
        certificate_image: d.certificate_image || '',
        issuer: d.issuer,
        issue_date: d.issue_date || null,
        valid_from: d.valid_from || null,
        valid_to: d.valid_to || null,
        points_reward: d.points_reward || 0,
        status: d.status || 'active',
        created_by: req.user.id
      },
      `INSERT INTO certificates (title, type, category, description, cover_image, certificate_image, issuer, issue_date, valid_from, valid_to, points_reward, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.title, d.type || 'certificate', d.category, d.description || '', d.cover_image || '', d.certificate_image || '', d.issuer, d.issue_date || null, d.valid_from || null, d.valid_to || null, d.points_reward || 0, d.status || 'active', req.user.id]
    );

    res.json({ code: 200, message: '创建成功', data: cert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const certId = parseInt(id);

    const cert = await db.getById('certificates', certId);

    if (!cert) {
      return res.status(404).json({ code: 404, message: '证书不存在' });
    }

    const d = req.body;

    const updated = await db.update(
      'certificates',
      certId,
      {},
      `UPDATE certificates SET 
        title = ?, type = ?, category = ?, description = ?,
        cover_image = ?, certificate_image = ?, issuer = ?,
        issue_date = ?, valid_from = ?, valid_to = ?,
        points_reward = ?, status = ?
      WHERE id = ?`,
      [
        d.title || cert.title,
        d.type || cert.type,
        d.category || cert.category,
        d.description !== undefined ? d.description : cert.description,
        d.cover_image !== undefined ? d.cover_image : cert.cover_image,
        d.certificate_image !== undefined ? d.certificate_image : cert.certificate_image,
        d.issuer || cert.issuer,
        d.issue_date !== undefined ? d.issue_date : cert.issue_date,
        d.valid_from !== undefined ? d.valid_from : cert.valid_from,
        d.valid_to !== undefined ? d.valid_to : cert.valid_to,
        d.points_reward !== undefined ? d.points_reward : cert.points_reward,
        d.status || cert.status,
        certId
      ]
    );

    res.json({ code: 200, message: '更新成功', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const certId = parseInt(id);

    const cert = await db.getById('certificates', certId);

    if (!cert) {
      return res.status(404).json({ code: 404, message: '证书不存在' });
    }

    const issuanceCount = await db.count(
      'certificate_issuances',
      i => i.certificate_id === certId,
      'SELECT COUNT(*) as c FROM certificate_issuances WHERE certificate_id = ?',
      [certId]
    );

    if (issuanceCount > 0) {
      return res.status(400).json({ code: 400, message: '该证书已有发放记录，无法删除' });
    }

    await db.remove('certificates', certId);

    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id/issuances', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const certId = parseInt(id);
    const status = req.query.status;

    let issuances;
    let total;

    if (db.useMySQL) {
      let sql = `SELECT i.*, u.real_name, u.username, u.avatar, u.branch, u.phone
                 FROM certificate_issuances i
                 INNER JOIN users u ON i.user_id = u.id
                 WHERE i.certificate_id = ?`;
      const params = [certId];
      let countSql = 'SELECT COUNT(*) as total FROM certificate_issuances WHERE certificate_id = ?';
      const countParams = [certId];

      if (status) {
        sql += ' AND i.status = ?';
        params.push(status);
        countSql += ' AND status = ?';
        countParams.push(status);
      }

      sql += ' ORDER BY i.issue_date DESC LIMIT ?, ?';
      params.push((page - 1) * pageSize, pageSize);

      issuances = await db.exec(sql, params);
      const [cr] = await db.exec(countSql, countParams);
      total = cr.total || 0;
    } else {
      const issuanceRecords = await db.findMany('certificate_issuances', i => {
        if (i.certificate_id !== certId) return false;
        if (status && i.status !== status) return false;
        return true;
      });

      const list = [];
      for (const issuance of issuanceRecords) {
        const user = await db.getById('users', issuance.user_id);
        list.push({
          ...issuance,
          real_name: user ? user.real_name : '未知',
          username: user ? user.username : '未知',
          avatar: user ? user.avatar : '',
          branch: user ? user.branch : '',
          phone: user ? user.phone : ''
        });
      }

      list.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
      total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      issuances = list.slice(start, end);
    }

    const cert = await db.getById('certificates', certId);

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: issuances, total, page, page_size: pageSize, certificate: cert }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/issue', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const certId = parseInt(id);
    const { user_id, certificate_number, remarks, issue_date } = req.body;

    if (!user_id) {
      return res.status(400).json({ code: 400, message: '请选择用户' });
    }

    const cert = await db.getById('certificates', certId);

    if (!cert) {
      return res.status(404).json({ code: 404, message: '证书不存在' });
    }

    if (cert.status !== 'active') {
      return res.status(400).json({ code: 400, message: '该证书当前不可发放' });
    }

    const userId = parseInt(user_id);

    const user = await db.getById('users', userId);

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const existingIssuance = await db.findOne(
      'certificate_issuances',
      i => i.certificate_id === certId && i.user_id === userId,
      'SELECT * FROM certificate_issuances WHERE certificate_id = ? AND user_id = ? LIMIT 1',
      [certId, userId]
    );

    if (existingIssuance) {
      return res.status(400).json({ code: 400, message: '该用户已获得此证书' });
    }

    const adminId = req.user.id;
    const adminName = req.user.real_name;

    const now = new Date();

    const issuance = await db.insert(
      'certificate_issuances',
      {
        certificate_id: certId,
        user_id: userId,
        issue_date: issue_date || now.toISOString().slice(0, 19).replace('T', ' '),
        issued_by: adminId,
        issuer_name: adminName,
        certificate_number: certificate_number || '',
        remarks: remarks || '',
        status: 'issued'
      },
      'INSERT INTO certificate_issuances (certificate_id, user_id, issue_date, issued_by, issuer_name, certificate_number, remarks, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [certId, userId, issue_date || now.toISOString().slice(0, 19).replace('T', ' '), adminId, adminName, certificate_number || '', remarks || '', 'issued']
    );

    if (cert.points_reward && cert.points_reward > 0) {
      await db.update(
        'users',
        userId,
        {},
        'UPDATE users SET points = points + ? WHERE id = ?',
        [cert.points_reward]
      );

      await db.insert(
        'points_records',
        {
          user_id: userId,
          points: cert.points_reward,
          reason: `获得证书：${cert.title}`,
          type: 'earn'
        },
        'INSERT INTO points_records (user_id, points, reason, type) VALUES (?, ?, ?, ?)',
        [userId, cert.points_reward, `获得证书：${cert.title}`, 'earn']
      );
    }

    res.json({ code: 200, message: '发放成功', data: issuance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/issuances/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const issuanceId = parseInt(id);

    const issuance = await db.getById('certificate_issuances', issuanceId);

    if (!issuance) {
      return res.status(404).json({ code: 404, message: '发放记录不存在' });
    }

    const cert = await db.getById('certificates', issuance.certificate_id);

    if (cert && cert.points_reward && cert.points_reward > 0) {
      await db.update(
        'users',
        issuance.user_id,
        {},
        'UPDATE users SET points = points - ? WHERE id = ?',
        [cert.points_reward]
      );

      await db.insert(
        'points_records',
        {
          user_id: issuance.user_id,
          points: -cert.points_reward,
          reason: `撤销证书：${cert.title}`,
          type: 'deduct'
        },
        'INSERT INTO points_records (user_id, points, reason, type) VALUES (?, ?, ?, ?)',
        [issuance.user_id, -cert.points_reward, `撤销证书：${cert.title}`, 'deduct']
      );
    }

    await db.remove('certificate_issuances', issuanceId);

    res.json({ code: 200, message: '撤销成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/stats/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let totalCertificates, totalHonors, activeCerts, totalIssuances;
    let byCategory, byMonth;

    if (db.useMySQL) {
      const [tc] = await db.exec("SELECT COUNT(*) as count FROM certificates WHERE type = 'certificate'");
      const [th] = await db.exec("SELECT COUNT(*) as count FROM certificates WHERE type = 'honor'");
      const [ac] = await db.exec("SELECT COUNT(*) as count FROM certificates WHERE status = 'active'");
      const [ti] = await db.exec('SELECT COUNT(*) as count FROM certificate_issuances');

      totalCertificates = tc.count;
      totalHonors = th.count;
      activeCerts = ac.count;
      totalIssuances = ti.count;

      byCategory = await db.exec(
        `SELECT category, COUNT(*) as count, 
                (SELECT COUNT(*) FROM certificate_issuances i WHERE i.certificate_id IN 
                  (SELECT id FROM certificates c WHERE c.category = cert.category)) as issuance_count
         FROM certificates cert
         WHERE category IS NOT NULL AND category != ''
         GROUP BY category
         ORDER BY count DESC`
      );

      byMonth = await db.exec(
        `SELECT DATE_FORMAT(issue_date, '%Y-%m') as month, COUNT(*) as count
         FROM certificate_issuances
         WHERE issue_date IS NOT NULL
         GROUP BY DATE_FORMAT(issue_date, '%Y-%m')
         ORDER BY month DESC
         LIMIT 12`
      );
    } else {
      const certs = await db.getAll('certificates');
      totalCertificates = certs.filter(c => c.type === 'certificate').length;
      totalHonors = certs.filter(c => c.type === 'honor').length;
      activeCerts = certs.filter(c => c.status === 'active').length;

      const issuances = await db.getAll('certificate_issuances');
      totalIssuances = issuances.length;

      const categoryMap = {};
      certs.forEach(c => {
        if (c.category) {
          if (!categoryMap[c.category]) {
            categoryMap[c.category] = { category: c.category, count: 0, issuance_count: 0 };
          }
          categoryMap[c.category].count++;
        }
      });

      issuances.forEach(i => {
        const cert = certs.find(c => c.id === i.certificate_id);
        if (cert && cert.category && categoryMap[cert.category]) {
          categoryMap[cert.category].issuance_count++;
        }
      });

      byCategory = Object.values(categoryMap).sort((a, b) => b.count - a.count);

      const monthMap = {};
      issuances.forEach(i => {
        if (i.issue_date) {
          const month = new Date(i.issue_date).toISOString().slice(0, 7);
          if (!monthMap[month]) {
            monthMap[month] = { month, count: 0 };
          }
          monthMap[month].count++;
        }
      });

      byMonth = Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        total_certificates: totalCertificates,
        total_honors: totalHonors,
        active_certs: activeCerts,
        total_issuances: totalIssuances,
        by_category: byCategory,
        by_month: byMonth
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/stats/ranking', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    let ranking;

    if (db.useMySQL) {
      ranking = await db.exec(
        `SELECT u.id, u.real_name, u.branch, u.avatar,
                COUNT(i.id) as cert_count,
                COALESCE(SUM(c.points_reward), 0) as total_points
         FROM users u
         LEFT JOIN certificate_issuances i ON u.id = i.user_id
         LEFT JOIN certificates c ON i.certificate_id = c.id
         WHERE u.role = 'user'
         GROUP BY u.id
         ORDER BY cert_count DESC, total_points DESC
         LIMIT ?`,
        [limit]
      );
    } else {
      const users = await db.findMany('users', u => u.role === 'user');
      const issuances = await db.getAll('certificate_issuances');
      const certs = await db.getAll('certificates');

      ranking = users.map(user => {
        const userIssuances = issuances.filter(i => i.user_id === user.id);
        let totalPoints = 0;
        userIssuances.forEach(i => {
          const cert = certs.find(c => c.id === i.certificate_id);
          if (cert) totalPoints += cert.points_reward || 0;
        });

        return {
          id: user.id,
          real_name: user.real_name,
          branch: user.branch,
          avatar: user.avatar,
          cert_count: userIssuances.length,
          total_points: totalPoints
        };
      }).sort((a, b) => b.cert_count - a.cert_count || b.total_points - a.total_points).slice(0, limit);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: ranking
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
