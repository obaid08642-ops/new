// F82 (issue 426): brotli copies of the build's scripts and stylesheets, written next to them as `<file>.br`.
// Next serves /_next/static/ gzip-compressed only; server/nonce-server.mjs sends these files instead to a client that
// accepts br (about 14% fewer bytes on the scripts every page loads). Quality 11 is slow, so it is done once, here, after
// `next build`, and not per request. A file is skipped when brotli would not make it smaller.
//
//   node scripts/precompress-static.mjs [staticDir]     (default: .next/static)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const dir = path.resolve(process.argv[2] || path.join(process.cwd(), ".next", "static"));

function* files(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (entry.isFile() && /\.(?:js|css)$/.test(entry.name)) yield full;
  }
}

if (!fs.existsSync(dir)) {
  console.error(`precompress-static: ${dir} does not exist (run next build first)`);
  process.exit(1);
}
let count = 0;
let before = 0;
let after = 0;
for (const file of files(dir)) {
  const source = fs.readFileSync(file);
  const compressed = zlib.brotliCompressSync(source, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: source.length },
  });
  if (compressed.length >= source.length) continue;
  fs.writeFileSync(`${file}.br`, compressed);
  count += 1;
  before += source.length;
  after += compressed.length;
}
console.log(`precompress-static: ${count} files, ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB brotli`);
