import { rm } from "node:fs/promises";
import { resolve } from "node:path";

// Only the generator's output folder; source files are never removed.
await rm(resolve("_site"), { recursive: true, force: true });

