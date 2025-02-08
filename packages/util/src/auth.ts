import { z } from "zod";
import { JWTPayload } from "hono/utils/jwt/types";

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  id_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const idTokenSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  email: z.string(),
  email_verified: z.boolean(),
  nickname: z.string().optional(),
  name: z.string().optional(),
});
export type IdToken = z.infer<typeof idTokenSchema>;

export const accessTokenSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  scope: z.string(),
});
export type AccessToken = z.infer<typeof accessTokenSchema>;

export const jwkSchema = z.object({
  kid: z.string(),
  kty: z.string(),
  use: z.string(),
  n: z.string(),
  e: z.string(),
  exp: z.number().optional(),
  iat: z.number().optional(),
  nbf: z.number().optional(),
  alg: z.string().optional(),
  x5t: z.string().optional(),
  x5c: z.array(z.string()).optional(),
});
export type Jwk = z.infer<typeof jwkSchema>;

export type RS256Token = {
  header: {
    alg: "RS256";
    kid: string;
  };
  payload: JWTPayload;
};
