export type ScalarTypeMatch<T, U extends T> = T extends U ? (U extends T ? U : never) : never;
export type ShallowObjectTypeMatch<T, U> = keyof T extends keyof U ? U : never;
export type DeepObjectTypeMatch<T, U> = // Ensure `T` does not have extra keys
  ([keyof T] extends [keyof U]
    ? // Ensure `U` does not have extra keys
      [keyof U] extends [keyof T]
      ? {
          [K in keyof T]: K extends keyof U ? DeepObjectTypeMatch<T[K], U[K]> : false;
        }[keyof T] extends false
        ? false
        : true
      : false
    : false) &
    (T extends U ? true : false); // Prevent intersection looseness

export type AssertDeepTypeMatch<T, U> = DeepObjectTypeMatch<T, U> extends false | never ? never : U;

export type SPageType = "paste" | "chat" | "redirect" | "email";

export type SBasePage = {
  path: string;
  name: string;
  id: string;
  ownerId: string;
  created: Date;
  expires: Date | null;
  views: number;
};

export type SBasePageInput = {
  name: string;
  path?: string | undefined;
  ttl?: number | undefined;
};

export type SPastePage = SBasePage & {
  type: ScalarTypeMatch<SPageType, "paste">;
  data: {
    pageId: string;
    size: number;
    mimetype: string | null;
    fileName: string | null;
    uploadUrl?: string | undefined;
    downloadUrl?: string | undefined;
  };
};

export type SPastePageInput = SBasePageInput & {
  type: ScalarTypeMatch<SPageType, "paste">;
  data: {
    direct: boolean;
    overwrite?: boolean | undefined;
  };
};

export type SChatPage = SBasePage & {
  type: ScalarTypeMatch<SPageType, "chat">;
  data: undefined;
};

export type SChatPageInput = SBasePageInput & {
  type: ScalarTypeMatch<SPageType, "chat">;
  data: undefined;
};

export type SRedirectPage = SBasePage & {
  type: ScalarTypeMatch<SPageType, "redirect">;
  data: {
    pageId: string;
    url: URL;
    iframe: boolean;
  };
};

export type SRedirectPageInput = SBasePageInput & {
  type: ScalarTypeMatch<SPageType, "redirect">;
  data: {
    targetUrl?: string | undefined;
    iframed?: boolean | undefined;
  };
};

export type SEmailPage = SBasePage & {
  type: ScalarTypeMatch<SPageType, "email">;
  data: {
    pageId: string;
    localPart: string;
  };
};

export type SEmailPageInput = SBasePageInput & {
  type: ScalarTypeMatch<SPageType, "email">;
  data: {
    localPart?: string | undefined;
  };
};

export type SPage = SPastePage | SChatPage | SRedirectPage | SEmailPage;

export type SPageInput = SPastePageInput | SChatPageInput | SRedirectPageInput | SEmailPageInput;

export interface IRPC {
  getPage(path: string): Promise<SPage | null>;
}
