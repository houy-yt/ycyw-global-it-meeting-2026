# YCYW 2026 Global IT Meeting

> **Connect · Innovate · Empower**
>
> 耀中耀华教育（YCYW）全球 IT 团队年度会议站点 —— 集**首页动态内容管理**、**会前公告与日程展示**、**参会指南与入场须知**、**天气预报**、**会议地点导航**、**会中实时查询与照片/视频上传**、**会后反思存档**、**数据分析与 LLM 总结**、**邮件通知**、**文件管理**、**RBAC 权限体系**、**往届会议入口**与**后台管理**于一体的全栈 Web 应用。

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
- [🔐 认证与权限系统](#-认证与权限系统)
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
| **首页** | `/` | Hero + 倒计时 + 关于会议（富文本）+ 会议主题三支柱 + 统计数字（动画计数器）+ 公告横幅 + 议题轨道 + 技术栈展示 + 快捷入口 + 团队宣言 + 往届预览；**所有区块均可通过后台「首页管理」动态配置** |
| **日程安排** | `/schedule` | 按日期 Tab 切换 + 时间轴展示，每日可配通知/注意事项；Talk 详情弹窗支持内嵌 PPT/PDF/视频/音频/图片/外链预览 |
| **参会指南** | `/meeting-guide` | 可配置信息卡片展示（住宿安排、交通指引、WiFi 信息、行前准备等），后台可自定义卡片内容/图标/排序 |
| **入场须知** | `/entry-guide` | 访客二维码、天气预览、入场流程指引页面 |
| **会议地点** | `/venue` | 学校信息、地址、嵌入式地图、交通指南 |
| **参会人员** | `/attendees` | 顶部部门 Tab 切换（IT / Logistics / HRD / FAD / CMD），按学校/组织手风琴分组展示，支持头像照片 |
| **天气预报** | `/weather` | 会议地点（北京亦庄）实时天气与未来预报，支持和风天气 / Open-Meteo 双数据源 |
| **会后反思** | `/reflections` | 参会人员可发布反思（富文本）；登录用户可评论、点赞（toggle）；支持匿名发布 |
| **会议剪影** | `/gallery` | 图片 / 视频 / 第三方链接上传；预设标签筛选；分页网格展示 |
| **往届会议** | `/past-meetings` | 历年会议记录浏览，支持外部链接跳转 |
| **OIDC 回调** | `/auth/callback` | OIDC 认证完成后的前端回调页面，自动保存令牌并跳转 |
| **登录** | `/login` | 登录引导页面（根据 OIDC 模式自动切换行为） |
| **后台管理** | `/admin` | 4 组 17 项侧边栏管理（详见下表） |

### 后台管理模块

| 分组 | 管理项 | 说明 |
| --- | --- | --- |
| **会议管理** | 会议信息 · 日程安排 · 参会须知 · 发送邮件 | 会议基本信息 CRUD、四级日程管理、参会指南卡片、SMTP 多发件人邮件通知 |
| **人员与组织** | 参会人员 · 部门维护 · 组织维护 | 参会者管理（含头像上传/Excel 导入）、部门字典、学校/组织维护 |
| **内容管理** | 首页管理 · 反思管理 · 剪影管理 · 往届会议 | **首页区块动态配置**（卡片组/宣言/公告/统计等）、反思审核、剪影审核、往届记录 |
| **数据与设置** | 数据分析 · 系统设置 · 权限设置 · 角色管理 · 文件管理 · FA图标库 | 反思分析（情感/关键词/LLM）、键值设置、**页面访问白名单**、**RBAC 角色管理**（超管专属）、elFinder 文件管理、图标参考 |

> **数据分析**：反思总览（情感分布、平均分、Top 点赞）、关键词云、时间趋势、贡献者排行、LLM 总结（OpenAI / DeepSeek 可选）
>
> **邮件通知**：SMTP 多发件人配置、按学校/部门选择收件人、富文本邮件编辑、测试发送
>
> **文件管理**：基于 elFinder 的可视化文件管理器，管理 `uploads/` 目录下的所有文件；支持上传、创建目录、重命名、移动、复制、删除、搜索、预览；与 TinyMCE 富文本编辑器集成，可直接插入服务器文件

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
| 图标 | **Font Awesome 7**（@fortawesome/vue-fontawesome） |
| 富文本编辑器 | **TinyMCE 8**（@tinymce/tinymce-vue，含中文语言包；集成 elFinder 文件选择器） |
| 文件管理器 | **elFinder**（基于 jQuery/jQuery UI，通过 iframe 嵌入后台） |
| HTTP 客户端 | **axios**（全局拦截器自动附加 JWT） |
| 日期处理 | **dayjs** |
| 文件导出 | **file-saver** + **jszip**（压缩下载） |
| 表格导入导出 | **xlsx**（Excel 读写） |
| 拖拽排序 | **sortablejs** |
| 构建辅助 | **vite-plugin-static-copy**（复制 TinyMCE / jQuery / jQuery UI 运行时资源） |
| 字体 | Inter + Noto Sans SC（Google Fonts CDN） |

### 后端

| 层 | 技术 |
| --- | --- |
| 运行时 | **Node.js 20** |
| 框架 | **Express 4** |
| ORM | **Prisma 5** |
| 认证 | **JWT**（jsonwebtoken）+ **OIDC**（openid-client v6 ESM，含登录 + 退出） |
| RBAC | 基于 `role` + `adminPermissions` 字段的角色权限控制 |
| 文件上传 | **multer**（内存模式 → StorageService） |
| 文件管理 | **elFinder Connector**（实现 elFinder 客户端-服务器协议 2.1，管理 uploads/ 目录） |
| 邮件发送 | **nodemailer**（多发件人 SMTP） |
| 安全 | **helmet** + **cors** + **bcryptjs** |
| 日志 | **morgan** |
| NLP 服务 | **sentimentService**（本地中文情感词典）+ **tokenizer**（中英文分词） |
| LLM 集成 | **llmService**（OpenAI / DeepSeek 等兼容接口，可选） |
| 动态配置 | **settingsService**（数据库键值对 + 内存缓存） |

### 数据库

| 环境 | 引擎 |
| --- | --- |
| 开发 | **SQLite**（`file:./dev.db`） |
| 生产 | **PostgreSQL 15**（通过 `DATABASE_URL` 切换） |

> ⚠️ Prisma `schema.prisma` 中 `provider` 硬编码为 `sqlite`，生产部署前需改为 `postgresql`。详见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

### 数据模型

| 模型 | 说明 |
| --- | --- |
| `User` | 用户（邮箱登录、角色 role、管理员权限 adminPermissions） |
| `Reflection` / `Comment` / `Like` | 会后反思、评论、点赞（含情感分析字段） |
| `GalleryItem` | 会议剪影（图片/视频/外链） |
| `PastMeeting` | 往届会议记录 |
| `PresetTag` | 预设标签 |
| `Announcement` | 公告 |
| `MeetingInfo` | 会议基本信息（单行表，含 `aboutTitle` / `aboutContent` 首页关于区块） |
| `ScheduleDay` / `ScheduleItem` / `Talk` / `TalkResource` | 日程安排四级结构 |
| `Attendee` / `Organization` / `Department` | 参会人员、组织、部门 |
| `SystemSetting` | 系统设置键值对（含 `auth.whitelist` 页面白名单） |
| `HomeSection` / `HomeSectionCard` | 首页动态区块 + 卡片（支持 cards / statement / intro / announcement / stats 等类型） |
| `MeetingGuideItem` | 参会指南信息卡片 |

### 存储

| 模式 | 说明 |
| --- | --- |
| 本地磁盘（默认） | 文件存储在 `backend/uploads/`，通过 Express 静态文件服务；可通过 elFinder 可视化管理 |
| 阿里云 OSS | 设置 `USE_OSS=true` 并配置 OSS 参数即可切换 |

整个上传流程通过 `StorageService` 抽象，业务代码无需改动。

### 认证

| 模式 | 触发条件 | 说明 |
| --- | --- | --- |
| Mock 模式 | `OIDC_ENABLED=false` | 弹出 AuthModal 输入邮箱即可登录（开发用） |
| OIDC 模式 | `OIDC_ENABLED=true` | 302 重定向到外部 OIDC Provider，回调后自动创建本地用户；支持 OIDC 退出登录 |

### 部署

- **Docker Compose**：PostgreSQL + Node.js 后端 + Nginx 前端
- **PM2**：可选，使用 `ecosystem.config.js` 进程管理
- 前端 Nginx 自动反向代理 `/api/` 和 `/uploads/` 到后端容器

---

## 📁 目录结构

```
project-root/
├── backend/
│   ├── src/
│   │   ├── routes/                   # 路由模块
│   │   │   ├── auth.js               # 登录 / OIDC 登录 / OIDC 回调 / OIDC 退出 / 获取当前用户
│   │   │   ├── staticData.js         # /schedule, /attendees, /meeting（读取数据库）
│   │   │   ├── talks.js              # 公开 Talk 详情（含资源列表）
│   │   │   ├── reflections.js        # 反思 CRUD + 点赞 + 评论列表
│   │   │   ├── comments.js           # 评论 创建/删除
│   │   │   ├── gallery.js            # 剪影 CRUD（含文件上传）
│   │   │   ├── pastMeetings.js       # 往届会议 CRUD
│   │   │   ├── presetTags.js         # 预设标签 CRD
│   │   │   ├── announcements.js      # 公告 CRUD
│   │   │   ├── weather.js            # 天气 API 代理（和风天气 / Open-Meteo）
│   │   │   ├── meetingGuide.js       # 参会指南 CRUD（public + admin）
│   │   │   ├── homeSections.js       # 首页区块 CRUD（public + admin）
│   │   │   ├── admin.js              # 管理员专属查询（反思/剪影列表）
│   │   │   ├── adminUsers.js         # 角色管理 CRUD（超级管理员专属）
│   │   │   ├── meeting.js            # 会议信息管理（admin）
│   │   │   ├── schedule.js           # 日程 CRUD：天/时段/演讲/资源（admin）
│   │   │   ├── attendeesAdmin.js     # 参会人员/组织/部门 CRUD（admin）
│   │   │   ├── settings.js           # 系统设置键值对 CRUD（admin）
│   │   │   ├── analytics.js          # 反思数据分析（情感/关键词/趋势/LLM）
│   │   │   ├── notification.js       # 邮件通知（SMTP 配置/发送/测试）
│   │   │   └── elfinder.js           # elFinder 连接器（文件管理 API）
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT 验证 / adminRequired / superAdminRequired / attendeeRequired
│   │   ├── services/
│   │   │   ├── storageService.js     # 存储抽象层（Local / OSS）
│   │   │   ├── settingsService.js    # 数据库键值设置读写（内存缓存）
│   │   │   ├── sentimentService.js   # 中文情感分析（本地词典 / LLM）
│   │   │   ├── llmService.js         # LLM 调用（OpenAI / DeepSeek 兼容）
│   │   │   └── tokenizer.js          # 中英文分词器
│   │   ├── utils/
│   │   │   └── prisma.js             # Prisma Client 单例
│   │   ├── app.js                    # Express 应用（中间件 + 路由注册）
│   │   └── server.js                 # 启动入口
│   ├── prisma/
│   │   ├── schema.prisma             # 数据模型定义（15 个模型）
│   │   ├── seed.js                   # 基础种子数据（用户/标签/往届/公告/部门/设置/日程/参会人员）
│   │   ├── seed-about.js             # 首页「关于会议」区块内容种子
│   │   ├── seed-demo.js              # 演示数据（10 篇反思 + 评论 + 点赞）
│   │   ├── clean-demo.js             # 清理演示数据
│   │   └── migrate-static-to-db.js   # 从 JSON 文件迁移数据到数据库
│   ├── data/
│   │   ├── schedule.json             # 会议三天日程（源数据）
│   │   ├── attendees.json            # 参会人员名单（源数据）
│   │   ├── sentiment-zh.json         # 中文情感词典
│   │   ├── stopwords-zh.json         # 中文停用词表
│   │   └── stopwords-en.json         # 英文停用词表
│   ├── uploads/                      # 本地文件存储（已 gitignore）
│   ├── .env.example                  # 环境变量模板
│   ├── Dockerfile                    # 后端容器镜像
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── logo.gif                  # 站点 Logo
│   │   ├── default-avatar.svg        # 默认头像
│   │   ├── hero-banner.jpg           # Hero 横幅
│   │   ├── hero-banner-sm.jpg        # Hero 横幅（移动端）
│   │   ├── schedule-banner.jpg       # 日程横幅
│   │   ├── save-date-bg.jpg          # Save the Date 背景
│   │   ├── video-cover.jpg           # 视频封面
│   │   ├── fksq-qrcode.jpg           # 访客申请二维码
│   │   ├── fkzn.jpg                  # 访客指南
│   │   ├── elfinder.html             # elFinder 文件管理器页面（独立 HTML）
│   │   ├── elfinder/                 # elFinder 静态资源（CSS/JS/图片/语言包）
│   │   ├── attendees/                # 参会人员头像照片
│   │   └── tinymce/langs/            # TinyMCE 中文语言包
│   ├── src/
│   │   ├── config/
│   │   │   └── adminMenu.js          # 后台菜单定义（单一事实来源）+ 前端路由标签 + 排除路径
│   │   ├── components/
│   │   │   ├── NavBar.vue            # 顶部导航栏
│   │   │   ├── Footer.vue            # 页脚
│   │   │   ├── AuthModal.vue         # 登录弹窗（Mock 模式）
│   │   │   ├── Countdown.vue         # 倒计时组件
│   │   │   ├── BackToTop.vue         # 回到顶部按钮
│   │   │   ├── WeatherCard.vue       # 天气卡片组件
│   │   │   ├── TinyEditor.vue        # TinyMCE 富文本编辑器封装（集成 elFinder 文件选择）
│   │   │   └── PhotoPreviewModal.vue # 照片预览弹窗
│   │   ├── views/
│   │   │   ├── HomeView.vue
│   │   │   ├── ScheduleView.vue
│   │   │   ├── MeetingGuideView.vue      # 参会指南
│   │   │   ├── EntryGuideView.vue        # 入场须知
│   │   │   ├── VenueView.vue
│   │   │   ├── AttendeesView.vue
│   │   │   ├── WeatherView.vue           # 天气预报
│   │   │   ├── ReflectionsView.vue
│   │   │   ├── GalleryView.vue
│   │   │   ├── PastMeetingsView.vue
│   │   │   ├── LoginView.vue
│   │   │   ├── OidcCallbackView.vue      # OIDC 回调处理
│   │   │   ├── AdminView.vue             # 管理后台容器（4 组侧边栏）
│   │   │   └── admin/                    # 管理后台模块
│   │   │       ├── AdminMeeting.vue          # 会议信息
│   │   │       ├── AdminSchedule.vue         # 日程管理
│   │   │       ├── AdminMeetingGuide.vue     # 参会须知
│   │   │       ├── AdminNotification.vue     # 发送邮件
│   │   │       ├── AdminAttendees.vue        # 参会人员
│   │   │       ├── AdminDepartments.vue      # 部门维护
│   │   │       ├── AdminOrganizations.vue    # 组织维护
│   │   │       ├── AdminHomeSections.vue     # 首页管理（动态区块 + 卡片）
│   │   │       ├── AdminReflections.vue      # 反思管理
│   │   │       ├── AdminGallery.vue          # 剪影管理
│   │   │       ├── AdminAnnouncements.vue    # 公告管理
│   │   │       ├── AdminPast.vue             # 往届会议
│   │   │       ├── AdminTags.vue             # 预设标签管理
│   │   │       ├── AdminAnalytics.vue        # 数据分析
│   │   │       ├── AdminSettings.vue         # 系统设置
│   │   │       ├── AdminPermissions.vue      # 权限设置（页面白名单）
│   │   │       ├── AdminAdmins.vue           # 角色管理（超级管理员专属）
│   │   │       ├── AdminFileManager.vue      # 文件管理（elFinder）
│   │   │       └── AdminFaIcons.vue          # FA图标库
│   │   ├── stores/
│   │   │   └── auth.js               # Pinia 认证状态（双模式 + RBAC 权限）
│   │   ├── router/
│   │   │   └── index.js              # 路由定义 + 导航守卫（含白名单检查）
│   │   ├── api/
│   │   │   └── index.js              # axios 实例（自动附加 JWT）
│   │   ├── assets/
│   │   │   └── main.css              # 全局样式 + Tailwind 指令
│   │   ├── main.js                   # 应用入口
│   │   └── App.vue                   # 根组件
│   ├── nginx.conf                    # Nginx 配置（SPA + 反向代理）
│   ├── Dockerfile                    # 前端多阶段构建
│   ├── vite.config.js                # Vite 配置（代理 + 别名 + 静态资源复制）
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── scripts/
│   ├── copy-attendee-photos.js       # 复制参会人员照片到 public（Node.js）
│   ├── copy-attendee-photos.ps1      # 同上（PowerShell 版）
│   └── generate-fa-categories.js     # 生成 Font Awesome 图标分类数据
├── docker-compose.yml                # 一键部署：PostgreSQL + Backend + Frontend
├── ecosystem.config.js               # PM2 进程管理配置
├── package.json                      # 根工程（concurrently 同时启动前后端）
├── DEPLOYMENT.md                     # 部署说明文档
└── README.md                         # 本文件
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

# 🚀 一键命令：同步 schema 并灌入全部默认数据
npm run db:init

# （可选）灌入演示数据（10 篇反思 + 评论 + 点赞）
npm run db:seed-demo
```

> `db:init` = `prisma db push --accept-data-loss` + `node prisma/seed.js`，会自动：
>
> 1. 把最新 `schema.prisma` 同步到 SQLite/Postgres（创建 `MeetingInfo / ScheduleDay / ScheduleItem / Talk / TalkResource / Attendee / Organization / Department / SystemSetting / HomeSection / HomeSectionCard / MeetingGuideItem` 等表）
> 2. 灌入用户、标签、往届会议、公告、部门、默认系统设置
> 3. 把 `data/schedule.json` 和 `data/attendees.json` 内容**自动迁入数据库**（首次执行时）
> 4. 灌入参会指南默认卡片（住宿/交通/WiFi 等）
>
> 如果新表已存在但日程/参会人员是空的（比如你从 v1 升级上来），也可以在后台「日程安排」「参会人员」Tab 顶部点击 **「📥 从静态文件导入」** 按钮一键填充。

如果想分开走传统流程：

```bash
npx prisma migrate dev --name init  # 用迁移文件管理
npm run db:seed                     # 灌入种子数据（含静态文件迁移）
```

> 种子脚本会：
> - 基于 `data/attendees.json` 自动创建参会用户（`isAttendee=true`）
> - 为 `ADMIN_EMAILS` 中的邮箱创建/提升管理员账号
> - 插入预设标签、往届会议记录和欢迎公告
> - 创建默认组织和部门数据
> - 初始化系统设置（上传限制、分析引擎、页面白名单等）

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
| **超级管理员** | 输入 `admin@ycyw.cn` 或 `.env` 中 `ADMIN_EMAILS` 配置的任何邮箱 → 拥有全部后台权限 |
| **参会人员** | 种子数据已为 `attendees.json` 中每人生成形如 `joycechen@ycyw-edu.com` 的邮箱 |
| **普通用户** | 输入任意有效邮箱 → 自动创建普通账户（可评论/点赞/上传剪影，但不能发布反思） |

---

## 🐳 生产部署

> 完整的生产部署指南请参阅 **[DEPLOYMENT.md](./DEPLOYMENT.md)**，涵盖 Docker Compose 部署、PM2 部署、PostgreSQL 切换、OSS 存储、OIDC 配置（含退出登录）、天气 API、邮件通知、LLM 分析、文件管理、RBAC 权限、页面白名单、SSL、数据备份等。

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
| `ADMIN_EMAILS` | `admin@ycyw.cn,ying.hou@ycyw.cn` | **超级管理员**邮箱列表（逗号分隔），登录即获最高权限；不可被角色管理撤销 |

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

### 天气 API

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `WEATHER_PROVIDER` | `auto` | 天气数据源：`qweather`（和风天气）/ `openmeteo`（Open-Meteo，免费）/ `auto`（自动选择） |
| `QWEATHER_API_HOST` | — | 和风天气 API 主机（如 `xxx.re.qweatherapi.com`） |
| `QWEATHER_CREDENTIAL_ID` | — | 和风天气 Credential ID（用于 JWT 签名） |
| `QWEATHER_PRIVATE_KEY` | — | 和风天气 Ed25519 私钥（仅 base64 body） |
| `WEATHER_LOCATION` | `101010100` | 和风天气城市 ID（默认北京） |

> 天气功能无需额外配置即可使用 —— 默认使用免费的 Open-Meteo 作为数据源。如需更精确的数据，可配置和风天气 API。

### 上传限制

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MAX_IMAGE_SIZE` | `10485760` | 图片最大大小（10 MB） |
| `MAX_VIDEO_SIZE` | `52428800` | 视频最大大小（50 MB） |

> 上传限制同时可通过后台「系统设置」动态调整，数据库设置优先级高于环境变量。

### 数据分析 / LLM（通过后台系统设置配置）

以下配置通过后台「系统设置」管理，存储在 `SystemSetting` 表中：

| 设置键 | 默认值 | 说明 |
| --- | --- | --- |
| `analytics.sentimentEngine` | `local` | 情感分析引擎：`local`（本地词典）/ `openai` / `deepseek` |
| `analytics.llmApiKey` | — | LLM API Key（使用 OpenAI/DeepSeek 时必填） |
| `analytics.llmBaseUrl` | （自动） | LLM API Base URL（可自定义，支持兼容接口） |
| `analytics.llmModel` | （自动） | LLM 模型名称（如 `gpt-4o-mini` / `deepseek-chat`） |

### 页面白名单（通过后台权限设置配置）

| 设置键 | 默认值 | 说明 |
| --- | --- | --- |
| `auth.whitelist` | `[]` | JSON 数组，列出无需登录即可访问的前端页面路径（如 `["/", "/schedule", "/weather"]`） |

> 当 `auth.whitelist` 为空数组时，所有页面都需要登录才能访问（OIDC 模式下会自动重定向到 SSO）。

---

## 🔐 认证与权限系统

### 双模式认证

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
  → 302 重定向到前端 /auth/callback?token=JWT&id_token=...&redirect=...
  → OidcCallbackView 保存 token + id_token → fetchMe → 跳转目标页面
```

退出登录（OIDC 模式）：

```
前端清除 localStorage → window.location.href = /api/auth/logout?id_token=...
  → 后端构建 end_session_endpoint URL（附带 id_token_hint + post_logout_redirect_uri）
  → 302 重定向到 OIDC Provider 退出页
  → Provider 退出后重定向回前端首页
```

> 后端使用 **openid-client v6**（ESM，通过 CommonJS 动态 `import()` 加载），支持 Discovery、Authorization Code Grant、UserInfo 获取、End Session。

### RBAC 角色权限模型

| 角色 | 判定方式 | 能力 |
| --- | --- | --- |
| **游客** | 未登录 | 浏览白名单页面（首页、日程等，取决于 `auth.whitelist` 设置） |
| **普通用户** | 登录但无特殊角色（`role=user`） | 浏览所有前台页面 + 评论 / 点赞 / 上传剪影 |
| **参会者** | `isAttendee=true`（来自种子数据） | 普通用户能力 + **发布反思** |
| **管理员** | `role=admin`（通过角色管理分配） | 前台全部能力 + 后台管理（按 `adminPermissions` 限制可见页面） |
| **审核员** | `role=auditor`（预留） | 同管理员，可按权限限制 |
| **编辑** | `role=editor`（预留） | 同管理员，可按权限限制 |
| **超级管理员** | 邮箱在 `ADMIN_EMAILS` 中（运行时判定） | **全部权限**，不可被撤销；可管理其他角色用户 |

#### 权限控制机制

- **超级管理员**由环境变量 `ADMIN_EMAILS` 定义，是运行时概念，无法通过后台撤销
- **角色用户**通过后台「角色管理」页面添加/修改/撤销，`adminPermissions` 字段控制可访问的后台页面
- `adminPermissions` 为 JSON 数组，值为后台菜单的 `key`（如 `["meeting", "schedule", "attendees"]`）
- 超级管理员的 `adminPermissions` 返回 `null`，表示拥有全部权限
- 前端 `AdminView.vue` 根据 `adminPermissions` 过滤侧边栏菜单项

#### 页面访问白名单

- 通过后台「权限设置」页面配置哪些前端路由无需登录即可访问
- 存储在 `SystemSetting` 表中（`auth.whitelist`）
- 前端路由守卫在 `beforeEach` 中检查白名单
- OIDC 模式下，非白名单页面会自动重定向到 SSO 登录

---

## 📡 API 参考

所有接口统一前缀 `/api`。

### 认证

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/auth/config` | 公开 | 返回 `{ oidcEnabled, whitelist }` |
| POST | `/auth/login` | 公开 | Mock 模式邮箱登录，`{ email }` → `{ token, user }` |
| GET | `/auth/oidc-login` | 公开 | OIDC 模式入口，`?redirect=&action=`，302 重定向到 OIDC Provider |
| GET | `/auth/oidc-callback` | 公开 | OIDC 回调，完成认证后重定向到前端（含 `token` + `id_token`） |
| GET | `/auth/logout` | 公开 | OIDC 退出登录，`?id_token=`，302 重定向到 Provider end_session |
| GET | `/auth/me` | 登录 | 获取当前用户信息（含 `role`、`isSuperAdmin`、`adminPermissions`） |

### 静态数据

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/schedule` | 公开 | 返回日程数据（从数据库读取） |
| GET | `/attendees` | 公开 | 返回按学校分组的参会人员列表 |
| GET | `/meeting` | 公开 | 返回会议基本信息 |

### 演讲详情

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/talks/:id` | 公开 | 获取 Talk 详情 + 关联资源列表（前台日程详情弹窗用） |

### 天气

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/weather` | 公开 | 获取天气数据（自动选择和风天气或 Open-Meteo，含内存缓存） |

### 参会指南

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/meeting-guide` | 公开 | 获取可见的参会指南卡片（按 sortOrder 排序） |

### 首页区块

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/home-sections` | 公开 | 获取可见的首页区块 + 卡片（按 sortOrder 排序；数据库为空时回退到默认值） |

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

### 管理员 — 查询

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/reflections` | 管理员 | 反思列表（含作者详情）`?q=keyword` |
| GET | `/admin/gallery` | 管理员 | 剪影列表（含上传者详情）`?tag=&uploader=` |

### 管理员 — 会议信息

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/meeting` | 管理员 | 获取会议信息（含 aboutTitle / aboutContent） |
| PUT | `/admin/meeting` | 管理员 | 更新会议信息（名称/主题/日期/地点/主办方/关于区块） |

### 管理员 — 日程管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/schedule/days` | 管理员 | 获取所有日程天 |
| POST | `/admin/schedule/days` | 管理员 | 创建日程天 |
| PUT | `/admin/schedule/days/:id` | 管理员 | 编辑日程天 |
| DELETE | `/admin/schedule/days/:id` | 管理员 | 删除日程天（级联） |
| POST | `/admin/schedule/items` | 管理员 | 创建时段 |
| PUT | `/admin/schedule/items/:id` | 管理员 | 编辑时段 |
| DELETE | `/admin/schedule/items/:id` | 管理员 | 删除时段（级联） |
| POST | `/admin/schedule/talks` | 管理员 | 创建演讲 |
| PUT | `/admin/schedule/talks/:id` | 管理员 | 编辑演讲 |
| DELETE | `/admin/schedule/talks/:id` | 管理员 | 删除演讲（级联） |
| POST | `/admin/schedule/talks/:id/resources` | 管理员 | 上传演讲资源（multipart 或外链） |
| PUT | `/admin/schedule/resources/:id` | 管理员 | 编辑资源 |
| DELETE | `/admin/schedule/resources/:id` | 管理员 | 删除资源 |

### 管理员 — 参会人员 / 组织 / 部门

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/admin/attendees/import-static` | 管理员 | 从 JSON 文件导入参会人员 |
| GET | `/admin/attendees` | 管理员 | 参会人员列表 |
| POST | `/admin/attendees` | 管理员 | 创建参会人员 |
| PUT | `/admin/attendees/:id` | 管理员 | 编辑参会人员 |
| DELETE | `/admin/attendees/:id` | 管理员 | 删除参会人员 |
| POST | `/admin/attendees/:id/photo` | 管理员 | 上传参会人员头像 |
| POST | `/admin/attendees/import-excel` | 管理员 | 从 Excel 批量导入 |
| GET | `/admin/organizations` | 管理员 | 组织列表 |
| POST | `/admin/organizations` | 管理员 | 创建组织 |
| PUT | `/admin/organizations/:id` | 管理员 | 编辑组织 |
| DELETE | `/admin/organizations/:id` | 管理员 | 删除组织 |
| GET | `/admin/departments` | 管理员 | 部门列表 |
| POST | `/admin/departments` | 管理员 | 创建部门 |
| PUT | `/admin/departments/:id` | 管理员 | 编辑部门 |
| DELETE | `/admin/departments/:id` | 管理员 | 删除部门 |

### 管理员 — 参会指南

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/meeting-guide` | 管理员 | 全部卡片列表 |
| POST | `/admin/meeting-guide` | 管理员 | 创建卡片 |
| PUT | `/admin/meeting-guide/:id` | 管理员 | 编辑卡片 |
| DELETE | `/admin/meeting-guide/:id` | 管理员 | 删除卡片 |
| POST | `/admin/meeting-guide/seed-defaults` | 管理员 | 插入默认卡片 |

### 管理员 — 首页区块

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/home-sections` | 管理员 | 全部区块列表（含隐藏的） |
| POST | `/admin/home-sections` | 管理员 | 创建区块 |
| PUT | `/admin/home-sections/reorder` | 管理员 | 批量调整区块排序 |
| PUT | `/admin/home-sections/:id` | 管理员 | 编辑区块 |
| DELETE | `/admin/home-sections/:id` | 管理员 | 删除区块（级联删除卡片） |
| POST | `/admin/home-sections/:id/cards` | 管理员 | 添加卡片 |
| PUT | `/admin/home-sections/:id/cards/reorder` | 管理员 | 批量调整卡片排序 |
| PUT | `/admin/home-sections/cards/:cardId` | 管理员 | 编辑卡片 |
| DELETE | `/admin/home-sections/cards/:cardId` | 管理员 | 删除卡片 |
| POST | `/admin/home-sections/seed-defaults` | 管理员 | 插入默认区块数据 |

### 管理员 — 角色管理（超级管理员专属）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/admins/roles` | 超管 | 获取角色定义列表（admin / auditor / editor） |
| GET | `/admin/admins` | 超管 | 获取所有角色用户列表 `?role=` |
| POST | `/admin/admins` | 超管 | 添加角色用户 `{ email, role, adminPermissions }` |
| PUT | `/admin/admins/:id` | 超管 | 更新角色/权限（不可修改超级管理员） |
| DELETE | `/admin/admins/:id` | 超管 | 撤销角色（降级为普通用户） |

### 管理员 — 系统设置

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/settings` | 管理员 | 获取所有设置（按分类分组） |
| GET | `/admin/settings/:category` | 管理员 | 按分类获取设置 |
| PUT | `/admin/settings` | 管理员 | 批量更新设置 `[{key, value, category?}]` |

### 管理员 — 数据分析

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/analytics/overview` | 管理员 | 反思总览（总数/匿名数/点赞/评论/情感分布/Top 点赞） |
| GET | `/admin/analytics/keywords` | 管理员 | 关键词提取 `?limit=30` |
| GET | `/admin/analytics/timeline` | 管理员 | 时间趋势 `?bucket=day\|week` |
| GET | `/admin/analytics/contributors` | 管理员 | 贡献者排行 `?limit=10` |
| POST | `/admin/analytics/scan` | 管理员 | 重新计算所有反思的情感分析 |
| POST | `/admin/analytics/summary` | 管理员 | LLM 生成 Markdown 总结 `{ topic? }` |

### 管理员 — 邮件通知

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/admin/notification/recipients` | 管理员 | 获取收件人列表（按学校分组） |
| GET | `/admin/notification/smtp-config` | 管理员 | 获取 SMTP 发件人配置（密码脱敏） |
| PUT | `/admin/notification/smtp-config` | 管理员 | 保存 SMTP 发件人配置 |
| POST | `/admin/notification/test-smtp` | 管理员 | 发送测试邮件 |
| POST | `/admin/notification/send` | 管理员 | 发送通知邮件 |

### 管理员 — 文件管理（elFinder）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET/POST | `/admin/elfinder` | 管理员 | elFinder 连接器端点，实现 [elFinder 客户端-服务器协议 2.1](https://github.com/Studio-42/elFinder/wiki/Client-Server-API-2.1) |

支持的 elFinder 命令：`open` · `tree` · `parents` · `ls` · `file` · `upload` · `mkdir` · `mkfile` · `rename` · `rm` · `duplicate` · `paste` · `search` · `info` · `size` · `get` · `put`

> elFinder 连接器操作 `backend/uploads/` 目录，通过 JWT 认证保护，仅管理员可访问。前端通过 `elfinder.html` 页面以 iframe 方式嵌入后台「文件管理」Tab，同时可作为 TinyMCE 的文件选择器使用。

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
| `npm run db:push` | `prisma db push --accept-data-loss` |
| `npm run db:init` | **一键初始化**：`prisma db push` + `seed.js`（推荐） |
| `npm run db:seed` | 基础种子数据 |
| `npm run db:seed-demo` | 演示数据（10 篇反思 + 评论 + 点赞） |
| `npm run db:clean-demo` | 清理演示数据（删除 `[DEMO]` 前缀的反思及关联数据） |
| `npm run db:migrate-static` | 从 JSON 文件迁移日程/参会人员到数据库 |
| `npm run db:reset` | `prisma migrate reset --force` |

---

## 📦 数据初始化

### 静态数据文件（源数据）

| 文件 | 说明 |
| --- | --- |
| `backend/data/schedule.json` | 会议三天日程（源自日程安排 Excel） |
| `backend/data/attendees.json` | 参会人员名单（学校 / 英文名 / 中文名 / 照片 URL） |
| `backend/data/sentiment-zh.json` | 中文情感词典（用于本地情感分析） |
| `backend/data/stopwords-zh.json` | 中文停用词表（关键词提取过滤） |
| `backend/data/stopwords-en.json` | 英文停用词表 |

> 日程和参会人员数据首次通过 `seed.js` 自动迁入数据库。后续管理通过后台 CRUD 界面进行，JSON 文件仅作为初始源数据保留。

### 种子脚本

| 脚本 | 说明 |
| --- | --- |
| `prisma/seed.js` | 创建参会用户、管理员、18 个预设标签、往届会议（2024 上海 / 2025 石河子）、欢迎公告、组织、部门、系统设置、日程/参会人员迁移 |
| `prisma/seed-about.js` | 灌入首页「关于会议」区块的富文本内容（`aboutTitle` / `aboutContent`） |
| `prisma/seed-demo.js` | 创建 10 篇 `[DEMO]` 前缀反思 + 随机评论和点赞（方便演示） |
| `prisma/clean-demo.js` | 清理所有 `[DEMO]` 开头的反思及其评论和点赞 |
| `prisma/migrate-static-to-db.js` | 将 `data/schedule.json` 和 `data/attendees.json` 迁移到数据库表 |

### 参会人员照片

```bash
# 从本地目录复制照片到 frontend/public/attendees/
node scripts/copy-attendee-photos.js
# 或 PowerShell 版
.\scripts\copy-attendee-photos.ps1
```

> 注意：脚本中的源路径是硬编码的，使用前请根据实际情况修改。

### Font Awesome 图标分类

```bash
# 生成 FA 图标分类数据（用于后台图标选择器）
node scripts/generate-fa-categories.js
```

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
- [ ] Redis 缓存（OIDC state、热门数据、页面白名单）
- [ ] 集群部署方案（Kubernetes + Ingress）
- [ ] auditor / editor 角色具体权限逻辑实现
- [x] ~~邮件通知（新反思、新评论）~~ — 已实现 SMTP 多发件人邮件通知
- [x] ~~文件管理~~ — 已实现 elFinder 可视化文件管理器 + TinyMCE 集成
- [x] ~~RBAC 角色权限~~ — 已实现角色管理 + 页面级权限控制 + 白名单
- [x] ~~首页动态配置~~ — 已实现 Home Sections 管理（区块 + 卡片 CRUD）
- [x] ~~OIDC 退出登录~~ — 已实现 end_session + id_token_hint

---

## License

Internal use only · YCYW Education
