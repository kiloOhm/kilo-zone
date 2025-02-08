import { z } from "zod";
import { server } from "..";
import type { ActionDefinition } from "../util/args";
import { useAuth } from "../util/auth";
import { formatBytes } from "@shared/util";
import type { SPastePage } from "@shared/types";

const { init, checkAuth, state: authState } = useAuth();

export const pasteCommand: ActionDefinition = {
  name: "paste",
  short: "p",
  description: "Create a paste page",
  args: [
    {
      name: "name",
      short: "n",
      valueDescription: "Name",
      valueType: "string",
      required: false,
    },
    {
      name: "path",
      short: "p",
      valueDescription: "Path",
      valueType: "string",
      required: false,
    },
    {
      name: "overwrite",
      short: "o",
      valueDescription: "Overwrite existing page",
      valueType: "flag",
      required: false,
      default: false,
    },
    {
      name: "ttl",
      short: "t",
      valueDescription: "Time to live",
      valueType: "duration",
      required: false,
    },
    {
      name: "file",
      short: "f",
      valueDescription: "File to upload",
      valueType: "string",
      required: true,
    },
  ],
  handler: [
    init,
    checkAuth,
    async ({ args }) => {
      try {
        const name = z.string().optional().parse(args.get("name"));
        const path = z.string().optional().parse(args.get("path"));
        const overwrite = z.boolean().parse(args.get("overwrite"));
        const ttl = z.number().optional().parse(args.get("ttl"));
        const file = z.string().parse(args.get("file"));

        const handle = Bun.file(file);
        if (!(await handle.exists())) {
          throw new Error("File does not exist");
        }
        const fd = new FormData();
        fd.append("type", "paste");
        fd.append("name", name ?? path ?? handle.name ?? "");
        if (path) {
          fd.append("path", path);
        }
        if (ttl) {
          fd.append("ttl", (ttl / 1000).toFixed(0));
        }
        fd.append("file", handle);
        const res = await fetch(`${server}/pages/paste/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authState.accessToken}`,
          },
          body: fd,
        });
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          let errorText = "";
          if (contentType && contentType.startsWith("application/json")) {
            errorText = JSON.stringify(await res.json(), null, 2);
          } else {
            errorText = await res.text();
          }
          throw new Error(`Failed to upload file: ${res.statusText}\n${errorText}`);
        }
        const {
          path: _path,
          data: { size },
        } = (await res.json()) as SPastePage;
        const url = new URL(server);
        url.pathname = `/${_path}`;
        console.log(`Uploaded ${formatBytes(size)}. URL: ${url.toString()}`);
      } catch (e) {
        throw e;
      }
    },
  ],
};
