const express = require('express');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const STAGE_CONFIG = [
  { code: 'application', name: '入党申请', sortOrder: 1, description: '提交入党申请书，党支部初审' },
  { code: 'activist', name: '积极分子培养', sortOrder: 2, description: '参加党课培训、培养联系人考察' },
  { code: 'candidate', name: '发展对象考察', sortOrder: 3, description: '政治审查、确定发展对象' },
  { code: 'probationary', name: '预备党员接收', sortOrder: 4, description: '支部大会讨论、上级审批' },
  { code: 'probation', name: '预备期管理', sortOrder: 5, description: '预备期一年培养考察' },
  { code: 'formal', name: '转正审批', sortOrder: 6, description: '转正申请、支部大会表决' }
];

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const addHistory = async (developmentId, stageCode, actionType, actionDetail, operatorId, operatorName) => {
  await db.insert(
    'party_development_history',
    { development_id: developmentId, stage_code: stageCode, action_type: actionType, action_detail: actionDetail, operator_id: operatorId, operator_name: operatorName },
    'INSERT INTO party_development_history (development_id, stage_code, action_type, action_detail, operator_id, operator_name) VALUES (?, ?, ?, ?, ?, ?)',
    [developmentId, stageCode, actionType, actionDetail, operatorId, operatorName]
  );
};

const initStages = async (developmentId) => {
  for (const stage of STAGE_CONFIG) {
    await db.insert(
      'party_development_stages',
      { development_id: developmentId, stage_code: stage.code, stage_name: stage.name, status: stage.code === 'application' ? 'in_progress' : 'pending', description: stage.description, sort_order: stage.sortOrder },
      'INSERT INTO party_development_stages (development_id, stage_code, stage_name, status, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [developmentId, stage.code, stage.name, stage.code === 'application' ? 'in_progress' : 'pending', stage.description, stage.sortOrder]
    );
  }
};

