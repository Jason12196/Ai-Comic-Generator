import { Router } from "express";

import { generateComic, generateImage, generateStory } from "../controllers/generate.controller.js";

const generateRouter = Router();

generateRouter.post("/story", generateStory);
generateRouter.post("/image", generateImage);
generateRouter.post("/comic", generateComic);

export { generateRouter };
