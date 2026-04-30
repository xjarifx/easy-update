import crypto from "node:crypto";
import { UnauthorizedError } from "./errors.js";

type AuthTokenPayload = {
  sub: number;
  email: string;
  iat: number;
  exp: number;
};

const TOKEN_HEADER = { alg: "HS256", typ: "JWT" } as const;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const readAuthSecret = () => {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret) {
    return "easy-update-dev-secret-change-me";
  }

  return secret;
};

const base64UrlEncode = (input: string | Buffer) => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const base64UrlDecode = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;

  const padded =
    padding === 0 ? normalized : `${normalized}${"=".repeat(4 - padding)}`;

  return Buffer.from(padded, "base64").toString("utf8");
};

const signToken = (value: string) => {
  return crypto
    .createHmac("sha256", readAuthSecret())
    .update(value)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const safeEqual = (a: string, b: string) => {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(first, second);
};

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("base64");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64");

  return `scrypt$${salt}$${hash}`;
};

export const verifyPassword = (password: string, encodedHash: string) => {
  const [algorithm, salt, hash] = encodedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const candidateHash = crypto
    .scryptSync(password, salt, 64)
    .toString("base64");

  return safeEqual(candidateHash, hash);
};

export const createAuthToken = (input: { id: number; email: string }) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: input.id,
    email: input.email,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(TOKEN_HEADER));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signToken(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const parseAuthToken = (token: string) => {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    throw new UnauthorizedError("Invalid token format");
  }

  const expectedSignature = signToken(`${header}.${payload}`);

  if (!safeEqual(signature, expectedSignature)) {
    throw new UnauthorizedError("Invalid token signature");
  }

  let decodedPayload: AuthTokenPayload;

  try {
    decodedPayload = JSON.parse(base64UrlDecode(payload)) as AuthTokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid token payload");
  }

  const now = Math.floor(Date.now() / 1000);

  if (!decodedPayload.exp || decodedPayload.exp <= now) {
    throw new UnauthorizedError("Token has expired");
  }

  if (!decodedPayload.sub || !decodedPayload.email) {
    throw new UnauthorizedError("Token payload is incomplete");
  }

  return decodedPayload;
};
