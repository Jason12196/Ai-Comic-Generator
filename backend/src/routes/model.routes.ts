import { Router } from "express";

import { generateImageByModel, generateText, getImageRequestStatus, getModels } from "../controllers/model.controller.js";

const modelRouter = Router();

modelRouter.get("/", getModels);
modelRouter.post("/generate-text", generateText);
modelRouter.post("/generate-image", generateImageByModel);
modelRouter.post("/image-request-status", getImageRequestStatus);

export { modelRouter };
