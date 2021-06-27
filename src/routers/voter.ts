import express from "express";

import { Election } from "../model/election";
import { Voter } from "../model/voter";

const router = express.Router();

router.post("/uploadKeys", async (req, res) => {
  const {
    electionName,
    voterId,
    publicKeySignature,
    publicKeyTrapdoor,
  } = req.body;

  const election = await Election.findOne({ name: electionName }).exec();

  if (!election) {
    res.status(500).send("Election does not exist");
    return;
  }

  const voter = await Voter.create({
    voterId,
    publicKeySignature,
    publicKeyTrapdoor,
    election,
  });

  election.voters.push(voter);
  await election.save();

  res.sendStatus(201);
});

export default router;
