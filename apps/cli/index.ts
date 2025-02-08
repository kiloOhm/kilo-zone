import { type ServiceType } from "../api/src";
import { hc } from "hono/client";
import { parseArgs, type ActionDefinition } from "./util/args";
import { loginCommand } from "./commands/login";
import { logoutCommand } from "./commands/logout";
import { whoamiCommand } from "./commands/whoami";
import { listCommand } from "./commands/list";
import { removeCommand } from "./commands/remove";
import { pasteCommand } from "./commands/paste";
import { redirectCommand } from "./commands/redirectCommand";
const colorCodes = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
} as const;

const local = false;

export const server = local ? "http://localhost:8787" : "https://api.kilo.zone";

export const apiClient = hc<ServiceType>(server);

const args = process.argv.slice(2);

const actions: ActionDefinition[] = [
  loginCommand,
  logoutCommand,
  whoamiCommand,
  listCommand,
  removeCommand,
  pasteCommand,
  redirectCommand,
];

try {
  await parseArgs(args, actions);
} catch (e) {
  if (e instanceof Error) {
    console.log(colorize(e.message, "red"));
    if (local) {
      console.error(e.stack);
    }
  } else {
    throw e;
  }
  // printUsage(actions);
  process.exit(1);
}

function colorize(str: string, color: keyof typeof colorCodes) {
  return `\x1b[${colorCodes[color]}m${str}\x1b[0m`;
}

function time<T>(action: () => Promise<T>, label?: string): () => Promise<T> {
  label = label ?? action.name;
  return async () => {
    const start = Date.now();
    const result = await action();
    const end = Date.now();
    console.log(`${label} took ${end - start}ms`);
    return result;
  };
}
