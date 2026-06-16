# YCYW 2026 Global IT Meeting — 部署指南

> 本文档详细描述了项目从本地开发到生产部署的完整流程，包括 Docker Compose 部署、数据库切换、对象存储、OIDC 认证、SSL 配置、数据备份及常见问题排查。

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
- [4. Nginx 反向代理详解](#4-nginx-反向代理详解)
- [5. PostgreSQL 数据库管理](#5-postgresql-数据库管理)
- [6. 切换到阿里云 OSS 存储](#6-切换到阿里云-oss-存储)
- [7. 启用真实 OIDC 登录](#7-启用真实-oidc-登录)
- [8. SSL / HTTPS 配置](#8-ssl--https-配置)
- [9. 数据备份与恢复](#9-数据备份与恢复)
- [10. 监控与日志](#10-监控与日志)
- [11. 常见问题排查](#11-常见问题排查)

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

# 4. 初始化数据库
cd backend
npx prisma migrate dev --name init
npm run db:seed
# （可选）灌入演示数据
npm run db:seed-demo
cd ..

# 5. 启动
npm run dev
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
- 管理员邮箱：`admin@ycyw.cn`（或 `.env` 中 `ADMIN_EMAILS` 定义的邮箱）
- 参会人员邮箱：种子数据生成的 `<英文名>@ycyw-edu.com`

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
      ADMIN_EMAILS: admin@ycyw-edu.com  # ← 改为实际管理员邮箱
      
      # 存储配置
      USE_OSS: 'false'                  # 'true' 启用 OSS
      # OSS_REGION / OSS_ACCESS_KEY_ID / ...
      
      # OIDC 配置
      OIDC_ENABLED: 'false'             # 'true' 启用真实 OIDC
      # OIDC_CLIENT_ID / OIDC_AUTHORITY / ...

  frontend:
    ports:
      - '80:80'                         # 按需修改外部端口
```

#### 🔐 安全清单

| 项目 | 操作 |
| --- | --- |
| `POSTGRES_PASSWORD` | 使用强密码替换 `meetingpass` |
| `JWT_SECRET` | 使用至少 32 字符的随机字符串 |
| `ADMIN_EMAILS` | 限定实际管理员邮箱 |
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
3. `node src/server.js` — 启动 API 服务

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
| `uploads` | 用户上传的图片 / 视频文件 |

> ⚠️ 删除 volume 会导致数据丢失。使用 `docker compose down` 不会删除 volume；`docker compose down -v` **会删除所有 volume**。

---

## 4. Nginx 反向代理详解

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

- `/api/*` 请求转发到后端的 Express 服务
- `/uploads/*` 请求转发到后端的静态文件服务
- `client_max_body_size 60m` 确保大文件上传不被 Nginx 拒绝

> **注意**：`backend` 是 Docker Compose 中的服务名，Nginx 通过 Docker 内部 DNS 解析。

---

## 5. PostgreSQL 数据库管理

### 连接到数据库

```bash
# 通过 Docker 进入 PostgreSQL 交互式终端
docker compose exec postgres psql -U meeting -d global_it
```

### 常用操作

```sql
-- 查看所有表
\dt

-- 查看用户列表
SELECT id, email, "isAttendee", "isAdmin" FROM "User" LIMIT 20;

-- 查看反思数量
SELECT COUNT(*) FROM "Reflection";

-- 手动提升管理员
UPDATE "User" SET "isAdmin" = true WHERE email = 'someone@example.com';
```

### 重新执行种子数据

```bash
# 进入后端容器
docker compose exec backend sh

# 在容器内执行
node prisma/seed.js
node prisma/seed-demo.js   # 可选：演示数据
node prisma/clean-demo.js  # 可选：清理演示数据
```

### 重置数据库（危险操作）

```bash
docker compose exec backend npx prisma migrate reset --force
```

> ⚠️ 此操作会删除所有数据并重新创建表结构和种子数据。

---

## 6. 切换到阿里云 OSS 存储

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

### OSS Bucket 配置建议

| 设置 | 推荐值 |
| --- | --- |
| 读写权限 | 公共读 (`public-read`) |
| 跨域 (CORS) | 允许你的前端域名 |
| 防盗链 | 可选，限制 Referer |
| 生命周期 | 按需配置过期清理 |

---

## 7. 启用真实 OIDC 登录

项目已**完整实现**真实 OIDC 认证流程（非占位代码），使用 `openid-client` v6。只需配置环境变量即可启用。

### 架构概览

```
用户 → 点击登录 → 前端跳转 /api/auth/oidc-login
  → 后端 302 → OIDC Provider (如 Azure AD / Auth0 / Keycloak)
  → 用户认证 → OIDC Provider 回调 /api/auth/oidc-callback
  → 后端 code→token→userinfo → findOrCreate 本地用户 → 签发 JWT
  → 302 → 前端 /auth/callback?token=JWT
  → OidcCallbackView 保存 token → 跳转目标页
```

### 步骤 1：在 OIDC Provider 注册应用

在你的 OIDC Provider（如 Azure AD、Auth0、Keycloak 等）中注册一个应用：

| 配置项 | 值 |
| --- | --- |
| Redirect URI | `https://<your-domain>/api/auth/oidc-callback` |
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
| 后端路由 | `backend/src/routes/auth.js` | `GET /oidc-login`（生成授权 URL）、`GET /oidc-callback`（处理回调） |
| OIDC 发现 | 自动 | `openid-client` 通过 `OIDC_AUTHORITY` 自动发现 `.well-known/openid-configuration` |
| State 管理 | 内存 Map | 10 分钟自动过期，集群部署需改用 Redis |
| 前端配置 | `stores/auth.js` | `fetchConfig()` 获取 `oidcEnabled`，`requireLogin()` 自动选择登录模式 |
| 前端回调 | `OidcCallbackView.vue` | 接收 JWT token，调用 `fetchMe()` 获取用户信息 |
| 前端守卫 | `router/index.js` | 管理员页面访问时自动触发 OIDC 登录 |

### 重要说明

- 后端使用 **openid-client v6**（ESM-only），通过 CommonJS 的 `import()` 动态加载
- 使用 `ClientSecretPost` 方式发送 client_secret
- 用户邮箱通过 `fetchUserInfo` 获取，然后在本地数据库 `findOrCreate`
- OIDC state 使用内存 Map 存储，**集群部署时需要改用 Redis**
- 前端在 `App.vue` 的 `onMounted` 中调用 `auth.fetchConfig()` 获取 OIDC 模式

---

## 8. SSL / HTTPS 配置

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

---

## 9. 数据备份与恢复

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

## 10. 监控与日志

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

---

## 11. 常见问题排查

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

### 问题：静态数据（日程/参会人员）更新后不生效

**说明**：`staticData.js` 路由**每次请求都直接读取文件**（无内存缓存），修改 `backend/data/schedule.json` 或 `attendees.json` 后即刻生效，无需重启。

> ⚠️ 如果使用 Docker 部署，需要重新构建后端容器（因为文件被 COPY 到镜像中）：
> ```bash
> docker compose up -d --build backend
> ```
> 或者将 `data/` 目录挂载为 volume。

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

# === 上传限制 ===
MAX_IMAGE_SIZE=10485760
MAX_VIDEO_SIZE=52428800
```
