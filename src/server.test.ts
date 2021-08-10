import { Express } from "express";
import mongoose from "mongoose";
import request from "supertest";

import { Election } from "./model";
import { createServer } from "./server";

const { DB_USER, DB_PW, CLUSTER_URL, DB_TEST_NAME } = process.env;

const uri = `mongodb+srv://${DB_USER}:${DB_PW}@${CLUSTER_URL}/${DB_TEST_NAME}?retryWrites=true&w=majority`;
let app: Express;

beforeAll(() => {
  app = createServer();
});

beforeEach(async () =>
  mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
);

afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe("GET /voter/getElectionParams", () => {
  it("Uninitiated election should return 400", async () => {
    const res = await request(app)
      .get(`/voter/getElectionParams/election_test`)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(res.body).toMatchObject({ code: "ELECTION_NOT_EXIST" });
  });

  it("Bad request should return 404", async () => {
    await request(app).get(`/voter/getElectionParams/`).expect(404);

    expect(true).toBeTruthy();
  });

  it("Initiated election should return params", async () => {
    const electionName = "election_test";

    await Election.create({
      name: electionName,
      numberOfVoters: 4,
      g: "123",
      p: "123",
      q: "123",
    });

    const res = await request(app)
      .get(`/voter/getElectionParams/${electionName}`)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toMatchObject({
      g: "123",
      p: "123",
      q: "123",
    });
  });
});
