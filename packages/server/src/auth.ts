import {
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{1,64}$/;

type UserRecord = {
  username: string;
  passwordHash: string;
};

type JwtPayload = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  iss?: unknown;
};

export type AuthenticatedUser = {
  username: string;
  tokenId: string;
  expiresAt: number;
};

export class AuthenticationError extends Error {
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class JwtAuthentication {
  private readonly revokedTokens = new Map<string, number>();

  private constructor(
    private readonly users: Map<string, string>,
    private readonly secret: string,
    private readonly lifetimeSeconds: number,
  ) {}

  static async fromEnvironment(): Promise<JwtAuthentication> {
    const usersFile = process.env.USERS_FILE;
    const secret = process.env.JWT_SECRET;
    if (!usersFile)
      throw new Error('USERS_FILE must point to the server users JSON file');
    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new Error('JWT_SECRET must contain at least 32 bytes');
    }

    const configuredUsers: unknown = JSON.parse(
      await readFile(usersFile, 'utf8'),
    );
    if (!Array.isArray(configuredUsers)) {
      throw new Error('USERS_FILE must contain a JSON array of user records');
    }

    const users = new Map<string, string>();
    for (const record of configuredUsers as UserRecord[]) {
      if (
        !record ||
        typeof record.username !== 'string' ||
        !USERNAME_PATTERN.test(record.username) ||
        typeof record.passwordHash !== 'string' ||
        !parsePasswordHash(record.passwordHash) ||
        users.has(record.username)
      ) {
        throw new Error(
          'USERS_FILE contains an invalid or duplicate user record',
        );
      }
      users.set(record.username, record.passwordHash);
    }

    if (users.size === 0)
      throw new Error('USERS_FILE must configure at least one user');
    const lifetimeSeconds = Number(process.env.JWT_TTL_SECONDS || 28800);
    if (!Number.isInteger(lifetimeSeconds) || lifetimeSeconds < 60) {
      throw new Error(
        'JWT_TTL_SECONDS must be an integer of at least 60 seconds',
      );
    }
    return new JwtAuthentication(users, secret, lifetimeSeconds);
  }

  async login(
    username: unknown,
    password: unknown,
  ): Promise<{ token: string; user: string }> {
    if (
      typeof username !== 'string' ||
      !USERNAME_PATTERN.test(username) ||
      typeof password !== 'string' ||
      password.length > 1024
    ) {
      throw new AuthenticationError('Invalid username or password');
    }

    const passwordHash = this.users.get(username);
    if (!passwordHash || !(await verifyPassword(password, passwordHash))) {
      throw new AuthenticationError('Invalid username or password');
    }
    return { token: this.issueToken(username), user: username };
  }

  authenticate(authorization: string | undefined): AuthenticatedUser {
    const match = authorization?.match(/^Bearer ([A-Za-z0-9._-]+)$/);
    if (!match) throw new AuthenticationError('Bearer token required');
    const [encodedHeader, encodedPayload, signature, extra] =
      match[1].split('.');
    if (!encodedHeader || !encodedPayload || !signature || extra) {
      throw new AuthenticationError('Invalid bearer token');
    }

    const expected = this.sign(`${encodedHeader}.${encodedPayload}`);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new AuthenticationError('Invalid bearer token');
    }

    try {
      const header = JSON.parse(
        Buffer.from(encodedHeader, 'base64url').toString(),
      );
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString(),
      ) as JwtPayload;
      const now = Math.floor(Date.now() / 1000);
      if (
        header.alg !== 'HS256' ||
        payload.iss !== undefined ||
        typeof payload.sub !== 'string' ||
        !USERNAME_PATTERN.test(payload.sub) ||
        typeof payload.jti !== 'string' ||
        this.revokedTokens.has(payload.jti) ||
        !Number.isInteger(payload.iat) ||
        !Number.isInteger(payload.exp) ||
        payload.exp <= now ||
        payload.iat > now + 60 ||
        !this.users.has(payload.sub)
      ) {
        throw new Error('Invalid JWT claims');
      }
      this.cleanupRevokedTokens(now);
      return {
        username: payload.sub,
        tokenId: payload.jti,
        expiresAt: payload.exp,
      };
    } catch {
      throw new AuthenticationError('Invalid or expired bearer token');
    }
  }

  revoke(authorization: string | undefined): void {
    const token = this.authenticate(authorization);
    this.revokedTokens.set(token.tokenId, token.expiresAt);
  }

  private issueToken(username: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({
      sub: username,
      jti: randomUUID(),
      iat: now,
      exp: now + this.lifetimeSeconds,
    });
    const content = `${header}.${payload}`;
    return `${content}.${this.sign(content)}`;
  }

  private sign(content: string): string {
    return createHmac('sha256', this.secret)
      .update(content)
      .digest('base64url');
  }

  private cleanupRevokedTokens(now: number): void {
    for (const [tokenId, expiry] of this.revokedTokens) {
      if (expiry <= now) this.revokedTokens.delete(tokenId);
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1024) {
    throw new Error('Password must contain between 12 and 1024 characters');
  }
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parsed = parsePasswordHash(storedHash);
  if (!parsed) return false;
  const derivedKey = (await scrypt(
    password,
    parsed.salt,
    parsed.key.length,
  )) as Buffer;
  return timingSafeEqual(derivedKey, parsed.key);
}

function parsePasswordHash(
  value: string,
): { salt: Buffer; key: Buffer } | undefined {
  const [algorithm, saltText, keyText, extra] = value.split('$');
  if (algorithm !== 'scrypt' || !saltText || !keyText || extra)
    return undefined;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const key = Buffer.from(keyText, 'base64url');
    if (salt.length < 16 || key.length !== 64) return undefined;
    return { salt, key };
  } catch {
    return undefined;
  }
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
