import { describe, expect, it } from "vitest";
import { isPrivateIP, validateDestinationUrl } from "../lib/url-security";

describe("url-security", () => {
  it("accepts http/https", async () => {
    for (const u of ["https://example.com", "http://example.com/a?b=c"]) {
      const r = await validateDestinationUrl(u, { resolveDns: false });
      expect(r.ok).toBe(true);
    }
  });

  it("rejects dangerous schemes", async () => {
    for (const u of [
      "javascript:alert(1)",
      "data:text/html,<h1>x</h1>",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
      "ftp://example.com/x",
    ]) {
      const r = await validateDestinationUrl(u, { resolveDns: false });
      expect(r.ok).toBe(false);
    }
  });

  it("rejects credential URLs", async () => {
    const r = await validateDestinationUrl("https://user:pass@example.com/", {
      resolveDns: false,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects malformed URLs", async () => {
    for (const u of ["", "not a url", "://missing", "https://"]) {
      const r = await validateDestinationUrl(u, { resolveDns: false });
      expect(r.ok).toBe(false);
    }
  });

  it("blocks SSRF literals (localhost/private/metadata)", async () => {
    const bad = [
      "http://localhost/admin",
      "http://127.0.0.1/",
      "http://0.0.0.0/",
      "http://10.0.0.5/",
      "http://172.16.5.4/",
      "http://192.168.1.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/",
      "http://[fe80::1]/",
    ];
    for (const u of bad) {
      const r = await validateDestinationUrl(u, { resolveDns: false });
      expect(r.ok).toBe(false);
    }
  });

  it("isPrivateIP covers v4/v6 ranges", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("10.1.2.3")).toBe(true);
    expect(isPrivateIP("172.20.1.1")).toBe(true);
    expect(isPrivateIP("192.168.0.1")).toBe(true);
    expect(isPrivateIP("::1")).toBe(true);
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
  });

  it("rejects header-injection / overlong input", async () => {
    const r = await validateDestinationUrl("https://example.com/" + "a".repeat(3000), {
      resolveDns: false,
    });
    expect(r.ok).toBe(false);
  });
});
