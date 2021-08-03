import { spawn } from "child_process";
import { createObjectCsvWriter } from "csv-writer";
import csv from "csvtojson";
import express, { Request } from "express";
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
  numVoters: number;
  voteOptions: string[];
}

interface CheckNumVoterResult {
  error: string;
  electionName: string;
  election: any;
  voters: any[];
}

const checkNumVoters = async (req: Request): Promise<CheckNumVoterResult> => {
  const result: CheckNumVoterResult = {
    error: "",
    electionName: "",
    election: {},
    voters: [],
  };

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    result.error = JSON.stringify({ errors: errors.array() });
    return result;
  }

  const { electionName }: { electionName: string } = req.body;

  // Generate CSV files
  const [election, voters] = await Promise.all([
    Election.findOne({ name: electionName }).exec(),
    Voter.find({ electionName }).sort("voterId").exec(),
  ]);

  const { numberOfVoters } = election;

  if (voters.length < numberOfVoters) {
    result.error = "Not all voters are registered";
    return result;
  }

  if (voters.length > numberOfVoters) {
    result.error = "Too many voters";
    return result;
  }

  return { error: "", electionName, election, voters };
};

/**
 * Initialisation of VMV Election
 */
router.post(
  "/init",
  body("electionName").notEmpty(),
  body("numberOfTellers").isInt(),
  body("thresholdTellers").isInt(),
  body("numVoters").isInt(),
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
      numVoters,
      voteOptions,
    }: InitReqBody = req.body;

    if (await Election.exists({ name: electionName })) {
      res.status(400).send("Election exists");
      return;
    }

    try {
      fs.mkdirSync(`${homeDir}/elections/${electionName}`);
    } catch (e) {
      res.status(500).send(e);
      return;
    }

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
        return <string[]>[...params, numVoters];
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
          numberOfVoters: numVoters,
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
  async (req: Request, res) => {
    const {
      error,
      electionName,
      election: { numberOfTellers, numberOfVoters },
      voters,
    } = await checkNumVoters(req);

    if (error) {
      res.status(400).send(error);
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
        const [associatedVoters, publicVoteOptions, trackerNumbers] =
          await Promise.all([
            csv().fromFile(`${dir}/ers-associated-voters.csv`),
            csv().fromFile(`${dir}/public-vote-options.csv`),
            csv().fromFile(`${dir}/public-tracker-numbers.csv`),
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
            {
              voteOptions: publicVoteOptions,
              trackerNumbers,
            }
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

    res.sendStatus(200);
  }
);

router.post(
  "/encryptVotes",
  body("electionName").notEmpty(),
  async (req: Request, res) => {
    const {
      error,
      electionName,
      election: { numberOfTellers },
      voters,
    } = await checkNumVoters(req);

    if (error) {
      res.status(400).send(error);
      return;
    }

    const { proofs, allVoted } = voters.reduce(
      (acc: any, curr: any) => {
        if (!acc.allVoted) return acc;

        const proof = curr.encryptProof.toObject();

        acc.proofs.push({
          ...proof,
          encryptedVoteSignature: curr.encryptedVoteSignature,
        });
        acc.allVoted &&=
          curr.encryptedVote && curr.encryptedVoteSignature && proof;

        return acc;
      },
      { proofs: [], allVoted: true }
    );

    if (!allVoted) {
      res.status(400).send("Not all voters voted");
      return;
    }

    // Generate ers-plaintext-voters.csv
    const ersPlaintextVoters = createObjectCsvWriter({
      path: `${homeDir}/elections/${electionName}/ers-plaintext-voters.csv`,
      header: [
        { id: "beta", title: "beta" },
        { id: "encryptedVote", title: "encryptedVote" },
        { id: "encryptedVoteSignature", title: "encryptedVoteSignature" },
        { id: "voterId", title: "id" },
        { id: "plainTextVote", title: "plainTextVote" },
        {
          id: "encryptedTrackerNumberInGroup",
          title: "encryptedTrackerNumberInGroup",
        },
        { id: "publicKeySignature", title: "publicKeySignature" },
        { id: "publicKeyTrapdoor", title: "publicKeyTrapdoor" },
      ],
    });

    // Generate ers-encrypt-proofs.csv
    const ersEncryptProofs = createObjectCsvWriter({
      path: `${homeDir}/elections/${electionName}/ers-encrypt-proofs.csv`,
      header: [
        { id: "c1Bar", title: "c1Bar" },
        { id: "c1R", title: "c1R" },
        { id: "c2Bar", title: "c2Bar" },
        { id: "c2R", title: "c2R" },
        { id: "encryptedVoteSignature", title: "encryptedVoteSignature" },
      ],
    });

    try {
      await Promise.all([
        ersPlaintextVoters.writeRecords(voters),
        ersEncryptProofs.writeRecords(proofs),
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
        `${projDir}/vmv-1.1.1.jar`,
        `${homeDir}/.ssh/id_ed25519`,
        "localhost",
        "expect",
        electionName,
        numberOfTellers,
        teller,
        homeDir,
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
        const encryptedVoters = await csv().fromFile(
          `${dir}/ers-encrypted-voters.csv`
        );

        const newVoters = encryptedVoters.map(({ alpha, id: voterId }) =>
          Voter.updateOne({ electionName, voterId }, { alpha }).exec()
        );

        await Promise.all(newVoters);

        console.log("Encrypt Votes done");
      }
    };

    for (let i = 1; i <= 4; i++) {
      const params = getParams(i);

      const vmv = spawn(`${projDir}/election_encrypt.exp`, params);

      vmv.stdout.on("data", (data: string) => stdoutFunc(data, i));

      vmv.stderr.on("data", (data: string) => stderrFunc(data, i));

      vmv.on("close", (code: number) => closeFunc(code, i));
    }

    res.sendStatus(200);
  }
);

router.delete("/clear", async (req, res) => {
  await Voter.deleteMany();
  await Election.deleteMany();

  res.sendStatus(200);
});

export default router;
