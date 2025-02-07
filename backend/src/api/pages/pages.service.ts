import { Context } from "hono";
import { Ctx } from "../..";
import { bindMethods } from "../../util/js";
import { useDb } from "../../db";
import {
  emailPageDataDBSchema,
  emailPageDataSelectSchema,
  GenericPage,
  InsertPage,
  InsertPageData,
  Page,
  PageData,
  pageDBSchema,
  pageIdPrefix,
  pageSelectSchema,
  PageType,
  pageTypes,
  pastePageDataDBSchema,
  pastePageDataSelectSchema,
  redirectPageDataDBSchema,
  redirectPageDataSelectSchema,
} from "./pages.db";
import { and, count, eq, inArray, sql, SQLWrapper } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "../../util/errors";
import { array as badwords } from "badwords-list";
import { randomString } from "../../util/crypto";
import { pastePrefix, useObjectsService } from "../objects/objects.service";
import { drizzle } from "drizzle-orm/d1";

const forbiddenPaths: string[] = [];

export function usePageService(env: Ctx["Bindings"]) {
  const db = useDb(env);
  return bindMethods({
    async getPages(options: {
      filter: {
        id?: string;
        path?: string;
        type?: PageType;
        ownerId?: string;
      };
      pagination: {
        offset?: number;
        limit?: number;
      };
    }): Promise<{
      total: number;
      offset: number;
      limit: number;
      data: GenericPage[];
    }> {
      const {
        filter: { id, path, type, ownerId },
        pagination: { offset = 0, limit = 100 },
      } = options;
      const where: SQLWrapper[] = [];
      if (id) where.push(eq(pageDBSchema.id, id));
      if (path) where.push(eq(pageDBSchema.path, path));
      if (type) where.push(eq(pageDBSchema.type, pageTypes.indexOf(type)));
      if (ownerId) where.push(eq(pageDBSchema.ownerId, ownerId));
      //ttl
      where.push(sql`${pageDBSchema.expires} IS NULL OR ${pageDBSchema.expires} > ${Date.now()}`);
      const [{ total }] = await db
        .select({ total: count(pageDBSchema.id) })
        .from(pageDBSchema)
        .where(and(...where))
        .execute();
      const result = await db
        .select()
        .from(pageDBSchema)
        .where(and(...where))
        .leftJoin(emailPageDataDBSchema, eq(emailPageDataDBSchema.pageId, pageDBSchema.id))
        .leftJoin(pastePageDataDBSchema, eq(pastePageDataDBSchema.pageId, pageDBSchema.id))
        .leftJoin(redirectPageDataDBSchema, eq(redirectPageDataDBSchema.pageId, pageDBSchema.id))
        .offset(offset)
        .limit(limit)
        .execute();
      if (result.length === 0) throw new NotFoundError("No results");
      const parsedAndCombined: GenericPage[] = await Promise.all(
        result.map(async ({ pages, email_page_data, paste_page_data, redirect_page_data }) => {
          const [parsedPage, parsedEmail, parsedPaste, parsedRedirect] = await Promise.allSettled([
            pageSelectSchema.parseAsync(pages),
            email_page_data ? emailPageDataSelectSchema.parseAsync(email_page_data) : Promise.resolve(null),
            paste_page_data ? pastePageDataSelectSchema.parseAsync(paste_page_data) : Promise.resolve(null),
            redirect_page_data ? redirectPageDataSelectSchema.parseAsync(redirect_page_data) : Promise.resolve(null),
          ] as const);
          if (parsedPage.status === "rejected") throw parsedPage.reason;
          switch (parsedPage.value.type) {
            case "email":
              if (parsedEmail.status === "rejected") throw parsedEmail.reason;
              return {
                ...parsedPage.value,
                data: parsedEmail.value,
              } as Page<"email">;
            case "paste":
              if (parsedPaste.status === "rejected") throw parsedPaste.reason;
              const data = parsedPaste.value ?? ({} as PageData<"paste">);
              const { getSignedLink } = useObjectsService(env);
              data.uploadUrl = await getSignedLink(parsedPage.value.id, 1 * 60 * 60 * 1000, "upload"); // 1 hour
              return {
                ...parsedPage.value,
                data,
              } as Page<"paste">;
            case "redirect":
              if (parsedRedirect.status === "rejected") throw parsedRedirect.reason;
              return {
                ...parsedPage.value,
                data: parsedRedirect.value,
              } as Page<"redirect">;
            case "chat":
              return parsedPage.value as Page<"chat">;
          }
        })
      );
      return {
        total,
        offset,
        limit,
        data: parsedAndCombined,
      };
    },
    async checkPathAvailability(...paths: string[]) {
      const notAvailable: string[] = [];
      for (const path of paths) {
        if (forbiddenPaths.includes(path) || badwords.includes(path)) {
          notAvailable.push(path);
          continue;
        }
      }
      const existing = await db
        .select()
        .from(pageDBSchema)
        .where(
          and(
            inArray(pageDBSchema.path, paths),
            sql`${pageDBSchema.expires} IS NULL OR ${pageDBSchema.expires} > ${Date.now()}`
          )
        )
        .execute();
      notAvailable.push(...existing.map((e) => e.path));
      const available = paths.filter((p) => !notAvailable.includes(p));
      return available;
    },
    async randomPath(): Promise<string> {
      //generate 20 random paths at a time with increasing length on every iteration
      //check if any of them are available and pick the first one that is
      for (let i = 1; i < 10; i++) {
        const paths = Array.from({ length: 20 }, (_, j) => randomString(i));
        const available = await this.checkPathAvailability(...paths);
        if (available.length > 0) return available[0];
      }
      throw new Error("Failed to generate random path after 10 iterations");
    },
    async checkLocalPartAvailability(...localParts: string[]) {
      const existing = await db
        .select()
        .from(emailPageDataDBSchema)
        .innerJoin(pageDBSchema, eq(pageDBSchema.id, emailPageDataDBSchema.pageId))
        .where(
          and(
            inArray(emailPageDataDBSchema.localPart, localParts),
            sql`${pageDBSchema.expires} IS NULL OR ${pageDBSchema.expires} > ${Date.now()}`
          )
        )
        .execute();
      const notAvailable = existing.map(({ email_page_data: { localPart } }) => localPart);
      const available = localParts.filter((p) => !notAvailable.includes(p));
      return available;
    },
    async randomLocalPart(): Promise<string> {
      //generate 20 random paths at a time with increasing length on every iteration
      //check if any of them are available and pick the first one that is
      for (let i = 1; i < 10; i++) {
        const localParts = Array.from({ length: 20 }, (_, j) => randomString(i));
        const available = await this.checkLocalPartAvailability(...localParts);
        if (available.length > 0) return available[0];
      }
      throw new Error("Failed to generate random path after 10 iterations");
    },
    async createPage<T extends PageType>(type: T, data: InsertPage<T>, ownerId: string) {
      if (data.path) {
        if (!(await this.checkPathAvailability(data.path))?.length) {
          throw new BadRequestError("Path not available");
        }
      } else {
        data.path = await this.randomPath();
      }
      const id = `${pageIdPrefix}${crypto.randomUUID()}`;
      const [newPage] = await db
        .insert(pageDBSchema)
        .values({
          id,
          created: new Date(),
          ownerId,
          name: data.name,
          path: data.path,
          type: pageTypes.indexOf(type),
          views: 0,
          expires: data.ttl ? new Date(Date.now() + data.ttl * 1000) : null,
          updated: null,
        } as typeof pageDBSchema.$inferInsert)
        .returning()
        .execute();
      if (!newPage) {
        console.error("Failed to create page");
        throw new Error("Failed to create page");
      }
      let pageData: PageData<T> | undefined = undefined;
      try {
        if (type === "paste") {
          const [newPastePageData] = await db
            .insert(pastePageDataDBSchema)
            .values({
              pageId: id,
              size: 0,
              mimetype: null,
            })
            .returning()
            .execute();
          if (!newPastePageData) {
            throw new Error("Failed to create paste page data");
          }
          if (!(data.data as InsertPageData<"paste">)?.direct) {
            const { getSignedLink } = useObjectsService(env);
            const uploadUrl = await getSignedLink(id, 1 * 60 * 60 * 1000, "upload"); // 1 hour
            pageData = (await pastePageDataSelectSchema.parseAsync({
              ...newPastePageData,
              uploadUrl,
            })) as PageData<T>;
          } else {
            pageData = (await pastePageDataSelectSchema.parseAsync(newPastePageData)) as PageData<T>;
          }
        } else if (type === "email") {
          let localPart = (data.data as InsertPageData<"email">).localPart;
          if (localPart) {
            if (!(await this.checkLocalPartAvailability(localPart))?.length) {
              throw new BadRequestError("Local part not available");
            }
          } else {
            localPart = await this.randomLocalPart();
          }
          const [newEmailPageData] = await db
            .insert(emailPageDataDBSchema)
            .values({
              pageId: id,
              localPart,
            })
            .returning()
            .execute();
          if (!newEmailPageData) {
            throw new Error("Failed to create email page data");
          }
          pageData = (await emailPageDataSelectSchema.parseAsync(newEmailPageData)) as PageData<T>;
        } else if (type === "redirect") {
          const additionalRedirectData = data.data as InsertPageData<"redirect">;
          if (!additionalRedirectData.targetUrl) {
            throw new Error("Missing target url");
          }
          const [newRedirectPageData] = await db
            .insert(redirectPageDataDBSchema)
            .values({
              pageId: id,
              url: additionalRedirectData.targetUrl,
              iframe: !!additionalRedirectData?.iframed,
            })
            .returning()
            .execute();
          if (!newRedirectPageData) {
            throw new Error("Failed to create redirect page data");
          }
          pageData = (await redirectPageDataSelectSchema.parseAsync(newRedirectPageData)) as PageData<T>;
        } else if (type === "chat") {
        } else {
          throw new Error("Invalid page type");
        }
      } catch {
        //rollback
        await db.delete(pageDBSchema).where(eq(pageDBSchema.id, id)).execute();
        throw new Error("Failed to create page data");
      }
      return {
        ...(await pageSelectSchema.parseAsync(newPage)),
        data: pageData,
      };
    },
    async deletePage(filter: { ownerId?: string; id?: string; path?: string }) {
      const { ownerId, id, path } = filter;
      if (!id && !path) {
        throw new BadRequestError("Either provide id or path");
      }
      const where: SQLWrapper[] = [];
      if (id) where.push(eq(pageDBSchema.id, id));
      if (path) where.push(eq(pageDBSchema.path, path));
      if (ownerId) where.push(eq(pageDBSchema.ownerId, ownerId));
      const toBeDeleted = await db
        .select()
        .from(pageDBSchema)
        .where(and(...where))
        .execute();
      const { success, error } = await db
        .delete(pageDBSchema)
        .where(and(...where))
        .execute();
      if (!success) {
        console.error("Failed to delete page", error);
        throw new Error("Failed to delete page");
      }
      //TODO: delete any associated chat instances etx
      const { remove } = useObjectsService(env);
      try {
        await remove(...toBeDeleted.map(({ id }) => id));
      } catch {}
    },
    async setPasteMeta(
      id: string,
      meta: {
        size?: number;
        mimetype?: string;
        fileName?: string;
      }
    ) {
      const { size, mimetype } = meta;
      const updated = await db
        .update(pastePageDataDBSchema)
        .set({
          size,
          mimetype,
          fileName: meta.fileName,
        })
        .where(eq(pastePageDataDBSchema.pageId, id))
        .returning();
      if (!updated) {
        throw new NotFoundError();
      }
      return updated;
    },
    async registerView(id: string) {
      const updated = await db
        .update(pageDBSchema)
        .set({
          views: sql`${pageDBSchema.views} + 1`,
        })
        .where(eq(pageDBSchema.id, id))
        .returning();
      if (!updated) {
        throw new NotFoundError();
      }
      return updated;
    },
  });
}

export async function cleanup(env: Env) {
  const db = drizzle(env.KILO_ZONE_DB);
  const toBeDeleted = await db
    .select()
    .from(pageDBSchema)
    .where(sql`${pageDBSchema.expires} < ${Date.now()}`);
  const ids = toBeDeleted.map(({ id }) => id);
  await env.KILO_ZONE_OBJECT_STORAGE.delete(ids.map((id) => pastePrefix + id));
  return await db.delete(pageDBSchema).where(inArray(pageDBSchema.id, ids));
}
