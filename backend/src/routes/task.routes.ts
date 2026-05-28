import { Router } from "express";

import { getTaskById } from "../controllers/task.controller.js";

const taskRouter = Router();

taskRouter.get("/:taskId", getTaskById);

export { taskRouter };
