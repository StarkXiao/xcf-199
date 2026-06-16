const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, real_name, phone, branch } = req.body;

    if (!username || !password || !real_name) {
      return res.status(400).json({ code: 400, message: '用户名、密码和姓名不能为空' });
    }

    const existingUser = await db.findOne(
      'users',
      u => u.username === username,
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (existingUser) {
      return res.status(400).json({ code: 400, message: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = await db.insert(
      'users',
      {
        username,
        password: hashedPassword,
        real_name,
        phone: phone || '',
        branch: branch || '',
        role: 'user',
        points: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      },
      `INSERT INTO users (username, password, real_name, phone, branch, role, points, avatar) VALUES (?, ?, ?, ?, ?, 'user', 0, ?)`,
      [username, hashedPassword, real_name, phone || '', branch || '', `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`]
    );

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }

    const user = await db.findOne(
      'users',
      u => u.username === username,
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [username]
    );
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await db.getById('users', req.user.id);

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      code: 200,
      message: '获取成功',
      data: userWithoutPassword
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { real_name, phone, branch } = req.body;

    const user = await db.getById('users', req.user.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const updated = await db.update(
      'users',
      req.user.id,
      { real_name: real_name || user.real_name, phone: phone || '', branch: branch || '' },
      `UPDATE users SET real_name = COALESCE(?, real_name), phone = ?, branch = ? WHERE id = ?`,
      [real_name || null, phone || '', branch || '']
    );

    const { password: _, ...userWithoutPassword } = updated;

    res.json({
      code: 200,
      message: '更新成功',
      data: userWithoutPassword
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    message: '退出成功'
  });
});

module.exports = router;
