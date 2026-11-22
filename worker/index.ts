import type { D1Database, R2Bucket, SendEmail } from '@cloudflare/workers-types';
import type { AuthDeps } from './auth';
import {
  checkReset,
  createInvite,
  createReset,
  listMembers,
  resetPassword,
  familyFor,
  findSession,
  isFirstFamily,
  join,
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
import { SOUND_ROUTE, sound } from './sound';
import type { PiperMaker, VoiceEngine, VoiceMaker, VoiceStore } from './voice';
import { piperVoice, remotePiperMaker, remoteVoiceMaker, voice, voiceEngine } from './voice';
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
  // Which voice machine is at VOICE_URL: "kokoro" (when left out) or "piper" (plan section 20).
  VOICE_ENGINE?: string;
}

export interface ApiDeps extends AuthDeps {
  appOrigin: string;
  pack: PackStore;
  backup: BackupStore;
  data: DataStore;
  voice: VoiceStore;
  // Which voice machine makes new sentences, and the machine itself, or null where there is none (local runs,
  // tests). Only the one for the engine is set.
  voiceEngine: VoiceEngine;
  voiceMaker: VoiceMaker | null; // Kokoro
  piperMaker: PiperMaker | null;
  // Whose records a signed-in parent reads and writes: the first family's, or their own family's (invites).
  // Null when the parent belongs to no family, which a signed-in parent never should.
  familyOf: (email: string) => Promise<string | null>;
  // Local runs: every account keeps to itself, so one test never sees another's children.
  dev?: boolean;
}

type Handler = (deps: ApiDeps, request: Request) => Promise<Response>;

// The only routes that work without a session.
const SIGN_IN_ROUTES: Record<string, Handler> = {
  'POST /api/auth/start': start,
  'POST /api/auth/password': setPassword,
  'POST /api/auth/login': login,
  'POST /api/auth/join': join,
  'POST /api/auth/reset-check': checkReset,
  'POST /api/auth/reset': resetPassword,
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
        return sessionInfo(deps, session);
      case 'POST /api/invites':
        return await createInvite(deps, session, deps.appOrigin);
      case 'GET /api/members':
        return await listMembers(deps, session);
      case 'POST /api/members/reset':
        return await createReset(deps, session, request, deps.appOrigin);
      case 'POST /api/auth/logout':
        return await logout(deps, session);
      case 'POST /api/auth/logout-all':
        return await logoutAll(deps, session);
      // The old backup file is the first family's alone: another family never reads or writes it.
      case 'GET /api/backup':
        if (!deps.dev && !isFirstFamily(deps, session.email)) return json(403, { error: 'forbidden' });
        return await getBackup(deps.backup, request);
      case 'PUT /api/backup':
        if (!deps.dev && !isFirstFamily(deps, session.email)) return json(403, { error: 'forbidden' });
        return await putBackup(deps.backup, request, deps.now());
      case 'GET /api/data':
      case 'POST /api/data': {
        const family = await deps.familyOf(session.email);
        if (family === null) return json(403, { error: 'forbidden' });
        return route === 'GET /api/data' ? await getData(deps.data, family, request) : await postData(deps.data, family, request, deps.now());
      }
      case 'POST /api/voice':
        return deps.voiceEngine === 'piper' ? await piperVoice(deps.voice, deps.piperMaker, request, deps.defer) : await voice(deps.voice, deps.voiceMaker, request, deps.defer);
      case 'GET /api/voice-pack':
        return await voicePack(deps.pack, request);
      default: {
        // GET /api/sound/<key>/<form>: a recorded letter sound.
        const asked = request.method === 'GET' ? SOUND_ROUTE.exec(path) : null;
        if (asked) return await sound(deps.voice, asked[1] ?? '', asked[2] ?? '');
        return json(404, { error: 'not_found' });
      }
    }
  } catch (error) {
    // Never log an address, a code, a password key or a cookie.
    console.error('api error on', route, error instanceof Error ? error.name : 'error');
    return json(500, { error: 'server' });
  }
}

export function buildDeps(env: Env, ctx: { waitUntil(work: Promise<unknown>): void }): ApiDeps | null {
  if (!env.AUTH_PEPPER || env.AUTH_PEPPER.length < 32) return null;
  const dev = env.ENVIRONMENT === 'dev';
  if (!dev && !env.MAIL_FROM) return null;
  const store = d1Store(env.DB);
  const parentEmails = parseParentEmails(env.PARENT_EMAILS);
  const engine = voiceEngine(env.VOICE_ENGINE);
  const machine = env.VOICE_URL && env.VOICE_KEY ? { url: env.VOICE_URL, key: env.VOICE_KEY } : null;
  const deps: ApiDeps = {
    store,
    mailer: dev ? consoleMailer() : cloudflareMailer(env.MAIL, env.MAIL_FROM ?? ''),
    pepper: env.AUTH_PEPPER,
    parentEmails,
    now: () => new Date(),
    defer: (work) => ctx.waitUntil(work),
    appOrigin: env.APP_ORIGIN,
    pack: r2PackStore(env.BACKUPS),
    backup: r2BackupStore(env.BACKUPS),
    data: d1DataStore(env.DB),
    voice: env.VOICE ? r2VoiceStore(env.VOICE) : memoryVoiceStore(),
    voiceEngine: engine,
    voiceMaker: machine && engine === 'kokoro' ? remoteVoiceMaker(machine.url, machine.key) : null,
    piperMaker: machine && engine === 'piper' ? remotePiperMaker(machine.url, machine.key) : null,
    // On the local test server each account keeps to itself, so one test never sees another's children.
    familyOf: (email) => (dev ? Promise.resolve(email) : familyFor(deps, email, FAMILY)),
    dev,
  };
  return deps;
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
