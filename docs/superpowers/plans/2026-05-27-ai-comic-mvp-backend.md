# AI Comic MVP Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable Express + TypeScript backend, wire the existing static frontend to it, and ship Docker Compose plus Nginx hosting for a same-origin AI comic MVP.

**Architecture:** Keep the current `index.html` as a static frontend served by Nginx. Add an Express backend under `backend/` with a small service layer for text generation, image generation, task orchestration, and in-memory task state. Route `/api/*` to Express and `/` to the static frontend.

**Tech Stack:** Node.js, Express, TypeScript, Vitest, Supertest, OpenAI SDK, Docker Compose, Nginx

---

### Task 1: Scaffold Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.gitignore`
- Create: `backend/.env.example`

- [ ] Add backend package metadata, scripts, and dependencies.
- [ ] Add TypeScript compiler config for `src` to `dist`.
- [ ] Add backend ignore rules for `node_modules`, `dist`, and `.env`.
- [ ] Add environment variable template for OpenAI and runtime config.

### Task 2: Add Backend Tests And Utilities

**Files:**
- Create: `backend/vitest.config.ts`
- Create: `backend/src/utils/jsonParser.ts`
- Create: `backend/src/utils/promptBuilder.ts`
- Create: `backend/src/__tests__/jsonParser.test.ts`

- [ ] Write a failing test for tolerant JSON extraction from model output.
- [ ] Run the parser test and confirm it fails.
- [ ] Implement minimal tolerant JSON parsing utilities.
- [ ] Re-run the parser test and confirm it passes.

### Task 3: Build Express App And Health Endpoint

**Files:**
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/routes/health.routes.ts`
- Create: `backend/src/controllers/health.controller.ts`
- Create: `backend/src/utils/response.ts`
- Create: `backend/src/__tests__/health.test.ts`

- [ ] Write a failing integration test for `GET /api/health`.
- [ ] Run the health test and confirm it fails.
- [ ] Implement the Express app, router, and health controller.
- [ ] Re-run the health test and confirm it passes.

### Task 4: Add Core Domain Types And Task Queue

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `backend/src/services/taskQueue.service.ts`
- Create: `backend/src/__tests__/taskQueue.test.ts`

- [ ] Write failing tests for task creation, progress updates, and missing-task lookup.
- [ ] Run the task queue test and confirm it fails.
- [ ] Implement the in-memory task queue service.
- [ ] Re-run the task queue test and confirm it passes.

### Task 5: Add OpenAI Service And Comic Pipeline

**Files:**
- Create: `backend/src/services/openai.service.ts`
- Create: `backend/src/services/comicPipeline.service.ts`

- [ ] Implement a small OpenAI client wrapper for text and image generation.
- [ ] Implement a pipeline service that creates a storyboard and then generates panel images sequentially.
- [ ] Ensure the pipeline updates task progress at each stage and stores final data.

### Task 6: Add Generate And Task Endpoints

**Files:**
- Create: `backend/src/routes/generate.routes.ts`
- Create: `backend/src/routes/task.routes.ts`
- Create: `backend/src/controllers/generate.controller.ts`
- Create: `backend/src/controllers/task.controller.ts`
- Create: `backend/src/__tests__/generate.test.ts`

- [ ] Write failing tests for `POST /api/generate/comic`, `GET /api/tasks/:taskId`, and invalid `panelCount`.
- [ ] Run the endpoint tests and confirm they fail.
- [ ] Implement request validation, controller logic, and route wiring.
- [ ] Re-run the endpoint tests and confirm they pass.

### Task 7: Wire Frontend To Backend With Minimal HTML Changes

**Files:**
- Modify: `index.html`

- [ ] Replace browser-side API key usage with same-origin `/api` helper functions.
- [ ] Update story generation and comic generation flows to call backend endpoints.
- [ ] Add polling logic that maps task responses onto the existing progress and render UI.
- [ ] Preserve the current layout and interaction model as much as possible.

### Task 8: Add Container And Reverse Proxy Setup

**Files:**
- Create: `backend/Dockerfile`
- Create: `docker-compose.yml`
- Create: `nginx/default.conf`

- [ ] Build a production backend image that compiles TypeScript and runs `dist/server.js`.
- [ ] Configure Nginx to serve the root static frontend and proxy `/api/` to the backend container.
- [ ] Define Compose services for backend and Nginx with restart policies and env file usage.

### Task 9: Write Deployment Documentation

**Files:**
- Create: `README_DEPLOY.md`

- [ ] Document Tencent Cloud Ubuntu setup, Docker installation, repository clone, `.env` editing, compose startup, and health verification.
- [ ] Include the final public URLs and operational notes about in-memory tasks and secret handling.

### Task 10: Verify End To End

**Files:**
- Modify: `backend/package.json` if script adjustments are needed

- [ ] Run backend unit and integration tests.
- [ ] Run a local build for the backend.
- [ ] Run `docker compose config` to validate configuration.
- [ ] Summarize any remaining runtime limitations clearly.
