import mongoose, { Schema } from "mongoose";

const electionSchema = new Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },
    numberOfVoters: {
      type: Number,
      required: true,
    },
    g: String,
    j: String,
    l: String,
    m: String,
    p: String,
    q: String,
    numberOfTellers: Number,
    thresholdTellers: Number,
    electionPublicKey: String,
    voteOptions: [
      {
        option: String,
        optionNumberInGroup: String,
      },
    ],
    trackerNumbers: [
      {
        encryptedTrackerNumberInGroup: String,
        trackerNumber: String,
        trackerNumberInGroup: String,
      },
    ],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export default mongoose.model("Election", electionSchema);
