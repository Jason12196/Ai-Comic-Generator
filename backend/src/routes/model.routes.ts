import { Router } from "express";

import { generateImageByModel, generateText, getModels } from "../controllers/model.controller.js";

const modelRouter = Router();

modelRouter.get("/", getModels);
modelRouter.post("/generate-text", generateText);
modelRouter.post("/generate-image", generateImageByModel);

export { modelRouter };
