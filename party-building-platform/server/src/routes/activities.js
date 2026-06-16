const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const getSignupCount = async (activityId) => {
  return await db.count(
    'activity_signups',
    s => s.activity_id === activityId && s.status !== 'cancelled',
    'SELECT COUNT(*) as c FROM activity_signups WHERE activity_id = ? AND status != ?',
    [activityId, 'cancelled']
  );
};

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;

    const predicate = activity => {
      if (status && activity.status !== status) return false;
      return true;
    };

    let sql = 'SELECT * FROM activities';
    const params = [];
    let countSql = 'SELECT COUNT(*) as c FROM activities';
    const countParams = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
      countSql += ' WHERE status = ?';
      countParams.push(status);
    }

    const result = await db.paginate('activities', {
      page,
      page_size: pageSize,
      predicate,
      sortBy: 'start_time',
      sortOrder: 'desc',
      sql,
      sqlParams: params,
      countSql,
      countParams
    });

    const list = [];
    for (const activity of result.list) {
      list.push({
        ...activity,
        signup_count: await getSignupCount(activity.id)
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

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const activityId = parseInt(id);

    const activity = await db.getById('activities', activityId);
    if (!activity) {
      return res.status(404).json({ code: 404, message: '活动不存在' });
    }

    const signup = await db.findOne(
      'activity_signups',
      s => s.user_id === req.user.id && s.activity_id === activityId,
      'SELECT * FROM activity_signups WHERE user_id = ? AND activity_id = ? LIMIT 1',
      [req.user.id, activityId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        ...activity,
        signup_count: await getSignupCount(activityId),
        is_signed_up: signup ? true : false,
        signup_status: signup ? signup.status : null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/signup', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const activityId = parseInt(id);

    const activity = await db.getById('activities', activityId);
    if (!activity) {
      return res.status(404).json({ code: 404, message: '活动不存在' });
    }

    const now = new Date();
    if (activity.signup_deadline && now > new Date(activity.signup_deadline)) {
      return res.status(400).json({ code: 400, message: '报名已截止' });
    }

    const existingSignup = await db.findOne(
      'activity_signups',
      s => s.user_id === userId && s.activity_id === activityId,
      'SELECT * FROM activity_signups WHERE user_id = ? AND activity_id = ? LIMIT 1',
      [userId, activityId]
    );
    if (existingSignup && existingSignup.status !== 'cancelled') {
      return res.status(400).json({ code: 400, message: '已报名该活动' });
    }

    const signupCount = await getSignupCount(activityId);
    if (activity.max_participants && signupCount >= activity.max_participants) {
      return res.status(400).json({ code: 400, message: '报名人数已满' });
    }

    if (existingSignup) {
      await db.update(
        'activity_signups',
        existingSignup.id,
        { status: 'pending' },
        'UPDATE activity_signups SET status = ?, signed_up_at = NOW() WHERE id = ?',
        ['pending']
      );
    } else {
      await db.insert(
        'activity_signups',
        { user_id: userId, activity_id: activityId, status: 'pending' },
        'INSERT INTO activity_signups (user_id, activity_id, status) VALUES (?, ?, ?)',
        [userId, activityId, 'pending']
      );
    }

    res.json({
      code: 200,
      message: '报名成功'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const activityId = parseInt(id);

    const signup = await db.findOne(
      'activity_signups',
      s => s.user_id === userId && s.activity_id === activityId,
      'SELECT * FROM activity_signups WHERE user_id = ? AND activity_id = ? LIMIT 1',
      [userId, activityId]
    );
    if (!signup || signup.status === 'cancelled') {
      return res.status(400).json({ code: 400, message: '未报名该活动' });
    }

    await db.update(
      'activity_signups',
      signup.id,
      { status: 'cancelled' },
      'UPDATE activity_signups SET status = ? WHERE id = ?',
      ['cancelled']
    );

    res.json({
      code: 200,
      message: '取消报名成功'
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
    const userId = req.user.id;

    let activities;
    if (db.useMySQL) {
      activities = await db.exec(
        `SELECT a.*, s.status as signup_status, s.signed_up_at 
         FROM activity_signups s 
         INNER JOIN activities a ON s.activity_id = a.id 
         WHERE s.user_id = ? AND s.status != ? 
         ORDER BY s.signed_up_at DESC 
         LIMIT ${(page - 1) * pageSize}, ${pageSize}`,
        [userId, 'cancelled']
      );
      const [countRow] = await db.exec(
        'SELECT COUNT(*) as total FROM activity_signups WHERE user_id = ? AND status != ?',
        [userId, 'cancelled']
      );
      const total = countRow.total || 0;
      res.json({
        code: 200,
        message: '获取成功',
        data: { list: activities, total, page, page_size: pageSize }
      });
    } else {
      const signups = await db.findMany('activity_signups', s => s.user_id === userId && s.status !== 'cancelled');
      const list = [];
      for (const signup of signups) {
        const activity = await db.getById('activities', signup.activity_id);
        if (activity) {
          list.push({
            ...activity,
            signup_status: signup.status,
            signed_up_at: signup.signed_up_at
          });
        }
      }
      list.sort((a, b) => new Date(b.signed_up_at) - new Date(a.signed_up_at));
      const total = list.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      res.json({
        code: 200,
        message: '获取成功',
        data: { list: list.slice(start, end), total, page, page_size: pageSize }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
