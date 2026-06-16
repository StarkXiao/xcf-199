# 党建平台 - 学习与活动管理系统

基于 Vue3 + Vite + TypeScript + Node.js + Express + MySQL 的党建平台学习与活动管理网站。

## 项目模块

- **学习专栏**：党建文章浏览、分类筛选、阅读记录、学习积分
- **活动报名**：活动列表、在线报名、报名管理、我的活动
- **积分排行**：积分排行榜、个人积分记录、党支部筛选
- **支部通知**：通知公告列表、详情查看、类型筛选
- **后台内容管理**：文章/活动/通知/用户 CRUD、报名审核
- **鉴权接口**：用户注册、登录、JWT 认证、角色权限控制

## 技术栈

### 前端
- Vue 3.4 + TypeScript
- Vite 5
- Vue Router 4
- Pinia（状态管理）
- Axios（HTTP 请求）

### 后端
- Node.js + Express
- **MySQL（默认）**：自动建库、建表、导入示例数据
- **自动降级**：MySQL 连接失败时自动回退到 JSON 文件数据库
- JWT（身份认证）
- bcryptjs（密码加密）

## 目录结构

```
party-building-platform/
├── client/                          # 前端项目
│   ├── src/
│   │   ├── api/                      # API 接口模块
│   │   ├── layouts/                  # 布局组件
│   │   ├── router/                   # 路由配置
│   │   ├── stores/                   # Pinia 状态管理
│   │   ├── styles/                   # 全局样式
│   │   ├── types/                    # TypeScript 类型定义
│   │   ├── utils/                    # 工具函数
│   │   ├── views/                    # 页面组件
│   │   │   ├── admin/                # 后台管理页面
│   │   │   └── *.vue                 # 前台页面
│   │   ├── App.vue
│   │   └── main.ts
│   └── package.json
├── server/                          # 后端项目
│   ├── data/                         # JSON 数据库（可选，MySQL 不可用时自动生成）
│   ├── src/
│   │   ├── config/                   # 配置
│   │   ├── database/                 # 数据库层（MySQL + JSON 双模式）
│   │   ├── middleware/               # 中间件
│   │   ├── routes/                   # 路由模块
│   │   │   ├── auth.js
│   │   │   ├── articles.js
│   │   │   ├── activities.js
│   │   │   ├── points.js
│   │   │   ├── notices.js
│   │   │   └── admin.js
│   │   └── app.js                    # 入口文件
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求
- Node.js >= 16.x
- MySQL >= 5.7（推荐，已默认启用；连接失败自动降级为 JSON 文件）

---

### 方式一：默认方式（MySQL，推荐）

无需特殊配置，直接启动即可（默认连接本地 MySQL，root 无密码）：

```bash
# 后端
cd server && npm install && npm start

# 前端（新开一个终端）
cd client && npm install && npm run dev
```

> 首次启动会自动创建 `party_building` 数据库、建表、导入示例数据。

如需自定义 MySQL 连接：

```bash
# 可选环境变量
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=party_building
```

---

### 方式二：零配置快速启动（JSON 文件模式）

如果没有 MySQL，设置环境变量后启动即可：

```bash
export DB_TYPE=json

# 后端
cd server && npm install && npm start

# 前端（新开一个终端）
cd client && npm install && npm run dev
```

- 后端默认端口：`http://localhost:3000`
- 前端默认端口：`http://localhost:5173`（被占用时自动切换）
- JSON 数据存储在 `server/data/db.json`

---

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 普通用户 | zhangsan | user123 |
| 普通用户 | lisi | 123456 |
| 普通用户 | wangwu | 123456 |

## 构建生产版本

```bash
# 前端打包（输出到 client/dist）
cd client
npm run build

# 仅类型检查
npm run typecheck
```

## API 接口

所有接口前缀：`/api`

### 鉴权
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /auth/register | 注册 | 否 |
| POST | /auth/login | 登录 | 否 |
| GET | /auth/profile | 获取个人信息 | 是 |
| PUT | /auth/profile | 更新个人信息 | 是 |
| POST | /auth/logout | 退出登录 | 是 |

### 学习专栏
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /articles | 文章列表（支持 category、keyword、page、page_size） |
| GET | /articles/categories | 文章分类 |
| GET | /articles/:id | 文章详情（自动累加阅读量） |
| POST | /articles/:id/read | 记录阅读（>=30秒奖励积分） |

### 活动报名
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /activities | 活动列表 | 否 |
| GET | /activities/:id | 活动详情 | 是 |
| POST | /activities/:id/signup | 活动报名 | 是 |
| POST | /activities/:id/cancel | 取消报名 | 是 |
| GET | /activities/my/list | 我的活动 | 是 |

### 积分排行
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /points/ranking | 积分排行榜（支持 branch、page、page_size） |
| GET | /points/my-records | 我的积分记录 |
| GET | /points/branches | 党支部列表 |

### 支部通知
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /notices | 通知列表（支持 type、page、page_size） |
| GET | /notices/types | 通知类型 |
| GET | /notices/:id | 通知详情 |

### 后台管理（需管理员）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/stats | 数据统计 |
| GET/POST/PUT/DELETE | /admin/articles[/:id] | 文章管理 |
| GET/POST/PUT/DELETE | /admin/activities[/:id] | 活动管理 |
| GET/POST/PUT/DELETE | /admin/notices[/:id] | 通知管理 |
| GET/DELETE | /admin/users[/:id] | 用户列表 / 删除 |
| PUT | /admin/users/:id/points | 调整用户积分 |
| GET | /admin/activity-signups/:activityId | 报名名单 |
| PUT | /admin/activity-signups/:id/status | 审核报名（approved/rejected/cancelled） |

## 核心功能演示

1. **首页浏览**：最新文章、热门活动、支部通知、积分排行
2. **学习专栏**：浏览党建文章、分类筛选、阅读得积分
3. **活动报名**：查看活动详情、在线报名、取消报名
4. **积分排行**：党员积分排名、党支部筛选、个人积分记录
5. **支部通知**：查看最新通知公告、类型筛选
6. **后台管理**（admin/admin123）：
   - 仪表盘：数据总览、最近报名
   - 文章管理：增删改查
   - 活动管理：增删改查、查看报名、审核通过自动发积分
   - 通知管理：增删改查、优先级排序
   - 用户管理：用户列表、调整积分、删除用户
7. **鉴权流程**：注册 → 登录 → JWT 自动续期 → 角色权限控制

## 注意事项

- **数据库模式**：默认使用 MySQL；设置 `DB_TYPE=json` 则使用 JSON 文件数据库
- **自动降级**：MySQL 连接失败时自动回退到 JSON 文件模式，保证服务可用
- 首次启动后端会自动初始化数据库和示例数据
- 重置数据：删除 `server/data/db.json`（JSON 模式）或 `DROP DATABASE party_building`（MySQL 模式）
- 生产部署时请修改 `JWT_SECRET` 环境变量
- 服务启动顺序：先完成数据库初始化，再监听端口接收请求
