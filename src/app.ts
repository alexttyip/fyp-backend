import "dotenv/config";

import express from "express";
import mongoose from "mongoose";

import { adminRouter, voterRouter } from "./routers";

// import { get } from "./db";
// import uploadRouter from "./routers/upload";

const app = express();
const port = process.env.PORT || 3000;

// const PUBLIC_VOTERS_KEYS = "public-voters-keys";

app.use(express.json());

app.use("/admin", adminRouter);
app.use("/voter", voterRouter);
// app.use("/upload", uploadRouter);

/* app.get("/drop", async (req, res) => {
  const collections = [
    "commitments-proofs-1",
    "commitments-proofs-2",
    "commitments-proofs-3",
    "commitments-proofs-4",
    "public-associated-voters",
    "public-commitments-1",
    "public-commitments-2",
    "public-commitments-3",
    "public-commitments-4",
    "public-tracker-numbers",
    "public-vote-options",
    "public-voters",
    "shuffled-tracker-numbers",
    "votes",
  ];

  const existing = (await db.listCollections().toArray()).map(
    (value) => value.name as String
  );

  const calls = collections.map((value) => {
    if (existing.includes(value)) {
      console.log(value);
      return db.collection(value).drop();
    }

    return Promise.resolve(`${value} doesn't exist`);
  });

  Promise.allSettled(calls)
    .then(() => {
      console.log("done");
      res.sendStatus(200);
    })
    .catch((e) => {
      console.log(e);
      res.sendStatus(500);
    });
}); */

/* app.get("/vote-options", async (req, res) => {
  try {
    const options = db.collection("public-vote-options");
    res.json(await options.find().toArray());
  } catch (e) {
    console.log(e);
  }
}); */

/*
app.delete("/deleteTest", async (req, res) => {
  const db = get();
  if (!db) {
    res.sendStatus(500);

    return;
  }

  const voterKeys = db.collection(PUBLIC_VOTERS_KEYS);

  const result = await voterKeys.deleteOne({ voterId: 9 });

  console.log(`Deleted ${result.deletedCount} docs`);

  res.status(200).json({ OK: `Deleted ${result.deletedCount} docs` });
});
*/

/*
app.post("/vote", async (req, res) => {
  const form = formidable.formidable();

  form.parse(req, async (err, fields) => {
    const { vote = "" } = fields;

    if (!vote) {
      res.sendStatus(400);
      return;
    }

    try {
      const collection = db.collection("votes");

      const result = await collection.insertOne({ vote });

      console.log(`Inserted ${result.insertedCount} docs`);

      res.sendStatus(200);
    } catch (e) {
      console.log(e);

      res.sendStatus(500);
    }
  });
});
*/

const { DB_USER, DB_PW, CLUSTER_URL, DB_NAME } = process.env;

const uri = `mongodb+srv://${DB_USER}:${DB_PW}@${CLUSTER_URL}/${DB_NAME}?retryWrites=true&w=majority`;
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .catch((reason) => {
    console.error("Unable to connect to the database:", reason);
  })
  .then(() => {
    console.log("Connected to DB");

    app.listen(port, () => {
      console.log(`App listening at http://localhost:${port}`);
    });
  });
