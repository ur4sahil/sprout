import type { D1Database, R2Bucket, SendEmail } from '@cloudflare/workers-types';
import type { AuthDeps } from './auth';
import {
  findSession,
  json,
  login,
  logout,
  logoutAll,
  parseParentEmails,
  sessionInfo,
  setPassword,
  start,
} from './auth';
import { getBackup, putBackup } from './backup';
import { FAMILY, getData, postData } from './data';
import { cloudflareMailer, consoleMailer } from './mailer';
import type { BackupStore, DataStore, PackStore } from './store';
import { d1DataStore, d1Store, r2BackupStore, r2PackStore } from './store';
import { voicePack } from './voicePack';

import { memoryVoiceStore, r2VoiceStore } from './store';
import type { VoiceMaker, VoiceStore } from './voice';
import { remoteVoiceMaker, voice } from './voice';
// Routes /api. Everything else is the built app.

export interface Env {
  DB: D1Database;
  MAIL: SendEmail;
  BACKUPS: R2Bucket;
  VOICE?: R2Bucket;
  ASSETS: { fetch(request: Request): Promise<Response> };
  ENVIRONMENT: string;
  APP_ORIGIN: string;
  PARENT_EMAILS?: string;
  AUTH_PEPPER?: string;
  MAIL_FROM?: string;
  VOICE_URL?: string;
  VOICE_KEY?: string;
}

export interface ApiDeps extends AuthDeps {
  appOrigin: string;
  pack: PackStore;
  backup: BackupStore;
  data: DataStore;
  voice: VoiceStore;
  // The machine that makes speech, or null where there is none (local runs, tests).
  voiceMaker: VoiceMaker | null;
  // Whose records a signed-in parent reads and writes. Every listed parent shares one family.
  familyOf: (email: string) => string;
}

type Handler = (deps: ApiDeps, request: Request) => Promise<Response>;

// The only routes that work without a session.
const SIGN_IN_ROUTES: Record<string, Handler> = {
  'POST /api/auth/start': start,
  'POST /api/auth/password': setPassword,
  'POST /api/auth/login': login,
};

// A request that changes something must be JSON, or the gzip file for the backup, sent by the app itself.
function isTrustedWrite(deps: ApiDeps, request: Request, route = ''): boolean {
  const type = (request.headers.get('Content-Type') ?? '').toLowerCase();
  const wanted = route === 'PUT /api/backup' ? 'application/gzip' : 'application/json';
  return type.startsWith(wanted) && request.headers.get('Origin') === deps.appOrigin;
}

function isRead(request: Request): boolean {
  return request.method === 'GET' || request.method === 'HEAD';
}

export async function handleApi(request: Request, deps: ApiDeps): Promise<Response> {
  const path = new URL(request.url).pathname;
  const route = `${request.method} ${path}`;
  try {
    const signIn = SIGN_IN_ROUTES[route];
    if (signIn) {
      if (!isTrustedWrite(deps, request)) return json(403, { error: 'forbidden' });
      return await signIn(deps, request);
    }

    // The one guard for every other path under /api, known or not.
    const session = await findSession(deps, request);
    if (!session) return json(401, { error: 'signed_out' });
    if (!isRead(request) && !isTrustedWrite(deps, request, route)) return json(403, { error: 'forbidden' });

    switch (route) {
      case 'GET /api/auth/session':
        return sessionInfo(session);
      case 'POST /api/auth/logout':
        return await logout(deps, session);
      case 'POST /api/auth/logout-all':
        return await logoutAll(deps, session);
      case 'GET /api/backup':
        return await getBackup(deps.backup, request);
      case 'PUT /api/backup':
        return await putBackup(deps.backup, request, deps.now());
      case 'GET /api/data':
        return await getData(deps.data, deps.familyOf(session.email), request);
      case 'POST /api/data':
        return await postData(deps.data, deps.familyOf(session.email), request, deps.now());
      case 'POST /api/voice':
        return await voice(deps.voice, deps.voiceMaker, request, deps.defer);
      case 'GET /api/voice-pack':
        return await voicePack(deps.pack, request);
      default:
        return json(404, { error: 'not_found' });
    }
  } catch (error) {
    // Never log an address, a code, a password key or a cookie.
    console.error('api error on', route, error instanceof Error ? error.name : 'error');
    return json(500, { error: 'server' });
  }
}

function buildDeps(env: Env, ctx: { waitUntil(work: Promise<unknown>): void }): ApiDeps | null {
  if (!env.AUTH_PEPPER || env.AUTH_PEPPER.length < 32) return null;
  const dev = env.ENVIRONMENT === 'dev';
  if (!dev && !env.MAIL_FROM) return null;
  return {
    store: d1Store(env.DB),
    mailer: dev ? consoleMailer() : cloudflareMailer(env.MAIL, env.MAIL_FROM ?? ''),
    pepper: env.AUTH_PEPPER,
    parentEmails: parseParentEmails(env.PARENT_EMAILS),
    now: () => new Date(),
    defer: (work) => ctx.waitUntil(work),
    appOrigin: env.APP_ORIGIN,
    pack: r2PackStore(env.BACKUPS),
    backup: r2BackupStore(env.BACKUPS),
    data: d1DataStore(env.DB),
    voice: env.VOICE ? r2VoiceStore(env.VOICE) : memoryVoiceStore(),
    voiceMaker: env.VOICE_URL && env.VOICE_KEY ? remoteVoiceMaker(env.VOICE_URL, env.VOICE_KEY) : null,
    // On the local test server each account keeps to itself, so one test never sees another's children.
    familyOf: (email) => (dev ? email : FAMILY),
  };
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: { waitUntil(work: Promise<unknown>): void },
  ): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api' || path.startsWith('/api/')) {
      const deps = buildDeps(env, ctx);
      if (!deps) {
        console.error('the Worker is missing a private setting');
        return json(500, { error: 'server' });
      }
      return handleApi(request, deps);
    }
    return env.ASSETS.fetch(request);
  },
};
