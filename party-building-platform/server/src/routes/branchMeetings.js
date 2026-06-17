const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

const MEETING_TYPE_MAP = {
  branch_committee: '支委会',
  member_congress: '党员大会',
  group_meeting: '党小组会',
  party_lesson: '党课'
};

const STATUS_MAP = {
  notified: '通知中',
  ongoing: '进行中',
  completed: '已结束',
  cancelled: '已取消'
};

async function getMeetingDetail(meetingId) {
  const meeting = await db.getById('branch_meetings', meetingId);
  if (!meeting) return null;

  const agendas = await db.findMany(
    'branch_meeting_agendas',
    a => a.meeting_id === meetingId,
    'SELECT * FROM branch_meeting_agendas WHERE meeting_id = ? ORDER BY sort_order ASC',
    [meetingId]
  );

  const attendees = await db.findMany(
    'branch_meeting_attendees',
    a => a.meeting_id === meetingId,
    'SELECT a.*, u.real_name, u.phone, u.branch, u.avatar FROM branch_meeting_attendees a LEFT JOIN users u ON a.user_id = u.id WHERE a.meeting_id = ?',
    [meetingId]
  );

  const checkins = await db.findMany(
    'branch_meeting_checkins',
    c => c.meeting_id === meetingId,
    'SELECT c.*, u.real_name, u.avatar FROM branch_meeting_checkins c LEFT JOIN users u ON c.user_id = u.id WHERE c.meeting_id = ?',
    [meetingId]
  );

  const resolutions = await db.findMany(
    'branch_meeting_resolutions',
    r => r.meeting_id === meetingId,
    'SELECT r.*, ag.title as agenda_title FROM branch_meeting_resolutions r LEFT JOIN branch_meeting_agendas ag ON r.agenda_id = ag.id WHERE r.meeting_id = ?',
    [meetingId]
  );

  const attendeeCount = attendees.length;
  const checkinCount = checkins.length;

  if (db.useMySQL) {
    const [creatorRows] = await db.exec('SELECT real_name FROM users WHERE id = ?', [meeting.created_by]);
    meeting.creator_name = creatorRows ? creatorRows.real_name : null;
  } else {
    const creator = await db.getById('users', meeting.created_by);
    meeting.creator_name = creator ? creator.real_name : null;
  }

  return {
    ...meeting,
    agendas,
    attendees: attendees.map(a => {
      if (typeof a === 'object' && a.real_name) return a;
      return { ...a, real_name: null, phone: null, branch: null, avatar: null };
    }),
    checkins,
    resolutions,
    attendee_count: attendeeCount,
    checkin_count: checkinCount
  };
}

