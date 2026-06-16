# 党建平台 - 学习与活动管理系统

一个基于 Vue3 + Node.js + Express 的党建平台学习与活动管理网站。

## 项目模块

- **学习专栏**：党建文章浏览、分类筛选、学习记录
- **活动报名**：活动列表、在线报名、报名管理
- **积分排行**：积分排行榜、个人积分记录
- **支部通知**：通知公告列表、详情查看
- **后台内容管理**：文章、活动、通知、用户管理
- **鉴权接口**：用户注册、登录、JWT 认证

## 技术栈

### 前端
- Vue 3 + TypeScript
- Vite 构建工具
- Vue Router 4（路由）
- Pinia（状态管理）
- Axios（HTTP 请求）

### 后端
- Node.js + Express
- JSON 文件数据库（无需安装数据库）
- JWT（身份认证）
- bcryptjs（密码加密）
- CORS（跨域支持）

## 目录结构

```
party-building-platform/
├── client/                 # 前端项目
│   ├── public/
│   ├── src/
│   │   ├── api/            # API 接口
│   │   ├── components/     # 公共组件
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── views/          # 页面视图
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                 # 后端项目
│   ├── data/               # 数据库文件（自动生成）
│   ├── src/
│   │   ├── database/       # 数据库模块
│   │   ├── middleware/     # 中间件
│   │   ├── routes/         # 路由模块
│   │   ├── config.js       # 配置文件
│   │   └── app.js          # 入口文件
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求
- Node.js >= 16.x

### 1. 启动后端服务

```bash
cd server
npm install
npm start
```

后端服务将在 http://localhost:3000 启动

### 2. 启动前端服务

```bash
cd client
npm install
npm run dev
```

前端服务将在 http://localhost:5173 启动（如果端口被占用会自动切换）

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 普通用户 | zhangsan | user123 |
| 普通用户 | lisi | 123456 |
| 普通用户 | wangwu | 123456 |

## API 接口

### 鉴权接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取个人信息
- `PUT /api/auth/profile` - 更新个人信息
- `POST /api/auth/logout` - 退出登录

### 学习专栏
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/categories` - 获取文章分类
- `GET /api/articles/:id` - 获取文章详情
- `POST /api/articles/:id/read` - 记录阅读

### 活动报名
- `GET /api/activities` - 获取活动列表
- `GET /api/activities/:id` - 获取活动详情
- `POST /api/activities/:id/signup` - 活动报名
- `POST /api/activities/:id/cancel` - 取消报名
- `GET /api/activities/my/list` - 我的活动报名

### 积分排行
- `GET /api/points/ranking` - 积分排行榜
- `GET /api/points/my-records` - 我的积分记录
- `GET /api/points/branches` - 党支部列表

### 支部通知
- `GET /api/notices` - 获取通知列表
- `GET /api/notices/types` - 获取通知类型
- `GET /api/notices/:id` - 获取通知详情

### 后台管理
- `GET /api/admin/stats` - 数据统计
- `GET /api/admin/articles` - 文章管理列表
- `POST /api/admin/articles` - 创建文章
- `PUT /api/admin/articles/:id` - 更新文章
- `DELETE /api/admin/articles/:id` - 删除文章
- `GET /api/admin/activities` - 活动管理列表
- `POST /api/admin/activities` - 创建活动
- `PUT /api/admin/activities/:id` - 更新活动
- `DELETE /api/admin/activities/:id` - 删除活动
- `GET /api/admin/notices` - 通知管理列表
- `POST /api/admin/notices` - 创建通知
- `PUT /api/admin/notices/:id` - 更新通知
- `DELETE /api/admin/notices/:id` - 删除通知
- `GET /api/admin/users` - 用户列表
- `PUT /api/admin/users/:id/points` - 调整用户积分
- `DELETE /api/admin/users/:id` - 删除用户
- `GET /api/admin/activity-signups/:activityId` - 活动报名列表
- `PUT /api/admin/activity-signups/:id/status` - 审核报名

## 核心功能演示

1. **首页浏览**：查看最新文章、热门活动、支部通知、积分排行
2. **文章学习**：浏览学习专栏文章，分类筛选
3. **活动报名**：查看活动详情，在线报名
4. **积分排行**：查看党员积分排名情况
5. **通知公告**：查看支部最新通知
6. **后台管理**：管理员登录后可管理文章、活动、通知、用户

## 注意事项

- 本项目使用 JSON 文件作为数据库，数据存储在 `server/data/db.json` 文件中
- 如需重置数据，删除 `server/data/db.json` 文件后重启后端服务即可
- 首次启动后端时会自动初始化数据库和示例数据
