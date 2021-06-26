import express from "express";

const fs = require("fs");
const { spawn } = require("child_process");

const homeDir = require("os").homedir();

const projDir = `${homeDir}/vmv-android-server`;

const router = express.Router();

router.post("/init", async (req, res) => {
  const { election } = req.body;

  fs.mkdirSync(`${homeDir}/elections/${election}`);

  const getParams = (teller: number) => {
    const params = [
      homeDir,
      `${projDir}/vmv-1.1.1.jar`,
      `${homeDir}/.ssh/id_ed25519`,
      "localhost",
      "expect",
      election,
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

  const closeFunc = (code: number, i: number) => {
    console.log(`Teller ${i} exited with code ${code}`);

    numTellersDone++;

    if (numTellersDone >= 4) {
      res.sendStatus(200);
    }
  };

  for (let i = 1; i <= 4; i++) {
    const params = getParams(i);

    const vmv = spawn(`${projDir}/election_initialisation.exp`, params);

    vmv.stdout.on("data", (data: string) => {
      console.log(`Teller ${i} stdout: ${data}`);
    });

    vmv.stderr.on("data", (data: string) => {
      console.error(`Teller ${i} stderr: ${data}`);
    });

    vmv.on("close", (code: number) => closeFunc(code, i));
  }
});

export default router;
