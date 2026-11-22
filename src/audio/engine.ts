// Which voice machine the server speaks with (plan section 20): Piper once the owner switches (the test copy now),
// Kokoro on the live app until then. It is the one switch for everything phase 1 of the voice plan changes on the
// device: the subject's friend saying its subject, the 0.7-second lesson pause, and the recorded letter sounds.
// The server says which in /build.json (`voice`, which the Worker adds from its VOICE_ENGINE setting), and the app
// asks for that file at launch, on its way back to the front and every quarter of an hour (src/app/updates.ts).
// Until the server has said piper, or when it cannot be asked, the app speaks exactly as it did before the switch.
// Held in memory only, so every launch starts from the old way.

export type VoiceEngine = 'kokoro' | 'piper';

let engine: VoiceEngine | null = null; // null: the server has not said

// What the server's build file says; anything but "kokoro" or "piper" counts as not saying.
export function setVoiceEngine(said: unknown): void {
  engine = said === 'piper' || said === 'kokoro' ? said : null;
}

// True once the server has said it speaks with the new voices.
export function newVoicesOn(): boolean {
  return engine === 'piper';
}

// For tests: as at launch, before the server has said.
export function resetVoiceEngine(): void {
  engine = null;
}
