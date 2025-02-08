import { z } from "zod";
import {
  ScalarTypeMatch,
  AssertDeepTypeMatch,
  DeepObjectTypeMatch,
  SBasePage,
  SPageType,
  SPastePage,
  SChatPage,
  SEmailPage,
  SPage,
  SRedirectPage,
  SBasePageInput,
  SPastePageInput,
  SChatPageInput,
  SEmailPageInput,
  SRedirectPageInput,
  SPageInput,
  ShallowObjectTypeMatch,
} from "@shared/types";
import {
  pageTypes,
  pageSelectSchema,
  pageInsertSchema,
  pastePageDataSelectSchema,
  pastePageDataInsertSchema,
  redirectPageDataSelectSchema,
  redirectPageDataInsertSchema,
  emailPageDataSelectSchema,
  emailPageDataInsertSchema,
} from "./pages.db";

export type PageType = ScalarTypeMatch<SPageType, (typeof pageTypes)[number]>;

export type BasePage = ShallowObjectTypeMatch<SBasePage, Omit<z.infer<typeof pageSelectSchema>, "type">>;

export type BasePageInput = ScalarTypeMatch<SBasePageInput, z.infer<typeof pageInsertSchema>>;

export type PastePage = AssertDeepTypeMatch<
  SPastePage,
  BasePage & {
    type: ScalarTypeMatch<PageType, "paste">;
    data: z.infer<typeof pastePageDataSelectSchema>;
  }
>;

export type PastePageInput = AssertDeepTypeMatch<
  SPastePageInput,
  BasePageInput & {
    type: ScalarTypeMatch<SPageType, "paste">;
    data: z.infer<typeof pastePageDataInsertSchema>;
  }
>;

export type ChatPage = AssertDeepTypeMatch<
  SChatPage,
  BasePage & {
    type: ScalarTypeMatch<PageType, "chat">;
    data: undefined;
  }
>;

export type ChatPageInput = AssertDeepTypeMatch<
  SChatPageInput,
  BasePageInput & {
    type: ScalarTypeMatch<SPageType, "chat">;
    data: undefined;
  }
>;

export type RedirectPage = AssertDeepTypeMatch<
  SRedirectPage,
  BasePage & {
    type: ScalarTypeMatch<PageType, "redirect">;
    data: z.infer<typeof redirectPageDataSelectSchema>;
  }
>;

export type RedirectPageInput = AssertDeepTypeMatch<
  SRedirectPageInput,
  BasePageInput & {
    type: ScalarTypeMatch<SPageType, "redirect">;
    data: z.infer<typeof redirectPageDataInsertSchema>;
  }
>;

export type EmailPage = AssertDeepTypeMatch<
  SEmailPage,
  BasePage & {
    type: ScalarTypeMatch<PageType, "email">;
    data: z.infer<typeof emailPageDataSelectSchema>;
  }
>;

export type EmailPageInput = AssertDeepTypeMatch<
  SEmailPageInput,
  BasePageInput & {
    type: ScalarTypeMatch<SPageType, "email">;
    data: z.infer<typeof emailPageDataInsertSchema>;
  }
>;

export type Page<T extends PageType> = AssertDeepTypeMatch<
  SPage,
  T extends "paste"
    ? PastePage
    : T extends "email"
    ? EmailPage
    : T extends "redirect"
    ? RedirectPage
    : T extends "chat"
    ? ChatPage
    : never
>;

export type PageInput<T extends PageType> = AssertDeepTypeMatch<
  SPageInput,
  T extends "paste"
    ? PastePageInput
    : T extends "email"
    ? EmailPageInput
    : T extends "redirect"
    ? RedirectPageInput
    : T extends "chat"
    ? ChatPageInput
    : never
>;

export type GenericPage = Page<"chat" | "paste" | "email" | "redirect">;
