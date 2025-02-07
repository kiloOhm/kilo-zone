import { sqliteTable, text, int } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
//uuid length
const uuidLength = 36;
export const pageIdPrefix = 'p_';
const idLength = uuidLength + pageIdPrefix.length;

export const pageTypes = ['paste', 'chat', 'redirect', 'email'] as const;
export type PageType = (typeof pageTypes)[number];

export const pageDBSchema = sqliteTable('pages', {
	id: text({ length: idLength }).primaryKey(),
	ownerId: text({ length: 255 }).notNull(),
	name: text({ length: 255 }).notNull(),
	path: text({ length: 32 }).notNull(),
	type: int({ mode: 'number' }).notNull(), // index of pageTypes
	created: int({ mode: 'timestamp_ms' }).notNull(),
	expires: int({ mode: 'timestamp_ms' }),
	views: int({ mode: 'number' }).notNull(),
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

export const emailPageDataDBSchema = sqliteTable('email_page_data', {
	pageId: text({ length: idLength })
		.references(() => pageDBSchema.id, { onDelete: 'cascade' })
		.primaryKey(),
	localPart: text({ length: 255 }).notNull(),
});
export const emailPageDataSelectSchema = createSelectSchema(emailPageDataDBSchema);
export const emailPageDataInsertSchema = z.object({
	localPart: z.string().min(1).max(255).optional(),
});

export const pastePageDataDBSchema = sqliteTable('paste_page_data', {
	pageId: text({ length: idLength })
		.references(() => pageDBSchema.id, { onDelete: 'cascade' })
		.primaryKey(),
	size: int({ mode: 'number' }).notNull(),
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

export const redirectPageDataDBSchema = sqliteTable('redirect_page_data', {
	pageId: text({ length: idLength })
		.references(() => pageDBSchema.id, { onDelete: 'cascade' })
		.primaryKey(),
	url: text({ length: 2048 }).notNull(),
	iframe: int({ mode: 'boolean' }).notNull(),
});
export const redirectPageDataSelectSchema = createSelectSchema(redirectPageDataDBSchema, {
	iframe: (s) => s.transform((v) => !!v),
	url: (s) => s.transform((v) => new URL(v)),
});
export const redirectPageDataInsertSchema = z.object({
	targetUrl: z.string().url().optional(),
	iframed: z.boolean().optional(),
});

export type Page<T extends PageType> = z.infer<typeof pageSelectSchema> & {
	data: PageData<T>;
};

export type PageData<T extends PageType> = T extends 'paste'
	? z.infer<typeof pastePageDataSelectSchema>
	: T extends 'email'
	? z.infer<typeof emailPageDataSelectSchema>
	: T extends 'redirect'
	? z.infer<typeof redirectPageDataSelectSchema>
	: T extends 'chat'
	? undefined
	: unknown;

export type GenericPage = Page<'chat' | 'paste' | 'email' | 'redirect'>;

export type InsertPage<T extends PageType> = z.infer<typeof pageInsertSchema> & {
	data: InsertPageData<T>;
};

export type InsertPageData<T extends PageType> = T extends 'paste'
	? z.infer<typeof pastePageDataInsertSchema>
	: T extends 'email'
	? z.infer<typeof emailPageDataInsertSchema>
	: T extends 'redirect'
	? z.infer<typeof redirectPageDataInsertSchema>
	: T extends 'chat'
	? undefined
	: unknown;
