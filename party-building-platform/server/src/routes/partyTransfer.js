const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const getStorage = (req) => {
  const materialsDir = req.app.get('materialsDir');
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const transferId = req.body.transfer_id || 'temp';
      const targetDir = path.join(materialsDir, 'transfer', String(transferId));
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const safeName = file.originalname.replace(/[\\/:*?"<>|]/g, '_');
      cb(null, `${timestamp}_${random}_${safeName}`);
    }
  });
};

const createUpload = (req) => multer({
  storage: getStorage(req),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
      '.txt', '.zip', '.rar'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，支持：PDF、Office文档、图片、压缩包'));
    }
  }
});

const STAGE_CONFIG = [
  { code: 'submit', name: '提交申请', sortOrder: 1, description: '党员提交组织关系转接申请', role: 'user', handler: '申请人' },
  { code: 'branch_out', name: '转出支部审核', sortOrder: 2, description: '原所在党支部审核转出申请', role: 'admin', handler: '支部书记' },
  { code: 'material_check', name: '材料校验', sortOrder: 3, description: '校验转接所需材料是否齐全有效', role: 'admin', handler: '组织委员' },
  { code: 'committee_out', name: '上级党委审批(转出)', sortOrder: 4, description: '上级党委审批转出', role: 'admin', handler: '党委书记' },
  { code: 'branch_in', name: '转入支部接收', sortOrder: 5, description: '目标党支部审核接收', role: 'admin', handler: '接收支部书记' },
  { code: 'committee_in', name: '上级党委审批(转入)', sortOrder: 6, description: '上级党委审批转入', role: 'admin', handler: '党委书记' },
  { code: 'complete', name: '转接完成', sortOrder: 7, description: '组织关系转接完成', role: 'system', handler: '系统' }
];

const REQUIRED_MATERIALS = [
  { name: '中国共产党党员组织关系介绍信', type: 'introduction_letter', required: true },
  { name: '党员证明材料', type: 'party_certificate', required: true },
  { name: '入党志愿书复印件', type: 'application_copy', required: true },
  { name: '现实表现鉴定材料', type: 'performance_review', required: false },
  { name: '党费缴纳证明', type: 'party_fee_proof', required: true }
];

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const addHistory = async (transferId, stageCode, actionType, actionDetail, operatorId, operatorName, operatorRole) => {
  await db.insert(
    'party_transfer_history',
    { transfer_id: transferId, stage_code: stageCode, action_type: actionType, action_detail: actionDetail, operator_id: operatorId, operator_name: operatorName, operator_role: operatorRole },
    'INSERT INTO party_transfer_history (transfer_id, stage_code, action_type, action_detail, operator_id, operator_name, operator_role) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [transferId, stageCode, actionType, actionDetail, operatorId, operatorName, operatorRole]
  );
};

const initStages = async (transferId) => {
  for (const stage of STAGE_CONFIG) {
    await db.insert(
      'party_transfer_stages',
      { transfer_id: transferId, stage_code: stage.code, stage_name: stage.name, status: stage.code === 'submit' ? 'completed' : 'pending', description: stage.description, handler: stage.handler, handler_role: stage.role, sort_order: stage.sortOrder },
      'INSERT INTO party_transfer_stages (transfer_id, stage_code, stage_name, status, description, handler, handler_role, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [transferId, stage.code, stage.name, stage.code === 'submit' ? 'completed' : 'pending', stage.description, stage.handler, stage.role, stage.sortOrder]
    );
  }
};

