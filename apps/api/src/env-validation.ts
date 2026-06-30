export interface EnvVars {
  [key: string]: string | undefined;
}

interface RequiredEnv {
  name: string;
  description: string;
  /** If true, only validated in production (NODE_ENV=production) */
  prodOnly?: boolean;
}

const REQUIRED_VARS: RequiredEnv[] = [
  { name: 'DATABASE_URL', description: 'PostgreSQL connection string' },
  { name: 'JWT_ACCESS_SECRET', description: 'Secret for user JWT access tokens' },
  { name: 'JWT_REFRESH_SECRET', description: 'Secret for user JWT refresh tokens' },
  { name: 'STAFF_JWT_ACCESS_SECRET', description: 'Secret for staff JWT access tokens' },
  { name: 'STAFF_JWT_REFRESH_SECRET', description: 'Secret for staff JWT refresh tokens' },
  { name: 'SMTP_HOST', description: 'SMTP server hostname' },
  { name: 'SMTP_USER', description: 'SMTP authentication username' },
  { name: 'SMTP_PASSWORD', description: 'SMTP authentication password' },
  { name: 'MAIL_FROM', description: 'Sender email address' },
  // LiveKit — required only in production (in dev the calls module degrades gracefully)
  { name: 'LIVEKIT_API_KEY', description: 'LiveKit API key for WebRTC', prodOnly: true },
  { name: 'LIVEKIT_API_SECRET', description: 'LiveKit API secret for WebRTC', prodOnly: true },
  { name: 'LIVEKIT_HOST', description: 'LiveKit server hostname', prodOnly: true },
];

export function validateEnvironment(env: EnvVars): void {
  const missing: string[] = [];
  const empty: string[] = [];
  const isProduction = env.NODE_ENV === 'production';

  for (const required of REQUIRED_VARS) {
    // Skip prodOnly vars in development
    if (required.prodOnly && !isProduction) continue;

    const value = env[required.name];
    if (value === undefined) {
      missing.push(required.name);
    } else if (value.trim() === '' || value === 'change-me') {
      empty.push(`${required.name} (${required.description})`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
      'Set them in .env or docker-compose environment section.',
    );
  }

  if (empty.length > 0) {
    throw new Error(
      `Required environment variables are empty or have placeholder values:\n  ${empty.join('\n  ')}\n\n` +
      'Set real values before starting in production.',
    );
  }
}
