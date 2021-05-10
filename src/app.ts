import "dotenv/config";

import parse from "csv-parse";
import express from "express";
import formidable, { File } from "formidable";
import * as fs from "fs";
import mongodb from "mongodb";

const app = express();
const port = process.env.PORT || 3000;

const { DB_USER, DB_PW, CLUSTER_URL } = process.env;

const uri = `mongodb+srv://${DB_USER}:${DB_PW}@${CLUSTER_URL}?retryWrites=true&w=majority`;
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

await client.connect();
const db = client.db("vmv");
console.log("Connected to MongoDB");

app.get("/", async (req, res) => {
  try {
    const voters = db.collection("voters");
    res.json(
      await voters
        .find(
          {},
          {
            projection: { _id: 0, voter_id: 1 },
          }
        )
        .toArray()
    );
  } catch (e) {
    console.log(e);
  }
});

app.post("/upload", async (req, res) => {
  const form = formidable.formidable();
  let name: string;

  const parser = parse({ columns: true }, async (err, records) => {
    try {
      const collection = db.collection(name);

      if (name in db.listCollections()) {
        await collection.drop(); // TODO only remove when indicated
      }

      const result = await collection.insertMany(records);

      console.log(`Inserted ${result.insertedCount} docs`);

      res.sendStatus(200);
    } catch (e) {
      console.log(e);

      res.sendStatus(500);
    }
  });

  form.parse(req, async (err, fields, files) => {
    const { path, name: fooName } = files.data as File;

    if (fooName == null || !fooName.endsWith(".csv")) {
      res.sendStatus(400);
      return;
    }

    name = fooName.slice(0, -4);

    fs.createReadStream(path).pipe(parser);
  });
});

app.get("/vote-options", async (req, res) => {
  try {
    const options = db.collection("public-vote-options");
    res.json(await options.find().toArray());
  } catch (e) {
    console.log(e);
  }
});

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

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
