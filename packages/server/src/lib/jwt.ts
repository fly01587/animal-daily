import * as jose from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production'
)

export interface JwtPayload {
  sub: string
  email: string
}

/** 签发 Access Token */
export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES ?? '15m')
    .sign(secret)
}

/** 验证 Access Token */
export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jose.jwtVerify(token, secret)
  return { sub: payload.sub as string, email: payload.email as string }
}

/** 生成随机 Refresh Token */
export function generateRefreshToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
