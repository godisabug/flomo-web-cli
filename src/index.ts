#!/usr/bin/env node

import { runCli } from "./cli/run.js";
import { isNodeVersionDeprecated, NEXT_MINIMUM_NODE_VERSION } from "./utils/nodeSupport.js";

// Only warn interactive users; scripts and --json consumers read stderr.
if (process.stderr.isTTY && isNodeVersionDeprecated()) {
  process.stderr.write(
    `提示：Node.js ${process.versions.node} 已停止维护。flomo-web-cli 0.3.0 起需要 Node.js ${NEXT_MINIMUM_NODE_VERSION} 或更高版本，请尽快升级 Node.js，或安装 flomo-web-cli@0.2 继续使用当前版本。\n`
  );
}

const exitCode = await runCli(process.argv);
process.exitCode = exitCode;