router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const branch = req.query.branch;
    const meetingType = req.query.meeting_type;
    const status = req.query.status;
    const startTime = req.query.start_time;
    const endTime = req.query.end_time;

    let sql = 'SELECT m.*, (SELECT COUNT(*) FROM branch_meeting_attendees WHERE meeting_id = m.id) as attendee_count, (SELECT COUNT(*) FROM branch_meeting_checkins WHERE meeting_id = m.id) as checkin_count, u.real_name as creator_name FROM branch_meetings m LEFT JOIN users u ON m.created_by = u.id WHERE 1=1';
    const params = [];
    let countSql = 'SELECT COUNT(*) as c FROM branch_meetings WHERE 1=1';
    const countParams = [];

    if (branch) {
      sql += ' AND m.branch = ?';
      params.push(branch);
      countSql += ' AND branch = ?';
      countParams.push(branch);
    }
    if (meetingType) {
      sql += ' AND m.meeting_type = ?';
      params.push(meetingType);
      countSql += ' AND meeting_type = ?';
      countParams.push(meetingType);
    }
    if (status) {
      sql += ' AND m.status = ?';
      params.push(status);
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    if (startTime) {
      sql += ' AND m.meeting_time >= ?';
      params.push(startTime);
      countSql += ' AND meeting_time >= ?';
      countParams.push(startTime);
    }
    if (endTime) {
      sql += ' AND m.meeting_time <= ?';
      params.push(endTime);
      countSql += ' AND meeting_time <= ?';
      countParams.push(endTime);
    }

    sql += ' ORDER BY m.meeting_time DESC';

    if (db.useMySQL) {
      const offset = (page - 1) * pageSize;
      const listSql = sql + ` LIMIT ${offset}, ${pageSize}`;
      const list = await db.exec(listSql, params);
      const [countRow] = await db.exec(countSql, countParams);
      const total = countRow.c || 0;

      res.json({
        code: 200,
        message: '获取成功',
        data: { list, total, page, page_size: pageSize }
      });
    } else {
      const predicate = m => {
        if (branch && m.branch !== branch) return false;
        if (meetingType && m.meeting_type !== meetingType) return false;
        if (status && m.status !== status) return false;
        if (startTime && new Date(m.meeting_time) < new Date(startTime)) return false;
        if (endTime && new Date(m.meeting_time) > new Date(endTime)) return false;
        return true;
      };

      const result = await db.paginate('branch_meetings', {
        page,
        page_size: pageSize,
        predicate,
        sortBy: 'meeting_time',
        sortOrder: 'desc'
      });

      const list = [];
      for (const m of result.list) {
        const attendeeCount = await db.count(
          'branch_meeting_attendees',
          a => a.meeting_id === m.id,
          'SELECT COUNT(*) as c FROM branch_meeting_attendees WHERE meeting_id = ?',
          [m.id]
        );
        const checkinCount = await db.count(
          'branch_meeting_checkins',
          c => c.meeting_id === m.id,
          'SELECT COUNT(*) as c FROM branch_meeting_checkins WHERE meeting_id = ?',
          [m.id]
        );
        const creator = m.created_by ? await db.getById('users', m.created_by) : null;

        list.push({
          ...m,
          attendee_count: attendeeCount,
          checkin_count: checkinCount,
          creator_name: creator ? creator.real_name : null
        });
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: { list, total: result.total, page, page_size: pageSize }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (db.useMySQL) {
      const [totalRow] = await db.exec('SELECT COUNT(*) as c FROM branch_meetings');
      const totalMeetings = totalRow.c || 0;

      const byType = await db.exec(
        'SELECT meeting_type as type, COUNT(*) as count FROM branch_meetings GROUP BY meeting_type'
      );

      const byBranch = await db.exec(
        'SELECT branch, COUNT(*) as count FROM branch_meetings GROUP BY branch'
      );

      const byMonth = await db.exec(
        "SELECT DATE_FORMAT(meeting_time, '%Y-%m') as month, COUNT(*) as count FROM branch_meetings GROUP BY DATE_FORMAT(meeting_time, '%Y-%m') ORDER BY month DESC LIMIT 12"
      );

      const [resolutionRow] = await db.exec('SELECT COUNT(*) as c FROM branch_meeting_resolutions');
      const totalResolutions = resolutionRow.c || 0;

      const [passedRow] = await db.exec("SELECT COUNT(*) as c FROM branch_meeting_resolutions WHERE result = 'passed'");
      const passedResolutions = passedRow.c || 0;

      const [checkinRow] = await db.exec('SELECT COUNT(*) as c FROM branch_meeting_checkins');
      const totalCheckins = checkinRow.c || 0;

      const [attendeeRow] = await db.exec('SELECT COUNT(*) as c FROM branch_meeting_attendees');
      const totalAttendees = attendeeRow.c || 0;

      const avgAttendanceRate = totalAttendees > 0 ? Math.round((totalCheckins / totalAttendees) * 100) : 0;

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          total_meetings: totalMeetings,
          by_type: byType.map(b => ({ type: b.type, count: b.count })),
          by_branch: byBranch,
          by_month: byMonth,
          avg_attendance_rate: avgAttendanceRate,
          total_resolutions: totalResolutions,
          passed_resolutions: passedResolutions
        }
      });
    } else {
      const meetings = await db.getAll('branch_meetings');
      const totalMeetings = meetings.length;

      const typeMap = {};
      meetings.forEach(m => {
        const typeKey = m.meeting_type || 'unknown';
        typeMap[typeKey] = (typeMap[typeKey] || 0) + 1;
      });
      const byType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

      const branchMap = {};
      meetings.forEach(m => {
        branchMap[m.branch] = (branchMap[m.branch] || 0) + 1;
      });
      const byBranch = Object.entries(branchMap).map(([branch, count]) => ({ branch, count }));

      const monthMap = {};
      meetings.forEach(m => {
        const month = m.meeting_time ? m.meeting_time.slice(0, 7) : 'unknown';
        monthMap[month] = (monthMap[month] || 0) + 1;
      });
      const byMonth = Object.entries(monthMap)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 12)
        .map(([month, count]) => ({ month, count }));

      const resolutions = await db.getAll('branch_meeting_resolutions');
      const totalResolutions = resolutions.length;
      const passedResolutions = resolutions.filter(r => r.result === 'passed').length;

      const checkins = await db.getAll('branch_meeting_checkins');
      const attendees = await db.getAll('branch_meeting_attendees');
      const avgAttendanceRate = attendees.length > 0 ? Math.round((checkins.length / attendees.length) * 100) : 0;

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          total_meetings: totalMeetings,
          by_type: byType,
          by_branch: byBranch,
          by_month: byMonth,
          avg_attendance_rate: avgAttendanceRate,
          total_resolutions: totalResolutions,
          passed_resolutions: passedResolutions
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/branches', async (req, res) => {
  try {
    if (db.useMySQL) {
      const branches = await db.exec('SELECT DISTINCT branch FROM users WHERE branch IS NOT NULL ORDER BY branch');
      res.json({ code: 200, message: '获取成功', data: branches.map(b => b.branch) });
    } else {
      const users = await db.getAll('users');
      const branches = [...new Set(users.map(u => u.branch).filter(Boolean))];
      res.json({ code: 200, message: '获取成功', data: branches.sort() });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;

    if (db.useMySQL) {
      const offset = (page - 1) * pageSize;
      const list = await db.exec(
        `SELECT m.*, (SELECT COUNT(*) FROM branch_meeting_attendees WHERE meeting_id = m.id) as attendee_count, (SELECT COUNT(*) FROM branch_meeting_checkins WHERE meeting_id = m.id) as checkin_count FROM branch_meetings m INNER JOIN branch_meeting_attendees a ON m.id = a.meeting_id WHERE a.user_id = ? ORDER BY m.meeting_time DESC LIMIT ?, ?`,
        [userId, offset, pageSize]
      );
      const [countRow] = await db.exec(
        'SELECT COUNT(*) as c FROM branch_meeting_attendees WHERE user_id = ?',
        [userId]
      );
      res.json({
        code: 200,
        message: '获取成功',
        data: { list, total: countRow.c || 0, page, page_size: pageSize }
      });
    } else {
      const attendees = await db.findMany('branch_meeting_attendees', a => a.user_id === userId);
      const meetingIds = attendees.map(a => a.meeting_id);
      const allMeetings = await db.getAll('branch_meetings');
      const myMeetings = allMeetings
        .filter(m => meetingIds.includes(m.id))
        .sort((a, b) => new Date(b.meeting_time) - new Date(a.meeting_time));
      const total = myMeetings.length;
      const start = (page - 1) * pageSize;
      const list = myMeetings.slice(start, start + pageSize);
      res.json({
        code: 200,
        message: '获取成功',
        data: { list, total, page, page_size: pageSize }
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    const detail = await getMeetingDetail(meetingId);
    if (!detail) {
      return res.status(404).json({ code: 404, message: '会议不存在' });
    }
    res.json({ code: 200, message: '获取成功', data: detail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = {
      title: req.body.title,
      branch: req.body.branch,
      meeting_type: req.body.meeting_type,
      location: req.body.location || '',
      meeting_time: req.body.meeting_time,
      end_time: req.body.end_time || null,
      status: req.body.status || 'notified',
      notification_content: req.body.notification_content || '',
      minutes_content: req.body.minutes_content || '',
      created_by: req.user.id
    };

    if (!data.title || !data.branch || !data.meeting_type || !data.meeting_time) {
      return res.status(400).json({ code: 400, message: '标题、支部、会议类型和会议时间为必填项' });
    }

    const meeting = await db.insert(
      'branch_meetings',
      data,
      'INSERT INTO branch_meetings (title, branch, meeting_type, location, meeting_time, end_time, status, notification_content, minutes_content, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.title, data.branch, data.meeting_type, data.location, data.meeting_time, data.end_time, data.status, data.notification_content, data.minutes_content, data.created_by]
    );

    if (req.body.attendee_ids && Array.isArray(req.body.attendee_ids)) {
      for (const userId of req.body.attendee_ids) {
        await db.insert(
          'branch_meeting_attendees',
          { meeting_id: meeting.id, user_id: userId, is_required: 1, status: 'pending' },
          'INSERT INTO branch_meeting_attendees (meeting_id, user_id, is_required, status) VALUES (?, ?, ?, ?)',
          [meeting.id, userId, 1, 'pending']
        );
      }
    }

    if (req.body.agendas && Array.isArray(req.body.agendas)) {
      for (let i = 0; i < req.body.agendas.length; i++) {
        const agenda = req.body.agendas[i];
        await db.insert(
          'branch_meeting_agendas',
          { meeting_id: meeting.id, title: agenda.title, content: agenda.content || '', sort_order: i + 1, status: 'pending', discussion_result: '' },
          'INSERT INTO branch_meeting_agendas (meeting_id, title, content, sort_order, status, discussion_result) VALUES (?, ?, ?, ?, ?, ?)',
          [meeting.id, agenda.title, agenda.content || '', i + 1, 'pending', '']
        );
      }
    }

    const detail = await getMeetingDetail(meeting.id);
    res.json({ code: 200, message: '创建成功', data: detail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    const meeting = await db.getById('branch_meetings', meetingId);
    if (!meeting) {
      return res.status(404).json({ code: 404, message: '会议不存在' });
    }

    const data = {};
    const fields = ['title', 'branch', 'meeting_type', 'location', 'meeting_time', 'end_time', 'status', 'notification_content', 'minutes_content'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    });

    if (Object.keys(data).length > 0) {
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = Object.values(data);
      await db.update(
        'branch_meetings',
        meetingId,
        data,
        `UPDATE branch_meetings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values]
      );
    }

    const detail = await getMeetingDetail(meetingId);
    res.json({ code: 200, message: '更新成功', data: detail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    const meeting = await db.getById('branch_meetings', meetingId);
    if (!meeting) {
      return res.status(404).json({ code: 404, message: '会议不存在' });
    }

    await db.remove('branch_meetings', meetingId, 'DELETE FROM branch_meetings WHERE id = ?');
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/agendas', authMiddleware, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    const meeting = await db.getById('branch_meetings', meetingId);
    if (!meeting) {
      return res.status(404).json({ code: 404, message: '会议不存在' });
    }

    const data = {
      meeting_id: meetingId,
      title: req.body.title,
      content: req.body.content || '',
      sort_order: req.body.sort_order || 0,
      status: req.body.status || 'pending',
      discussion_result: req.body.discussion_result || ''
    };

    const agenda = await db.insert(
      'branch_meeting_agendas',
      data,
      'INSERT INTO branch_meeting_agendas (meeting_id, title, content, sort_order, status, discussion_result) VALUES (?, ?, ?, ?, ?, ?)',
      [data.meeting_id, data.title, data.content, data.sort_order, data.status, data.discussion_result]
    );

    res.json({ code: 200, message: '议题添加成功', data: agenda });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/:id/agendas/:agendaId', authMiddleware, async (req, res) => {
  try {
    const agendaId = parseInt(req.params.agendaId);
    const data = {};
    const fields = ['title', 'content', 'sort_order', 'status', 'discussion_result'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    });

    if (Object.keys(data).length > 0) {
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = Object.values(data);
      await db.update(
        'branch_meeting_agendas',
        agendaId,
        data,
        `UPDATE branch_meeting_agendas SET ${setClause} WHERE id = ?`,
        [...values]
      );
    }

    res.json({ code: 200, message: '议题更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/:id/agendas/:agendaId', authMiddleware, async (req, res) => {
  try {
    const agendaId = parseInt(req.params.agendaId);
    await db.remove('branch_meeting_agendas', agendaId, 'DELETE FROM branch_meeting_agendas WHERE id = ?');
    res.json({ code: 200, message: '议题删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/attendees', authMiddleware, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    const meeting = await db.getById('branch_meetings', meetingId);
    if (!meeting) {
      return res.status(404).json({ code: 404, message: '会议不存在' });
    }

    const userIds = req.body.user_ids || [];
    const isRequired = req.body.is_required !== undefined ? req.body.is_required : 1;

    for (const userId of userIds) {
      const existing = await db.findOne(
        'branch_meeting_attendees',
        a => a.meeting_id === meetingId && a.user_id === userId,
        'SELECT * FROM branch_meeting_attendees WHERE meeting_id = ? AND user_id = ? LIMIT 1',
        [meetingId, userId]
      );
      if (!existing) {
        await db.insert(
          'branch_meeting_attendees',
          { meeting_id: meetingId, user_id: userId, is_required: isRequired, status: 'pending' },
          'INSERT INTO branch_meeting_attendees (meeting_id, user_id, is_required, status) VALUES (?, ?, ?, ?)',
          [meetingId, userId, isRequired, 'pending']
        );
      }
    }

    res.json({ code: 200, message: '参会人员添加成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/:id/attendees/:attendeeId', authMiddleware, async (req, res) => {
  try {
    const attendeeId = parseInt(req.params.attendeeId);
    const data = {};
    const fields = ['is_required', 'status'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    });

    if (Object.keys(data).length > 0) {
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = Object.values(data);
      await db.update(
        'branch_meeting_attendees',
        attendeeId,
        data,
        `UPDATE branch_meeting_attendees SET ${setClause} WHERE id = ?`,
        [...values]
      );
    }

    res.json({ code: 200, message: '参会人员状态更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/:id/attendees/:attendeeId', authMiddleware, async (req, res) => {
  try {
    const attendeeId = parseInt(req.params.attendeeId);
    await db.remove('branch_meeting_attendees', attendeeId, 'DELETE FROM branch_meeting_attendees WHERE id = ?');
    res.json({ code: 200, message: '参会人员移除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/checkin', authMiddleware, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    const userId = req.user.id;
    const checkinType = req.body.checkin_type || 'onsite';

    const meeting = await db.getById('branch_meetings', meetingId);
    if (!meeting) {
      return res.status(404).json({ code: 404, message: '会议不存在' });
    }

    const existing = await db.findOne(
      'branch_meeting_checkins',
      c => c.meeting_id === meetingId && c.user_id === userId,
      'SELECT * FROM branch_meeting_checkins WHERE meeting_id = ? AND user_id = ? LIMIT 1',
      [meetingId, userId]
    );
    if (existing) {
      return res.status(400).json({ code: 400, message: '已签到' });
    }

    await db.insert(
      'branch_meeting_checkins',
      { meeting_id: meetingId, user_id: userId, checkin_type: checkinType },
      'INSERT INTO branch_meeting_checkins (meeting_id, user_id, checkin_type) VALUES (?, ?, ?)',
      [meetingId, userId, checkinType]
    );

    const attendee = await db.findOne(
      'branch_meeting_attendees',
      a => a.meeting_id === meetingId && a.user_id === userId,
      'SELECT * FROM branch_meeting_attendees WHERE meeting_id = ? AND user_id = ? LIMIT 1',
      [meetingId, userId]
    );
    if (attendee) {
      await db.update(
        'branch_meeting_attendees',
        attendee.id,
        { status: 'confirmed' },
        'UPDATE branch_meeting_attendees SET status = ? WHERE id = ?',
        ['confirmed']
      );
    }

    res.json({ code: 200, message: '签到成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/resolutions', authMiddleware, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    const meeting = await db.getById('branch_meetings', meetingId);
    if (!meeting) {
      return res.status(404).json({ code: 404, message: '会议不存在' });
    }

    const data = {
      meeting_id: meetingId,
      agenda_id: req.body.agenda_id || null,
      title: req.body.title,
      content: req.body.content || '',
      result: req.body.result || 'pending',
      vote_for: req.body.vote_for || 0,
      vote_against: req.body.vote_against || 0,
      vote_abstain: req.body.vote_abstain || 0,
      resolved_at: req.body.result && req.body.result !== 'pending' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null
    };

    const resolution = await db.insert(
      'branch_meeting_resolutions',
      data,
      'INSERT INTO branch_meeting_resolutions (meeting_id, agenda_id, title, content, result, vote_for, vote_against, vote_abstain, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.meeting_id, data.agenda_id, data.title, data.content, data.result, data.vote_for, data.vote_against, data.vote_abstain, data.resolved_at]
    );

    res.json({ code: 200, message: '决议记录成功', data: resolution });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/:id/resolutions/:resolutionId', authMiddleware, async (req, res) => {
  try {
    const resolutionId = parseInt(req.params.resolutionId);
    const data = {};
    const fields = ['title', 'content', 'result', 'vote_for', 'vote_against', 'vote_abstain', 'agenda_id'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    });

    if (data.result && data.result !== 'pending' && !data.resolved_at) {
      data.resolved_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    if (Object.keys(data).length > 0) {
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = Object.values(data);
      await db.update(
        'branch_meeting_resolutions',
        resolutionId,
        data,
        `UPDATE branch_meeting_resolutions SET ${setClause} WHERE id = ?`,
        [...values]
      );
    }

    res.json({ code: 200, message: '决议更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/:id/resolutions/:resolutionId', authMiddleware, async (req, res) => {
  try {
    const resolutionId = parseInt(req.params.resolutionId);
    await db.remove('branch_meeting_resolutions', resolutionId, 'DELETE FROM branch_meeting_resolutions WHERE id = ?');
    res.json({ code: 200, message: '决议删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
