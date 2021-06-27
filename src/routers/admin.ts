import { spawn } from "child_process";
import csv from "csvtojson";
import express from "express";
import * as fs from "fs";
import { homedir } from "os";

import { Election } from "../model/election";

const homeDir = homedir();

const projDir = `${homeDir}/vmv-android-server`;

const router = express.Router();

router.post("/init", async (req, res) => {
  const { electionName } = req.body;

  if (!electionName) {
    res.status(400).send("Must provide election name");
    return;
  }

  if (await Election.exists({ name: electionName })) {
    res.status(400).send("Election exists");
    return;
  }

  try {
    await Election.create({ name: electionName });
    res.sendStatus(201);
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  }

  fs.mkdirSync(`${homeDir}/elections/${electionName}`);

  const getParams = (teller: number) => {
    const params = [
      homeDir,
      `${projDir}/vmv-1.1.1.jar`,
      `${homeDir}/.ssh/id_ed25519`,
      "localhost",
      "expect",
      electionName,
      4,
      3,
      teller,
      "127.0.0.1",
      8080 + teller,
      4040 + teller,
    ];

    if (teller === 1) {
      return params.concat([10, "ers-voters.csv", "ers-associated-voters.csv"]);
    }

    return params;
  };

  let numTellersDone: number = 0;
  let hasError: boolean = false;

  const stdoutFunc = (data: string, i: number) => {
    console.log(`Teller ${i} stdout: ${data}`);
  };

  const stderrFunc = (data: string, i: number) => {
    console.error(`Teller ${i} stderr: ${data}`);
    hasError = true;
  };

  const closeFunc = async (code: number, i: number) => {
    console.log(`Teller ${i} exited with code ${code}`);

    numTellersDone++;

    if (numTellersDone >= 4 && !hasError) {
      const [csvObj] = await csv().fromFile(
        `${homeDir}/elections/${electionName}/public-election-params.csv`
      );

      console.log(csvObj);

      await Election.updateOne({ name: electionName }, csvObj);
    }
  };

  for (let i = 1; i <= 4; i++) {
    const params = getParams(i);

    const vmv = spawn(`${projDir}/election_initialisation.exp`, params);

    vmv.stdout.on("data", (data: string) => stdoutFunc(data, i));

    vmv.stderr.on("data", (data: string) => stderrFunc(data, i));

    vmv.on("close", (code: number) => closeFunc(code, i));
  }
});

export default router;