const getTransferWithDetails = async (transferId) => {
  const transfer = await db.getById('party_transfers', transferId);
  if (!transfer) return null;

  const stages = await db.findMany(
    'party_transfer_stages',
    s => s.transfer_id === transferId,
    'SELECT * FROM party_transfer_stages WHERE transfer_id = ? ORDER BY sort_order ASC',
    [transferId]
  );

  const materials = await db.findMany(
    'party_transfer_materials',
    m => m.transfer_id === transferId,
    'SELECT * FROM party_transfer_materials WHERE transfer_id = ? ORDER BY created_at DESC',
    [transferId]
  );

  const history = await db.findMany(
    'party_transfer_history',
    h => h.transfer_id === transferId,
    'SELECT * FROM party_transfer_history WHERE transfer_id = ? ORDER BY created_at DESC',
    [transferId]
  );

  return { ...transfer, stages, materials, history };
};

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const transfers = await db.findMany(
      'party_transfers',
      t => t.user_id === req.user.id,
      'SELECT * FROM party_transfers WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ code: 200, message: '获取成功', data: transfers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my/:id', authMiddleware, async (req, res) => {
  try {
    const transfer = await db.getById('party_transfers', req.params.id);
    if (!transfer) {
      return res.status(404).json({ code: 404, message: '转接记录不存在' });
    }
    if (transfer.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权访问' });
    }

    const data = await getTransferWithDetails(req.params.id);
    if (data) {
      const user = await db.getById('users', data.user_id);
      if (user) {
        delete user.password;
        data.user = user;
      }
    }
    res.json({ code: 200, message: '获取成功', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/stages/config', authMiddleware, (req, res) => {
  res.json({ code: 200, message: '获取成功', data: STAGE_CONFIG });
});

router.get('/materials/required', authMiddleware, (req, res) => {
  res.json({ code: 200, message: '获取成功', data: REQUIRED_MATERIALS });
});

router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { transfer_type, transfer_direction, from_branch, to_branch, from_organization, to_organization, reason, remarks } = req.body;

    if (!from_branch || !to_branch || !reason) {
      return res.status(400).json({ code: 400, message: '转出支部、转入支部和转接原因不能为空' });
    }

    const now = new Date().toISOString();
    const expectedDate = addDays(now, 30);

    const transfer = await db.insert(
      'party_transfers',
      {
        user_id: req.user.id,
        transfer_type: transfer_type || 'internal',
        transfer_direction: transfer_direction || 'out',
        from_branch,
        to_branch,
        from_organization: from_organization || null,
        to_organization: to_organization || null,
        reason,
        remarks: remarks || null,
        current_stage: 'branch_out',
        overall_status: 'processing',
        submit_date: now,
        expected_date: expectedDate
      },
      'INSERT INTO party_transfers (user_id, transfer_type, transfer_direction, from_branch, to_branch, from_organization, to_organization, reason, remarks, current_stage, overall_status, submit_date, expected_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, transfer_type || 'internal', transfer_direction || 'out', from_branch, to_branch, from_organization || null, to_organization || null, reason, remarks || null, 'branch_out', 'processing', now, expectedDate]
    );

    await initStages(transfer.id);

    await db.update(
      'party_transfer_stages',
      null,
      { handle_date: now },
      `UPDATE party_transfer_stages SET handle_date = ? WHERE transfer_id = ? AND stage_code = 'submit'`,
      [now, transfer.id]
    );

    const user = await db.getById('users', req.user.id);
    await addHistory(transfer.id, 'submit', 'submit', `提交组织关系转接申请：从${from_branch}转至${to_branch}，原因：${reason}`, req.user.id, user ? user.real_name : '未知用户', user ? user.role : 'user');

    for (const mat of REQUIRED_MATERIALS) {
      await db.insert(
        'party_transfer_materials',
        { transfer_id: transfer.id, material_name: mat.name, material_type: mat.type, is_required: mat.required ? 1 : 0, verify_status: 'pending', stage_code: 'material_check' },
        'INSERT INTO party_transfer_materials (transfer_id, material_name, material_type, is_required, verify_status, stage_code) VALUES (?, ?, ?, ?, ?, ?)',
        [transfer.id, mat.name, mat.type, mat.required ? 1 : 0, 'pending', 'material_check']
      );
    }

    const data = await getTransferWithDetails(transfer.id);
    res.json({ code: 200, message: '申请提交成功', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/materials/upload', authMiddleware, (req, res) => {
  const upload = createUpload(req).single('file');
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ code: 400, message: '文件大小不能超过50MB' });
      }
      return res.status(400).json({ code: 400, message: '文件上传失败：' + err.message });
    }
    if (err) {
      return res.status(400).json({ code: 400, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择要上传的文件' });
    }

    try {
      const { transfer_id, material_name, material_type, description, material_id } = req.body;

      if (!transfer_id) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ code: 400, message: '转接记录ID不能为空' });
      }

      const transfer = await db.getById('party_transfers', transfer_id);
      if (!transfer) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ code: 404, message: '转接记录不存在' });
      }

      if (transfer.user_id !== req.user.id && req.user.role !== 'admin') {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ code: 403, message: '无权操作' });
      }

      const finalName = material_name && material_name.trim() ? material_name : req.file.originalname;
      const fileUrl = `/uploads/materials/transfer/${transfer_id}/${req.file.filename}`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const finalType = material_type || ext.substring(1);

      let material;
      if (material_id) {
        const existingMat = await db.getById('party_transfer_materials', material_id);
        if (existingMat && existingMat.transfer_id === parseInt(transfer_id)) {
          await db.update(
            'party_transfer_materials',
            material_id,
            { material_name: finalName, material_type: finalType, file_url: fileUrl, file_size: req.file.size, uploaded_by: req.user.id, description: description || existingMat.description, verify_status: 'pending' },
            `UPDATE party_transfer_materials SET material_name = ?, material_type = ?, file_url = ?, file_size = ?, uploaded_by = ?, description = ?, verify_status = ? WHERE id = ?`,
            [finalName, finalType, fileUrl, req.file.size, req.user.id, description || existingMat.description, 'pending', material_id]
          );
          material = await db.getById('party_transfer_materials', material_id);
        }
      }

      if (!material) {
        material = await db.insert(
          'party_transfer_materials',
          {
            transfer_id: parseInt(transfer_id),
            material_name: finalName,
            material_type: finalType,
            file_url: fileUrl,
            file_size: req.file.size,
            uploaded_by: req.user.id,
            is_required: 0,
            verify_status: 'pending',
            description: description || null
          },
          'INSERT INTO party_transfer_materials (transfer_id, material_name, material_type, file_url, file_size, uploaded_by, is_required, verify_status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [parseInt(transfer_id), finalName, finalType, fileUrl, req.file.size, req.user.id, 0, 'pending', description || null]
        );
      }

      const user = await db.getById('users', req.user.id);
      await addHistory(parseInt(transfer_id), transfer.current_stage, 'upload_material', `上传材料：${finalName}`, req.user.id, user ? user.real_name : '未知用户', user ? user.role : 'user');

      res.json({ code: 200, message: '材料上传成功', data: material });
    } catch (innerErr) {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error(innerErr);
      res.status(500).json({ code: 500, message: '服务器内部错误', error: innerErr.message });
    }
  });
});

