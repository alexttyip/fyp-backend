import express from "express";

import { adminRouter, voterRouter } from "./routers";

export const createServer = () => {
  const app = express();

  app.use(express.json());

  app.use("/admin", adminRouter);
  app.use("/voter", voterRouter);

  return app;
};