const getDevelopmentWithDetails = async (developmentId) => {
  const development = await db.getById('party_development', developmentId);
  if (!development) return null;

  const stages = await db.findMany(
    'party_development_stages',
    s => s.development_id === developmentId,
    'SELECT * FROM party_development_stages WHERE development_id = ? ORDER BY sort_order ASC',
    [developmentId]
  );

  const materials = await db.findMany(
    'party_development_materials',
    m => m.development_id === developmentId,
    'SELECT * FROM party_development_materials WHERE development_id = ? ORDER BY created_at DESC',
    [developmentId]
  );

  const history = await db.findMany(
    'party_development_history',
    h => h.development_id === developmentId,
    'SELECT * FROM party_development_history WHERE development_id = ? ORDER BY created_at DESC',
    [developmentId]
  );

  return { ...development, stages, materials, history };
};

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const development = await db.findOne(
      'party_development',
      d => d.user_id === req.user.id,
      'SELECT * FROM party_development WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!development) {
      return res.json({ code: 200, message: '获取成功', data: null });
    }

    const data = await getDevelopmentWithDetails(development.id);
    res.json({ code: 200, message: '获取成功', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const existing = await db.findOne(
      'party_development',
      d => d.user_id === req.user.id,
      'SELECT * FROM party_development WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (existing) {
      return res.status(400).json({ code: 400, message: '您已提交入党申请，请勿重复提交' });
    }

    const now = new Date().toISOString();
    const development = await db.insert(
      'party_development',
      { user_id: req.user.id, current_stage: 'application', overall_status: 'in_progress', application_date: now },
      'INSERT INTO party_development (user_id, current_stage, overall_status, application_date) VALUES (?, ?, ?, ?)',
      [req.user.id, 'application', 'in_progress', now]
    );

    await initStages(development.id);

    const user = await db.getById('users', req.user.id);
    await addHistory(development.id, 'application', 'submit', '提交入党申请书', req.user.id, user ? user.real_name : '未知用户');

    const data = await getDevelopmentWithDetails(development.id);
    res.json({ code: 200, message: '申请提交成功', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/materials', authMiddleware, async (req, res) => {
  try {
    const { development_id, stage_code, material_name, material_type, file_url, file_size, description } = req.body;

    if (!development_id || !material_name) {
      return res.status(400).json({ code: 400, message: '发展记录ID和材料名称不能为空' });
    }

    const development = await db.getById('party_development', development_id);
    if (!development) {
      return res.status(404).json({ code: 404, message: '发展记录不存在' });
    }

    if (development.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }

    const material = await db.insert(
      'party_development_materials',
      { development_id, stage_code: stage_code || null, material_name, material_type: material_type || null, file_url: file_url || null, file_size: file_size || null, uploaded_by: req.user.id, description: description || null },
      'INSERT INTO party_development_materials (development_id, stage_code, material_name, material_type, file_url, file_size, uploaded_by, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [development_id, stage_code || null, material_name, material_type || null, file_url || null, file_size || null, req.user.id, description || null]
    );

    const user = await db.getById('users', req.user.id);
    await addHistory(development_id, stage_code || development.current_stage, 'upload', `上传材料：${material_name}`, req.user.id, user ? user.real_name : '未知用户');

    res.json({ code: 200, message: '材料上传成功', data: material });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/materials/:id', authMiddleware, async (req, res) => {
  try {
    const material = await db.getById('party_development_materials', req.params.id);
    if (!material) {
      return res.status(404).json({ code: 404, message: '材料不存在' });
    }

    const development = await db.getById('party_development', material.development_id);
    if (!development) {
      return res.status(404).json({ code: 404, message: '发展记录不存在' });
    }

    if (development.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }

    await db.remove('party_development_materials', req.params.id);

    const user = await db.getById('users', req.user.id);
    await addHistory(material.development_id, material.stage_code, 'delete_material', `删除材料：${material.material_name}`, req.user.id, user ? user.real_name : '未知用户');

    res.json({ code: 200, message: '材料删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/list', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, page_size = 10, keyword = '', stage = '', status = '' } = req.query;

    const predicate = (d) => {
      let match = true;
      if (stage) match = match && d.current_stage === stage;
      if (status) match = match && d.overall_status === status;
      return match;
    };

    const sqlBase = 'FROM party_development pd LEFT JOIN users u ON pd.user_id = u.id WHERE 1=1';
    const countSql = `SELECT COUNT(*) as c ${sqlBase}`;
    const sql = `SELECT pd.*, u.real_name, u.branch, u.phone ${sqlBase}`;

    const listSql = sql + ' ORDER BY pd.created_at DESC';

    const result = await db.paginate('party_development', {
      page: parseInt(page),
      page_size: parseInt(page_size),
      predicate,
      sortBy: 'created_at',
      sortOrder: 'desc',
      sql: listSql,
      countSql
    });

    res.json({ code: 200, message: '获取成功', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const data = await getDevelopmentWithDetails(req.params.id);
    if (!data) {
      return res.status(404).json({ code: 404, message: '发展记录不存在' });
    }

    const user = await db.getById('users', data.user_id);
    if (user) {
      delete user.password;
      data.user = user;
    }

    res.json({ code: 200, message: '获取成功', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/admin/:id/stage/:stageCode', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id, stageCode } = req.params;
    const { status, review_opinion, start_date, end_date, deadline_date } = req.body;

    const development = await db.getById('party_development', id);
    if (!development) {
      return res.status(404).json({ code: 404, message: '发展记录不存在' });
    }

    const stage = await db.findOne(
      'party_development_stages',
      s => s.development_id === parseInt(id) && s.stage_code === stageCode,
      'SELECT * FROM party_development_stages WHERE development_id = ? AND stage_code = ? LIMIT 1',
      [id, stageCode]
    );

    if (!stage) {
      return res.status(404).json({ code: 404, message: '阶段不存在' });
    }

    const user = await db.getById('users', req.user.id);
    const reviewerName = user ? user.real_name : '管理员';

    const updateData = {};
    if (status) updateData.status = status;
    if (review_opinion !== undefined) updateData.review_opinion = review_opinion;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (deadline_date) updateData.deadline_date = deadline_date;

    if (status === 'completed' && !stage.review_date) {
      updateData.review_date = new Date().toISOString();
    }
    if (status && !stage.reviewer) {
      updateData.reviewer = reviewerName;
    }

    await db.update(
      'party_development_stages',
      stage.id,
      updateData,
      `UPDATE party_development_stages SET ${Object.keys(updateData).map(k => `${k} = ?`).join(', ')} WHERE id = ?`,
      Object.values(updateData)
    );

    if (status === 'completed') {
      const currentIndex = STAGE_CONFIG.findIndex(s => s.code === stageCode);
      if (currentIndex < STAGE_CONFIG.length - 1) {
        const nextStage = STAGE_CONFIG[currentIndex + 1];
        const nextStageRecord = await db.findOne(
          'party_development_stages',
          s => s.development_id === parseInt(id) && s.stage_code === nextStage.code,
          'SELECT * FROM party_development_stages WHERE development_id = ? AND stage_code = ? LIMIT 1',
          [id, nextStage.code]
        );

        if (nextStageRecord && nextStageRecord.status === 'pending') {
          const now = new Date().toISOString();
          let deadline = null;
          if (nextStage.code === 'activist') deadline = addDays(now, 180);
          else if (nextStage.code === 'candidate') deadline = addDays(now, 90);
          else if (nextStage.code === 'probation') deadline = addDays(now, 365);
          else if (nextStage.code === 'formal') deadline = addDays(now, 30);

          await db.update(
            'party_development_stages',
            nextStageRecord.id,
            { status: 'in_progress', start_date: now, deadline_date: deadline },
            'UPDATE party_development_stages SET status = ?, start_date = ?, deadline_date = ? WHERE id = ?',
            ['in_progress', now, deadline]
          );

          const devUpdateData = { current_stage: nextStage.code };
          if (nextStage.code === 'activist') devUpdateData.activist_date = now;
          else if (nextStage.code === 'candidate') devUpdateData.candidate_date = now;
          else if (nextStage.code === 'probationary') devUpdateData.probationary_date = now;
          else if (nextStage.code === 'probation') {
            devUpdateData.probation_start_date = now;
            devUpdateData.probation_end_date = addDays(now, 365);
          } else if (nextStage.code === 'formal') devUpdateData.formal_date = now;

          await db.update(
            'party_development',
            id,
            devUpdateData,
            `UPDATE party_development SET ${Object.keys(devUpdateData).map(k => `${k} = ?`).join(', ')} WHERE id = ?`,
            Object.values(devUpdateData)
          );

          await addHistory(id, nextStage.code, 'start', `进入${nextStage.name}阶段`, req.user.id, reviewerName);
        }
      } else {
        await db.update(
          'party_development',
          id,
          { overall_status: 'completed', formal_date: new Date().toISOString() },
          'UPDATE party_development SET overall_status = ?, formal_date = ? WHERE id = ?',
          ['completed', new Date().toISOString()]
        );
      }
    }

    await addHistory(id, stageCode, 'review', `审核${stage.stage_name}阶段：${status === 'completed' ? '通过' : status}${review_opinion ? ' - ' + review_opinion : ''}`, req.user.id, reviewerName);

    const data = await getDevelopmentWithDetails(id);
    res.json({ code: 200, message: '更新成功', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { branch_secretary, introducer1, introducer2, remarks } = req.body;

    const development = await db.getById('party_development', req.params.id);
    if (!development) {
      return res.status(404).json({ code: 404, message: '发展记录不存在' });
    }

    const updateData = {};
    if (branch_secretary !== undefined) updateData.branch_secretary = branch_secretary;
    if (introducer1 !== undefined) updateData.introducer1 = introducer1;
    if (introducer2 !== undefined) updateData.introducer2 = introducer2;
    if (remarks !== undefined) updateData.remarks = remarks;

    await db.update(
      'party_development',
      req.params.id,
      updateData,
      `UPDATE party_development SET ${Object.keys(updateData).map(k => `${k} = ?`).join(', ')} WHERE id = ?`,
      Object.values(updateData)
    );

    const user = await db.getById('users', req.user.id);
    await addHistory(req.params.id, development.current_stage, 'update_info', '更新发展基本信息', req.user.id, user ? user.real_name : '管理员');

    const data = await getDevelopmentWithDetails(req.params.id);
    res.json({ code: 200, message: '更新成功', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/reminders/list', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const reminders = await db.findMany(
      'party_development_stages',
      s => {
        if (s.status !== 'in_progress' || !s.deadline_date) return false;
        return s.deadline_date <= in7Days;
      },
      `SELECT s.*, pd.user_id, u.real_name, u.branch
       FROM party_development_stages s
       LEFT JOIN party_development pd ON s.development_id = pd.id
       LEFT JOIN users u ON pd.user_id = u.id
       WHERE s.status = 'in_progress' AND s.deadline_date IS NOT NULL AND s.deadline_date <= ?
       ORDER BY s.deadline_date ASC`,
      [in7Days]
    );

    res.json({ code: 200, message: '获取成功', data: reminders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/stages/config', authMiddleware, (req, res) => {
  res.json({ code: 200, message: '获取成功', data: STAGE_CONFIG });
});

module.exports = router;
