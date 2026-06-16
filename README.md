# YCYW 2026 Global IT Meeting

> **Connect · Innovate · Empower**
>
> 耀中耀华教育（YCYW）全球 IT 团队年度会议站点 —— 集**会前公告与日程展示**、**会议地点导航**、**会中实时查询与照片/视频上传**、**会后反思存档**、**往届会议入口**与**后台管理**于一体的全栈 Web 应用。

![Vue](https://img.shields.io/badge/Vue-3.4-42b883?logo=vue.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-Internal_Use-lightgrey)

---

## 目录

- [✨ 功能总览](#-功能总览)
- [🛠 技术架构](#-技术架构)
- [📁 目录结构](#-目录结构)
- [🚀 快速开始（开发环境）](#-快速开始开发环境)
- [🐳 生产部署](#-生产部署)
- [⚙️ 环境变量说明](#️-环境变量说明)
- [🔐 认证系统](#-认证系统)
- [📡 API 参考](#-api-参考)
- [🧱 npm 脚本汇总](#-npm-脚本汇总)
- [📦 数据初始化](#-数据初始化)
- [📸 品牌设计规范](#-品牌设计规范)
- [📝 后续可拓展](#-后续可拓展)
- [License](#license)

---

## ✨ 功能总览

| 模块 | 路由 | 说明 |
| --- | --- | --- |
| **首页** | `/` | Hero + 倒计时 + 会议主题三支柱 + 统计数字（动画计数器）+ 公告横幅 + 议题轨道 + 技术栈展示 + 快捷入口 + 往届预览 |
| **日程安排** | `/schedule` | 按日期 Tab 切换 + 时间轴展示，数据来自 `schedule.json`，移动端友好 |
| **会议地点** | `/venue` | 学校信息、地址、嵌入式地图、交通指南 |
| **参会人员** | `/attendees` | 按学校 / 部门手风琴分组展示，支持头像照片 |
| **会后反思** | `/reflections` | 参会人员可发布反思；登录用户可评论、点赞（toggle）；支持匿名发布 |
| **会议剪影** | `/gallery` | 图片 / 视频 / 第三方链接上传；预设标签筛选；分页网格展示 |
| **往届会议** | `/past-meetings` | 历年会议记录浏览，支持外部链接跳转 |
| **OIDC 回调** | `/auth/callback` | OIDC 认证完成后的前端回调页面，自动保存令牌并跳转 |
| **后台管理** | `/admin` | 反思管理 / 剪影管理 / 往届会议 / 预设标签 / 公告管理（5 个 Tab） |
| **登录** | `/login` | 登录引导页面（根据 OIDC 模式自动切换行为） |

---

## 🛠 技术架构

### 前端

| 层 | 技术 |
| --- | --- |
| 框架 | **Vue 3.4** + Composition API (`<script setup>`) |
| 构建工具 | **Vite 5** |
| 状态管理 | **Pinia** |
| 路由 | **Vue Router 4**（history 模式） |
| UI 框架 | **Tailwind CSS 3.4** + **Element Plus** |
| 图标 | **Font Awesome**（@fortawesome/vue-fontawesome） |
| HTTP 客户端 | **axios**（全局拦截器自动附加 JWT） |
| 日期处理 | **dayjs** |
| 字体 | Inter + Noto Sans SC（Google Fonts CDN） |

### 后端

| 层 | 技术 |
| --- | --- |
| 运行时 | **Node.js 20** |
| 框架 | **Express 4** |
| ORM | **Prisma 5** |
| 认证 | **JWT**（jsonwebtoken）+ **OIDC**（openid-client v6 ESM） |
| 文件上传 | **multer**（内存模式 → StorageService） |
| 安全 | **helmet** + **cors** |
| 日志 | **morgan** |

### 数据库

| 环境 | 引擎 |
| --- | --- |
| 开发 | **SQLite**（`file:./dev.db`） |
| 生产 | **PostgreSQL 15**（通过 `DATABASE_URL` 切换） |

> ⚠️ Prisma `schema.prisma` 中 `provider` 硬编码为 `sqlite`，生产部署前需改为 `postgresql`。详见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

### 存储

| 模式 | 说明 |
| --- | --- |
| 本地磁盘（默认） | 文件存储在 `backend/uploads/`，通过 Express 静态文件服务 |
| 阿里云 OSS | 设置 `USE_OSS=true` 并配置 OSS 参数即可切换 |

整个上传流程通过 `StorageService` 抽象，业务代码无需改动。

### 认证

| 模式 | 触发条件 | 说明 |
| --- | --- | --- |
| Mock 模式 | `OIDC_ENABLED=false` | 弹出 AuthModal 输入邮箱即可登录（开发用） |
| OIDC 模式 | `OIDC_ENABLED=true` | 302 重定向到外部 OIDC Provider，回调后自动创建本地用户 |

### 部署

- **Docker Compose**：PostgreSQL + Node.js 后端 + Nginx 前端
- 前端 Nginx 自动反向代理 `/api/` 和 `/uploads/` 到后端容器

---

## 📁 目录结构

```
project-root/
├── backend/
│   ├── src/
│   │   ├── routes/              # 路由模块
│   │   │   ├── auth.js          # 登录 / OIDC 登录 / OIDC 回调 / 获取当前用户
│   │   │   ├── staticData.js    # /schedule, /attendees（读取 JSON 文件）
│   │   │   ├── reflections.js   # 反思 CRUD + 点赞 + 评论列表
│   │   │   ├── comments.js      # 评论 创建/删除
│   │   │   ├── gallery.js       # 剪影 CRUD（含文件上传）
│   │   │   ├── pastMeetings.js  # 往届会议 CRUD
│   │   │   ├── presetTags.js    # 预设标签 CRD
│   │   │   ├── announcements.js # 公告 CRUD
│   │   │   └── admin.js         # 管理员专属查询（反思/剪影列表）
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT 验证 / 权限中间件
│   │   ├── services/
│   │   │   └── storageService.js # 存储抽象层（Local / OSS）
│   │   ├── utils/
│   │   │   └── prisma.js        # Prisma Client 单例
│   │   ├── app.js               # Express 应用（中间件 + 路由注册）
│   │   └── server.js            # 启动入口
│   ├── prisma/
│   │   ├── schema.prisma        # 数据模型定义
│   │   ├── seed.js              # 基础种子数据（用户 / 标签 / 往届会议 / 公告）
│   │   ├── seed-demo.js         # 演示数据（10 篇反思 + 评论 + 点赞）
│   │   └── clean-demo.js        # 清理演示数据
│   ├── data/
│   │   ├── schedule.json        # 会议三天日程
│   │   └── attendees.json       # 参会人员名单
│   ├── uploads/                 # 本地文件存储（已 gitignore）
│   ├── .env.example             # 环境变量模板
│   ├── Dockerfile               # 后端容器镜像
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── logo.gif             # 站点 Logo
│   │   ├── default-avatar.svg   # 默认头像
│   │   └── attendees/           # 参会人员头像照片
│   ├── src/
│   │   ├── components/
│   │   │   ├── NavBar.vue       # 顶部导航栏
│   │   │   ├── Footer.vue       # 页脚
│   │   │   ├── AuthModal.vue    # 登录弹窗（Mock 模式）
│   │   │   ├── Countdown.vue    # 倒计时组件
│   │   │   └── BackToTop.vue    # 回到顶部按钮
│   │   ├── views/
│   │   │   ├── HomeView.vue
│   │   │   ├── ScheduleView.vue
│   │   │   ├── VenueView.vue
│   │   │   ├── AttendeesView.vue
│   │   │   ├── ReflectionsView.vue
│   │   │   ├── GalleryView.vue
│   │   │   ├── PastMeetingsView.vue
│   │   │   ├── LoginView.vue
│   │   │   ├── OidcCallbackView.vue  # OIDC 回调处理
│   │   │   ├── AdminView.vue         # 管理后台容器
│   │   │   └── admin/                # 管理后台 5 个 Tab
│   │   │       ├── AdminReflections.vue
│   │   │       ├── AdminGallery.vue
│   │   │       ├── AdminPast.vue
│   │   │       ├── AdminTags.vue
│   │   │       └── AdminAnnouncements.vue
│   │   ├── stores/
│   │   │   └── auth.js          # Pinia 认证状态（双模式支持）
│   │   ├── router/
│   │   │   └── index.js         # 路由定义 + 导航守卫
│   │   ├── api/
│   │   │   └── index.js         # axios 实例（自动附加 JWT）
│   │   ├── assets/
│   │   │   └── main.css         # 全局样式 + Tailwind 指令
│   │   ├── main.js              # 应用入口
│   │   └── App.vue              # 根组件
│   ├── nginx.conf               # Nginx 配置（SPA + 反向代理）
│   ├── Dockerfile               # 前端多阶段构建
│   ├── vite.config.js           # Vite 配置（代理 + 别名）
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── scripts/
│   ├── copy-attendee-photos.js  # 复制参会人员照片到 public（Node.js）
│   └── copy-attendee-photos.ps1 # 同上（PowerShell 版）
├── docker-compose.yml           # 一键部署：PostgreSQL + Backend + Frontend
├── package.json                 # 根工程（concurrently 同时启动前后端）
├── DEPLOYMENT.md                # 部署说明文档
└── README.md                    # 本文件
```

---

## 🚀 快速开始（开发环境）

### 前提条件

- **Node.js** ≥ 20
- **npm** ≥ 9

### 1. 安装依赖

```bash
# 一次性安装根、前端、后端所有依赖
npm run install:all
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
# 默认使用 SQLite，无需修改 DATABASE_URL
# 按需调整 ADMIN_EMAILS
```

### 3. 初始化数据库 + 灌入种子数据

```bash
cd backend

# 创建数据库迁移并应用
npx prisma migrate dev --name init

# 灌入基础种子数据（用户 / 标签 / 往届会议 / 公告）
npm run db:seed

# （可选）灌入演示数据（10 篇反思 + 评论 + 点赞）
npm run db:seed-demo
```

> 种子脚本会：
> - 基于 `data/attendees.json` 自动创建参会用户（`isAttendee=true`）
> - 为 `ADMIN_EMAILS` 中的邮箱创建/提升管理员账号
> - 插入预设标签、往届会议记录和欢迎公告

### 4. 启动前后端

```bash
# 在项目根目录
npm run dev
# BACKEND: http://localhost:3000
# FRONTEND: http://localhost:5173
```

也可以分别启动：

```bash
npm run dev:backend   # 仅后端（nodemon 热重载）
npm run dev:frontend  # 仅前端（Vite HMR）
```

> 开发模式下，Vite 自动将 `/api` 和 `/uploads` 请求代理到 `http://localhost:3000`。

### 5. 测试登录

默认为 Mock 模式（`OIDC_ENABLED=false`），点击导航栏「管理员登录」按钮会弹出邮箱输入框：

| 角色 | 登录方式 |
| --- | --- |
| **管理员** | 输入 `admin@ycyw.cn` 或 `.env` 中 `ADMIN_EMAILS` 配置的任何邮箱 |
| **参会人员** | 种子数据已为 `attendees.json` 中每人生成形如 `joycechen@ycyw-edu.com` 的邮箱 |
| **普通用户** | 输入任意有效邮箱 → 自动创建普通账户（可评论/点赞/上传剪影，但不能发布反思） |

---

## 🐳 生产部署

> 完整的生产部署指南请参阅 **[DEPLOYMENT.md](./DEPLOYMENT.md)**，涵盖 Docker Compose 部署、PostgreSQL 切换、OSS 存储、OIDC 配置、SSL、数据备份等。

快速概览：

```bash
# 1. 修改 backend/prisma/schema.prisma 中 provider 为 "postgresql"
# 2. 按需修改 docker-compose.yml 中的环境变量（JWT_SECRET、ADMIN_EMAILS 等）
# 3. 一键部署
docker compose up -d --build
# 4. 访问 http://<服务器IP>
```

容器组成：
- `postgres` — PostgreSQL 15 (端口 5432)
- `backend` — Node.js API 服务 (端口 3000)
- `frontend` — Nginx 静态 + 反向代理 (端口 80)

数据持久化：`pgdata` 和 `uploads` 两个 Docker Volume。

---

## ⚙️ 环境变量说明

> 完整模板见 [`backend/.env.example`](./backend/.env.example)

### 应用基础

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | 运行环境 |
| `PORT` | `3000` | API 服务端口 |
| `JWT_SECRET` | （示例值） | JWT 签名密钥 — **生产环境必须修改** |
| `JWT_EXPIRES_IN` | `7d` | JWT 过期时间 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的前端源，多个用逗号分隔 |

### 数据库

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | 开发用 SQLite；生产改为 `postgresql://user:pass@host:5432/db` |

### 管理员

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ADMIN_EMAILS` | `admin@ycyw.cn,ying.hou@ycyw.cn` | 管理员邮箱列表（逗号分隔），登录即获管理员权限 |

### 存储

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `USE_OSS` | `false` | `true` = 阿里云 OSS，`false` = 本地磁盘 |
| `OSS_REGION` | `cn-hangzhou` | OSS 区域 |
| `OSS_ACCESS_KEY_ID` | — | OSS AccessKey ID |
| `OSS_ACCESS_SECRET` | — | OSS AccessKey Secret |
| `OSS_BUCKET` | — | OSS Bucket 名称 |
| `OSS_ENDPOINT` | — | OSS 自定义 Endpoint（可选） |
| `OSS_PUBLIC_BASE_URL` | — | OSS 公网访问基础 URL（可选） |

### OIDC 认证

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OIDC_ENABLED` | `false` | `true` = 启用真实 OIDC，`false` = 使用 Mock 邮箱登录 |
| `OIDC_AUTHORITY` | — | OIDC Provider 的 Issuer URL（支持 `.well-known/openid-configuration` 自动发现） |
| `OIDC_CLIENT_ID` | — | OIDC Client ID |
| `OIDC_CLIENT_SECRET` | — | OIDC Client Secret |
| `OIDC_REDIRECT_URI` | — | OIDC 回调 URI（指向后端，如 `http://host/api/auth/oidc-callback`） |
| `OIDC_SCOPES` | `openid email profile` | 请求的 OIDC Scopes |
| `OIDC_FRONTEND_CALLBACK` | `/auth/callback` | 认证完成后重定向的前端路径 |

### 上传限制

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MAX_IMAGE_SIZE` | `10485760` | 图片最大大小（10 MB） |
| `MAX_VIDEO_SIZE` | `52428800` | 视频最大大小（50 MB） |

---

## 🔐 认证系统

### 双模式架构

项目实现了完整的双模式认证，通过 `OIDC_ENABLED` 环境变量在两种模式之间切换：

#### Mock 模式（`OIDC_ENABLED=false`，默认）

```
用户点击登录 → AuthModal 弹窗 → 输入邮箱
  → POST /api/auth/login { email }
  → 后端 findOrCreate 用户 → 签发 JWT → 返回 token + user
  → 前端保存到 localStorage + Pinia
```

#### OIDC 模式（`OIDC_ENABLED=true`）

```
用户点击登录 → 前端 window.location.href = /api/auth/oidc-login?redirect=...
  → 后端生成 state → 302 重定向到 OIDC Provider
  → 用户在 OIDC Provider 认证
  → OIDC Provider 回调到 /api/auth/oidc-callback?code=...&state=...
  → 后端用 code 换 token → fetchUserInfo 获取邮箱
  → findOrCreate 本地用户 → 签发 JWT
  → 302 重定向到前端 /auth/callback?token=JWT&redirect=...
  → OidcCallbackView 保存 token → fetchMe → 跳转目标页面
```

> 后端使用 **openid-client v6**（ESM，通过 CommonJS 动态 `import()` 加载），支持 Discovery、Authorization Code Grant、UserInfo 获取。

### 权限模型

| 角色 | 判定方式 | 能力 |
| --- | --- | --- |
| **游客** | 未登录 | 浏览首页、日程安排、会议地点、参会人员、反思列表、剪影列表、往届会议 |
| **普通用户** | 登录但非参会者 | 游客能力 + 评论 / 点赞 / 上传剪影 |
| **参会者** | `isAttendee=true`（来自种子数据） | 普通用户能力 + **发布反思** |
| **管理员** | `isAdmin=true`（邮箱在 `ADMIN_EMAILS` 中） | 全部能力 + 后台管理 |

---

## 📡 API 参考

所有接口统一前缀 `/api`。

### 认证

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/auth/config` | 公开 | 返回 `{ oidcEnabled }` |
| POST | `/auth/login` | 公开 | Mock 模式邮箱登录，`{ email }` → `{ token, user }` |
| GET | `/auth/oidc-login` | 公开 | OIDC 模式入口，302 重定向到 OIDC Provider |
| GET | `/auth/oidc-callback` | 公开 | OIDC 回调，完成认证后重定向到前端 |
| GET | `/auth/me` | 登录 | 获取当前用户信息 |

### 静态数据

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/schedule` | 公开 | 返回日程 JSON |
| GET | `/attendees` | 公开 | 返回按学校分组的参会人员列表 |

### 反思

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/reflections` | 公开 | 分页列表 `?page=&limit=` |
| GET | `/reflections/:id` | 公开 | 单条详情 |
| POST | `/reflections` | 参会者 | 发布反思 |
| PUT | `/reflections/:id` | 作者/管理员 | 编辑反思 |
| DELETE | `/reflections/:id` | 作者/管理员 | 删除反思（级联删除评论和点赞） |
| POST | `/reflections/:id/like` | 登录 | 点赞 / 取消点赞（toggle） |
| GET | `/reflections/:id/comments` | 公开 | 获取评论列表 |

### 评论

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/comments` | 登录 | 发表评论 `{ reflectionId, content, isAnonymous }` |
| DELETE | `/comments/:id` | 作者/管理员 | 删除评论 |

### 剪影

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/gallery` | 公开 | 分页列表 `?tag=&date=&page=&limit=` |
| POST | `/gallery` | 登录 | 上传（multipart：`file` + `title` + `type` + `tags` + `videoLink`） |
| PATCH | `/gallery/:id` | 管理员 | 编辑标题/标签 |
| DELETE | `/gallery/:id` | 管理员 | 删除 |

### 往届会议

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/past-meetings` | 公开 | 列表（按年份降序） |
| POST | `/past-meetings` | 管理员 | 创建 |
| PUT | `/past-meetings/:id` | 管理员 | 编辑 |
| DELETE | `/past-meetings/:id` | 管理员 | 删除 |

### 预设标签

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/preset-tags` | 公开 | 列表（按名称排序） |
| POST | `/preset-tags` | 管理员 | 创建 |
| DELETE | `/preset-tags/:id` | 管理员 | 删除 |

### 公告

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/announcements/active` | 公开 | 获取最新激活公告 |
| GET | `/announcements` | 管理员 | 全部公告列表 |
| POST | `/announcements` | 管理员 | 创建 |
| PUT | `/announcements/:id` | 管理员 | 编辑 |
| DELETE | `/announcements/:id` | 管理员 | 删除 |

### 管理员查询

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/reflections` | 管理员 | 反思列表（含作者详情）`?q=keyword` |
| GET | `/admin/gallery` | 管理员 | 剪影列表（含上传者详情）`?tag=&uploader=` |

### 健康检查

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/health` | 公开 | `{ ok: true, ts: "..." }` |

---

## 🧱 npm 脚本汇总

### 根目录

| 命令 | 说明 |
| --- | --- |
| `npm run install:all` | 一次性安装根 / 前端 / 后端所有依赖 |
| `npm run dev` | 同时启动前后端（concurrently） |
| `npm run dev:backend` | 仅启动后端（nodemon） |
| `npm run dev:frontend` | 仅启动前端（Vite） |
| `npm run build:frontend` | 前端打包到 `frontend/dist` |
| `npm run db:migrate` | 执行 `prisma migrate dev` |
| `npm run db:seed` | 执行基础种子脚本 |
| `npm run db:reset` | 重置数据库（含迁移与种子） |

### 后端目录 (`backend/`)

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | nodemon 启动 |
| `npm start` | 生产启动 |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev --name init` |
| `npm run db:push` | `prisma db push` |
| `npm run db:seed` | 基础种子数据 |
| `npm run db:seed-demo` | 演示数据（10 篇反思 + 评论 + 点赞） |
| `npm run db:clean-demo` | 清理演示数据（删除 `[DEMO]` 前缀的反思及关联数据） |
| `npm run db:reset` | `prisma migrate reset --force` |

---

## 📦 数据初始化

### 静态数据文件

| 文件 | 说明 |
| --- | --- |
| `backend/data/schedule.json` | 会议三天日程（源自日程安排 Excel） |
| `backend/data/attendees.json` | 参会人员名单（学校 / 英文名 / 中文名 / 照片 URL） |

> `staticData.js` 路由每次请求时直接读取文件，无内存缓存。修改 JSON 后重启后端即刻生效。

### 种子脚本

| 脚本 | 说明 |
| --- | --- |
| `prisma/seed.js` | 创建参会用户、管理员、18 个预设标签、往届会议（2024 上海 / 2025 石河子）、欢迎公告 |
| `prisma/seed-demo.js` | 创建 10 篇 `[DEMO]` 前缀反思 + 随机评论和点赞（方便演示） |
| `prisma/clean-demo.js` | 清理所有 `[DEMO]` 开头的反思及其评论和点赞 |

### 参会人员照片

```bash
# 从本地目录复制照片到 frontend/public/attendees/
node scripts/copy-attendee-photos.js
# 或 PowerShell 版
.\scripts\copy-attendee-photos.ps1
```

> 注意：脚本中的源路径是硬编码的，使用前请根据实际情况修改。

---

## 📸 品牌设计规范

### 颜色

| 名称 | 色值 | 用途 |
| --- | --- | --- |
| Brand Blue | `#0032a0` | 主色调 |
| Brand Deep | `#001e60` | 深色背景 |
| Brand Orange | `#ff8200` | 强调 / CTA |
| Brand Red | `#ff0044` | 警示 / 标记 |
| Neutral | `#e3e3e6` | 灰色边框 / 背景 |

### 字体

- **英文**：Inter（Google Fonts CDN）
- **中文**：Noto Sans SC（Google Fonts CDN）

---

## 📝 后续可拓展

- [ ] 真实 SSO（SAML 2.0）接入补充
- [ ] 主站「每届独立站点」统一入口（`PastMeeting.linkUrl` 已支持）
- [ ] 反思 / 剪影全文检索（接入 Meilisearch 或 Elasticsearch）
- [ ] 移动端 PWA 支持
- [ ] 上传后自动生成视频缩略图
- [ ] 多语言（i18n）支持
- [ ] 邮件通知（新反思、新评论）
- [ ] Redis 缓存（OIDC state、热门数据）
- [ ] 集群部署方案（Kubernetes + Ingress）

---

## License

Internal use only · YCYW Education
