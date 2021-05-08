import express from "express";
import mongodb from "mongodb";

import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;

const { DB_USER, DB_PW, CLUSTER_URL } = process.env;

const uri = `mongodb+srv://${DB_USER}:${DB_PW}@${CLUSTER_URL}?retryWrites=true&w=majority`;
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.get("/", async (req, res) => {
  try {
    await client.connect();

    console.log("Connected to MongoDB");

    const database = client.db("vmv");
    const voters = database.collection("voters");
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
  } finally {
    await client.close();
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
