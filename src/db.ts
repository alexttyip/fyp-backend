import mongodb, { Db, MongoClient } from "mongodb";

const { DB_USER, DB_PW, CLUSTER_URL, DB_NAME } = process.env;

const uri = `mongodb+srv://${DB_USER}:${DB_PW}@${CLUSTER_URL}/${DB_NAME}?retryWrites=true&w=majority`;

interface DbState {
  client: MongoClient | null;
  db: Db | null;
}

const state: DbState = {
  client: new mongodb.MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }),
  db: null,
};

export async function connect() {
  if (state.db) return;

  await state.client?.connect();

  state.db = state.client?.db("vmv") || null;
}

export function get() {
  return state.db;
}

export async function close(done: Function) {
  if (state.db) {
    await state.client?.close();
    state.client = null;
    state.db = null;

    done();
  }
}

export async function electionExists(election: string) {
  const elections = state.db?.collection("elections");

  return elections?.findOne({ name: election });
}
