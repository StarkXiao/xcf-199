const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password, real_name, phone, branch } = req.body;

  if (!username || !password || !real_name) {
    return res.status(400).json({ code: 400, message: '用户名、密码和姓名不能为空' });
  }

  const existingUser = db.findOne('users', u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ code: 400, message: '用户名已存在' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const user = db.insert('users', {
    username,
    password: hashedPassword,
    real_name,
    phone: phone || '',
    branch: branch || '',
    role: 'user',
    points: 0,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    code: 200,
    message: '注册成功',
    data: {
      token,
      user: userWithoutPassword
    }
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }

  const user = db.findOne('users', u => u.username === username);
  if (!user) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    code: 200,
    message: '登录成功',
    data: {
      token,
      user: userWithoutPassword
    }
  });
});

router.get('/profile', authMiddleware, (req, res) => {
  const user = db.getById('users', req.user.id);

  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    code: 200,
    message: '获取成功',
    data: userWithoutPassword
  });
});

router.put('/profile', authMiddleware, (req, res) => {
  const { real_name, phone, branch } = req.body;

  const user = db.getById('users', req.user.id);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }

  const updated = db.update('users', req.user.id, {
    real_name: real_name || user.real_name,
    phone: phone || '',
    branch: branch || ''
  });

  const { password: _, ...userWithoutPassword } = updated;

  res.json({
    code: 200,
    message: '更新成功',
    data: userWithoutPassword
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    message: '退出成功'
  });
});

module.exports = router;
