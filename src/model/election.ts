import mongoose from "mongoose";

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
});

export const Election = mongoose.model("Election", electionSchema);
