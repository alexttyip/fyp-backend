import mongoose, { Schema } from "mongoose";

interface VoterInterface extends mongoose.Document {
  deviceId: string;
  voterId: number;
  electionName: string;
  publicKeySignature: string;
  publicKeyTrapdoor: string;
  beta: string;
  encryptedTrackerNumberInGroup: string;
}

const voterSchema = new Schema<VoterInterface>(
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
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export default mongoose.model("Voter", voterSchema);
