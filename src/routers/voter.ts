import express from "express";
import { body, param, validationResult } from "express-validator";

import { Election, Voter } from "../model";

const router = express.Router();

interface UploadKeysReqBody {
  electionName: string;
  publicKeySignature: string;
  publicKeyTrapdoor: string;
  deviceId: string;
}

router.get(
  "/getElectionParams/:electionName",
  param("electionName").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { electionName } = req.params as any;

    try {
      const election = await Election.findOne({ name: electionName }).exec();

      if (!election) {
        res.status(400).send("Election does not exist");
        return;
      }

      const { g, p, q, electionPublicKey } = election;
      res.status(200).json({
        g,
        p,
        q,
        electionPublicKey,
      });
    } catch (e) {
      res.status(500).json(e);
    }
  }
);

/**
 * Voter upload their generated keys
 */
router.post(
  "/uploadKeys",
  body("electionName").notEmpty(),
  body("publicKeySignature").notEmpty(),
  body("publicKeyTrapdoor").notEmpty(),
  body("deviceId").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      electionName,
      publicKeySignature,
      publicKeyTrapdoor,
      deviceId,
    }: UploadKeysReqBody = req.body;

    if (!(await Election.exists({ name: electionName }))) {
      res.status(500).send("Election does not exist");
      return;
    }

    // Assign voterId depending on number of existing voters.
    // 1-based
    const voterId = (await Voter.countDocuments({ electionName }).exec()) + 1;

    try {
      await Voter.create({
        electionName,
        publicKeySignature,
        publicKeyTrapdoor,
        deviceId,
        voterId,
      });

      res.sendStatus(201);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  }
);

/**
 * Voter get beta and encryptedTrackerNumberInGroup
 */
router.post(
  "/getVoterParams",
  body("electionName").notEmpty(),
  body("deviceId").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { electionName, deviceId } = req.body;

    try {
      const { beta, encryptedTrackerNumberInGroup } = await Voter.findOne(
        { electionName, deviceId },
        ["beta", "encryptedTrackerNumberInGroup"]
      ).exec();

      res.status(200).json({ beta, encryptedTrackerNumberInGroup });
    } catch (e) {
      console.error(e);
      res.status(500).json(e);
    }
  }
);

export default router;
