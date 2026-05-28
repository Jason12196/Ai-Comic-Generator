import dotenv from "dotenv";

import { createApp } from "./app.js";

dotenv.config();

const port = Number(process.env.PORT ?? 3001);

createApp().listen(port, () => {
  console.log(`AI Comic Generator backend listening on port ${port}`);
});
