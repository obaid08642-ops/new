// A Sentry stand-in: accepts envelopes on /api/<project>/envelope/ and appends one JSON line per error event
// ({ level, fingerprint, message, revalidate }) to the file given as the second argument.
//   node sentry-sink.mjs 4020 /tmp/sentry-events.jsonl
import fs from "node:fs";
import http from "node:http";
import zlib from "node:zlib";

const out = process.argv[3] || "/tmp/sentry-events.jsonl";
http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    let body = Buffer.concat(chunks);
    if (req.headers["content-encoding"] === "gzip") body = zlib.gunzipSync(body);
    const lines = body.toString("utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      let item;
      try { item = JSON.parse(lines[i]); } catch { continue; }
      if (item?.exception || item?.level || item?.message) {
        fs.appendFileSync(out, JSON.stringify({
          level: item.level, fingerprint: item.fingerprint, type: item.exception?.values?.[0]?.type,
          message: item.exception?.values?.[0]?.value ?? item.message, nextjs: item.contexts?.nextjs, tags: item.tags,
        }) + "\n");
      }
    }
    res.writeHead(200, { "content-type": "application/json" }).end("{}");
  });
}).listen(Number(process.argv[2] || 4020), "127.0.0.1");
