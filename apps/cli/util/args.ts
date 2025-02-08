import { z } from "zod";

const actionHandlerSchema = z
  .function()
  .args(
    z.object({
      args: z.map(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      rest: z.array(z.string()),
      context: z.map(z.string(), z.string()),
    })
  )
  .returns(z.union([z.promise(z.any()), z.any()]));

export const actionDefinitionSchema = z.object({
  name: z.string(),
  short: z.string().optional(),
  description: z.string(),
  args: z
    .array(
      z.object({
        name: z.string(),
        short: z.string().optional(),
        valueDescription: z.string(),
        valueType: z.enum(["string", "number", "flag", "duration"]),
        required: z.boolean().optional(),
        default: z.union([z.string(), z.number(), z.boolean()]).optional(),
      })
    )
    .optional(),
  handler: z.union([actionHandlerSchema, z.array(actionHandlerSchema)]),
});

export type ActionDefinition = z.infer<typeof actionDefinitionSchema>;

export async function parseArgs(argv: string[], definitions: ActionDefinition[]) {
  const parsedDefinitions = await z.array(actionDefinitionSchema).parseAsync(definitions);
  if (argv.length === 0) {
    printUsage(parsedDefinitions);
    return;
  }
  const action = parsedDefinitions.find((def) => def.name === argv[0] || def.short === argv[0]);
  if (!action) {
    throw new Error(`Unknown action: ${argv[0]}`);
  }
  const args = argv.slice(1);
  const parsedArgs = new Map<string, string | number | boolean>();
  const rest = [];
  if (action.args) {
    while (args.length > 0) {
      const arg = args.shift();
      if (!arg) {
        break;
      }
      const def = action.args.find((def) => "--" + def.name === arg || (def.short && "-" + def.short === arg));
      if (!def) {
        rest.push(arg);
        continue;
      }
      switch (def.valueType) {
        case "string":
          const value = args.shift();
          if (!value) {
            throw new Error(`Missing value for argument ${arg}`);
          }
          parsedArgs.set(def.name, value);
          break;
        case "number":
          const number = parseInt(args.shift() || "");
          if (isNaN(number)) {
            throw new Error(`Invalid number for argument ${arg}`);
          }
          parsedArgs.set(def.name, number);
          break;
        case "flag":
          parsedArgs.set(def.name, true);
          break;
        case "duration":
          const duration = args.shift();
          if (!duration) {
            throw new Error(`Missing duration for argument ${arg}`);
          }
          const parsedDuration = parseDurationString(duration);
          parsedArgs.set(def.name, parsedDuration);
      }
    }
    // check for required args and set defaults
    for (const def of action.args) {
      if (def.required && !parsedArgs.has(def.name)) {
        throw new Error(`Missing required argument --${def.name}`);
      }
      if (!parsedArgs.has(def.name)) {
        if (def.valueType === "flag") {
          parsedArgs.set(def.name, false);
        } else if (def.default !== undefined) {
          parsedArgs.set(def.name, def.default);
        }
      }
    }
  }
  const context = new Map<string, string>();
  if (action.handler instanceof Array) {
    for (const handler of action.handler) {
      await handler({
        args: parsedArgs,
        rest,
        context,
      });
    }
    return;
  } else {
    await action.handler({
      args: parsedArgs,
      rest,
      context,
    });
  }
}

export function usage(definition: ActionDefinition): string {
  const args = definition.args
    ?.map((def) => {
      let arg = `--${def.name}`;
      if (def.short) {
        arg += ` -${def.short}`;
      }
      arg += ` <${def.valueDescription ?? def.valueType}>`;
      if (def.default !== undefined) {
        arg += ` (default: ${def.default})`;
      }
      if (def.required) {
        arg = `[${arg}]`;
      }
      return arg;
    })
    .join(" ");
  let output = "kz " + definition.name;
  if (args) {
    output += " " + args;
  }
  output += "\n" + definition.description + "\n";
  return output;
}

export function printUsage(definitions: ActionDefinition[]) {
  console.log("Usage:");
  for (const def of definitions) {
    console.log(usage(def));
  }
}

/**
 * Parses a duration string and converts it to milliseconds.
 *
 * The duration string should be in the format of a number followed by a single character
 * representing the time unit. Supported time units are:
 * - `s` for seconds
 * - `m` for minutes
 * - `h` for hours
 * - `d` for days
 * - `w` for weeks
 * - `M` for months (approximated as 30 days)
 * - `y` for years (approximated as 365 days)
 *
 * @param duration - The duration string to parse.
 * @returns The duration in milliseconds.
 * @throws Will throw an error if the duration string is invalid or contains an unsupported time unit.
 */
function parseDurationString(duration: string) {
  const match = duration.match(/^(\d+)([smhdwMy])$/);
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }
  const value = parseInt(match[1]);
  switch (match[2]) {
    case "s":
      return value * 1000; // seconds
    case "m":
      return value * 60 * 1000; // minutes
    case "h":
      return value * 60 * 60 * 1000; // hours
    case "d":
      return value * 24 * 60 * 60 * 1000; // days
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000; // weeks
    case "M":
      return value * 30 * 24 * 60 * 60 * 1000; // months
    case "y":
      return value * 365 * 24 * 60 * 60 * 1000; // years
    default:
      throw new Error(
        `Invalid duration: ${duration}, allowed values are s(econds), m(inutes), h(ours), d(ays), w(eeks), M(onths), y(ears)`
      );
  }
}
