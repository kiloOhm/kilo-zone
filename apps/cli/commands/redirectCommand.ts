import { z } from "zod";
import { apiClient } from "..";
import type { ActionDefinition } from "../util/args";
import { useAuth } from "../util/auth";

const { init, checkAuth, state: authState } = useAuth();

export const redirectCommand: ActionDefinition = {
  name: "redirect",
  short: "r",
  description: "Create a redirect page",
  args: [
    {
      name: "name",
      short: "n",
      valueDescription: "Name",
      valueType: "string",
      required: true,
    },
    {
      name: "path",
      short: "p",
      valueDescription: "Path",
      valueType: "string",
      required: false,
    },
    {
      name: "ttl",
      short: "t",
      valueDescription: "Time to live",
      valueType: "duration",
      required: false,
    },
    {
      name: "targetUrl",
      short: "url",
      valueDescription: "target url",
      valueType: "string",
      required: true,
    },
    {
      name: "iframe",
      short: "i",
      valueDescription: "if target url is loaded in iFrame",
      valueType: "flag",
      required: false,
    },
  ],
  handler: [
    init,
    checkAuth,
    async ({ args }) => {
      const name = z.string().parse(args.get("name"));
      const path = z.string().parse(args.get("path"));
      const ttl = z.number().optional().parse(args.get("ttl"));
      const targetUrl = z.string().url().parse(args.get("targetUrl"));
      const iframe = z.boolean().parse(args.get("iframe"));
      const {} = await apiClient.pages.redirect.$post(
        {
          json: {
            type: "redirect",
            data: {
              iframed: iframe,
              targetUrl,
            },
            name,
            path,
            ttl: ttl ? ttl / 1000 : undefined,
          },
        },
        { headers: { Authorization: `Bearer ${authState.accessToken}` } }
      );
    },
  ],
};
