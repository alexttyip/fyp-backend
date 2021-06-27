// import express from "express";
// import formidable from "formidable";
//
// import { electionExists, get } from "../db";
//
// const router = express.Router();
//
// const PUBLIC_VOTERS_KEYS = "public-voters-keys";
//
// router.post("/keys", async (req, res) => {
//   const form = formidable.formidable();
//
//   form.parse(req, async (err, fields) => {
//     const { election, voterId, publicKeySignature, publicKeyTrapdoor } = fields;
//
//     try {
//       if (!(await electionExists(election as string))) {
//         res.status(500).json({ error: "Election does not exist." });
//         return;
//       }
//
//       const db = get();
//
//       if (!db) {
//         res.status(500).json({ error: "Cannot get MongoDB DB." });
//
//         return;
//       }
//
//       const voterKeys = db.collection(PUBLIC_VOTERS_KEYS);
//
//       const myDoc = await voterKeys.findOne({ voterId });
//
//       if (myDoc) {
//         res.status(500).json({ error: "Keys exist." });
//         return;
//       }
//
//       const newKeys = {
//         election,
//         voterId,
//         publicKeySignature,
//         publicKeyTrapdoor,
//       };
//
//       const result = await voterKeys.insertOne(newKeys);
//
//       console.log(`Inserted ${result.insertedCount} docs`);
//
//       res.status(200).json({ OK: `Inserted ${result.insertedCount} docs` });
//     } catch (e) {
//       console.log(e);
//
//       res.sendStatus(500);
//     }
//   });
// });
//
// export default router;
