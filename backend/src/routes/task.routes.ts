import { Router } from "express";

import { deleteAllTasks, deleteTask, listTasks, upsertTask } from "../controllers/task.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const taskRouter = Router();

taskRouter.use(requireAuth);
taskRouter.get("/", listTasks);
taskRouter.post("/", upsertTask);
taskRouter.delete("/", deleteAllTasks);
taskRouter.patch("/:taskId", upsertTask);
taskRouter.delete("/:taskId", deleteTask);

export { taskRouter };
