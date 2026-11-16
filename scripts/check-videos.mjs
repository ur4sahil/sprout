// Checks every video in src/content/videos.json (plan section 12, step 21).
// Each id is asked for at YouTube's oEmbed address, which answers only for a video that exists and
// may be embedded. The script fails on any that does not load, on a title that has changed, on a
// video from another channel, and on a skill id that is not in the catalogue.
//
//   npm run check:videos
//
// It needs the network, so it is not part of `npm run verify`.
import { readFileSync } from 'node:fs';

const list = JSON.parse(readFileSync(new URL('../src/content/videos.json', import.meta.url), 'utf8'));
const catalogue = readFileSync(new URL('../src/content/catalogue.ts', import.meta.url), 'utf8');
const skillIds = new Set([...catalogue.matchAll(/^\s+id: '([A-Z0-9-]+)',$/gm)].map((match) => match[1]));

const problems = [];
const entries = Object.entries(list.videos);

for (const [skillId, video] of entries) {
  if (!skillIds.has(skillId)) problems.push(`${skillId}: not a skill in the catalogue`);
  if (!/^[A-Za-z0-9_-]{11}$/.test(video.youtubeId)) problems.push(`${skillId}: "${video.youtubeId}" is not a YouTube id`);
  if (!Number.isInteger(video.seconds) || video.seconds < 20 || video.seconds > 600) problems.push(`${skillId}: length ${video.seconds} seconds is not between 20 and 600`);
}

// A few at a time, so the check is polite and still quick.
async function check([skillId, video]) {
  const address = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.youtubeId}`)}`;
  try {
    const reply = await fetch(address, { headers: { 'User-Agent': 'video-list-check' } });
    if (!reply.ok) return `${skillId}: ${video.youtubeId} does not load (${reply.status})`;
    const found = await reply.json();
    if (found.author_name !== video.source) return `${skillId}: ${video.youtubeId} is from "${found.author_name}", not "${video.source}"`;
    if (!String(found.title).toLowerCase().startsWith(video.title.toLowerCase())) return `${skillId}: ${video.youtubeId} is now titled "${found.title}", not "${video.title}"`;
    return null;
  } catch (error) {
    return `${skillId}: ${video.youtubeId} could not be checked (${error instanceof Error ? error.message : String(error)})`;
  }
}

for (let at = 0; at < entries.length; at += 5) {
  const found = await Promise.all(entries.slice(at, at + 5).map(check));
  problems.push(...found.filter((each) => each !== null));
}

if (problems.length > 0) {
  console.error(`${problems.length} of ${entries.length} videos have a problem:`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`${entries.length} videos load, each from its stated channel with its stated title. Videos are ${list.enabled ? 'on' : 'off'}.`);
