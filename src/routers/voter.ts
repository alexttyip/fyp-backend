import express from "express";
import { body, validationResult } from "express-validator";

import { Election, Voter } from "../model";

const router = express.Router();

interface UploadKeysReqBody {
  electionName: string;
  voterId: number;
  publicKeySignature: string;
  publicKeyTrapdoor: string;
}

/**
 * Voter upload their generated keys
 */
router.post(
  "/uploadKeys",
  body("electionName").notEmpty(),
  body("voterId").notEmpty(),
  body("publicKeySignature").notEmpty(),
  body("publicKeyTrapdoor").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      electionName,
      voterId,
      publicKeySignature,
      publicKeyTrapdoor,
    }: UploadKeysReqBody = req.body;

    if (!(await Election.exists({ name: electionName }))) {
      res.status(500).send("Election does not exist");
      return;
    }

    try {
      await Voter.findOneAndUpdate(
        { electionName, voterId },
        {
          publicKeySignature,
          publicKeyTrapdoor,
        },
        { upsert: true }
      );

      res.sendStatus(201);
    } catch (e) {
      console.error(e);
      res.status(500).send(e);
    }
  }
);

export default router;
