import mongoose, { Schema } from "mongoose";

const encryptProofSchema = new Schema({
  c1Bar: String,
  c1R: String,
  c2Bar: String,
  c2R: String,
});

const voterSchema = new Schema(
  {
    deviceId: {
      type: String,
      required: true,
    },
    voterId: {
      type: Number,
      required: true,
    },
    electionName: {
      type: String,
      required: true,
    },
    publicKeySignature: String,
    publicKeyTrapdoor: String,
    beta: String,
    encryptedTrackerNumberInGroup: String,
    encryptedVote: String,
    encryptedVoteSignature: String,
    encryptProof: encryptProofSchema,
    alpha: String,
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export default mongoose.model("Voter", voterSchema);
