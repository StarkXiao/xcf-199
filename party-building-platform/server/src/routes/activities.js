const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const getSignupCount = (activityId) => {
  return db.count('activity_signups', s => s.activity_id === activityId && s.status !== 'cancelled');
};

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;
  const status = req.query.status;

  const predicate = activity => {
    if (status && activity.status !== status) return false;
    return true;
  };

  const result = db.paginate('activities', {
    page,
    page_size: pageSize,
    predicate,
    sortBy: 'start_time',
    sortOrder: 'desc'
  });

  const list = result.list.map(activity => ({
    ...activity,
    signup_count: getSignupCount(activity.id)
  }));

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
});

router.get('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;

  const activity = db.getById('activities', parseInt(id));
  if (!activity) {
    return res.status(404).json({ code: 404, message: '活动不存在' });
  }

  const signup = db.findOne('activity_signups', s => s.user_id === req.user.id && s.activity_id === parseInt(id));

  res.json({
    code: 200,
    message: '获取成功',
    data: {
      ...activity,
      signup_count: getSignupCount(parseInt(id)),
      is_signed_up: signup ? true : false,
      signup_status: signup ? signup.status : null
    }
  });
});

router.post('/:id/signup', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const activityId = parseInt(id);

  const activity = db.getById('activities', activityId);
  if (!activity) {
    return res.status(404).json({ code: 404, message: '活动不存在' });
  }

  const now = new Date();
  const deadline = new Date(activity.signup_deadline);
  if (now > deadline) {
    return res.status(400).json({ code: 400, message: '报名已截止' });
  }

  const existingSignup = db.findOne('activity_signups', s => s.user_id === userId && s.activity_id === activityId);
  if (existingSignup && existingSignup.status !== 'cancelled') {
    return res.status(400).json({ code: 400, message: '已报名该活动' });
  }

  const signupCount = getSignupCount(activityId);
  if (activity.max_participants && signupCount >= activity.max_participants) {
    return res.status(400).json({ code: 400, message: '报名人数已满' });
  }

  if (existingSignup) {
    db.update('activity_signups', existingSignup.id, {
      status: 'pending',
      signed_up_at: new Date().toISOString()
    });
  } else {
    db.insert('activity_signups', {
      user_id: userId,
      activity_id: activityId,
      status: 'pending'
    });
  }

  res.json({
    code: 200,
    message: '报名成功'
  });
});

router.post('/:id/cancel', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const activityId = parseInt(id);

  const signup = db.findOne('activity_signups', s => s.user_id === userId && s.activity_id === activityId);
  if (!signup || signup.status === 'cancelled') {
    return res.status(400).json({ code: 400, message: '未报名该活动' });
  }

  db.update('activity_signups', signup.id, { status: 'cancelled' });

  res.json({
    code: 200,
    message: '取消报名成功'
  });
});

router.get('/my/list', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.page_size) || config.pageSize;
  const userId = req.user.id;

  const signups = db.findMany('activity_signups', s => s.user_id === userId && s.status !== 'cancelled');
  
  const activities = signups.map(signup => {
    const activity = db.getById('activities', signup.activity_id);
    if (!activity) return null;
    return {
      ...activity,
      signup_status: signup.status,
      signed_up_at: signup.signed_up_at
    };
  }).filter(Boolean);

  activities.sort((a, b) => new Date(b.signed_up_at) - new Date(a.signed_up_at));

  const total = activities.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const list = activities.slice(start, end);

  res.json({
    code: 200,
    message: '获取成功',
    data: {
      list,
      total,
      page,
      page_size: pageSize
    }
  });
});

module.exports = router;