router.get('/materials/download/:id', authMiddleware, async (req, res) => {
  try {
    const material = await db.getById('party_transfer_materials', req.params.id);
    if (!material || !material.file_url) {
      return res.status(404).json({ code: 404, message: '材料不存在' });
    }

    const transfer = await db.getById('party_transfers', material.transfer_id);
    if (!transfer) {
      return res.status(404).json({ code: 404, message: '转接记录不存在' });
    }

    if (transfer.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }

    const materialsDir = req.app.get('materialsDir');
    const relativePath = material.file_url.replace('/uploads/materials/', '');
    const absolutePath = path.join(materialsDir, relativePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ code: 404, message: '文件已不存在' });
    }

    res.download(absolutePath, material.material_name, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: '下载失败' });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/materials/:id/verify', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { verify_status, verify_opinion } = req.body;
    const material = await db.getById('party_transfer_materials', req.params.id);
    if (!material) {
      return res.status(404).json({ code: 404, message: '材料不存在' });
    }

    const now = new Date().toISOString();
    const user = await db.getById('users', req.user.id);

    await db.update(
      'party_transfer_materials',
      req.params.id,
      { verify_status, verify_opinion: verify_opinion || null, verified_by: req.user.id, verified_at: now },
      `UPDATE party_transfer_materials SET verify_status = ?, verify_opinion = ?, verified_by = ?, verified_at = ? WHERE id = ?`,
      [verify_status, verify_opinion || null, req.user.id, now, req.params.id]
    );

    await addHistory(material.transfer_id, 'material_check', 'verify_material', `校验材料：${material.material_name}，结果：${verify_status === 'passed' ? '通过' : verify_status === 'rejected' ? '不通过' : '待校验'}${verify_opinion ? ' - ' + verify_opinion : ''}`, req.user.id, user ? user.real_name : '管理员', 'admin');

    res.json({ code: 200, message: '材料校验完成' });
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

    const sqlBase = 'FROM party_transfers pt LEFT JOIN users u ON pt.user_id = u.id WHERE 1=1';
    const countSql = `SELECT COUNT(*) as c ${sqlBase}`;
    const sql = `SELECT pt.*, u.real_name, u.branch as user_branch, u.phone ${sqlBase}`;

    const listSql = sql + ' ORDER BY pt.created_at DESC';

    const result = await db.paginate('party_transfers', {
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
    const data = await getTransferWithDetails(req.params.id);
    if (!data) {
      return res.status(404).json({ code: 404, message: '转接记录不存在' });
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
    const { status, opinion, action } = req.body;

    const transfer = await db.getById('party_transfers', id);
    if (!transfer) {
      return res.status(404).json({ code: 404, message: '转接记录不存在' });
    }

    if (transfer.overall_status === 'completed' || transfer.overall_status === 'rejected') {
      return res.status(400).json({ code: 400, message: '该转接流程已结束，无法继续操作' });
    }

    if (transfer.current_stage !== stageCode) {
      return res.status(400).json({ code: 400, message: '当前审批阶段不匹配' });
    }

    const stage = await db.findOne(
      'party_transfer_stages',
      s => s.transfer_id === parseInt(id) && s.stage_code === stageCode,
      'SELECT * FROM party_transfer_stages WHERE transfer_id = ? AND stage_code = ? LIMIT 1',
      [id, stageCode]
    );

    if (!stage) {
      return res.status(404).json({ code: 404, message: '阶段不存在' });
    }

    const user = await db.getById('users', req.user.id);
    const handlerName = user ? user.real_name : '管理员';
    const now = new Date().toISOString();

    if (action === 'reject') {
      await db.update(
        'party_transfer_stages',
        stage.id,
        { status: 'rejected', opinion: opinion || '审批不通过', handler: handlerName, handle_date: now },
        `UPDATE party_transfer_stages SET status = ?, opinion = ?, handler = ?, handle_date = ? WHERE id = ?`,
        ['rejected', opinion || '审批不通过', handlerName, now, stage.id]
      );

      await db.update(
        'party_transfers',
        id,
        { overall_status: 'rejected', updated_at: now },
        `UPDATE party_transfers SET overall_status = ?, updated_at = ? WHERE id = ?`,
        ['rejected', now, id]
      );

      await addHistory(id, stageCode, 'reject', `驳回${stage.stage_name}：${opinion || '审批不通过'}`, req.user.id, handlerName, 'admin');

      const data = await getTransferWithDetails(id);
      return res.json({ code: 200, message: '已驳回该转接申请', data });
    }

    await db.update(
      'party_transfer_stages',
      stage.id,
      { status: 'completed', opinion: opinion || '审批通过', handler: handlerName, handle_date: now },
      `UPDATE party_transfer_stages SET status = ?, opinion = ?, handler = ?, handle_date = ? WHERE id = ?`,
      ['completed', opinion || '审批通过', handlerName, now, stage.id]
    );

    await addHistory(id, stageCode, 'approve', `通过${stage.stage_name}${opinion ? ' - ' + opinion : ''}`, req.user.id, handlerName, 'admin');

    const currentIndex = STAGE_CONFIG.findIndex(s => s.code === stageCode);
    if (currentIndex < STAGE_CONFIG.length - 1) {
      const nextStage = STAGE_CONFIG[currentIndex + 1];
      const nextStageRecord = await db.findOne(
        'party_transfer_stages',
        s => s.transfer_id === parseInt(id) && s.stage_code === nextStage.code,
        'SELECT * FROM party_transfer_stages WHERE transfer_id = ? AND stage_code = ? LIMIT 1',
        [id, nextStage.code]
      );

      if (nextStageRecord && nextStageRecord.status === 'pending') {
        const deadline = addDays(now, 7);

        await db.update(
          'party_transfer_stages',
          nextStageRecord.id,
          { status: 'in_progress', deadline_date: deadline },
          'UPDATE party_transfer_stages SET status = ?, deadline_date = ? WHERE id = ?',
          ['in_progress', deadline, nextStageRecord.id]
        );

        await db.update(
          'party_transfers',
          id,
          { current_stage: nextStage.code, updated_at: now },
          `UPDATE party_transfers SET current_stage = ?, updated_at = ? WHERE id = ?`,
          [nextStage.code, now, id]
        );

        await addHistory(id, nextStage.code, 'start_stage', `进入${nextStage.name}阶段`, req.user.id, handlerName, 'admin');
      }
    } else {
      await db.update(
        'party_transfers',
        id,
        { overall_status: 'completed', current_stage: 'complete', completed_date: now, updated_at: now },
        `UPDATE party_transfers SET overall_status = ?, current_stage = ?, completed_date = ?, updated_at = ? WHERE id = ?`,
        ['completed', 'complete', now, now, id]
      );
      await addHistory(id, 'complete', 'complete', '组织关系转接完成', req.user.id, handlerName, 'admin');
    }

    const data = await getTransferWithDetails(id);
    res.json({ code: 200, message: '审批通过', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/admin/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await db.getById('party_transfers', id);
    if (!transfer) {
      return res.status(404).json({ code: 404, message: '转接记录不存在' });
    }
    if (transfer.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }
    if (transfer.overall_status === 'completed' || transfer.overall_status === 'rejected') {
      return res.status(400).json({ code: 400, message: '该转接流程已结束，无法撤销' });
    }

    const now = new Date().toISOString();
    const user = await db.getById('users', req.user.id);

    await db.update(
      'party_transfers',
      id,
      { overall_status: 'cancelled', updated_at: now },
      `UPDATE party_transfers SET overall_status = ?, updated_at = ? WHERE id = ?`,
      ['cancelled', now, id]
    );

    await addHistory(id, transfer.current_stage, 'cancel', `撤销转接申请：${req.body.reason || '用户主动撤销'}`, req.user.id, user ? user.real_name : '未知用户', user ? user.role : 'user');

    res.json({ code: 200, message: '申请已撤销' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allTransfers = await db.findMany(
      'party_transfers',
      () => true,
      'SELECT * FROM party_transfers'
    );

    const total = allTransfers.length;
    const pending = allTransfers.filter(t => t.overall_status === 'pending').length;
    const processing = allTransfers.filter(t => t.overall_status === 'processing').length;
    const completed = allTransfers.filter(t => t.overall_status === 'completed').length;
    const rejected = allTransfers.filter(t => t.overall_status === 'rejected').length;
    const cancelled = allTransfers.filter(t => t.overall_status === 'cancelled').length;

    const byStage = STAGE_CONFIG.map(s => ({
      stage: s.code,
      name: s.name,
      count: allTransfers.filter(t => t.current_stage === s.code && t.overall_status === 'processing').length
    }));

    const byMonth = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = allTransfers.filter(t => {
        const created = new Date(t.created_at);
        return created >= d && created < nextD;
      }).length;
      byMonth.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        count
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        total,
        pending,
        processing,
        completed,
        rejected,
        cancelled,
        by_stage: byStage,
        by_month: byMonth
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
