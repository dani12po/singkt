import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inspectMedia, streamMediaProxied } from "../lib/downloader/guards";
import { __muxActive, muxAvailable, muxStream } from "../lib/downloader/mux";

process.env.SINGKAT_ALLOW_PRIVATE = "1";
process.env.MEDIA_SEGMENT_BYTES = String(1024 * 1024); // 1 MiB segments for tests
vi.stubEnv("USING_VITEST", "1");

const BYTES_2K = Buffer.alloc(2048, 7);
const BIG = Buffer.alloc(3 * 1024 * 1024);
for (let i = 0; i < BIG.length; i++) BIG[i] = i % 251;

let server: http.Server;
let base = "";

function localUrl(p: string): string {
  return `${base}${p}`;
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = http.createServer((req, res) => {
      const u = new URL(req.url ?? "/", "http://x");
      if (u.pathname === "/head403.mp4") {
        if (req.method === "HEAD") {
          res.writeHead(403);
          res.end();
          return;
        }
        res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": BYTES_2K.length });
        res.end(BYTES_2K);
        return;
      }
      if (u.pathname === "/octet.mp4" || u.pathname === "/octet") {
        res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": BYTES_2K.length });
        res.end(req.method === "HEAD" ? undefined : BYTES_2K);
        return;
      }
      if (u.pathname === "/redir") {
        res.writeHead(302, { Location: "/head403.mp4" });
        res.end();
        return;
      }
      if (u.pathname === "/redir-evil") {
        res.writeHead(302, { Location: "http://127.0.0.1:9/dead" });
        res.end();
        return;
      }
      if (u.pathname === "/slow") {
        if (req.method === "HEAD") {
          res.writeHead(200, { "Content-Type": "video/mp4" });
          res.end();
          return;
        }
        res.writeHead(200, { "Content-Type": "video/mp4" });
        let n = 0;
        const t = setInterval(() => {
          n++;
          if (n > 13) {
            clearInterval(t);
            res.end();
            return;
          }
          res.write(Buffer.alloc(64, n));
        }, 5000);
        return;
      }
      if (u.pathname === "/range.mp4") {
        const total = BYTES_2K.length;
        const range = req.headers.range ?? "";
        const m = range.match(/bytes=(\d*)-(\d*)/);
        if (m) {
          const start = m[1] ? Number(m[1]) : 0;
          const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
          res.writeHead(206, {
            "Content-Type": "video/mp4",
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Content-Length": end - start + 1,
          });
          res.end(req.method === "HEAD" ? undefined : BYTES_2K.subarray(start, end + 1));
          return;
        }
        res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": total });
        res.end(req.method === "HEAD" ? undefined : BYTES_2K);
        return;
      }
      if (u.pathname === "/big.mp4") {
        // 3 MiB file with full Range support (segmented path: 1 MiB segments).
        const total = BIG.length;
        const range = req.headers.range ?? "";
        const m = range.match(/bytes=(\d*)-(\d*)/);
        if (m) {
          const start = m[1] ? Number(m[1]) : 0;
          const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
          res.writeHead(206, {
            "Content-Type": "video/mp4",
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Content-Length": end - start + 1,
          });
          res.end(req.method === "HEAD" ? undefined : BIG.subarray(start, end + 1));
          return;
        }
        res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": total });
        res.end(req.method === "HEAD" ? undefined : BIG);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, "127.0.0.1", () => {
      const a = server.address();
      base = typeof a === "object" && a ? `http://127.0.0.1:${a.port}` : "";
      resolve();
    });
  });
}, 30000);

