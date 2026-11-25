import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Each test worker gets its own throwaway data directory and in-memory database.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "readyline-test-"));
process.env.DATA_DIR = dir;
process.env.READYLINE_DB = ":memory:";
process.env.READYLINE_TEST = "1";
process.env.APP_URL = "http://localhost:3000";
process.env.TRUST_PROXY_HOPS = "1";
