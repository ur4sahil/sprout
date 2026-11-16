#!/bin/bash
# Makes the voice pack on a Mac and uploads it to the private R2 bucket.
# Run: npm run clips
#
# It uses the built-in `say` command with the Samantha voice and `afconvert` to make small AAC
# clips: the 26 letter names, the numbers 0 to 100, and the praise phrases. Apple allows its
# voices for personal use, not for handing out, so the clips are never written into the repo.
# They go to R2 and are served only to a signed-in iPad.
set -euo pipefail

VOICE="${SPROUT_VOICE:-Samantha}"
BUCKET="sprout-backups"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

command -v say >/dev/null || { echo "This script needs a Mac: the 'say' command was not found."; exit 1; }
command -v afconvert >/dev/null || { echo "This script needs a Mac: 'afconvert' was not found."; exit 1; }
say -v "$VOICE" "" 2>/dev/null || { echo "The voice '$VOICE' is not on this Mac. Add it in System Settings, Accessibility, Spoken Content."; exit 1; }

clip() { # clip <key> <text for say>
  local file="$WORK/clip-$(printf '%s' "$1" | tr ':' '_')"
  say -v "$VOICE" -o "$file.aiff" "$2"
  afconvert -f m4af -d aac -b 32000 "$file.aiff" "$file.m4a" >/dev/null
  rm "$file.aiff"
  printf '%s\t%s\n' "$1" "$file.m4a" >> "$WORK/list.tsv"
}

echo "Making clips with the $VOICE voice..."
for letter in a b c d e f g h i j k l m n o p q r s t u v w x y z; do
  # [[char LTRL]] makes the voice read the character as a letter name, never as a word or a sound.
  clip "letter:$letter" "[[char LTRL]] $letter"
done
for number in $(seq 0 100); do
  clip "number:$number" "$number"
done
clip "phrase:great-job" "Great job."
clip "phrase:you-got-it" "You got it."
clip "phrase:nice-work" "Nice work."
clip "phrase:thats-right" "That's right."
clip "phrase:well-done" "Well done."

VERSION="$(date -u +%Y%m%d%H%M%S)"
node -e '
const fs = require("fs");
const [list, out, version] = process.argv.slice(1);
const clips = {};
for (const line of fs.readFileSync(list, "utf8").trim().split("\n")) {
  const [key, file] = line.split("\t");
  clips[key] = fs.readFileSync(file).toString("base64");
}
fs.writeFileSync(out, JSON.stringify({ version, mimeType: "audio/mp4", clips }));
console.log(`Packed ${Object.keys(clips).length} clips, ${(fs.statSync(out).size / 1024).toFixed(0)} KB, version ${version}`);
' "$WORK/list.tsv" "$WORK/voice-pack.json" "$VERSION"

if [ "${SPROUT_CLIPS_NO_UPLOAD:-}" = "1" ]; then
  cp "$WORK/voice-pack.json" "${SPROUT_CLIPS_OUT:?Set SPROUT_CLIPS_OUT to a path outside the repo}"
  echo "Not uploaded. Saved to $SPROUT_CLIPS_OUT"
  exit 0
fi

echo "Uploading to R2..."
npx wrangler r2 object put "$BUCKET/voice-pack.json" --file "$WORK/voice-pack.json" --content-type application/json --remote
echo "Done. Each signed-in iPad downloads the pack the next time the app opens."
