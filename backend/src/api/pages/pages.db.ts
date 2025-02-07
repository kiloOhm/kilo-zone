import { sqliteTable, text, int } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { ScalarTypeMatch, SPage } from "../../types";
import { Page, PageType } from "./pages";
//uuid length
const uuidLength = 36;
export const pageIdPrefix = "p_";
const idLength = uuidLength + pageIdPrefix.length;

export const pageTypes = ["paste", "chat", "redirect", "email"] as const;

export const pageDBSchema = sqliteTable("pages", {
  id: text({ length: idLength }).primaryKey(),
  ownerId: text({ length: 255 }).notNull(),
  name: text({ length: 255 }).notNull(),
  path: text({ length: 32 }).notNull(),
  type: int({ mode: "number" }).notNull(), // index of pageTypes
  created: int({ mode: "timestamp_ms" }).notNull(),
  expires: int({ mode: "timestamp_ms" }),
  views: int({ mode: "number" }).notNull(),
});
export const pageSelectSchema = createSelectSchema(pageDBSchema, {
  created: (s) => s.transform((v) => new Date(v)),
  expires: (s) => s.transform((v) => (v ? new Date(v) : null)),
  type: (s) => s.transform((v) => pageTypes[v] as PageType),
});
export const pageInsertSchema = z.object({
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(32).optional(),
  ttl: z.number({ coerce: true }).positive().optional(),
});

export const emailPageDataDBSchema = sqliteTable("email_page_data", {
  pageId: text({ length: idLength })
    .references(() => pageDBSchema.id, { onDelete: "cascade" })
    .primaryKey(),
  localPart: text({ length: 255 }).notNull(),
});
export const emailPageDataSelectSchema = createSelectSchema(emailPageDataDBSchema);
export const emailPageDataInsertSchema = z.object({
  localPart: z.string().min(1).max(255).optional(),
});

export const pastePageDataDBSchema = sqliteTable("paste_page_data", {
  pageId: text({ length: idLength })
    .references(() => pageDBSchema.id, { onDelete: "cascade" })
    .primaryKey(),
  size: int({ mode: "number" }).notNull(),
  mimetype: text({ length: 128 }),
  fileName: text({ length: 255 }),
});
export const pastePageDataSelectSchema = createSelectSchema(pastePageDataDBSchema).merge(
  z.object({
    uploadUrl: z.string().url().optional(),
  })
);
export const pastePageDataInsertSchema = z.object({
  direct: z.boolean().default(false),
  overwrite: z.boolean().optional(),
});

export const redirectPageDataDBSchema = sqliteTable("redirect_page_data", {
  pageId: text({ length: idLength })
    .references(() => pageDBSchema.id, { onDelete: "cascade" })
    .primaryKey(),
  url: text({ length: 2048 }).notNull(),
  iframe: int({ mode: "boolean" }).notNull(),
});
export const redirectPageDataSelectSchema = createSelectSchema(redirectPageDataDBSchema, {
  iframe: (s) => s.transform((v) => !!v),
  url: (s) => s.transform((v) => new URL(v)),
});
export const redirectPageDataInsertSchema = z.object({
  targetUrl: z.string().url().optional(),
  iframed: z.boolean().optional(),
});
