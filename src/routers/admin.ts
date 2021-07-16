import { spawn } from "child_process";
import { createObjectCsvWriter } from "csv-writer";
import csv from "csvtojson";
import express from "express";
import { body, validationResult } from "express-validator";
import * as fs from "fs";
import { homedir } from "os";

import { Election, Voter } from "../model";

const homeDir = homedir();
const projDir = `${homeDir}/vmv-android-server`;

const router = express.Router();

interface InitReqBody {
  electionName: string;
  numberOfTellers: number;
  thresholdTellers: number;
  voters: number[];
  voteOptions: string[];
}

/**
 * Initialisation of VMV Election
 */
router.post(
  "/init",
  body("electionName").notEmpty(),
  body("numberOfTellers").isInt(),
  body("thresholdTellers").isInt(),
  body("voters").isArray(),
  body("voteOptions").isArray(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      electionName,
      numberOfTellers,
      thresholdTellers,
      voters,
      voteOptions,
    }: InitReqBody = req.body;

    if (!electionName) {
      res.status(400).send("Must provide election name");
      return;
    }

    if (await Election.exists({ name: electionName })) {
      res.status(400).send("Election exists");
      return;
    }

    fs.mkdirSync(`${homeDir}/elections/${electionName}`);

    // Generate ers-vote-options.csv
    const ersVoteOptions = createObjectCsvWriter({
      path: `${homeDir}/elections/${electionName}/ers-vote-options.csv`,
      header: [
        { id: "option", title: "option" },
        { id: "optionNumberInGroup", title: "optionNumberInGroup" },
      ],
    });

    try {
      await ersVoteOptions.writeRecords(
        voteOptions.map((option) => ({ option }))
      );
    } catch (e) {
      res.status(500).json({
        message: "Unable to generate CSV files",
        error: e,
      });

      return;
    }

    res.sendStatus(202);

    const getParams = (teller: number): string[] => {
      const params = [
        homeDir,
        `${projDir}/vmv-1.1.1.jar`,
        `${homeDir}/.ssh/id_ed25519`,
        "localhost",
        "expect",
        electionName,
        numberOfTellers,
        thresholdTellers,
        teller,
        "127.0.0.1",
        8080 + teller,
        4040 + teller,
      ];

      if (teller === 1) {
        return <string[]>params.concat([voters.length]);
      }

      return <string[]>params;
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
        const dir = `${homeDir}/elections/${electionName}`;
        const [params, electionKeys] = await Promise.all([
          csv().fromFile(`${dir}/public-election-params.csv`),
          csv().fromFile(`${dir}/public-election-keys.csv`),
        ]);

        await Election.create({
          name: electionName,
          numberOfVoters: voters.length,
          electionPublicKey: electionKeys[0].publicKey,
          ...params[0],
        });

        console.log("Init done");
      }
    };

    for (let i = 1; i <= 4; i++) {
      const params = getParams(i);

      const vmv = spawn(`${projDir}/election_initialisation.exp`, params);

      vmv.stdout.on("data", (data: string) => stdoutFunc(data, i));

      vmv.stderr.on("data", (data: string) => stderrFunc(data, i));

      vmv.on("close", (code: number) => closeFunc(code, i));
    }
  }
);

/**
 * VMV actions post-generation of voters' keys
 */
router.post(
  "/postVotersKeys",
  body("electionName").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { electionName }: { electionName: string } = req.body;

    const [election, voters] = await Promise.all([
      Election.findOne({ name: electionName }).exec(),
      Voter.find({ electionName }).sort("voterId").exec(),
    ]);

    const { numberOfVoters, numberOfTellers } = election;

    if (voters.length < numberOfVoters) {
      res.status(400).send("Not all voters are registered");
      return;
    }

    if (voters.length > numberOfVoters) {
      res.status(400).send("Too many voters");
      return;
    }

    // Generate public-voters-keys.csv
    const publicVotersKeys = createObjectCsvWriter({
      path: `${homeDir}/elections/${electionName}/public-voters-keys.csv`,
      header: [
        { id: "publicKeySignature", title: "publicKeySignature" },
        { id: "publicKeyTrapdoor", title: "publicKeyTrapdoor" },
      ],
    });

    // Generate ers-voters.csv
    const ersVoters = createObjectCsvWriter({
      path: `${homeDir}/elections/${electionName}/ers-voters.csv`,
      header: [
        { id: "voterId", title: "id" },
        { id: "publicKeySignature", title: "publicKeySignature" },
        { id: "publicKeyTrapdoor", title: "publicKeyTrapdoor" },
      ],
    });

    try {
      await Promise.all([
        publicVotersKeys.writeRecords(voters),
        ersVoters.writeRecords(voters),
      ]);
    } catch (e) {
      res.status(500).json({
        message: "Unable to generate CSV files",
        error: e,
      });

      return;
    }

    console.log("Generated CSV files");

    const getParams = (teller: number): string[] =>
      <string[]>[
        homeDir,
        `${projDir}/vmv-1.1.1.jar`,
        `${homeDir}/.ssh/id_ed25519`,
        "localhost",
        "expect",
        electionName,
        numberOfTellers,
        teller,
        "127.0.0.1",
        8080 + teller,
        4040 + teller,
        numberOfVoters,
      ];

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
        const dir = `${homeDir}/elections/${electionName}`;
        const [associatedVoters, publicVoteOptions] = await Promise.all([
          csv().fromFile(`${dir}/ers-associated-voters.csv`),
          csv().fromFile(`${dir}/public-vote-options.csv`),
        ]);

        const newVoters = associatedVoters.map(
          ({ beta, id: voterId, encryptedTrackerNumberInGroup }) =>
            Voter.updateOne(
              { electionName, voterId },
              { beta, encryptedTrackerNumberInGroup }
            ).exec()
        );

        await Promise.all([
          ...newVoters,
          Election.updateOne(
            { name: electionName },
            { voteOptions: publicVoteOptions }
          ).exec(),
        ]);

        console.log("Post-Voter Keys done");
      }
    };

    for (let i = 1; i <= 4; i++) {
      const params = getParams(i);

      const vmv = spawn(
        `${projDir}/election_init_post_voters_keys.exp`,
        params
      );

      vmv.stdout.on("data", (data: string) => stdoutFunc(data, i));

      vmv.stderr.on("data", (data: string) => stderrFunc(data, i));

      vmv.on("close", (code: number) => closeFunc(code, i));
    }

    res.status(200).send(voters);
  }
);

router.delete("/clear", async (req, res) => {
  await Voter.deleteMany();
  await Election.deleteMany();

  res.sendStatus(200);
});

export default router;