afterAll(async () => {
  delete process.env.SINGKAT_ALLOW_PRIVATE;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("local mock-server guards", () => {
  it("HEAD 403 + GET 200 still inspects OK", async () => {
    const r = await inspectMedia(localUrl("/head403.mp4"), "video");
    expect(r.ok).toBe(true);
  });

  it("octet-stream accepted only with matching extension", async () => {
    expect((await inspectMedia(localUrl("/octet.mp4"), "video")).ok).toBe(true);
    const bad = await inspectMedia(localUrl("/octet"), "video");
    expect(bad.ok).toBe(false);
  });

  it("relative redirects are followed and validated", async () => {
    const r = await inspectMedia(localUrl("/redir"), "video");
    expect(r.ok).toBe(true);
    expect(r.ok && r.url).toContain("/head403.mp4");
  });

  it("slow body (>60s total) stays intact while data flows", async () => {
    const res = await streamMediaProxied(localUrl("/slow"), "video", "slow.mp4");
    expect(res instanceof Response).toBe(true);
    if (!(res instanceof Response)) return;
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBe(13 * 64);
  }, 120000);

  it("client Range is forwarded and 206 relayed", async () => {
    const res = await streamMediaProxied(localUrl("/range.mp4"), "video", "r.mp4", {
      clientRange: "bytes=0-1023",
    });
    expect(res instanceof Response).toBe(true);
    if (!(res instanceof Response)) return;
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toContain("bytes 0-1023/");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBe(1024);
  });

  it("segmented download reassembles large files byte-exact", async () => {
    const res = await streamMediaProxied(localUrl("/big.mp4"), "video", "big.mp4");
    expect(res instanceof Response).toBe(true);
    if (!(res instanceof Response)) return;
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe(String(BIG.length));
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBe(BIG.length);
    expect(Buffer.compare(buf, BIG)).toBe(0);
  });
});

describe("ssrf redirect guard (no private bypass)", () => {
  it("redirects to internal addresses are rejected", async () => {
    delete process.env.SINGKAT_ALLOW_PRIVATE;
    try {
      const r = await inspectMedia(localUrl("/redir-evil"), "video");
      expect(r.ok).toBe(false);
    } finally {
      process.env.SINGKAT_ALLOW_PRIVATE = "1";
    }
  });
});

describe("ffmpeg pipe mux", () => {
  it("streams bytes early and releases the slot", async () => {
    if (!(await muxAvailable())) {
      console.warn("ffmpeg missing — skipping pipe mux test");
      return;
    }
    const dir = tmpdir();
    const v = join(dir, `mux-t-v-${Date.now()}.mp4`);
    const a = join(dir, `mux-t-a-${Date.now()}.wav`);
    const run = (args: string[]) =>
      new Promise<void>((resolve, reject) => {
        execFile("ffmpeg", ["-y", ...args], { windowsHide: true }, (e) => (e ? reject(e) : resolve()));
      });
    await run(["-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", v]);
    await run(["-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:a", "pcm_s16le", a]);
    // Serve the fixtures over the local server via file round-trip:
    const vb = await readFile(v);
    const ab = await readFile(a);
    const vPath = `/fix-v-${Date.now()}.mp4`;
    const aPath = `/fix-a-${Date.now()}.wav`;
    const srv = http.createServer((req, res) => {
      if (req.url === vPath) {
        res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": vb.length });
        res.end(req.method === "HEAD" ? undefined : vb);
        return;
      }
      if (req.url === aPath) {
        res.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": ab.length });
        res.end(req.method === "HEAD" ? undefined : ab);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", () => resolve()));
    const addr = srv.address();
    const b = typeof addr === "object" && addr ? `http://127.0.0.1:${addr.port}` : "";
    try {
      const before = __muxActive();
      const started = Date.now();
      const { stream, cleanup } = await muxStream({ v: `${b}${vPath}`, a: `${b}${aPath}`, cont: "mp4", signal: null });
      const reader = stream.getReader();
      const first = await reader.read();
      const firstMs = Date.now() - started;
      expect(first.done).toBe(false);
      expect((first.value as Uint8Array).length).toBeGreaterThan(0);
      expect(firstMs).toBeLessThan(60000);
      // Drain fully, then slot must release:
      let chunks = 0;
      for (;;) {
        const n = await reader.read();
        if (n.done) break;
        chunks++;
      }
      expect(chunks).toBeGreaterThan(0);
      cleanup();
      await new Promise((r) => setTimeout(r, 200));
      expect(__muxActive()).toBe(before);
    } finally {
      await new Promise<void>((resolve) => srv.close(() => resolve()));
    }
  }, 120000);
});
