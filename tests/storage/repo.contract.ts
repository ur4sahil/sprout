import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Backend } from '../../src/storage/backend';
import { ImportError } from '../../src/storage/exportFile';
import type { ExportFile, Repo } from '../../src/storage/repo';
import { makeRepo } from '../../src/storage/repoCore';
import { freezeClock } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { T, attempt, child, diagnostic, flag, plan, progress, session, state } from './fixtures';

// One suite, run against every kind of Repo. `open` gives a fresh, empty one.
export function repoContract(name: string, open: () => Promise<Backend>): void {
  describe(`Repo contract: ${name}`, () => {
    let backend: Backend;
    let repo: Repo;
    beforeEach(async () => {
      freezeClock(T(20));
      backend = await open();
      repo = makeRepo(backend);
    });
    afterEach(() => {
      expect(recentErrors().filter((e) => !e.message.includes('could not be read'))).toEqual([]);
    });

    // Fills a repo with one of everything, for two children.
    async function fill(target: Repo): Promise<void> {
      await target.saveChild(child('a'));
      await target.saveChild(child('b', { grade: '1', createdAt: T(2) }));
      await target.saveSkillState(state('a', 'M-K-C4', { score: 41, bestScore: 41, streak: 4, attempts: 2, correct: 1, recent: [true, false], lastPracticedAt: T(3) }));
      await target.saveSkillState(state('b', 'M-K-C4', { score: 10, attempts: 1, correct: 1, recent: [true], lastPracticedAt: T(4) }));
      await target.addAttempt(attempt('att-1', 'a', 'M-K-C4', true, T(3, 1)));
      await target.addAttempt(attempt('att-2', 'a', 'M-K-C4', false, T(3, 2)));
      await target.addAttempt(attempt('att-3', 'a', 'M-K-B3', true, T(4, 1)));
      await target.addAttempt(attempt('att-4', 'b', 'M-K-C4', true, T(4, 2)));
      await target.saveSession(session('session-1', 'a', T(3)));
      await target.saveSession(session('session-2', 'b', T(4)));
      await target.addAward({ childId: 'a', awardId: 'questions:25', earnedAt: T(5) });
      await target.savePlan(plan('p1'));
      await target.saveDiagnostic(diagnostic('d1', 'a', T(5)));
      await target.saveFlag(flag('f1', 'a', T(5)));
      await target.saveDiagnosticProgress(progress('a', T(5)));
      await target.saveFamily({ id: 'family', pinSalt: 'salt', pinHash: 'hash', removedVideos: [], updatedAt: T(5) });
    }

    async function everything(target: Repo): Promise<Omit<ExportFile, 'exportedAt'>> {
      const { exportedAt: _exportedAt, ...rest } = await target.exportAll();
      void _exportedAt;
      const sorted = JSON.parse(JSON.stringify(rest)) as Omit<ExportFile, 'exportedAt'>;
      sorted.skillStates.sort((x, y) => `${x.childId}${x.skillId}`.localeCompare(`${y.childId}${y.skillId}`));
      sorted.attempts.sort((x, y) => x.id.localeCompare(y.id));
      sorted.sessions.sort((x, y) => x.id.localeCompare(y.id));
      sorted.children.sort((x, y) => x.id.localeCompare(y.id));
      return sorted;
    }

    describe('the device record under several jobs at once', () => {
      it('changes made at the same moment all land, none written over by an old copy', async () => {
        await Promise.all([
          repo.updateDeviceState({ signedInEmail: 'parent.one@example.com' }),
          repo.updateDeviceState({ lastSyncAt: T(9) }),
          repo.updateDeviceState({ voicePackVersion: 'pack-2' }),
          repo.saveChild(child('a')),
          repo.updateDeviceState({ muted: true }),
        ]);
        expect(await repo.getDeviceState()).toMatchObject({ signedInEmail: 'parent.one@example.com', lastSyncAt: T(9), voicePackVersion: 'pack-2', muted: true });
      });

      it('a slow job cannot undo a sign-out that happened while it was working', async () => {
        await repo.updateDeviceState({ signedInEmail: 'parent.one@example.com', sessionExpiresAt: T(28) });
        // The job reads the record, works for a while, then records only its own result.
        const job = (async () => {
          await repo.getDeviceState();
          await new Promise((resolve) => setTimeout(resolve, 20));
          await repo.updateDeviceState({ lastSyncAt: T(9) });
        })();
        await repo.updateDeviceState({ signedInEmail: null, sessionExpiresAt: null });
        await job;
        expect(await repo.getDeviceState()).toMatchObject({ signedInEmail: null, sessionExpiresAt: null, lastSyncAt: T(9) });
      });

      it('an update is checked like any other write, and returns the record as saved', async () => {
        await expect(repo.updateDeviceState({ errors: 'none' as unknown as [] })).rejects.toThrow();
        const saved = await repo.updateDeviceState({ muted: true });
        expect(saved).toEqual(await repo.getDeviceState());
        // A failed update does not block the ones after it.
        expect(saved.muted).toBe(true);
      });
    });

    describe('first run', () => {
      it('creates no children and no plans', async () => {
        expect(await repo.listChildren()).toEqual([]);
        expect(await repo.listPlans()).toEqual([]);
        expect(await repo.listFlags()).toEqual([]);
        expect(await repo.countQuarantined()).toBe(0);
      });

      it('gives default family and device records when nothing is saved', async () => {
        expect(await repo.getFamily()).toEqual({ id: 'family', pinSalt: null, pinHash: null, removedVideos: [], updatedAt: '1970-01-01T00:00:00.000Z' });
        expect(await repo.getDeviceState()).toEqual({
          id: 'device',
          muted: false,
          signedInEmail: null,
          sessionExpiresAt: null,
          lastSyncAt: null,
          backupVersion: null,
          dirty: false,
          voicePackVersion: null,
          persistGranted: null,
          lastExportAt: null,
          browserModeAccepted: false,
          catalogueVersion: 0,
          removedVideos: [],
          movedOnline: false,
          errors: [],
        });
      });
    });

    describe('children', () => {
      it('saves and lists children, oldest first, without soft-deleted ones', async () => {
        await repo.saveChild(child('b', { createdAt: T(2) }));
        await repo.saveChild(child('a'));
        await repo.saveChild(child('gone', { deletedAt: T(3) }));
        expect((await repo.listChildren()).map((c) => c.id)).toEqual(['a', 'b']);
      });

      it('saving a child again replaces it', async () => {
        await repo.saveChild(child('a'));
        await repo.saveChild(child('a', { name: 'New name', updatedAt: T(3) }));
        const list = await repo.listChildren();
        expect(list).toHaveLength(1);
        expect(list[0]?.name).toBe('New name');
      });

      it('refuses a child that does not fit the schema, and saves nothing', async () => {
        await expect(repo.saveChild(child('a', { name: '' }))).rejects.toThrow();
        await expect(repo.saveChild({ ...child('a'), grade: 'Z' } as never)).rejects.toThrow();
        expect(await repo.listChildren()).toEqual([]);
      });
    });

    describe('skill states, attempts, sessions', () => {
      beforeEach(async () => fill(repo));

      it('keeps each child\'s skill states apart, one for each skill', async () => {
        expect((await repo.getSkillStates('a')).map((s) => [s.skillId, s.score])).toEqual([['M-K-C4', 41]]);
        expect((await repo.getSkillStates('b')).map((s) => s.score)).toEqual([10]);
        expect(await repo.getSkillStates('nobody')).toEqual([]);
        await repo.saveSkillState(state('a', 'M-K-C4', { score: 52, bestScore: 52 }));
        await repo.saveSkillState(state('a', 'M-K-B3', { score: 10 }));
        const states = await repo.getSkillStates('a');
        expect(states.map((s) => s.skillId).sort()).toEqual(['M-K-B3', 'M-K-C4']);
        expect(states.find((s) => s.skillId === 'M-K-C4')?.score).toBe(52);
      });

      it('lists a child\'s attempts oldest first, and filters by skill and time', async () => {
        expect((await repo.listAttempts('a', {})).map((a) => a.id)).toEqual(['att-1', 'att-2', 'att-3']);
        expect((await repo.listAttempts('a', { skillId: 'M-K-C4' })).map((a) => a.id)).toEqual(['att-1', 'att-2']);
        expect((await repo.listAttempts('a', { since: T(3, 2) })).map((a) => a.id)).toEqual(['att-2', 'att-3']);
        expect((await repo.listAttempts('a', { until: T(3, 2) })).map((a) => a.id)).toEqual(['att-1', 'att-2']);
        expect((await repo.listAttempts('a', { since: T(3, 2), until: T(3, 2) })).map((a) => a.id)).toEqual(['att-2']);
        expect((await repo.listAttempts('b', {})).map((a) => a.id)).toEqual(['att-4']);
      });

      it('with a limit gives the newest ones, still oldest first', async () => {
        expect((await repo.listAttempts('a', { limit: 2 })).map((a) => a.id)).toEqual(['att-2', 'att-3']);
        expect((await repo.listAttempts('a', { limit: 0 })).map((a) => a.id)).toEqual([]);
        expect((await repo.listAttempts('a', { limit: 99 })).map((a) => a.id)).toEqual(['att-1', 'att-2', 'att-3']);
        expect((await repo.listAttempts('a', { skillId: 'M-K-C4', limit: 1 })).map((a) => a.id)).toEqual(['att-2']);
      });

      it('keeps exactly what the child submitted, whatever its shape', async () => {
        await repo.addAttempt(attempt('odd', 'a', 'M-K-C4', true, T(6), { response: { pairs: [[0, 1], [1, 0]], note: null } }));
        const [found] = await repo.listAttempts('a', { since: T(6) });
        expect(found?.response).toEqual({ pairs: [[0, 1], [1, 0]], note: null });
        expect(found?.snapshot).toEqual({ prompt: 'How many?', correct: '3', given: '3' });
      });

      it('an attempt is only ever added: a second one with the same id is ignored', async () => {
        await repo.addAttempt(attempt('att-1', 'a', 'M-K-C4', false, T(9)));
        const first = (await repo.listAttempts('a', {})).find((a) => a.id === 'att-1');
        expect(first?.correct).toBe(true);
        expect(first?.createdAt).toBe(T(3, 1));
      });

      it('saves a session again as it goes on, and lists by child and start time', async () => {
        await repo.saveSession(session('session-1', 'a', T(3), { endedAt: T(3, 9), questions: 8, correct: 7 }));
        expect(await repo.listSessions('a')).toEqual([session('session-1', 'a', T(3), { endedAt: T(3, 9), questions: 8, correct: 7 })]);
        await repo.saveSession(session('session-3', 'a', T(8)));
        expect((await repo.listSessions('a', T(4))).map((s) => s.id)).toEqual(['session-3']);
        expect((await repo.listSessions('b')).map((s) => s.id)).toEqual(['session-2']);
      });

      it('an award, once earned, keeps its first date', async () => {
        await repo.addAward({ childId: 'a', awardId: 'questions:25', earnedAt: T(9) });
        await repo.addAward({ childId: 'a', awardId: 'days:3', earnedAt: T(9) });
        expect(await repo.listAwards('a')).toEqual([
          { childId: 'a', awardId: 'questions:25', earnedAt: T(5) },
          { childId: 'a', awardId: 'days:3', earnedAt: T(9) },
        ]);
        expect(await repo.listAwards('b')).toEqual([]);
      });

      it('plans, diagnostics, flags and diagnostic progress round-trip', async () => {
        expect(await repo.listPlans()).toEqual([plan('p1')]);
        await repo.savePlan(plan('p1', { deletedAt: T(6), updatedAt: T(6) }));
        expect(await repo.listPlans()).toEqual([]);
        expect(await repo.listDiagnostics('a')).toEqual([diagnostic('d1', 'a', T(5))]);
        expect(await repo.listDiagnostics('b')).toEqual([]);
        expect(await repo.listFlags()).toEqual([flag('f1', 'a', T(5))]);
        expect(await repo.getDiagnosticProgress('a', 'math')).toEqual(progress('a', T(5)));
        expect(await repo.getDiagnosticProgress('a', 'ela')).toBeNull();
        expect(await repo.getDiagnosticProgress('b', 'math')).toBeNull();
        expect(await repo.getFamily()).toEqual({ id: 'family', pinSalt: 'salt', pinHash: 'hash', removedVideos: [], updatedAt: T(5) });
      });
    });

    describe('voice clips', () => {
      it('saves bytes, lists keys, and deletes', async () => {
        const bytes = new Uint8Array([1, 2, 3, 250]).buffer;
        await repo.saveClip({ key: 'number:7', bytes, mimeType: 'audio/mp4', packVersion: 'v1' });
        await repo.saveClip({ key: 'letter:a', bytes: new Uint8Array([9]).buffer, mimeType: 'audio/mp4', packVersion: 'v1' });
        expect(await repo.listClipKeys()).toEqual(['letter:a', 'number:7']);
        const clip = await repo.getClip('number:7');
        expect(clip?.mimeType).toBe('audio/mp4');
        expect([...new Uint8Array(clip?.bytes ?? new ArrayBuffer(0))]).toEqual([1, 2, 3, 250]);
        await repo.deleteClip('number:7');
        expect(await repo.getClip('number:7')).toBeNull();
        expect(await repo.listClipKeys()).toEqual(['letter:a']);
      });
    });

    describe('the device record', () => {
      it('is changed only by writes to the device itself: saving a family record leaves it alone', async () => {
        await repo.saveDeviceState({ ...(await repo.getDeviceState()), muted: true });
        const before = await repo.getDeviceState();
        await repo.saveChild(child('a'));
        await repo.addAttempt(attempt('x', 'a', 'S', true, T(3)));
        await repo.saveFamily({ id: 'family', pinSalt: null, pinHash: null, removedVideos: [], updatedAt: T(3) });
        expect(await repo.getDeviceState()).toEqual(before);
      });

      it('keeps the sign-in state and the last 20 errors', async () => {
        const errors = Array.from({ length: 20 }, (_, i) => ({ at: T(1, i), message: `error ${i}`, stack: null }));
        await repo.saveDeviceState({ ...(await repo.getDeviceState()), signedInEmail: 'parent.one@example.com', sessionExpiresAt: T(30), errors });
        const device = await repo.getDeviceState();
        expect(device.signedInEmail).toBe('parent.one@example.com');
        expect(device.sessionExpiresAt).toBe(T(30));
        expect(device.errors).toHaveLength(20);
        await expect(repo.saveDeviceState({ ...device, errors: [...errors, { at: T(2), message: 'one too many', stack: null }] })).rejects.toThrow();
      });
    });

    describe('reset', () => {
      beforeEach(async () => fill(repo));

      it('deletes that child\'s skill states, attempts, sessions, awards, diagnostics, progress and flags, and nobody else\'s', async () => {
        await repo.resetChild('a');
        expect(await repo.getSkillStates('a')).toEqual([]);
        expect(await repo.listAttempts('a', {})).toEqual([]);
        expect(await repo.listSessions('a')).toEqual([]);
        expect(await repo.listAwards('a')).toEqual([]);
        expect(await repo.listDiagnostics('a')).toEqual([]);
        expect(await repo.getDiagnosticProgress('a', 'math')).toBeNull();
        expect(await repo.listFlags()).toEqual([]);
        // The other child, the plans and the child itself are untouched.
        expect((await repo.getSkillStates('b')).map((s) => s.score)).toEqual([10]);
        expect((await repo.listAttempts('b', {})).map((a) => a.id)).toEqual(['att-4']);
        expect(await repo.listPlans()).toEqual([plan('p1')]);
        const kid = (await repo.listChildren()).find((c) => c.id === 'a');
        expect(kid?.resetAt).toBe(T(20));
        expect(kid?.name).toBe('Child a');
      });

      it('rows that are still stored from before the reset are ignored on read', async () => {
        // As if another tab or an old write put a pre-reset row back.
        await repo.resetChild('a');
        await backend.write({
          puts: [
            { store: 'attempts', key: 'old', value: attempt('old', 'a', 'M-K-C4', true, T(3)) },
            { store: 'skillStates', key: 'a|M-K-C4', value: state('a', 'M-K-C4', { score: 99, updatedAt: T(3) }) },
            { store: 'awards', key: 'a|days:3', value: { childId: 'a', awardId: 'days:3', earnedAt: T(3) } },
          ],
        });
        expect(await repo.listAttempts('a', {})).toEqual([]);
        expect(await repo.getSkillStates('a')).toEqual([]);
        expect(await repo.listAwards('a')).toEqual([]);
        const file = await repo.exportAll();
        expect(file.attempts.map((a) => a.id)).toEqual(['att-4']);
        expect(file.skillStates.map((s) => s.childId)).toEqual(['b']);
      });

      it('the child can practise again straight after', async () => {
        await repo.resetChild('a');
        freezeClock(T(21));
        await repo.saveSkillState(state('a', 'M-K-C4', { score: 10, updatedAt: T(21) }));
        await repo.addAttempt(attempt('new', 'a', 'M-K-C4', true, T(21)));
        await repo.addAward({ childId: 'a', awardId: 'questions:25', earnedAt: T(21) });
        expect((await repo.getSkillStates('a')).map((s) => s.score)).toEqual([10]);
        expect((await repo.listAttempts('a', {})).map((a) => a.id)).toEqual(['new']);
        expect(await repo.listAwards('a')).toEqual([{ childId: 'a', awardId: 'questions:25', earnedAt: T(21) }]);
      });

      it('resetting a child that does not exist does nothing', async () => {
        await repo.resetChild('nobody');
        expect((await repo.listAttempts('a', {})).length).toBe(3);
      });
    });

    describe('export and import', () => {
      it('starts with its format and version, and holds no email address and no clips', async () => {
        await fill(repo);
        await repo.saveClip({ key: 'number:7', bytes: new Uint8Array([1, 2, 3]).buffer, mimeType: 'audio/mp4', packVersion: 'v1' });
        await repo.saveDeviceState({ ...(await repo.getDeviceState()), signedInEmail: 'parent.one@example.com', sessionExpiresAt: T(30) });
        const file = await repo.exportAll();
        expect(Object.keys(file).slice(0, 2)).toEqual(['format', 'version']);
        expect(file.format).toBe('sprout-export');
        expect(file.version).toBe(1);
        const text = JSON.stringify(file);
        expect(text).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
        expect(text).not.toContain('audio/mp4');
        expect(text).not.toContain('signedInEmail');
        expect(text).not.toContain('sessionExpiresAt');
        expect(Object.keys(file).sort()).toEqual(
          ['attempts', 'awards', 'children', 'diagnosticProgress', 'diagnostics', 'exportedAt', 'family', 'flags', 'format', 'plans', 'quarantined', 'sessions', 'skillStates', 'version'],
        );
      });

      it('export, wipe, import restores everything', async () => {
        await fill(repo);
        const before = await everything(repo);
        const file = JSON.parse(JSON.stringify(await repo.exportAll())) as ExportFile; // through a file and back
        const wiped = makeRepo(await open());
        expect(await wiped.listChildren()).toEqual([]);
        const report = await wiped.importAll(file);
        expect(await everything(wiped)).toEqual(before);
        expect(report.added).toBe(2 + 2 + 4 + 2 + 1 + 1 + 1 + 1 + 1);
        expect(report.updated).toBe(1); // the family record replaces the default
        // And everything is readable through the normal calls.
        expect((await wiped.listAttempts('a', {})).map((a) => a.id)).toEqual(['att-1', 'att-2', 'att-3']);
        expect((await wiped.getSkillStates('a'))[0]?.score).toBe(41);
        expect(await wiped.getDiagnosticProgress('a', 'math')).toEqual(progress('a', T(5)));
      });

      it('importing the same file twice changes nothing the second time', async () => {
        await fill(repo);
        const file = await repo.exportAll();
        const again = await repo.importAll(file);
        expect(again.added).toBe(0);
        expect(again.updated).toBe(0);
        expect(again.skipped).toBeGreaterThan(10);
      });

      it('import onto a device that already has data merges and wipes nothing', async () => {
        // This device: child a with its own attempts, and child c that the file has never heard of.
        await repo.saveChild(child('a', { name: 'Older name', updatedAt: T(1) }));
        await repo.saveChild(child('c', { createdAt: T(3) }));
        await repo.saveSkillState(state('a', 'M-K-C4', { score: 20, bestScore: 20, attempts: 2, correct: 2, recent: [true, true], lastPracticedAt: T(2), updatedAt: T(2) }));
        await repo.saveSkillState(state('c', 'M-K-B3', { score: 31 }));
        await repo.addAttempt(attempt('local-1', 'a', 'M-K-C4', true, T(2, 1)));
        await repo.addAttempt(attempt('local-2', 'a', 'M-K-C4', true, T(2, 2)));
        await repo.addAttempt(attempt('c-1', 'c', 'M-K-B3', true, T(3)));
        await repo.savePlan(plan('p-local'));

        // The other device's file.
        const other = makeRepo(await open());
        await fill(other);
        await other.saveChild(child('a', { name: 'Newer name', updatedAt: T(9) }));
        const report = await repo.importAll(await other.exportAll());

        expect((await repo.listChildren()).map((c) => [c.id, c.name])).toEqual([
          ['a', 'Newer name'],
          ['b', 'Child b'],
          ['c', 'Child c'],
        ]);
        expect((await repo.listAttempts('a', {})).map((a) => a.id)).toEqual(['local-1', 'local-2', 'att-1', 'att-2', 'att-3']);
        expect((await repo.listAttempts('c', {})).map((a) => a.id)).toEqual(['c-1']);
        expect((await repo.getSkillStates('c')).map((s) => s.score)).toEqual([31]);
        expect((await repo.listPlans()).map((p) => p.id).sort()).toEqual(['p-local', 'p1']);
        // The skill both devices practised: the later practice wins the score, and no answer is lost.
        const merged = (await repo.getSkillStates('a')).find((s) => s.skillId === 'M-K-C4');
        expect(merged).toMatchObject({ score: 41, streak: 4, bestScore: 41, attempts: 4, correct: 3, recent: [true, true, true, false], lastPracticedAt: T(3) });
        expect(report.added).toBeGreaterThan(0);
        expect(report.updated).toBeGreaterThan(0);
      });

      it('a reset child stays reset when an older export is imported', async () => {
        await fill(repo);
        const old = await repo.exportAll();
        freezeClock(T(21));
        await repo.resetChild('a');
        const report = await repo.importAll(old);
        expect(await repo.listAttempts('a', {})).toEqual([]);
        expect(await repo.getSkillStates('a')).toEqual([]);
        expect(await repo.listAwards('a')).toEqual([]);
        expect(await repo.getDiagnosticProgress('a', 'math')).toBeNull();
        expect((await repo.listChildren()).find((c) => c.id === 'a')?.resetAt).toBe(T(21));
        expect((await repo.listAttempts('b', {})).map((a) => a.id)).toEqual(['att-4']);
        expect(report.added).toBe(0);
      });

      it('a reset on another device removes this device\'s older rows for that child', async () => {
        await fill(repo);
        const other = makeRepo(await open());
        await other.importAll(await repo.exportAll());
        freezeClock(T(22));
        await other.resetChild('a');
        await other.addAttempt(attempt('after-reset', 'a', 'M-K-C4', true, T(22, 5)));
        freezeClock(T(23));
        await repo.importAll(await other.exportAll());
        expect((await repo.listAttempts('a', {})).map((a) => a.id)).toEqual(['after-reset']);
        expect(await repo.getSkillStates('a')).toEqual([]);
        expect((await repo.listAttempts('b', {})).map((a) => a.id)).toEqual(['att-4']);
        // The dead rows are really gone, not just hidden.
        expect((await backend.all('attempts')).map((row) => row.key).sort()).toEqual(['after-reset', 'att-4']);
      });

      it('a soft delete of a child or a plan travels with an import', async () => {
        await fill(repo);
        const other = makeRepo(await open());
        await other.importAll(await repo.exportAll());
        await other.saveChild(child('b', { grade: '1', createdAt: T(2), deletedAt: T(10), updatedAt: T(10) }));
        await other.savePlan(plan('p1', { deletedAt: T(10), updatedAt: T(10) }));
        await repo.importAll(await other.exportAll());
        expect((await repo.listChildren()).map((c) => c.id)).toEqual(['a']);
        expect(await repo.listPlans()).toEqual([]);
      });

      it('refuses a newer version with a clear message, and changes nothing', async () => {
        await fill(repo);
        const before = await everything(repo);
        const file = { ...(await repo.exportAll()), version: 2 };
        await expect(repo.importAll(file)).rejects.toThrow(ImportError);
        await expect(repo.importAll(file)).rejects.toThrow(/newer version of Sprout/);
        expect(await everything(repo)).toEqual(before);
      });

      it('refuses a file that is not an export, or is damaged, and changes nothing', async () => {
        await fill(repo);
        const before = await everything(repo);
        const good = await repo.exportAll();
        const bad: unknown[] = [
          null,
          [],
          'text',
          {},
          { format: 'something-else', version: 1 },
          { ...good, version: 0 },
          { ...good, version: 'one' },
          { ...good, children: 'none' },
          { ...good, attempts: [{ ...good.attempts[0], correct: 'yes' }] },
          { ...good, skillStates: [{ ...good.skillStates[0], score: 150 }] },
          { ...good, family: { id: 'family' } },
        ];
        for (const file of bad) await expect(repo.importAll(file as ExportFile), JSON.stringify(file)?.slice(0, 60)).rejects.toThrow(ImportError);
        expect(await everything(repo)).toEqual(before);
      });
    });

    describe('damaged records', () => {
      beforeEach(async () => fill(repo));

      it('a corrupted record is quarantined, counted, left out, and never crashes a read', async () => {
        await backend.write({
          puts: [
            { store: 'skillStates', key: 'a|M-K-B3', value: { childId: 'a', skillId: 'M-K-B3', score: 'lots' } },
            { store: 'attempts', key: 'broken', value: { id: 'broken', childId: 'a' } },
            { store: 'children', key: 'half', value: { id: 'half', name: 'Half' } },
          ],
        });
        expect((await repo.getSkillStates('a')).map((s) => s.skillId)).toEqual(['M-K-C4']);
        expect((await repo.listAttempts('a', {})).map((a) => a.id)).toEqual(['att-1', 'att-2', 'att-3']);
        expect((await repo.listChildren()).map((c) => c.id)).toEqual(['a', 'b']);
        expect(await repo.countQuarantined()).toBe(3);
        expect(recentErrors().length).toBeGreaterThan(0);
      });

      it('is counted once however often it is read, and its first copy is never overwritten', async () => {
        const raw = { childId: 'a', skillId: 'M-K-B3', score: 'lots', note: 'the original' };
        await backend.write({ puts: [{ store: 'skillStates', key: 'a|M-K-B3', value: raw }] });
        await repo.getSkillStates('a');
        await repo.getSkillStates('a');
        await repo.exportAll();
        expect(await repo.countQuarantined()).toBe(1);
        // The key is damaged again with something else. The first copy is kept.
        await backend.write({ puts: [{ store: 'skillStates', key: 'a|M-K-B3', value: { childId: 'a', rubbish: true } }] });
        await repo.getSkillStates('a');
        await repo.exportAll();
        const held = await backend.quarantined();
        expect(held).toHaveLength(1);
        expect(held[0]?.raw).toEqual(raw);
        expect(held[0]?.store).toBe('skillStates');
        expect(held[0]?.key).toBe('a|M-K-B3');
        expect(held[0]?.error.length).toBeGreaterThan(0);
      });

      it('the export includes quarantined items untouched', async () => {
        const raw = { id: 'broken', childId: 'a', mystery: [1, 2, { deep: true }] };
        await backend.write({ puts: [{ store: 'attempts', key: 'broken', value: raw }] });
        await repo.listAttempts('a', {});
        const file = await repo.exportAll();
        expect(file.quarantined).toHaveLength(1);
        expect(file.quarantined[0]?.raw).toEqual(raw);
        expect(file.attempts.map((a) => a.id)).not.toContain('broken');
        // Such a file still imports.
        const wiped = makeRepo(await open());
        await wiped.importAll(JSON.parse(JSON.stringify(file)) as ExportFile);
        expect((await wiped.listAttempts('a', {})).length).toBe(3);
      });

      it('a damaged device or family record falls back to defaults', async () => {
        await backend.write({ puts: [{ store: 'device', key: 'device', value: { id: 'device', muted: 'yes' } }, { store: 'family', key: 'family', value: 'nonsense' }] });
        expect((await repo.getDeviceState()).muted).toBe(false);
        expect((await repo.getFamily()).pinHash).toBeNull();
        expect(await repo.countQuarantined()).toBe(2);
      });
    });

    describe('records saved by an older version', () => {
      it('a record missing a newer field loads with its default', async () => {
        await backend.write({
          puts: [
            // A device record from before most of its fields existed.
            { store: 'device', key: 'device', value: { id: 'device', muted: true } },
            // A diagnostic walk from before `right` and `wrong` were added.
            {
              store: 'diagnosticProgress',
              key: 'a|math',
              value: { childId: 'a', subject: 'math', ladders: { counting: { currentSkillId: 'M-K-A1', passed: [], failed: [], asked: 0, done: false } }, sittings: 0, done: false, updatedAt: T(5) },
            },
            { store: 'children', key: 'a', value: child('a') },
          ],
        });
        const device = await repo.getDeviceState();
        expect(device.muted).toBe(true);
        expect(device).toMatchObject({ dirty: false, browserModeAccepted: false, catalogueVersion: 0, errors: [], signedInEmail: null });
        const walk = (await repo.getDiagnosticProgress('a', 'math'))?.ladders.counting;
        expect(walk).toMatchObject({ right: 0, wrong: 0, currentSkillId: 'M-K-A1' });
        expect(await repo.countQuarantined()).toBe(0);
      });
    });
  });
}
