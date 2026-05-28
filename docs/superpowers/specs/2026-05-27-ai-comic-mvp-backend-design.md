# AI Comic MVP Backend Design

**Goal**

在不重构现有单文件前端的前提下，为 Ai-Comic-Generator 增加一个可部署的 Node.js + Express + TypeScript 后端，并通过 Docker Compose 与 Nginx 将前后端一并托管到腾讯云 Ubuntu 服务器，使用户可以通过 `http://43.160.235.239/` 访问页面，完成“输入故事 -> 生成分镜 -> 生成图片 -> 轮询展示结果”的 MVP 闭环，同时确保模型 API Key 仅保存在后端 `backend/.env` 中。

**Scope**

- 保留现有 `index.html` 的页面结构、主要交互和样式。
- 删除前端直连 Gemini 的关键路径，改为同域名下 `/api/*` 请求。
- 新增 `backend/`，提供健康检查、故事分镜、单图生成、整本漫画异步生成和任务查询接口。
- 新增基于内存的任务队列，MVP 阶段不做数据库与任务恢复。
- 新增 `docker-compose.yml`、`nginx/default.conf` 和部署说明。
- 前端与后端都不提交真实密钥。

**Architecture**

前端继续作为静态页面存在于仓库根目录，由 Nginx 直接提供 `index.html`。Nginx 同时将 `/api/*` 反向代理到 Express 后端。后端接收故事输入后，先调用文本模型生成结构化分镜 JSON，再逐格调用图像模型生成图片，并把任务进度和结果保存在进程内内存中。前端通过 `taskId` 定时轮询 `/api/tasks/:taskId`，驱动进度条和最终结果展示。

**Backend Components**

- `app.ts`：Express 应用初始化、中间件、路由挂载。
- `server.ts`：读取环境变量并启动服务。
- `routes/`：`health`、`generate`、`task` 路由。
- `controllers/`：参数校验、请求分发、错误响应。
- `services/openai.service.ts`：文本与图像模型调用封装。
- `services/comicPipeline.service.ts`：完整漫画生成流水线。
- `services/taskQueue.service.ts`：任务创建、状态更新、结果查询。
- `utils/promptBuilder.ts`：故事分镜与图片 prompt 组装。
- `utils/jsonParser.ts`：容错 JSON 提取与解析。
- `types/index.ts`：请求、响应、任务、分镜等类型。

**Data Flow**

1. 前端提交故事、风格、分镜数、比例和语言到 `POST /api/generate/comic`。
2. 后端创建 `taskId`，立即返回 `pending`。
3. 后台任务更新到 `processing`，先生成结构化故事分镜。
4. 后台逐格生成图片，随每一格完成更新 `progress` 与 `panels`。
5. 任务完成后写入最终漫画结果并置为 `completed`。
6. 前端轮询 `GET /api/tasks/:taskId`，在完成后渲染最终结果。

**API Contract**

- `GET /api/health`
  - 返回服务状态与时间戳。
- `POST /api/generate/story`
  - 输入故事描述，返回结构化漫画脚本。
- `POST /api/generate/image`
  - 输入单张图片 prompt，返回 `data:image/...;base64,...`。
- `POST /api/generate/comic`
  - 创建异步任务，返回 `taskId` 与初始状态。
- `GET /api/tasks/:taskId`
  - 返回任务状态、进度、脚本、已生成 panels、错误信息。

**Validation And Error Handling**

- `panelCount` 只允许 `1 | 2 | 4 | 6 | 8`。
- 缺少 `OPENAI_API_KEY` 时接口返回 500，并给出可读错误信息。
- 模型返回非标准 JSON 时，通过代码块提取和首尾括号切片进行容错解析。
- 单格图片失败时记录失败原因并使整任务进入 `failed`，保持前端可见。
- 未找到任务时，`GET /api/tasks/:taskId` 返回 404。

**Frontend Integration**

- 移除页面顶部 API Key 输入的必填逻辑，改为展示“服务端托管模式”。
- 新增轻量 `apiRequest`、`generateComicTask`、`pollTaskStatus` 等函数。
- 尽量保留现有任务列表、进度条和展示网格，只替换数据来源。
- 前端请求默认使用同源 `/api`，不在浏览器端保存任何模型密钥。

**Deployment**

- `backend` 容器监听 `3001`。
- `nginx` 容器对外暴露 `80`，挂载根目录静态前端文件和反代配置。
- `docker compose up -d --build` 后，访问：
  - `http://43.160.235.239/`
  - `http://43.160.235.239/api/health`

**Testing**

- 后端接口测试覆盖：
  - `GET /api/health`
  - 参数校验
  - 任务创建与查询
  - JSON 容错解析
- 前端以最小手工验证为主：
  - 页面加载
  - 点击生成后出现轮询进度
  - 完成后展示结果
