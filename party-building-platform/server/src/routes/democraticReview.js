const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;
    const year = req.query.year;
    const branch = req.query.branch;

    const predicate = item => {
      if (status && item.status !== status) return false;
      if (year && item.year !== parseInt(year)) return false;
      if (branch && item.branch !== branch) return false;
      if (item.status === 'draft') return false;
      return true;
    };

    let sql = 'SELECT * FROM democratic_reviews WHERE status != ?';
    const params = ['draft'];
    let countSql = 'SELECT COUNT(*) as c FROM democratic_reviews WHERE status != ?';
    const countParams = ['draft'];

    if (status) {
      sql = 'SELECT * FROM democratic_reviews WHERE status = ?';
      params.length = 0;
      params.push(status);
      countSql = 'SELECT COUNT(*) as c FROM democratic_reviews WHERE status = ?';
      countParams.length = 0;
      countParams.push(status);
    }
    if (year) {
      sql += ' AND year = ?';
      params.push(parseInt(year));
      countSql += ' AND year = ?';
      countParams.push(parseInt(year));
    }
    if (branch) {
      sql += ' AND branch = ?';
      params.push(branch);
      countSql += ' AND branch = ?';
      countParams.push(branch);
    }

    const result = await db.paginate('democratic_reviews', {
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
    for (const review of result.list) {
      const formItems = db.useMySQL
        ? await db.exec('SELECT * FROM democratic_review_form_items WHERE review_id = ? ORDER BY sort_order', [review.id])
        : await db.findMany('democratic_review_form_items', fi => fi.review_id === review.id);

      let participantCount = 0;
      let completedCount = 0;
      let avgScore = 0;

      if (db.useMySQL) {
        const [pc] = await db.exec('SELECT COUNT(DISTINCT reviewer_id) as c FROM democratic_review_scores WHERE review_id = ?', [review.id]);
        participantCount = pc.c || 0;
        const [cc] = await db.exec('SELECT COUNT(DISTINCT target_user_id) as c FROM democratic_review_scores WHERE review_id = ? AND review_type = ?', [review.id, 'mutual']);
        completedCount = cc.c || 0;
        const [as] = await db.exec('SELECT AVG(score) as avg FROM democratic_review_scores WHERE review_id = ? AND review_type = ?', [review.id, 'mutual']);
        avgScore = as.avg || 0;
      } else {
        const scores = await db.findMany('democratic_review_scores', s => s.review_id === review.id);
        const reviewerSet = new Set(scores.map(s => s.reviewer_id));
        participantCount = reviewerSet.size;
        const mutualScores = scores.filter(s => s.review_type === 'mutual');
        const targetSet = new Set(mutualScores.map(s => s.target_user_id));
        completedCount = targetSet.size;
        if (mutualScores.length > 0) {
          avgScore = mutualScores.reduce((sum, s) => sum + (s.score || 0), 0) / mutualScores.length;
        }
      }

      list.push({
        ...review,
        form_items: formItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        participant_count: participantCount,
        completed_count: completedCount,
        avg_score: Math.round(avgScore * 100) / 100
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list,
        total: result.total,
        page,
        page_size: pageSize
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id);

    const review = await db.getById('democratic_reviews', reviewId);
    if (!review) {
      return res.status(404).json({ code: 404, message: '评议不存在' });
    }

    const formItems = db.useMySQL
      ? await db.exec('SELECT * FROM democratic_review_form_items WHERE review_id = ? ORDER BY sort_order', [reviewId])
      : (await db.findMany('democratic_review_form_items', fi => fi.review_id === reviewId)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    let participantCount = 0;
    let completedCount = 0;
    let avgScore = 0;

    if (db.useMySQL) {
      const [pc] = await db.exec('SELECT COUNT(DISTINCT reviewer_id) as c FROM democratic_review_scores WHERE review_id = ?', [reviewId]);
      participantCount = pc.c || 0;
      const [cc] = await db.exec('SELECT COUNT(DISTINCT target_user_id) as c FROM democratic_review_scores WHERE review_id = ? AND review_type = ?', [reviewId, 'mutual']);
      completedCount = cc.c || 0;
      const [as] = await db.exec('SELECT AVG(score) as avg FROM democratic_review_scores WHERE review_id = ? AND review_type = ?', [reviewId, 'mutual']);
      avgScore = as.avg || 0;
    } else {
      const scores = await db.findMany('democratic_review_scores', s => s.review_id === reviewId);
      const reviewerSet = new Set(scores.map(s => s.reviewer_id));
      participantCount = reviewerSet.size;
      const mutualScores = scores.filter(s => s.review_type === 'mutual');
      const targetSet = new Set(mutualScores.map(s => s.target_user_id));
      completedCount = targetSet.size;
      if (mutualScores.length > 0) {
        avgScore = mutualScores.reduce((sum, s) => sum + (s.score || 0), 0) / mutualScores.length;
      }
    }

    let myScores = [];
    if (req.user) {
      myScores = db.useMySQL
        ? await db.exec('SELECT * FROM democratic_review_scores WHERE review_id = ? AND reviewer_id = ?', [reviewId, req.user.id])
        : await db.findMany('democratic_review_scores', s => s.review_id === reviewId && s.reviewer_id === req.user.id);
    }

    const history = db.useMySQL
      ? await db.exec('SELECT * FROM democratic_review_history WHERE review_id = ? ORDER BY created_at DESC', [reviewId])
      : (await db.findMany('democratic_review_history', h => h.review_id === reviewId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        ...review,
        form_items: formItems,
        participant_count: participantCount,
        completed_count: completedCount,
        avg_score: Math.round(avgScore * 100) / 100,
        my_scores: myScores,
        history
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id);

    const review = await db.getById('democratic_reviews', reviewId);
    if (!review) {
      return res.status(404).json({ code: 404, message: '评议不存在' });
    }

    const formItems = db.useMySQL
      ? await db.exec('SELECT * FROM democratic_review_form_items WHERE review_id = ? ORDER BY sort_order', [reviewId])
      : (await db.findMany('democratic_review_form_items', fi => fi.review_id === reviewId)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const scoreItems = formItems.filter(fi => fi.item_type === 'score');
    const totalMaxScore = scoreItems.reduce((sum, fi) => sum + (fi.max_score || 0) * (fi.weight || 1), 0);

    const allUsers = db.useMySQL
      ? await db.exec("SELECT id, real_name, branch, avatar FROM users WHERE branch = ? AND role != 'admin'", [review.branch])
      : await db.findMany('users', u => u.branch === review.branch && u.role !== 'admin');

    const allScores = db.useMySQL
      ? await db.exec('SELECT * FROM democratic_review_scores WHERE review_id = ?', [reviewId])
      : await db.findMany('democratic_review_scores', s => s.review_id === reviewId);

    const results = allUsers.map(user => {
      const userMutualScores = allScores.filter(s => s.target_user_id === user.id && s.review_type === 'mutual');
      const userOrgScores = allScores.filter(s => s.target_user_id === user.id && s.review_type === 'organization');

      let mutualWeightedSum = 0;
      let mutualTotalWeight = 0;
      const reviewerCount = new Set(userMutualScores.map(s => s.reviewer_id)).size;

      for (const item of scoreItems) {
        const itemScores = userMutualScores.filter(s => s.form_item_id === item.id);
        if (itemScores.length > 0) {
          const avg = itemScores.reduce((sum, s) => sum + (s.score || 0), 0) / itemScores.length;
          mutualWeightedSum += avg * (item.weight || 1);
          mutualTotalWeight += (item.weight || 1);
        }
      }

      let orgWeightedSum = 0;
      let orgTotalWeight = 0;
      for (const item of scoreItems) {
        const itemScores = userOrgScores.filter(s => s.form_item_id === item.id);
        if (itemScores.length > 0) {
          const avg = itemScores.reduce((sum, s) => sum + (s.score || 0), 0) / itemScores.length;
          orgWeightedSum += avg * (item.weight || 1);
          orgTotalWeight += (item.weight || 1);
        }
      }

      const mutualAvg = mutualTotalWeight > 0 ? (mutualWeightedSum / mutualTotalWeight) : 0;
      const orgAvg = orgTotalWeight > 0 ? (orgWeightedSum / orgTotalWeight) : 0;
      const totalScore = mutualAvg * 0.4 + orgAvg * 0.6;

      return {
        user_id: user.id,
        real_name: user.real_name,
        branch: user.branch,
        avatar: user.avatar,
        mutual_avg_score: Math.round(mutualAvg * 100) / 100,
        organization_score: Math.round(orgAvg * 100) / 100,
        total_score: Math.round(totalScore * 100) / 100,
        review_count: reviewerCount
      };
    });

    results.sort((a, b) => b.total_score - a.total_score);
    results.forEach((r, index) => {
      r.rank = index + 1;
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/mutual-review', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id);
    const userId = req.user.id;
    const { target_user_id, scores } = req.body;

    const review = await db.getById('democratic_reviews', reviewId);
    if (!review) {
      return res.status(404).json({ code: 404, message: '评议不存在' });
    }

    if (review.status !== 'in_progress') {
      return res.status(400).json({ code: 400, message: '当前评议未在进行中' });
    }

    const now = new Date();
    if (review.end_date && now > new Date(review.end_date)) {
      return res.status(400).json({ code: 400, message: '评议已截止' });
    }

    if (!target_user_id || !scores || !Array.isArray(scores)) {
      return res.status(400).json({ code: 400, message: '参数不完整' });
    }

    const targetUser = await db.getById('users', parseInt(target_user_id));
    if (!targetUser) {
      return res.status(404).json({ code: 404, message: '被评议人不存在' });
    }

    if (parseInt(target_user_id) === userId) {
      return res.status(400).json({ code: 400, message: '不能对自己进行互评' });
    }

    for (const scoreItem of scores) {
      const formItem = await db.getById('democratic_review_form_items', scoreItem.form_item_id);
      if (!formItem) continue;

      const existing = await db.findOne(
        'democratic_review_scores',
        s => s.review_id === reviewId && s.reviewer_id === userId && s.target_user_id === parseInt(target_user_id) && s.form_item_id === scoreItem.form_item_id && s.review_type === 'mutual',
        'SELECT id FROM democratic_review_scores WHERE review_id = ? AND reviewer_id = ? AND target_user_id = ? AND form_item_id = ? AND review_type = ? LIMIT 1',
        [reviewId, userId, parseInt(target_user_id), scoreItem.form_item_id, 'mutual']
      );

      if (existing) {
        await db.update(
          'democratic_review_scores',
          existing.id,
          { score: scoreItem.score || 0, content: scoreItem.content || '' },
          'UPDATE democratic_review_scores SET score = ?, content = ? WHERE id = ?',
          [scoreItem.score || 0, scoreItem.content || '']
        );
      } else {
        await db.insert(
          'democratic_review_scores',
          {
            review_id: reviewId,
            reviewer_id: userId,
            target_user_id: parseInt(target_user_id),
            review_type: 'mutual',
            form_item_id: scoreItem.form_item_id,
            score: scoreItem.score || 0,
            content: scoreItem.content || ''
          },
          'INSERT INTO democratic_review_scores (review_id, reviewer_id, target_user_id, review_type, form_item_id, score, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [reviewId, userId, parseInt(target_user_id), 'mutual', scoreItem.form_item_id, scoreItem.score || 0, scoreItem.content || '']
        );
      }
    }

    await db.insert(
      'democratic_review_history',
      {
        review_id: reviewId,
        action_type: 'mutual_review',
        action_detail: `${req.user.real_name} 对 ${targetUser.real_name} 进行了互评`,
        operator_id: userId,
        operator_name: req.user.real_name
      },
      'INSERT INTO democratic_review_history (review_id, action_type, action_detail, operator_id, operator_name) VALUES (?, ?, ?, ?, ?)',
      [reviewId, 'mutual_review', `${req.user.real_name} 对 ${targetUser.real_name} 进行了互评`, userId, req.user.real_name]
    );

    res.json({ code: 200, message: '互评提交成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/organization-review', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id);
    const adminId = req.user.id;
    const { target_user_id, scores } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '仅管理员可进行组织评价' });
    }

    const review = await db.getById('democratic_reviews', reviewId);
    if (!review) {
      return res.status(404).json({ code: 404, message: '评议不存在' });
    }

    if (!target_user_id || !scores || !Array.isArray(scores)) {
      return res.status(400).json({ code: 400, message: '参数不完整' });
    }

    for (const scoreItem of scores) {
      const existing = await db.findOne(
        'democratic_review_scores',
        s => s.review_id === reviewId && s.reviewer_id === adminId && s.target_user_id === parseInt(target_user_id) && s.form_item_id === scoreItem.form_item_id && s.review_type === 'organization',
        'SELECT id FROM democratic_review_scores WHERE review_id = ? AND reviewer_id = ? AND target_user_id = ? AND form_item_id = ? AND review_type = ? LIMIT 1',
        [reviewId, adminId, parseInt(target_user_id), scoreItem.form_item_id, 'organization']
      );

      if (existing) {
        await db.update(
          'democratic_review_scores',
          existing.id,
          { score: scoreItem.score || 0, content: scoreItem.content || '' },
          'UPDATE democratic_review_scores SET score = ?, content = ? WHERE id = ?',
          [scoreItem.score || 0, scoreItem.content || '']
        );
      } else {
        await db.insert(
          'democratic_review_scores',
          {
            review_id: reviewId,
            reviewer_id: adminId,
            target_user_id: parseInt(target_user_id),
            review_type: 'organization',
            form_item_id: scoreItem.form_item_id,
            score: scoreItem.score || 0,
            content: scoreItem.content || ''
          },
          'INSERT INTO democratic_review_scores (review_id, reviewer_id, target_user_id, review_type, form_item_id, score, content) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [reviewId, adminId, parseInt(target_user_id), 'organization', scoreItem.form_item_id, scoreItem.score || 0, scoreItem.content || '']
        );
      }
    }

    const targetUser = await db.getById('users', parseInt(target_user_id));
    await db.insert(
      'democratic_review_history',
      {
        review_id: reviewId,
        action_type: 'organization_review',
        action_detail: `组织评价了 ${targetUser ? targetUser.real_name : '未知用户'}`,
        operator_id: adminId,
        operator_name: req.user.real_name
      },
      'INSERT INTO democratic_review_history (review_id, action_type, action_detail, operator_id, operator_name) VALUES (?, ?, ?, ?, ?)',
      [reviewId, 'organization_review', `组织评价了 ${targetUser ? targetUser.real_name : '未知用户'}`, adminId, req.user.real_name]
    );

    res.json({ code: 200, message: '组织评价提交成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
