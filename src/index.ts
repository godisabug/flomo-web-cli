#!/usr/bin/env node

import { runCli } from "./cli/run.js";

const exitCode = await runCli(process.argv);
process.exitCode = exitCode;
