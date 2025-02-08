import { Ctx } from "../..";
import { bindMethods } from "@shared/util";
import { useObjectStorage } from "../../util/objectStorage";
import { sign, verify } from "hono/jwt";
import { JWTPayload } from "hono/utils/jwt/types";
import { BadRequestError, ForbiddenError } from "../../util/errors";
import { usePageService } from "../pages/pages.service";

export const pastePrefix = "paste_";

type SignaturePayload = JWTPayload & {
  key: string;
  type: "download" | "upload";
};

export function useObjectsService(env: Ctx["Bindings"]) {
  const { setPasteMeta } = usePageService(env);
  const { streamObject, uploadObject, removeObject } = useObjectStorage(env);
  const signingSecret = env.OBJECT_STORAGE_SIGNING_SECRET;
  return bindMethods({
    async getSignedLink(key: string, ttl: number, type: "download" | "upload") {
      const now = Date.now() / 1000;
      const signature = await sign(
        {
          key,
          type,
          exp: now + ttl,
        } as JWTPayload,
        signingSecret,
        "HS256"
      );
      const protocol = env.DEV ? "http" : "https";
      return `${protocol}://${env.HOSTNAME}/objects/${key}?signature=${signature}`;
    },
    async download(pageId: string, signature: string | null) {
      if (signature !== null) {
        const { key, type } = (await verify(signature, signingSecret, "HS256")) as SignaturePayload;
        if (key !== pageId) throw new ForbiddenError("Invalid signature, key mismatch");
        if (type !== "download") throw new ForbiddenError("Invalid signature, type mismatch");
      }
      return await streamObject(pastePrefix + pageId);
    },
    async upload(pageId: string, signature: string | null, file: File) {
      if (signature !== null) {
        const { key, type } = (await verify(signature, signingSecret, "HS256")) as SignaturePayload;
        if (key !== pageId) throw new ForbiddenError("Invalid signature, key mismatch");
        if (type !== "upload") throw new ForbiddenError("Invalid signature, type mismatch");
        if (file.size > env.MAX_FILE_SIZE) throw new BadRequestError("File too large, max size is 100MB");
      }
      //TODO: verify mimetype
      const [_, uploadedBytes] = await Promise.all([
        setPasteMeta(pageId, {
          size: file.size,
          mimetype: file.type,
          fileName: file.name,
        }),
        uploadObject(pastePrefix + pageId, file.stream(), {
          contentType: file.type,
          contentDisposition: `attachment; filename="${file.name}"`,
        }),
      ]);
      return {
        size: uploadedBytes,
        mimetype: file.type,
        fileName: file.name,
      };
    },
    async remove(...pageIds: string[]) {
      await removeObject(...pageIds.map((pageId) => pastePrefix + pageId));
    },
  });
}
