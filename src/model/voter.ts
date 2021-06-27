import mongoose, { Schema } from "mongoose";

const voterSchema = new mongoose.Schema({
  voterId: Number,
  election: {
    type: Schema.Types.ObjectId,
    ref: "Election",
  },
  publicKeySignature: String,
  publicKeyTrapdoor: String,
});

export default mongoose.model("Voter", voterSchema);
