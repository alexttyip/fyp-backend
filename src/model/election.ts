import mongoose, { Schema } from "mongoose";

const electionSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
  },
  g: String,
  j: String,
  l: String,
  m: String,
  p: String,
  q: String,
  numberOfTellers: Number,
  thresholdTellers: Number,
  voters: [
    {
      type: Schema.Types.ObjectId,
      ref: "Voter",
    },
  ],
});

export const Election = mongoose.model("Election", electionSchema);
