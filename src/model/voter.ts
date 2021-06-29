import mongoose, { Schema } from "mongoose";

interface VoterInterface extends mongoose.Document {
  voterId: number;
  electionName: string;
  publicKeySignature: string;
  publicKeyTrapdoor: string;
}

const voterSchema = new Schema<VoterInterface>(
  {
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
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

voterSchema.methods.isFilled = function (): boolean {
  return !!(this.publicKeySignature && this.publicKeyTrapdoor);
};

export default mongoose.model("Voter", voterSchema);
