const express = require('express');
const db = require('../database');
const config = require('../config');
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || config.pageSize;
    const status = req.query.status;
    const keyword = req.query.keyword;

    let sql = 'SELECT s.*, u.real_name as creator_name FROM surveys s LEFT JOIN users u ON s.created_by = u.id';
    const params = [];
    let countSql = 'SELECT COUNT(*) as c FROM surveys';
    const countParams = [];
    const whereConditions = [];

    if (status) {
      whereConditions.push('s.status = ?');
      params.push(status);
      countParams.push(status);
    }
    if (keyword) {
      whereConditions.push('(s.title LIKE ? OR s.description LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (whereConditions.length > 0) {
      const whereStr = ' WHERE ' + whereConditions.join(' AND ');
      sql += whereStr;
      countSql += whereStr.replace('s.', '').replace('u.', '');
    }

    sql += ' ORDER BY s.created_at DESC';

    if (db.useMySQL) {
      const countResult = await db.exec(countSql, countParams);
      const total = countResult[0].c;
      sql += ' LIMIT ?, ?';
      params.push((page - 1) * pageSize, pageSize);
      const list = await db.exec(sql, params);

      for (const survey of list) {
        survey.questions = await db.exec('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order ASC', [survey.id]);
        if (req.user) {
          const existing = await db.findOne(
            'survey_responses',
            r => r.survey_id === survey.id && r.user_id === req.user.id,
            'SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ? LIMIT 1',
            [survey.id, req.user.id]
          );
          survey.has_responded = existing ? true : false;
        }
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: { list, total, page, page_size: pageSize }
      });
    } else {
      const allSurveys = await db.findMany('surveys', s => {
        if (status && s.status !== status) return false;
        if (keyword) {
          const kw = keyword.toLowerCase();
          if (!String(s.title || '').toLowerCase().includes(kw) && !String(s.description || '').toLowerCase().includes(kw)) return false;
        }
        return true;
      });

      const creatorIds = [...new Set(allSurveys.map(s => s.created_by))];
      const creators = {};
      for (const cid of creatorIds) {
        const user = await db.getById('users', cid);
        if (user) creators[cid] = user.real_name;
      }

      const total = allSurveys.length;
      allSurveys.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const list = allSurveys.slice((page - 1) * pageSize, page * pageSize);

      for (const survey of list) {
        survey.creator_name = creators[survey.created_by] || '未知';
        survey.questions = await db.findMany('survey_questions', q => q.survey_id === survey.id);
        survey.questions.sort((a, b) => a.sort_order - b.sort_order);
        if (req.user) {
          const existing = await db.findOne(
            'survey_responses',
            r => r.survey_id === survey.id && r.user_id === req.user.id
          );
          survey.has_responded = existing ? true : false;
        }
      }

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

router.get('/available', optionalAuthMiddleware, async (req, res) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (db.useMySQL) {
      let sql = `SELECT s.*, u.real_name as creator_name FROM surveys s LEFT JOIN users u ON s.created_by = u.id WHERE s.status = 'published' AND s.start_date <= ? AND s.end_date >= ?`;
      const params = [now, now];
      const list = await db.exec(sql, params);

      const filtered = [];
      for (const survey of list) {
        survey.questions = await db.exec('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order ASC', [survey.id]);
        if (req.user) {
          if (survey.target_type === 'branch' && survey.target_branches) {
            const branches = JSON.parse(survey.target_branches || '[]');
            if (branches.length > 0 && !branches.includes(req.user.branch)) continue;
          }
          if (survey.target_type === 'specific' && survey.target_user_ids) {
            const userIds = JSON.parse(survey.target_user_ids || '[]').map(id => parseInt(id));
            if (userIds.length > 0 && !userIds.includes(req.user.id)) continue;
          }
          const existing = await db.findOne(
            'survey_responses',
            r => true,
            'SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ? LIMIT 1',
            [survey.id, req.user.id]
          );
          survey.has_responded = existing ? true : false;
        }
        filtered.push(survey);
      }

      res.json({ code: 200, message: '获取成功', data: filtered });
    } else {
      const allSurveys = await db.findMany('surveys', s => {
        if (s.status !== 'published') return false;
        if (s.start_date && s.start_date > now) return false;
        if (s.end_date && s.end_date < now) return false;
        return true;
      });

      const filtered = [];
      for (const survey of allSurveys) {
        if (req.user) {
          if (survey.target_type === 'branch' && survey.target_branches) {
            const branches = JSON.parse(survey.target_branches || '[]');
            if (branches.length > 0 && !branches.includes(req.user.branch)) continue;
          }
          if (survey.target_type === 'specific' && survey.target_user_ids) {
            const userIds = JSON.parse(survey.target_user_ids || '[]').map(id => parseInt(id));
            if (userIds.length > 0 && !userIds.includes(req.user.id)) continue;
          }
          const existing = await db.findOne(
            'survey_responses',
            r => r.survey_id === survey.id && r.user_id === req.user.id
          );
          survey.has_responded = existing ? true : false;
        }
        const creator = await db.getById('users', survey.created_by);
        survey.creator_name = creator ? creator.real_name : '未知';
        survey.questions = await db.findMany('survey_questions', q => q.survey_id === survey.id);
        survey.questions.sort((a, b) => a.sort_order - b.sort_order);
        filtered.push(survey);
      }

      res.json({ code: 200, message: '获取成功', data: filtered });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/stats/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let totalSurveys, publishedSurveys, closedSurveys, totalResponses, byStatus, byMonth;

    if (db.useMySQL) {
      const [ts] = await db.exec('SELECT COUNT(*) as count FROM surveys');
      const [ps] = await db.exec("SELECT COUNT(*) as count FROM surveys WHERE status = 'published'");
      const [cs] = await db.exec("SELECT COUNT(*) as count FROM surveys WHERE status = 'closed'");
      const [tr] = await db.exec('SELECT COUNT(*) as count FROM survey_responses');
      totalSurveys = ts.count;
      publishedSurveys = ps.count;
      closedSurveys = cs.count;
      totalResponses = tr.count;

      byStatus = await db.exec('SELECT status, COUNT(*) as count FROM surveys GROUP BY status ORDER BY count DESC');
      byMonth = await db.exec(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM surveys GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month DESC LIMIT 12`
      );
    } else {
      const surveys = await db.getAll('surveys');
      totalSurveys = surveys.length;
      publishedSurveys = surveys.filter(s => s.status === 'published').length;
      closedSurveys = surveys.filter(s => s.status === 'closed').length;

      const responses = await db.getAll('survey_responses');
      totalResponses = responses.length;

      const statusMap = {};
      surveys.forEach(s => {
        if (!statusMap[s.status]) statusMap[s.status] = { status: s.status, count: 0 };
        statusMap[s.status].count++;
      });
      byStatus = Object.values(statusMap);

      const monthMap = {};
      surveys.forEach(s => {
        if (s.created_at) {
          const month = new Date(s.created_at).toISOString().slice(0, 7);
          if (!monthMap[month]) monthMap[month] = { month, count: 0 };
          monthMap[month].count++;
        }
      });
      byMonth = Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: { total_surveys: totalSurveys, published_surveys: publishedSurveys, closed_surveys: closedSurveys, total_responses: totalResponses, by_status: byStatus, by_month: byMonth }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.id);
    const survey = await db.getById('surveys', surveyId);
    if (!survey) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }

    const questions = db.useMySQL
      ? await db.exec('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order ASC', [surveyId])
      : (await db.findMany('survey_questions', q => q.survey_id === surveyId)).sort((a, b) => a.sort_order - b.sort_order);

    const responses = db.useMySQL
      ? await db.exec('SELECT r.*, u.real_name, u.avatar, u.branch FROM survey_responses r LEFT JOIN users u ON r.user_id = u.id WHERE r.survey_id = ? ORDER BY r.submitted_at DESC', [surveyId])
      : (await db.findMany('survey_responses', r => r.survey_id === surveyId));

    if (!db.useMySQL) {
      for (const resp of responses) {
        if (resp.user_id) {
          const user = await db.getById('users', resp.user_id);
          resp.real_name = user ? user.real_name : '匿名';
          resp.avatar = user ? user.avatar : '';
          resp.branch = user ? user.branch : '';
        }
      }
      responses.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    }

    const answers = db.useMySQL
      ? await db.exec('SELECT a.*, q.title as question_title, q.question_type FROM survey_response_answers a LEFT JOIN survey_questions q ON a.question_id = q.id WHERE a.response_id IN (SELECT id FROM survey_responses WHERE survey_id = ?)', [surveyId])
      : await db.findMany('survey_response_answers', a => true);

    if (!db.useMySQL) {
      const responseIds = new Set(responses.map(r => r.id));
      const filteredAnswers = answers.filter(a => responseIds.has(a.response_id));
      for (const ans of filteredAnswers) {
        const q = questions.find(q => q.id === ans.question_id);
        ans.question_title = q ? q.title : '';
        ans.question_type = q ? q.question_type : '';
      }
    }

    const questionStats = questions.map(q => {
      const qAnswers = (db.useMySQL ? answers : answers.filter(a => responseIds.has(a.response_id))).filter(a => a.question_id === q.id);
      const stats = {
        question_id: q.id,
        question_title: q.title,
        question_type: q.question_type,
        response_count: qAnswers.length,
        option_counts: [],
        avg_rating: 0,
        text_answers: []
      };

      if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
        const options = JSON.parse(q.options || '[]');
        stats.option_counts = options.map(opt => ({
          option: opt,
          count: qAnswers.filter(a => {
            const ans = a.answer_text || '';
            if (q.question_type === 'multiple_choice') {
              return JSON.parse(ans || '[]').includes(opt);
            }
            return ans === opt;
          }).length
        }));
      } else if (q.question_type === 'rating' || q.question_type === 'scale') {
        const nums = qAnswers.map(a => parseFloat(a.answer_text)).filter(n => !isNaN(n));
        stats.avg_rating = nums.length > 0 ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length * 100) / 100 : 0;
      } else if (q.question_type === 'text') {
        stats.text_answers = qAnswers.map(a => a.answer_text).filter(t => t && t.trim());
      }

      return stats;
    });

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        survey,
        questions,
        responses: survey.is_anonymous ? responses.map(r => ({ ...r, real_name: '匿名', avatar: '', branch: '' })) : responses,
        answers: survey.is_anonymous ? answers.map(a => ({ ...a })) : answers,
        question_stats: questionStats
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id/export', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.id);
    const survey = await db.getById('surveys', surveyId);
    if (!survey) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }

    const questions = db.useMySQL
      ? await db.exec('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order ASC', [surveyId])
      : (await db.findMany('survey_questions', q => q.survey_id === surveyId)).sort((a, b) => a.sort_order - b.sort_order);

    const responses = db.useMySQL
      ? await db.exec('SELECT r.*, u.real_name, u.branch FROM survey_responses r LEFT JOIN users u ON r.user_id = u.id WHERE r.survey_id = ? ORDER BY r.submitted_at DESC', [surveyId])
      : (await db.findMany('survey_responses', r => r.survey_id === surveyId));

    if (!db.useMySQL) {
      for (const resp of responses) {
        if (resp.user_id) {
          const user = await db.getById('users', resp.user_id);
          resp.real_name = user ? user.real_name : '匿名';
          resp.branch = user ? user.branch : '';
        }
      }
    }

    const responseIds = responses.map(r => r.id);
    let allAnswers;
    if (db.useMySQL) {
      if (responseIds.length > 0) {
        const placeholders = responseIds.map(() => '?').join(',');
        allAnswers = await db.exec(`SELECT a.*, q.title as question_title, q.question_type FROM survey_response_answers a LEFT JOIN survey_questions q ON a.question_id = q.id WHERE a.response_id IN (${placeholders})`, responseIds);
      } else {
        allAnswers = [];
      }
    } else {
      allAnswers = (await db.findMany('survey_response_answers', a => responseIds.includes(a.response_id)));
      for (const ans of allAnswers) {
        const q = questions.find(q => q.id === ans.question_id);
        ans.question_title = q ? q.title : '';
        ans.question_type = q ? q.question_type : '';
      }
    }

    const header = ['序号'];
    if (!survey.is_anonymous) {
      header.push('填写人', '支部');
    }
    header.push('提交时间');
    questions.forEach(q => header.push(q.title));

    const rows = responses.map((resp, idx) => {
      const row = [idx + 1];
      if (!survey.is_anonymous) {
        row.push(survey.is_anonymous ? '匿名' : (resp.real_name || '匿名'));
        row.push(resp.branch || '');
      }
      row.push(resp.submitted_at || '');

      questions.forEach(q => {
        const answer = allAnswers.find(a => a.response_id === resp.id && a.question_id === q.id);
        if (answer) {
          row.push(answer.answer_text || '');
        } else {
          row.push('');
        }
      });
      return row;
    });

    const csvContent = [header, ...rows].map(row =>
      row.map(cell => {
        const str = String(cell || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',')
    ).join('\n');

    const BOM = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="survey_${surveyId}_export.csv"`);
    res.send(BOM + csvContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.id);
    const survey = await db.getById('surveys', surveyId);
    if (!survey) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }

    const creator = await db.getById('users', survey.created_by);
    survey.creator_name = creator ? creator.real_name : '未知';

    survey.questions = db.useMySQL
      ? await db.exec('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order ASC', [surveyId])
      : (await db.findMany('survey_questions', q => q.survey_id === surveyId)).sort((a, b) => a.sort_order - b.sort_order);

    if (req.user) {
      const existing = await db.findOne(
        'survey_responses',
        r => r.survey_id === surveyId && r.user_id === req.user.id,
        'SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ? LIMIT 1',
        [surveyId, req.user.id]
      );
      survey.has_responded = existing ? true : false;
    }

    res.json({ code: 200, message: '获取成功', data: survey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const d = req.body;
    if (!d.title) {
      return res.status(400).json({ code: 400, message: '问卷标题不能为空' });
    }

    const survey = await db.insert(
      'surveys',
      {
        title: d.title,
        description: d.description || '',
        status: d.status || 'draft',
        is_anonymous: d.is_anonymous !== undefined ? d.is_anonymous : 0,
        start_date: d.start_date || null,
        end_date: d.end_date || null,
        target_type: d.target_type || 'all',
        target_branches: d.target_branches || '[]',
        target_user_ids: d.target_user_ids || '[]',
        response_count: 0,
        created_by: req.user.id
      },
      'INSERT INTO surveys (title, description, status, is_anonymous, start_date, end_date, target_type, target_branches, target_user_ids, response_count, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [d.title, d.description || '', d.status || 'draft', d.is_anonymous !== undefined ? d.is_anonymous : 0, d.start_date || null, d.end_date || null, d.target_type || 'all', d.target_branches || '[]', d.target_user_ids || '[]', 0, req.user.id]
    );

    if (d.questions && d.questions.length > 0) {
      for (let i = 0; i < d.questions.length; i++) {
        const q = d.questions[i];
        await db.insert(
          'survey_questions',
          {
            survey_id: survey.id,
            title: q.title,
            question_type: q.question_type || 'single_choice',
            options: q.options || '[]',
            required: q.required !== undefined ? q.required : 1,
            sort_order: i + 1,
            max_rating: q.max_rating || 5,
            min_label: q.min_label || '',
            max_label: q.max_label || ''
          },
          'INSERT INTO survey_questions (survey_id, title, question_type, options, required, sort_order, max_rating, min_label, max_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [survey.id, q.title, q.question_type || 'single_choice', q.options || '[]', q.required !== undefined ? q.required : 1, i + 1, q.max_rating || 5, q.min_label || '', q.max_label || '']
        );
      }
    }

    res.json({ code: 200, message: '创建成功', data: survey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.id);
    const survey = await db.getById('surveys', surveyId);
    if (!survey) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }

    const d = req.body;

    await db.update(
      'surveys',
      surveyId,
      {},
      `UPDATE surveys SET title = ?, description = ?, status = ?, is_anonymous = ?, start_date = ?, end_date = ?, target_type = ?, target_branches = ?, target_user_ids = ? WHERE id = ?`,
      [
        d.title || survey.title,
        d.description !== undefined ? d.description : survey.description,
        d.status || survey.status,
        d.is_anonymous !== undefined ? d.is_anonymous : survey.is_anonymous,
        d.start_date !== undefined ? d.start_date : survey.start_date,
        d.end_date !== undefined ? d.end_date : survey.end_date,
        d.target_type || survey.target_type,
        d.target_branches !== undefined ? d.target_branches : survey.target_branches,
        d.target_user_ids !== undefined ? d.target_user_ids : survey.target_user_ids,
        surveyId
      ]
    );

    if (d.questions) {
      if (db.useMySQL) {
        await db.exec('DELETE FROM survey_response_answers WHERE response_id IN (SELECT id FROM survey_responses WHERE survey_id = ?)', [surveyId]);
      } else {
        const existingResponses = await db.findMany('survey_responses', r => r.survey_id === surveyId);
        for (const resp of existingResponses) {
          const answers = await db.findMany('survey_response_answers', a => a.response_id === resp.id);
          for (const ans of answers) {
            await db.remove('survey_response_answers', ans.id);
          }
        }
      }

      if (db.useMySQL) {
        await db.exec('DELETE FROM survey_responses WHERE survey_id = ?', [surveyId]);
      } else {
        const existingResponses = await db.findMany('survey_responses', r => r.survey_id === surveyId);
        for (const resp of existingResponses) {
          await db.remove('survey_responses', resp.id);
        }
      }

      if (db.useMySQL) {
        await db.exec('DELETE FROM survey_questions WHERE survey_id = ?', [surveyId]);
      } else {
        const existingQuestions = await db.findMany('survey_questions', q => q.survey_id === surveyId);
        for (const q of existingQuestions) {
          await db.remove('survey_questions', q.id);
        }
      }

      for (let i = 0; i < d.questions.length; i++) {
        const q = d.questions[i];
        await db.insert(
          'survey_questions',
          {
            survey_id: surveyId,
            title: q.title,
            question_type: q.question_type || 'single_choice',
            options: q.options || '[]',
            required: q.required !== undefined ? q.required : 1,
            sort_order: i + 1,
            max_rating: q.max_rating || 5,
            min_label: q.min_label || '',
            max_label: q.max_label || ''
          },
          'INSERT INTO survey_questions (survey_id, title, question_type, options, required, sort_order, max_rating, min_label, max_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [surveyId, q.title, q.question_type || 'single_choice', q.options || '[]', q.required !== undefined ? q.required : 1, i + 1, q.max_rating || 5, q.min_label || '', q.max_label || '']
        );
      }

      await db.update(
        'surveys',
        surveyId,
        { response_count: 0 },
        'UPDATE surveys SET response_count = 0 WHERE id = ?',
        [surveyId]
      );
    }

    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.id);
    const survey = await db.getById('surveys', surveyId);
    if (!survey) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }

    if (db.useMySQL) {
      await db.exec('DELETE FROM survey_response_answers WHERE response_id IN (SELECT id FROM survey_responses WHERE survey_id = ?)', [surveyId]);
      await db.exec('DELETE FROM survey_responses WHERE survey_id = ?', [surveyId]);
      await db.exec('DELETE FROM survey_questions WHERE survey_id = ?', [surveyId]);
    } else {
      const responses = await db.findMany('survey_responses', r => r.survey_id === surveyId);
      for (const resp of responses) {
        const answers = await db.findMany('survey_response_answers', a => a.response_id === resp.id);
        for (const ans of answers) await db.remove('survey_response_answers', ans.id);
        await db.remove('survey_responses', resp.id);
      }
      const questions = await db.findMany('survey_questions', q => q.survey_id === surveyId);
      for (const q of questions) await db.remove('survey_questions', q.id);
    }

    await db.remove('surveys', surveyId);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.id);
    const survey = await db.getById('surveys', surveyId);
    if (!survey) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }
    if (survey.status !== 'published') {
      return res.status(400).json({ code: 400, message: '该问卷未开放填写' });
    }

    const now = new Date();
    if (survey.end_date && new Date(survey.end_date) < now) {
      return res.status(400).json({ code: 400, message: '该问卷已截止' });
    }
    if (survey.start_date && new Date(survey.start_date) > now) {
      return res.status(400).json({ code: 400, message: '该问卷尚未开始' });
    }

    if (req.user) {
      const existing = await db.findOne(
        'survey_responses',
        r => r.survey_id === surveyId && r.user_id === req.user.id,
        'SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ? LIMIT 1',
        [surveyId, req.user.id]
      );
      if (existing) {
        return res.status(400).json({ code: 400, message: '您已填写过该问卷' });
      }
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ code: 400, message: '请填写问卷答案' });
    }

    const questions = db.useMySQL
      ? await db.exec('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order ASC', [surveyId])
      : (await db.findMany('survey_questions', q => q.survey_id === surveyId)).sort((a, b) => a.sort_order - b.sort_order);

    for (const q of questions) {
      if (q.required) {
        const answer = answers.find(a => a.question_id === q.id);
        if (!answer || !answer.answer_text || answer.answer_text.trim() === '' || answer.answer_text === '[]') {
          return res.status(400).json({ code: 400, message: `请填写必填题：${q.title}` });
        }
      }
    }

    const response = await db.insert(
      'survey_responses',
      {
        survey_id: surveyId,
        user_id: req.user ? req.user.id : null,
        respondent_name: survey.is_anonymous ? '匿名' : (req.user ? req.user.real_name : '匿名'),
        submitted_at: now.toISOString().slice(0, 19).replace('T', ' ')
      },
      'INSERT INTO survey_responses (survey_id, user_id, respondent_name, submitted_at) VALUES (?, ?, ?, ?)',
      [surveyId, req.user ? req.user.id : null, survey.is_anonymous ? '匿名' : (req.user ? req.user.real_name : '匿名'), now.toISOString().slice(0, 19).replace('T', ' ')]
    );

    for (const answer of answers) {
      await db.insert(
        'survey_response_answers',
        {
          response_id: response.id,
          question_id: answer.question_id,
          answer_text: answer.answer_text || ''
        },
        'INSERT INTO survey_response_answers (response_id, question_id, answer_text) VALUES (?, ?, ?)',
        [response.id, answer.question_id, answer.answer_text || '']
      );
    }

    if (db.useMySQL) {
      await db.exec('UPDATE surveys SET response_count = response_count + 1 WHERE id = ?', [surveyId]);
    } else {
      survey.response_count = (survey.response_count || 0) + 1;
      await db.update('surveys', surveyId, { response_count: survey.response_count });
    }

    res.json({ code: 200, message: '提交成功', data: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

router.put('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const surveyId = parseInt(req.params.id);
    const { status } = req.body;
    const survey = await db.getById('surveys', surveyId);
    if (!survey) {
      return res.status(404).json({ code: 404, message: '问卷不存在' });
    }

    await db.update(
      'surveys',
      surveyId,
      { status },
      'UPDATE surveys SET status = ? WHERE id = ?',
      [status, surveyId]
    );

    res.json({ code: 200, message: '状态更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
  }
});

module.exports = router;
