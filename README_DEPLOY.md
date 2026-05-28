# AI Comic Generator Deployment Guide

本指南适用于将当前仓库部署到腾讯云 Ubuntu 服务器 `43.160.235.239`，部署结果包括：

- 前端页面：`http://43.160.235.239/`
- 健康检查：`http://43.160.235.239/api/health`

## 1. 服务器基础信息

- 云厂商：腾讯云 Lighthouse
- 公网 IP：`43.160.235.239`
- 操作系统：Ubuntu Server 22.04 LTS
- 对外端口：`80`
- 后端容器端口：`3001`

## 2. 首次安装依赖

```bash
ssh root@43.160.235.239

apt update
apt upgrade -y
apt install -y git curl ufw

curl -fsSL https://get.docker.com | bash
systemctl enable docker
systemctl start docker
apt install -y docker-compose-plugin

docker --version
docker compose version
```

## 3. 拉取项目

```bash
git clone https://github.com/Jason12196/Ai-Comic-Generator.git
cd Ai-Comic-Generator
```

如果是更新已有部署：

```bash
cd Ai-Comic-Generator
git pull origin main
```

## 4. 配置后端环境变量

只提交了模板文件，真实密钥请手动填写到服务器。

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

建议至少填写：

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://43.160.235.239

OPENAI_API_KEY=your_real_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TEXT_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
```

## 5. 启动服务

```bash
docker compose up -d --build
```

查看运行状态：

```bash
docker ps
docker logs -f ai-comic-backend
docker logs -f ai-comic-nginx
```

## 6. 验证部署

```bash
curl http://43.160.235.239/api/health
```

预期返回：

```json
{
  "success": true,
  "message": "AI Comic Generator backend is running",
  "timestamp": "2026-05-27T00:00:00.000Z"
}
```

然后在浏览器打开：

- `http://43.160.235.239/`

页面会由 Nginx 直接托管，前端请求同域名下的 `/api/*`，浏览器端不需要填写任何 API Key。

## 7. 常用运维命令

重启服务：

```bash
docker compose restart
```

停止服务：

```bash
docker compose down
```

重新构建并启动：

```bash
docker compose up -d --build
```

## 8. 当前实现说明

- 漫画生成任务使用后端内存队列保存。
- 如果后端容器重启，未完成任务不会恢复。
- API Key 只存在于 `backend/.env`，不会暴露到前端。
- 前端页面仍保持单文件结构，未做框架重构。

## 9. 安全组建议

当前至少开放：

- `22`：SSH
- `80`：HTTP

后续如果接入 HTTPS，再开放：

- `443`：HTTPS
