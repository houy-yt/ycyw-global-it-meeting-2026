# YCYW 2026 Global IT Meeting — 部署指南

> 本文档详细描述了项目从本地开发到生产部署的完整流程，包括 Docker Compose 部署、PM2 部署、数据库切换、对象存储、OIDC 认证（含退出登录）、天气 API、邮件通知、文件管理、数据分析与 LLM、RBAC 权限与页面白名单、SSL 配置、数据备份及常见问题排查。

---

## 目录

- [1. 前提条件](#1-前提条件)
- [2. 本地开发部署（SQLite）](#2-本地开发部署sqlite)
- [3. 生产部署（Docker Compose + PostgreSQL）](#3-生产部署docker-compose--postgresql)
  - [3.1 准备工作：切换 Prisma Provider](#31-准备工作切换-prisma-provider)
  - [3.2 配置 docker-compose.yml](#32-配置-docker-composeyml)
  - [3.3 构建与启动](#33-构建与启动)
  - [3.4 验证部署](#34-验证部署)
  - [3.5 容器架构说明](#35-容器架构说明)
- [4. PM2 部署（可选）](#4-pm2-部署可选)
- [5. Nginx 反向代理详解](#5-nginx-反向代理详解)
- [6. PostgreSQL 数据库管理](#6-postgresql-数据库管理)
- [7. 切换到阿里云 OSS 存储](#7-切换到阿里云-oss-存储)
- [8. 启用真实 OIDC 登录](#8-启用真实-oidc-登录)
- [9. 天气 API 配置](#9-天气-api-配置)
- [10. 邮件通知配置](#10-邮件通知配置)
- [11. 数据分析与 LLM 配置](#11-数据分析与-llm-配置)
- [12. 文件管理（elFinder）](#12-文件管理elfinder)
- [13. RBAC 权限与页面白名单](#13-rbac-权限与页面白名单)
- [14. 首页动态内容管理](#14-首页动态内容管理)
- [15. SSL / HTTPS 配置](#15-ssl--https-配置)
- [16. 数据备份与恢复](#16-数据备份与恢复)
- [17. 监控与日志](#17-监控与日志)
- [18. 常见问题排查](#18-常见问题排查)

---

## 1. 前提条件

### 本地开发

| 工具 | 最低版本 | 说明 |
| --- | --- | --- |
| Node.js | 20 | 后端使用 ESM 动态 import |
| npm | 9 | 包管理 |

### 生产部署

| 工具 | 最低版本 | 说明 |
| --- | --- | --- |
| Docker | 24 | 容器运行时 |
| Docker Compose | 2.20 | 多容器编排（`docker compose` V2 命令） |
| Git | — | 拉取代码 |

> 推荐服务器配置：2 核 CPU / 4GB RAM / 40GB SSD（足以支撑百人级会议站点）

---

## 2. 本地开发部署（SQLite）

适用于开发、调试、功能验证。使用 SQLite 作为数据库，无需安装额外数据库服务。

### 步骤

```bash
# 1. 克隆代码
git clone <repo-url>
cd "YCYW 2026 Global IT Meeting"

# 2. 一次性安装所有依赖
npm run install:all

# 3. 配置后端环境变量
cd backend
cp .env.example .env
# 默认配置即可用于开发，按需修改 ADMIN_EMAILS
cd ..

# 4. 初始化数据库（推荐一键命令）
cd backend
npm run db:init
# （可选）灌入演示数据
npm run db:seed-demo
cd ..

# 5. 启动
npm run dev
```

> `db:init` = `prisma db push --accept-data-loss` + `node prisma/seed.js`，会自动同步 schema、灌入种子数据、并将 `data/schedule.json` 和 `data/attendees.json` 迁入数据库。

如果想使用传统迁移文件方式：

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
```

### 验证

| 服务 | URL |
| --- | --- |
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3000 |
| 健康检查 | http://localhost:3000/api/health |

> 开发模式下，Vite 通过 `vite.config.js` 中的 `proxy` 配置，自动将前端的 `/api` 和 `/uploads` 请求代理到后端 `http://localhost:3000`。

### 开发模式登录

默认 `OIDC_ENABLED=false`，使用 Mock 模式：

- 点击导航栏「管理员登录」→ 弹出 AuthModal → 输入邮箱即可
- 超级管理员邮箱：`admin@ycyw.cn`（或 `.env` 中 `ADMIN_EMAILS` 定义的邮箱）
- 参会人员邮箱：种子数据生成的 `<英文名>@ycyw-edu.com`

### 前端构建说明

前端使用 `vite-plugin-static-copy` 在构建时自动复制以下运行时资源：

| 资源 | 源路径 | 目标路径 | 说明 |
| --- | --- | --- | --- |
| TinyMCE 资源 | `node_modules/tinymce/{skins,icons,themes,models,plugins}` | `/tinymce/` | 富文本编辑器运行时文件 |
| jQuery | `node_modules/jquery/dist` | `/libs/jquery/dist/` | elFinder 依赖 |
| jQuery UI | `node_modules/jquery-ui-dist` | `/libs/jquery-ui-dist/` | elFinder 依赖 |

> 这些资源在 `npm run build:frontend` 时自动处理，无需手动操作。

---

## 3. 生产部署（Docker Compose + PostgreSQL）

### 3.1 准备工作：切换 Prisma Provider

> ⚠️ **重要**：`schema.prisma` 中 `provider` 默认为 `sqlite`，生产使用 PostgreSQL 前**必须修改**。

编辑 `backend/prisma/schema.prisma`：

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

> **注意**：SQLite 和 PostgreSQL 的迁移文件不兼容。切换 provider 后，如果存在旧的 SQLite 迁移文件夹（`backend/prisma/migrations/`），建议删除并重新生成：
> ```bash
> rm -rf backend/prisma/migrations
> ```
> Docker 构建时会自动执行 `prisma migrate deploy`，会根据新的 provider 创建迁移。

### 3.2 配置 docker-compose.yml

项目根目录的 `docker-compose.yml` 已预配置好三个服务。根据实际需要修改以下关键变量：

```yaml
services:
  postgres:
    environment:
      POSTGRES_USER: meeting            # 数据库用户名
      POSTGRES_PASSWORD: meetingpass     # ← 生产环境务必修改
      POSTGRES_DB: global_it            # 数据库名

  backend:
    environment:
      NODE_ENV: production
      PORT: 3000
      JWT_SECRET: please_change_me_in_production  # ← 生产环境务必修改
      DATABASE_URL: postgresql://meeting:meetingpass@postgres:5432/global_it
      ADMIN_EMAILS: admin@ycyw-edu.com  # ← 改为实际超级管理员邮箱
      
      # 存储配置
      USE_OSS: 'false'                  # 'true' 启用 OSS
      # OSS_REGION / OSS_ACCESS_KEY_ID / ...
      
      # OIDC 配置
      OIDC_ENABLED: 'false'             # 'true' 启用真实 OIDC
      # OIDC_CLIENT_ID / OIDC_AUTHORITY / ...

      # 天气 API（可选，默认使用免费 Open-Meteo）
      # WEATHER_PROVIDER: 'auto'
      # QWEATHER_API_HOST: ''
      # QWEATHER_CREDENTIAL_ID: ''
      # QWEATHER_PRIVATE_KEY: ''

  frontend:
    ports:
      - '80:80'                         # 按需修改外部端口
```

#### 🔐 安全清单

| 项目 | 操作 |
| --- | --- |
| `POSTGRES_PASSWORD` | 使用强密码替换 `meetingpass` |
| `JWT_SECRET` | 使用至少 32 字符的随机字符串 |
| `ADMIN_EMAILS` | 限定实际超级管理员邮箱 |
| `DATABASE_URL` | 确保密码与 `POSTGRES_PASSWORD` 一致 |

> 生成随机密钥：`openssl rand -base64 32`

### 3.3 构建与启动

```bash
# 一键构建并启动
docker compose up -d --build

# 查看容器状态
docker compose ps

# 查看后端日志（确认启动正常）
docker compose logs -f backend
```

后端容器的 `CMD` 会自动执行：
1. `npx prisma migrate deploy` — 应用数据库迁移
2. `node prisma/seed.js` — 灌入种子数据（幂等，重复执行安全）
3. `node prisma/clean-demo.js` — 自动清除「会后反思」和「会议剪影」的 `[DEMO]` 假数据（及关联的评论、点赞），其他所有数据保留
4. `node src/server.js` — 启动 API 服务

### 3.4 验证部署

```bash
# 健康检查
curl http://<服务器IP>/api/health
# 预期：{"ok":true,"ts":"2026-..."}

# 访问前端
# 浏览器打开 http://<服务器IP>
```

### 3.5 容器架构说明

```
┌──────────────────────────────────────────────────────────────┐
│  Docker Host                                                  │
│                                                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐   │
│  │  frontend    │    │  backend    │    │  postgres       │   │
│  │  (Nginx)     │───>│  (Node.js)  │───>│  (PostgreSQL)   │   │
│  │  Port: 80    │    │  Port: 3000 │    │  Port: 5432     │   │
│  └─────────────┘    └─────────────┘    └─────────────────┘   │
│         │                   │                    │             │
│         │                   │                    │             │
│    静态文件 +          uploads/             pgdata/            │
│    反向代理             (volume)            (volume)           │
│  /api/ → backend                                              │
│  /uploads/ → backend                                          │
└──────────────────────────────────────────────────────────────┘
```

| 容器 | 基础镜像 | 说明 |
| --- | --- | --- |
| `postgres` | `postgres:15-alpine` | 数据库，数据持久化到 `pgdata` volume |
| `backend` | `node:20-alpine` | API 服务，上传文件持久化到 `uploads` volume |
| `frontend` | `nginx:1.27-alpine`（多阶段构建） | Vite 构建产物 + Nginx SPA + 反向代理 |

### 数据持久化

| Docker Volume | 用途 |
| --- | --- |
| `pgdata` | PostgreSQL 数据目录 |
| `uploads` | 用户上传的图片 / 视频文件（也是 elFinder 文件管理器操作的根目录） |

> ⚠️ 删除 volume 会导致数据丢失。使用 `docker compose down` 不会删除 volume；`docker compose down -v` **会删除所有 volume**。

---

## 4. PM2 部署（可选）

如果不使用 Docker，可以用 PM2 进行进程管理。项目根目录已提供 `ecosystem.config.js`。

### 前提条件

- 已安装 Node.js 20+、npm 9+
- 已安装 PM2：`npm install -g pm2`
- 已安装并配置 PostgreSQL（或继续使用 SQLite 开发）

### 步骤

```bash
# 1. 安装依赖
npm run install:all

# 2. 配置环境变量
cd backend
cp .env.example .env
# 编辑 .env，设置 DATABASE_URL、JWT_SECRET 等
cd ..

# 3. 构建前端
npm run build:frontend

# 4. 初始化数据库
cd backend
npm run db:init
cd ..

# 5. 启动后端（PM2）
pm2 start ecosystem.config.js

# 6. 查看状态
pm2 status
pm2 logs ycyw-meeting-api
```

### ecosystem.config.js 配置

```javascript
module.exports = {
  apps: [{
    name: 'ycyw-meeting-api',
    cwd: './backend',
    script: 'src/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    instances: 1,        // SQLite 不支持多进程写入
    autorestart: true,
    max_memory_restart: '500M',
  }],
};
```

> **注意**：PM2 部署时，前端需要单独配置 Nginx 提供静态文件服务 + 反向代理。参考 `frontend/nginx.conf` 的配置。
>
> 如果使用 PostgreSQL，可以将 `instances` 改为 `'max'` 或具体数字以支持多进程。

### PM2 常用命令

```bash
pm2 start ecosystem.config.js   # 启动
pm2 restart ycyw-meeting-api     # 重启
pm2 stop ycyw-meeting-api        # 停止
pm2 delete ycyw-meeting-api      # 删除
pm2 logs ycyw-meeting-api        # 查看日志
pm2 save                         # 保存当前进程列表
pm2 startup                     # 配置开机自启
```

---

## 5. Nginx 反向代理详解

前端容器内的 Nginx 配置（`frontend/nginx.conf`）承担两个职责：

### 1. SPA 路由回退

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

所有不匹配实际静态文件的请求都回退到 `index.html`，由 Vue Router 处理客户端路由。

### 2. API 和上传文件反向代理

```nginx
location /api/ {
    proxy_pass http://backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 60m;    # 支持最大 60MB 上传
}

location /uploads/ {
    proxy_pass http://backend:3000;
    proxy_set_header Host $host;
}
```

- `/api/*` 请求转发到后端的 Express 服务（包括 elFinder 文件管理 API `/api/admin/elfinder`）
- `/uploads/*` 请求转发到后端的静态文件服务
- `client_max_body_size 60m` 确保大文件上传不被 Nginx 拒绝

> **注意**：`backend` 是 Docker Compose 中的服务名，Nginx 通过 Docker 内部 DNS 解析。

---

## 6. PostgreSQL 数据库管理

### 连接到数据库

```bash
# 通过 Docker 进入 PostgreSQL 交互式终端
docker compose exec postgres psql -U meeting -d global_it
```

### 常用操作

```sql
-- 查看所有表
\dt

-- 查看用户列表（含角色信息）
SELECT id, email, "isAttendee", "isAdmin", role, "adminPermissions" FROM "User" LIMIT 20;

-- 查看反思数量
SELECT COUNT(*) FROM "Reflection";

-- 查看系统设置
SELECT * FROM "SystemSetting" ORDER BY category, key;

-- 查看页面白名单
SELECT value FROM "SystemSetting" WHERE key = 'auth.whitelist';

-- 查看参会人员
SELECT id, "nameEn", "nameCn", school, department FROM "Attendee" LIMIT 20;

-- 查看首页区块
SELECT id, key, "sectionType", title, visible, "sortOrder" FROM "HomeSection" ORDER BY "sortOrder";

-- 手动提升管理员
UPDATE "User" SET "isAdmin" = true, role = 'admin' WHERE email = 'someone@example.com';
```

### 重新执行种子数据

```bash
# 进入后端容器
docker compose exec backend sh

# 在容器内执行
node prisma/seed.js
node prisma/seed-about.js   # 可选：首页关于区块内容
node prisma/seed-demo.js    # 可选：演示数据
node prisma/clean-demo.js   # 可选：清理演示数据
```

### 重置数据库（危险操作）

```bash
docker compose exec backend npx prisma migrate reset --force
```

> ⚠️ 此操作会删除所有数据并重新创建表结构和种子数据。

---

## 7. 切换到阿里云 OSS 存储

项目通过 `StorageService`（`backend/src/services/storageService.js`）抽象了存储层。默认使用本地磁盘，切换到阿里云 OSS 只需以下步骤：

### 步骤 1：安装 ali-oss

```bash
cd backend
npm install ali-oss
```

### 步骤 2：配置环境变量

在 `.env` 或 `docker-compose.yml` 中设置：

```env
USE_OSS=true
OSS_REGION=cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name
OSS_ENDPOINT=                     # 可选，自定义域名
OSS_PUBLIC_BASE_URL=              # 可选，公网访问 URL
```

### 步骤 3：解注释 storageService.js

打开 `backend/src/services/storageService.js`，在 `OssStorage` 类中：

1. **构造函数**：取消注释 `ali-oss` 初始化代码
2. **upload 方法**：取消注释真实上传逻辑，删除 `throw new Error(...)` 占位行
3. **delete 方法**：取消注释删除逻辑

```javascript
// OssStorage 构造函数 — 取消注释以下代码：
const OSS = require('ali-oss');
this.client = new OSS({
  region:          process.env.OSS_REGION,
  accessKeyId:     process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_SECRET,
  bucket:          process.env.OSS_BUCKET,
  endpoint:        process.env.OSS_ENDPOINT || undefined,
});

// upload 方法 — 取消注释以下代码：
const buffer = file.buffer || fs.readFileSync(file.path);
const result = await this.client.put(key, buffer);
const url = this.publicBase ? `${this.publicBase}/${key}` : result.url;
return { url, key };

// delete 方法 — 取消注释以下代码：
await this.client.delete(key);
```

> 业务路由代码（`routes/gallery.js` 等）**无需任何改动**，StorageService 透明切换。
>
> **注意**：elFinder 文件管理器当前仅操作本地磁盘 `uploads/` 目录。启用 OSS 后，elFinder 管理的仍然是本地文件，通过业务接口（剪影上传、演讲资源等）上传的文件则走 OSS。

### OSS Bucket 配置建议

| 设置 | 推荐值 |
| --- | --- |
| 读写权限 | 公共读 (`public-read`) |
| 跨域 (CORS) | 允许你的前端域名 |
| 防盗链 | 可选，限制 Referer |
| 生命周期 | 按需配置过期清理 |

---

## 8. 启用真实 OIDC 登录

项目已**完整实现**真实 OIDC 认证流程（包括登录和退出登录），使用 `openid-client` v6。只需配置环境变量即可启用。

### 架构概览

#### 登录流程

```
用户 → 点击登录 → 前端跳转 /api/auth/oidc-login
  → 后端 302 → OIDC Provider (如 Azure AD / Auth0 / Keycloak / IdentityServer)
  → 用户认证 → OIDC Provider 回调 /api/auth/oidc-callback
  → 后端 code→token→userinfo → findOrCreate 本地用户 → 签发 JWT
  → 302 → 前端 /auth/callback?token=JWT&id_token=...
  → OidcCallbackView 保存 token + id_token → 跳转目标页
```

#### 退出流程

```
用户 → 点击退出 → 前端清除 localStorage
  → window.location.href = /api/auth/logout?id_token=<原始OIDC id_token>
  → 后端构建 end_session URL（id_token_hint + post_logout_redirect_uri + client_id）
  → 302 → OIDC Provider 退出页面
  → Provider 退出 → 302 → 前端首页
```

### 步骤 1：在 OIDC Provider 注册应用

在你的 OIDC Provider（如 Azure AD、Auth0、Keycloak、IdentityServer 等）中注册一个应用：

| 配置项 | 值 |
| --- | --- |
| Redirect URI | `https://<your-domain>/api/auth/oidc-callback` |
| Post-Logout Redirect URI | `https://<your-domain>/` |
| Scopes | `openid email profile` |
| Grant Type | Authorization Code |

### 步骤 2：配置环境变量

```env
OIDC_ENABLED=true
OIDC_AUTHORITY=https://your-oidc-provider.com/
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://<your-domain>/api/auth/oidc-callback
OIDC_SCOPES=openid email profile
OIDC_FRONTEND_CALLBACK=/auth/callback
```

### 步骤 3：重启服务

```bash
# 开发
npm run dev:backend

# 生产
docker compose restart backend
```

### 工作机制

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| 后端登录路由 | `backend/src/routes/auth.js` | `GET /oidc-login`（生成授权 URL）、`GET /oidc-callback`（处理回调） |
| 后端退出路由 | `backend/src/routes/auth.js` | `GET /logout`（构建 end_session URL 并重定向） |
| OIDC 发现 | 自动 | `openid-client` 通过 `OIDC_AUTHORITY` 自动发现 `.well-known/openid-configuration` |
| State 管理 | 内存 Map | 10 分钟自动过期，集群部署需改用 Redis |
| 前端配置 | `stores/auth.js` | `fetchConfig()` 获取 `oidcEnabled` + `whitelist`，`requireLogin()` 自动选择登录模式 |
| 前端回调 | `OidcCallbackView.vue` | 接收 JWT token + id_token，调用 `fetchMe()` 获取用户信息 |
| 前端守卫 | `router/index.js` | 管理员页面和非白名单页面访问时自动触发 OIDC 登录 |
| 前端退出 | `NavBar.vue` | 清除 localStorage 后重定向到 `/api/auth/logout?id_token=...` |

### 重要说明

- 后端使用 **openid-client v6**（ESM-only），通过 CommonJS 的 `import()` 动态加载
- 使用 `ClientSecretPost` 方式发送 client_secret
- 用户邮箱通过 `fetchUserInfo` 获取，然后在本地数据库 `findOrCreate`
- OIDC state 使用内存 Map 存储，**集群部署时需要改用 Redis**
- 前端在 `App.vue` 的 `onMounted` 中调用 `auth.fetchConfig()` 获取 OIDC 模式和白名单
- 退出登录时，`id_token` 从前端 localStorage 传递给后端（比服务端内存存储更可靠，不受后端重启影响）
- 提供 `id_token_hint` 后，IdentityServer 等 Provider 会跳过「确认退出」页面

---

## 9. 天气 API 配置

项目内置天气预报功能，支持两个数据源，可在 `/weather` 页面和入场须知页面展示天气信息。

### 数据源

| 数据源 | 费用 | 说明 |
| --- | --- | --- |
| **Open-Meteo** | 免费 | 默认数据源，无需任何配置。基于 GPS 坐标（默认北京）获取天气数据 |
| **和风天气（QWeather）** | 按量计费 | 更精确的国内天气数据，需要注册并获取 API 凭证 |

### 默认行为

无需配置任何环境变量，天气功能即可使用 —— 默认通过 Open-Meteo 获取北京地区天气数据，数据缓存在内存中。

### 配置和风天气（可选）

如需使用和风天气获取更精确的数据：

1. 前往 [和风天气开发平台](https://dev.qweather.com/) 注册并创建应用
2. 获取 API Host、Credential ID 和 Ed25519 私钥
3. 配置环境变量：

```env
WEATHER_PROVIDER=qweather          # 或 'auto' 自动尝试和风→Open-Meteo
QWEATHER_API_HOST=xxx.re.qweatherapi.com
QWEATHER_CREDENTIAL_ID=your-credential-id
QWEATHER_PRIVATE_KEY=<Ed25519 私钥的 base64 body>
WEATHER_LOCATION=101010100         # 和风天气城市 ID（默认北京）
```

### 认证方式

和风天气 API 使用 **Ed25519 JWT 签名** 认证（非传统 API Key），后端自动生成和缓存 JWT token。

### 缓存策略

天气数据使用内存缓存，避免频繁请求外部 API。缓存自动过期后重新获取最新数据。

---

## 10. 邮件通知配置

项目内置了完整的邮件通知系统，支持向参会人员批量发送通知邮件。

### 架构

- 使用 **nodemailer** 发送邮件
- SMTP 配置存储在数据库 `SystemSetting` 表中（通过后台界面管理）
- 支持**多发件人轮询**（避免单一邮箱发送频率限制）
- 收件人从 `Attendee` 表按学校/部门分组获取

### 配置步骤

#### 1. 通过后台界面配置（推荐）

1. 登录超级管理员账号
2. 进入后台 → 「发送邮件」Tab
3. 配置 SMTP 发件人信息（支持添加多个发件人）：
   - 发件人邮箱
   - 发件人名称
   - SMTP 服务器地址
   - SMTP 端口
   - 加密方式（TLS/SSL）
   - 用户名和密码
4. 点击「测试发送」验证配置

#### 2. SMTP 参数参考

| 参数 | 示例值 | 说明 |
| --- | --- | --- |
| Host | `smtp.office365.com` | SMTP 服务器地址 |
| Port | `587` | SMTP 端口（TLS 通常为 587，SSL 为 465） |
| Secure | `tls` | 加密方式：`tls` / `ssl` |
| User | `sender@example.com` | SMTP 认证用户名 |
| Pass | `app-specific-password` | SMTP 认证密码（建议使用应用专用密码） |

### 发送流程

1. 在「发送邮件」Tab 中选择收件人（按学校/部门筛选）
2. 编辑邮件主题和内容（支持富文本，使用 TinyMCE 编辑器，可通过 elFinder 插入服务器文件）
3. 选择发件人
4. 点击发送

> **注意**：多发件人配置时，系统会自动在多个发件人之间轮询，均衡分配发送任务。

---

## 11. 数据分析与 LLM 配置

后台「数据分析」模块提供反思内容的自动分析功能，包括情感分析、关键词提取、时间趋势和 LLM 总结。

### 情感分析引擎

| 引擎 | 说明 | 配置 |
| --- | --- | --- |
| **local**（默认） | 基于本地中文情感词典（`data/sentiment-zh.json`），无需外部服务 | 开箱即用 |
| **openai** | 使用 OpenAI API 进行情感分析 | 需配置 API Key |
| **deepseek** | 使用 DeepSeek API 进行情感分析 | 需配置 API Key |

### 配置步骤

#### 使用本地分析（默认，无需配置）

本地引擎使用内置的中文情感词典和分词器，适用于大多数场景。

#### 使用 LLM 引擎（OpenAI / DeepSeek）

1. 登录管理员 → 后台 → 「系统设置」Tab
2. 在 `analytics` 分类下配置：

| 设置键 | 值 |
| --- | --- |
| `analytics.sentimentEngine` | `openai` 或 `deepseek` |
| `analytics.llmApiKey` | 你的 API Key |
| `analytics.llmBaseUrl` | （可选）自定义 API 地址 |
| `analytics.llmModel` | （可选）自定义模型名 |

3. 进入「数据分析」Tab，点击「扫描」重新计算所有反思的情感得分

### LLM 总结功能

在「数据分析」Tab 中，可以点击「生成总结」按钮，让 LLM 对所有反思内容进行主题总结，生成 Markdown 格式的分析报告。

> 此功能需要配置 LLM 引擎（openai 或 deepseek），local 模式不支持。

### 关键词提取

基于 `tokenizer.js` 分词器，自动从反思内容中提取高频关键词，排除停用词（`stopwords-zh.json` / `stopwords-en.json`）。此功能为本地计算，不依赖外部 API。

---

## 12. 文件管理（elFinder）

项目集成了 [elFinder](https://studio-42.github.io/elFinder/) 作为可视化文件管理器，允许管理员直接管理服务器上 `uploads/` 目录下的所有文件。

### 架构

```
┌───────────────────┐     iframe      ┌───────────────────┐
│  AdminFileManager │  ──────────────>│  elfinder.html    │
│  (Vue 组件)       │                 │  (jQuery + elFinder│
│  后台「文件管理」  │                 │   + jQuery UI)     │
└───────────────────┘                 └─────────┬─────────┘
                                                │ HTTP + JWT
                                     ┌──────────▼──────────┐
                                     │  /api/admin/elfinder │
                                     │  (Express 路由)      │
                                     │  操作 backend/uploads│
                                     └─────────────────────┘
```

### 组件说明

| 组件 | 文件 | 说明 |
| --- | --- | --- |
| 后端连接器 | `backend/src/routes/elfinder.js` | 实现 [elFinder 客户端-服务器协议 2.1](https://github.com/Studio-42/elFinder/wiki/Client-Server-API-2.1)，支持 16 个命令 |
| 前端管理页 | `frontend/src/views/admin/AdminFileManager.vue` | 通过 iframe 嵌入 `elfinder.html`，自动传递 JWT token |
| 前端 HTML | `frontend/public/elfinder.html` | 独立的 elFinder 页面，加载 jQuery / jQuery UI / elFinder 资源 |
| 静态资源 | `frontend/public/elfinder/` | elFinder CSS、JS、图标、语言包（中文） |

### 功能特性

- **文件操作**：上传、下载、创建目录/文件、重命名、复制、移动、删除、搜索
- **文件预览**：图片直接预览缩略图，支持 Quick Look 快速查看
- **安全保护**：所有操作通过 JWT 认证 + 管理员权限验证；路径遍历防护
- **上传限制**：单文件最大 50MB，最多同时上传 20 个文件
- **中文界面**：加载 elFinder 中文语言包

### TinyMCE 集成

TinyMCE 富文本编辑器（`TinyEditor.vue`）可以通过 elFinder 选择服务器文件：

1. 在编辑器中点击「插入图片」或「插入文件」按钮
2. 弹出 elFinder 文件选择器窗口
3. 选择文件后，URL 自动填入编辑器

集成方式通过 iframe + `postMessage` 通信实现，支持两种模式：
- **iframe 模式**：elFinder 嵌入 TinyMCE 对话框内，通过 `postMessage` 传回文件 URL
- **弹窗模式**：`window.open` 打开 elFinder，通过回调函数传回文件 URL

### 生产环境注意事项

- elFinder 操作的是 Docker Volume 中的 `uploads/` 目录
- 确保 Nginx 的 `client_max_body_size` 设置足够大（默认 `60m`）
- elFinder 前端资源（`public/elfinder/`）和依赖库（jQuery / jQuery UI）在 `npm run build:frontend` 时自动包含在构建产物中

---

## 13. RBAC 权限与页面白名单

项目实现了基于角色的访问控制（RBAC），支持多级权限和页面级白名单。

### 角色体系

| 角色 | 标识 | 判定方式 | 说明 |
| --- | --- | --- | --- |
| **超级管理员** | `superadmin`（运行时） | 邮箱在 `ADMIN_EMAILS` 环境变量中 | 拥有全部权限，不可被撤销 |
| **管理员** | `role=admin` | 通过「角色管理」页面分配 | 可访问授权的后台页面 |
| **审核员** | `role=auditor` | 通过「角色管理」页面分配 | 预留角色，同管理员 |
| **编辑** | `role=editor` | 通过「角色管理」页面分配 | 预留角色，同管理员 |
| **参会者** | `isAttendee=true` | 种子数据 / 匹配 attendees.json | 可发布反思 |
| **普通用户** | `role=user` | 默认 | 可评论/点赞/上传剪影 |
| **游客** | — | 未登录 | 仅可访问白名单页面 |

### 后台页面权限

管理员的 `adminPermissions` 字段为 JSON 数组，控制可以访问哪些后台页面。值为 `adminMenu.js` 中定义的 `key`：

```json
["meeting", "schedule", "attendees", "reflections"]
```

- **超级管理员**：`adminPermissions = null`，表示可访问所有后台页面
- **角色用户**：只能看到 `adminPermissions` 中列出的页面对应的侧边栏菜单项

### 配置角色

1. 以**超级管理员**身份登录
2. 进入后台 → 「角色管理」Tab（仅超管可见）
3. 添加用户：输入邮箱 → 选择角色（admin / auditor / editor）→ 勾选允许的后台页面
4. 用户下次登录时即生效

### 页面访问白名单

控制哪些前端页面无需登录即可访问。

#### 配置方式

1. 以管理员身份登录
2. 进入后台 → 「权限设置」Tab
3. 勾选允许匿名访问的页面（首页、日程、天气等）
4. 保存后立即生效

#### 工作原理

1. 白名单存储在 `SystemSetting` 表中（`auth.whitelist` 键），值为 JSON 数组
2. 前端启动时通过 `GET /api/auth/config` 获取白名单
3. 路由守卫 `beforeEach` 检查目标路径是否在白名单中
4. 非白名单页面 → OIDC 模式自动重定向到 SSO / Mock 模式跳转到登录页

#### 示例

```json
["/", "/schedule", "/venue", "/meeting-guide", "/entry-guide", "/attendees", "/weather", "/past-meetings"]
```

上述配置表示：首页、日程、会议地点等页面无需登录即可访问；反思、剪影等页面需要登录后才能查看。

> **注意**：白名单为空数组 `[]` 时，所有页面都需要登录。这适用于会前仅允许内部人员预览的场景。

### 后端权限中间件

| 中间件 | 说明 |
| --- | --- |
| `authRequired` | 验证 JWT，附加 `req.user`，401 未授权 |
| `authOptional` | JWT 有效则附加 `req.user`，无效则继续（匿名） |
| `adminRequired` | 检查 `req.user.isAdmin`，403 禁止 |
| `superAdminRequired` | 检查邮箱是否在 `ADMIN_EMAILS` 中，403 禁止 |
| `attendeeRequired` | 检查 `req.user.isAttendee`，403 禁止 |

---

## 14. 首页动态内容管理

首页的所有内容区块（会议主题、议题轨道、快捷入口、技术栈、团队宣言等）现在通过数据库管理，可在后台动态配置。

### 区块类型

| `sectionType` | 说明 | 示例 |
| --- | --- | --- |
| `cards` | 卡片组（默认） | 会议主题三支柱、议题轨道、快捷入口、技术栈 |
| `statement` | 宣言/引言（大段文字展示） | 团队宣言 |
| `intro` | 关于会议（内容来自 MeetingInfo 的 aboutContent） | 关于本次会议 |
| `announcement` | 公告（自动拉取最新激活公告） | 最新公告 |
| `stats` | 数字统计（自动生成） | By the Numbers |

### 管理方式

1. 登录管理员 → 后台 → 「首页管理」Tab
2. 可进行以下操作：
   - **添加/删除区块**：创建新区块，设置类型、标题、描述等
   - **编辑区块属性**：修改标签、标题、描述、背景色、边框等
   - **显示/隐藏区块**：切换 `visible` 开关
   - **调整区块排序**：拖拽或手动设置 `sortOrder`
   - **管理卡片**：为 `cards` 类型区块添加/编辑/删除/排序卡片
   - **一键初始化**：点击「插入默认数据」恢复出厂预设

### 卡片属性

| 字段 | 说明 |
| --- | --- |
| `icon` | Font Awesome 图标名称（如 `robot`） |
| `iconColor` | 图标背景色（hex，如 `#0032a0`） |
| `imageUrl` | 可选图片 URL（优先于图标） |
| `title` | 卡片标题 |
| `subtitle` | 卡片副标题 |
| `content` | 卡片内容/描述 |
| `sortOrder` | 排序序号 |

### 默认数据回退

当数据库中 `HomeSection` 表为空时，公开 API `/api/home-sections` 会自动返回硬编码的默认数据，确保首页始终有内容展示。

---

## 15. SSL / HTTPS 配置

生产环境强烈建议使用 HTTPS。以下是几种常见方案：

### 方案 A：外部反向代理（推荐）

在 Docker 前面放置一个反向代理（如 Nginx、Caddy 或云厂商 SLB）处理 SSL 终止：

```
互联网 → [SLB/Nginx/Caddy :443 (SSL)] → Docker frontend :80
```

#### Nginx 外部代理示例

```nginx
server {
    listen 443 ssl http2;
    server_name meeting.ycyw-edu.com;

    ssl_certificate     /etc/ssl/meeting.ycyw-edu.com.pem;
    ssl_certificate_key /etc/ssl/meeting.ycyw-edu.com.key;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 60m;
    }
}

server {
    listen 80;
    server_name meeting.ycyw-edu.com;
    return 301 https://$host$request_uri;
}
```

### 方案 B：Caddy 自动 HTTPS

使用 Caddy 作为反向代理，自动申请和续期 Let's Encrypt 证书：

```
# Caddyfile
meeting.ycyw-edu.com {
    reverse_proxy localhost:80
}
```

### 方案 C：修改 frontend 容器直接支持 SSL

修改 `frontend/nginx.conf` 和 `frontend/Dockerfile`，将证书挂载到容器内。

### OIDC + HTTPS

启用 OIDC 时，`OIDC_REDIRECT_URI` 必须使用 HTTPS 地址：

```env
OIDC_REDIRECT_URI=https://meeting.ycyw-edu.com/api/auth/oidc-callback
```

同时确保 `CORS_ORIGIN` 也使用 HTTPS：

```env
CORS_ORIGIN=https://meeting.ycyw-edu.com
```

> **提示**：OIDC Provider 中注册的 Post-Logout Redirect URI 也应使用 HTTPS（`https://meeting.ycyw-edu.com/`）。

---

## 16. 数据备份与恢复

### PostgreSQL 数据备份

```bash
# 备份到宿主机
docker compose exec postgres pg_dump -U meeting global_it > backup_$(date +%Y%m%d_%H%M%S).sql

# 定时备份（Linux crontab 示例）
# 每天凌晨 2 点备份
0 2 * * * cd /path/to/project && docker compose exec -T postgres pg_dump -U meeting global_it > /backups/meeting_$(date +\%Y\%m\%d).sql
```

### PostgreSQL 数据恢复

```bash
# 恢复（会覆盖现有数据）
cat backup_20260716.sql | docker compose exec -T postgres psql -U meeting -d global_it
```

### 上传文件备份

```bash
# 备份 uploads volume
docker run --rm -v ycyw-2026-global-it-meeting_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz /data

# 恢复
docker run --rm -v ycyw-2026-global-it-meeting_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads_backup.tar.gz -C /
```

### 完整备份脚本示例

```bash
#!/bin/bash
# backup.sh — 完整备份脚本
BACKUP_DIR="/backups/meeting"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

echo "📦 Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump -U meeting global_it > "$BACKUP_DIR/db_$DATE.sql"

echo "📦 Backing up uploads..."
docker run --rm \
  -v ycyw-2026-global-it-meeting_uploads:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/uploads_$DATE.tar.gz" /data

echo "✅ Backup completed: $BACKUP_DIR"
ls -la "$BACKUP_DIR"/*$DATE*
```

---

## 17. 监控与日志

### 查看容器日志

```bash
# 所有容器日志
docker compose logs -f

# 仅后端日志
docker compose logs -f backend

# 仅数据库日志
docker compose logs -f postgres

# 最近 100 行
docker compose logs --tail 100 backend
```

### 健康检查

```bash
# API 健康检查
curl -s http://localhost/api/health | jq .

# 数据库连接检查
docker compose exec postgres pg_isready -U meeting
```

### 后端启动日志

后端启动时会输出以下信息，便于确认配置：

```
🚀 YCYW Meeting API ready at http://localhost:3000
   Mode: production
   Storage: Local disk          # 或 "Aliyun OSS"
   DB: postgresql://meeting:***@postgres:5432/global_it
```

### PM2 监控

```bash
# 查看进程状态
pm2 status

# 实时日志
pm2 logs ycyw-meeting-api

# 监控面板
pm2 monit
```

---

## 18. 常见问题排查

### 问题：后端容器启动失败，提示 "prisma migrate deploy" 错误

**原因**：`schema.prisma` 的 `provider` 仍为 `sqlite`，但 `DATABASE_URL` 是 PostgreSQL。

**解决**：
```bash
# 修改 provider
# backend/prisma/schema.prisma → provider = "postgresql"
# 删除旧迁移
rm -rf backend/prisma/migrations
# 重新构建
docker compose up -d --build
```

---

### 问题：前端页面能打开但 API 请求返回 502/504

**原因**：Nginx 无法连接到 backend 容器。

**排查**：
```bash
# 检查 backend 容器是否运行
docker compose ps

# 查看 backend 日志
docker compose logs backend

# 检查容器间网络
docker compose exec frontend ping backend
```

---

### 问题：上传文件返回 413 Request Entity Too Large

**原因**：Nginx 的 `client_max_body_size` 限制。

**解决**：`frontend/nginx.conf` 中已配置 `client_max_body_size 60m;`。如果使用外部反向代理，也需要设置相应限制。

---

### 问题：OIDC 登录后 302 重定向到前端 callback 页面但显示错误

**排查**：

1. 检查 `OIDC_REDIRECT_URI` 是否正确指向后端 `/api/auth/oidc-callback`
2. 检查 OIDC Provider 中注册的 Redirect URI 是否匹配
3. 查看后端日志中的 `[OIDC]` 输出
4. 确保 `OIDC_CLIENT_SECRET` 正确
5. 确保服务器能访问 `OIDC_AUTHORITY` 的 `.well-known/openid-configuration`

```bash
# 测试 OIDC Discovery
curl -s https://your-oidc-provider/.well-known/openid-configuration | jq .
```

---

### 问题：OIDC 退出后仍然需要重新确认退出

**原因**：未提供 `id_token_hint`，IdentityServer 会显示确认页面。

**排查**：

1. 检查前端是否正确保存了 OIDC 回调中的 `id_token`（`OidcCallbackView.vue` 中的 `auth.setIdToken()`）
2. 检查导航栏退出按钮是否将 `id_token` 作为查询参数传递给 `/api/auth/logout`
3. 确认 OIDC Provider 中注册了正确的 Post-Logout Redirect URI（`https://<your-domain>/`）
4. 查看后端日志中的 `[OIDC] Logout` 相关输出

---

### 问题：天气数据加载失败

1. 检查后端日志中 `[Weather]` 相关输出
2. 如果使用 Open-Meteo（默认），确认服务器能访问 `api.open-meteo.com`
3. 如果使用和风天气，检查：
   - `QWEATHER_API_HOST`、`QWEATHER_CREDENTIAL_ID`、`QWEATHER_PRIVATE_KEY` 是否正确
   - 服务器能否访问和风天气 API 主机
   - Ed25519 私钥格式是否正确（仅需 base64 body 部分，不含 PEM 头尾）

```bash
# 测试天气 API
curl -s http://localhost/api/weather | jq .
```

---

### 问题：邮件发送失败

**排查**：

1. 在后台「发送邮件」Tab 中先点击「测试发送」
2. 检查后端日志中的错误信息
3. 常见原因：
   - SMTP 服务器地址/端口错误
   - 密码不正确（某些邮箱需要使用「应用专用密码」而非登录密码）
   - 加密方式不匹配（TLS 用 587 端口，SSL 用 465 端口）
   - 邮件服务商限制发送频率

---

### 问题：情感分析不工作（LLM 模式）

**排查**：

1. 在后台「系统设置」中确认 `analytics.sentimentEngine` 设为 `openai` 或 `deepseek`
2. 确认 `analytics.llmApiKey` 已设置
3. 检查后端日志中的 LLM 调用错误
4. 确认服务器能访问 LLM API 地址（`api.openai.com` 或 `api.deepseek.com`）
5. 本地模式（`local`）无需外部 API，始终可用

---

### 问题：elFinder 文件管理器无法加载

**排查**：

1. 确认已以管理员身份登录
2. 检查浏览器控制台是否有 JavaScript 错误
3. 确认 `elfinder.html` 和 `elfinder/` 静态资源是否存在：
   - 开发环境：`frontend/public/elfinder.html` 和 `frontend/public/elfinder/`
   - 生产构建：这些文件应在 `frontend/dist/` 中
4. 确认 jQuery 和 jQuery UI 库已正确复制：
   - 开发环境：Vite 自动通过 `vite-plugin-static-copy` 复制到 `/libs/`
   - 生产构建：检查 `frontend/dist/libs/` 是否存在
5. 检查后端 API 是否可访问：`curl http://localhost:3000/api/admin/elfinder?cmd=open&init=1`（需携带 JWT）

---

### 问题：TinyMCE 编辑器中无法通过 elFinder 选择文件

**排查**：

1. 确认 `elfinder.html` 中的 `url` 配置指向正确的后端 API 地址（`/api/admin/elfinder`）
2. 检查 JWT token 是否正确传递（通过 URL 参数或 localStorage）
3. 确认 `TinyEditor.vue` 中的 `file_picker_callback` 配置正确
4. 检查弹窗是否被浏览器拦截

---

### 问题：角色管理页面看不到

**原因**：「角色管理」Tab 仅对超级管理员可见。

**解决**：确认你的登录邮箱在 `ADMIN_EMAILS` 环境变量中。通过角色管理分配的 admin 角色**不是**超级管理员。

---

### 问题：管理员只能看到部分后台页面

**原因**：该管理员的 `adminPermissions` 限制了可见页面。

**解决**：
1. 以超级管理员身份登录
2. 进入后台 → 「角色管理」Tab
3. 编辑该用户的权限，勾选需要的后台页面

或通过数据库直接修改：
```sql
UPDATE "User" SET "adminPermissions" = '["meeting","schedule","attendees","reflections"]' WHERE email = 'someone@example.com';
```

---

### 问题：所有页面都要求登录

**原因**：页面白名单为空。

**解决**：
1. 以管理员身份登录 → 后台 → 「权限设置」Tab
2. 勾选允许匿名访问的页面
3. 保存后前端路由守卫会立即生效

或通过数据库直接设置：
```sql
INSERT INTO "SystemSetting" (key, value, category, "updatedAt")
VALUES ('auth.whitelist', '["/", "/schedule", "/venue", "/weather"]', 'auth', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW();
```

---

### 问题：首页内容显示为默认值，修改不生效

**原因**：`HomeSection` 表可能为空，API 回退到了硬编码默认值。

**解决**：
1. 进入后台 → 「首页管理」Tab
2. 点击「插入默认数据」按钮将默认区块写入数据库
3. 之后的编辑修改会实时生效

---

### 问题：数据库重置后种子数据丢失

**解决**：重新执行种子脚本：

```bash
docker compose exec backend node prisma/seed.js
```

---

### 问题：开发环境 Vite 代理不生效

**原因**：后端未启动或端口不对。

**确认**：

```bash
# 确认后端在 3000 端口运行
curl http://localhost:3000/api/health
```

> Vite 代理配置在 `frontend/vite.config.js`：`/api` 和 `/uploads` 都代理到 `http://localhost:3000`。

---

### 问题：日程 / 参会人员数据为空

**说明**：数据现在存储在数据库中。如果是首次部署或从旧版本升级：

1. 运行 `npm run db:init`（会自动从 JSON 文件迁移数据）
2. 或在后台对应 Tab 顶部点击 **「📥 从静态文件导入」** 按钮
3. 或手动执行：`node prisma/migrate-static-to-db.js`

---

### 问题：Docker 构建很慢

**优化**：

- 后端 Dockerfile 已将 `package*.json` 和 `prisma/` 提前 COPY 并安装，利用 Docker 层缓存
- 前端使用多阶段构建，运行时镜像仅包含 Nginx + 构建产物
- 首次构建较慢是正常的，后续构建会利用缓存

---

## 附录：环境变量快速参考

```env
# === 必须配置（生产） ===
NODE_ENV=production
JWT_SECRET=<strong-random-string>
DATABASE_URL=postgresql://meeting:<password>@postgres:5432/global_it
ADMIN_EMAILS=admin@your-domain.com

# === 可选配置 ===
PORT=3000
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://meeting.your-domain.com

# === OSS（可选）===
USE_OSS=true
OSS_REGION=cn-hangzhou
OSS_ACCESS_KEY_ID=<key>
OSS_ACCESS_SECRET=<secret>
OSS_BUCKET=<bucket>
OSS_ENDPOINT=
OSS_PUBLIC_BASE_URL=

# === OIDC（可选）===
OIDC_ENABLED=true
OIDC_AUTHORITY=https://your-oidc-provider/
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
OIDC_REDIRECT_URI=https://meeting.your-domain.com/api/auth/oidc-callback
OIDC_SCOPES=openid email profile
OIDC_FRONTEND_CALLBACK=/auth/callback

# === 天气 API（可选，默认使用免费 Open-Meteo）===
WEATHER_PROVIDER=auto
QWEATHER_API_HOST=<api-host>
QWEATHER_CREDENTIAL_ID=<credential-id>
QWEATHER_PRIVATE_KEY=<ed25519-private-key-base64>
WEATHER_LOCATION=101010100

# === 上传限制 ===
MAX_IMAGE_SIZE=10485760
MAX_VIDEO_SIZE=52428800
```

> **注意**：以下配置通过后台界面管理，存储在数据库 `SystemSetting` 表中，**不需要环境变量**：
> - 邮件通知（SMTP 发件人配置）
> - 数据分析（LLM 引擎 / API Key）
> - 页面白名单（`auth.whitelist`）
