import mongoose from "mongoose";

import { createServer } from "./server";

const port = process.env.PORT || 3000;
const { DB_USER, DB_PW, CLUSTER_URL, DB_NAME } = process.env;

const uri = `mongodb+srv://${DB_USER}:${DB_PW}@${CLUSTER_URL}/${DB_NAME}?retryWrites=true&w=majority`;
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log("Connected to DB");

    const app = createServer();

    app.listen(port, () => {
      console.log(`App listening at http://localhost:${port}`);
    });
  })
  .catch((reason) => {
    console.error("Unable to connect to the database:", reason);
    console.error(uri);
  });
