/**
 * FCM probe unit tests.
 *
 * FCM is two-step — OAuth2 then messages:send. We mock both round
 * trips with a sequence of responses keyed off the URL.
 *
 * Critical truth table we're locking down:
 *
 *   OAuth2 4xx                              → broken (service acct dead)
 *   OAuth2 5xx                              → transient
 *   messages:send INVALID_ARGUMENT          → ok (bogus token rejected)
 *   messages:send UNREGISTERED              → ok
 *   messages:send 401 UNAUTHENTICATED       → broken
 *   messages:send 403 PERMISSION_DENIED     → broken
 *   messages:send 404 NOT_FOUND             → broken (project gone)
 *   messages:send 429                       → transient
 *   messages:send 5xx                       → transient
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { probeFcmCredentials } from "./fcm";

// Matching RSA-signed private key in PKCS#8 PEM. FCM service accounts
// use RS256 (not ES256 like APNs), so this is a distinct key type.
// Generated deterministically; not trusted anywhere.
const TEST_RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBRE0fCp+xshIK
MEvw0uBs17zUWf5IHjqTRM5RZ5m+iIqFumYT3NYUHtn4vULY6ly8SbHk1gAkt2Nl
7a3RClDWwuUPT6jpLUzBXbk/DYYnAGC7KTfF30vFppmsUHd+s74yAaVGTF5jj24T
MxgA95YoRRV2OrmQ8JVVPQLo2VUgLHt/qOJzjF2+XwSpRUehqVeu0NN6yVkZXmup
TI0h1NvBu3Xf3d4FF8Apin/ngXZRWtI4vFmvOIn9Va4yBJJZPRmhNfcpQgDejl3j
fq/OfNpKMNqq0FGAmLT7wLiWHpfnUldtUVkMSc2C/J8N5mqs96HfgJrdrZQ0Nazh
thv/bwspAgMBAAECggEAA9ot36xqppNyHzNy37gqppINzE24M9MPrvFHTEXMtjQM
e3LcvL6vcwDJJe3+efDKsoIBgb3O6+S+PNsHG5cCCpvOibjSO31uYzCk8AzJ2VVh
SN7ZZjVw6nu65lbUVXlm8IENETetTe64tpIsjGRNjApXbv+VXI4O54E1+SL+u/Fd
rBwY48TBj4Qk46d8AbrSuKvhcDKcC8xSSHmcGeMnjUWUnj2OVjgjyUkoQPPAjWzC
q4iUsbp5u3wKcKTkxfE5z8d/7gdRWSoNPgZO2SGkGY0M+U4YgIMLTbAqWv9XlauR
bHVHtK3c8Ai9J6yJFS9fvc+4IA99QShJiPfu2bzseQKBgQD36bQxp9gSvJ+ZzLJ9
ZN9QwtQSaqxvzVL4OPn7PE46PdcPhsH3hjaMPv63qKXm0TDGBFMY8fgJIDk5ZvMo
3EHGoUsx6CzmgHYubRxVnHzYA7/89QevS4qEVHEgUCcYxRpUnQ7gwPJIOrxzp5ex
8jSfH0Vp9DiBJKe0AfyWHeBBpwKBgQDHhbJaXpr+LcoIOP0qZW99T+Ch9Hw3I8Ir
gS35HUhW2e1RY78BWcDOM47mrk1xCoQBlBsKmEX0n+vwX0hi1BzHDQLNHvuCFGYx
oFfsl2CXMOB4Eq3xrOFmnTsqBNvHfx3TKhAd48KKKMDAF2Bg12r7kSfgXIWcl9Wq
W0gHbq1pzwKBgQCyYiKqxjKMapN5NhByjA96UvdzjWbGbSNYZ78AvdqhFHxoQe9c
cDOaIZCFmLM/xxDwuz0d9g1yOiafDtM/MzucP55dgBQhjOpIwFGEQgMWs/v8DOC0
ZJNBDW+X8TYmYuTnvdHVz9XqefpI5JOzoFM1/bAv0nR94Dn+CwMcRRp9xQKBgH5m
GMPYHGQKtBnxqm0OeIPr/7pGa+SfJC4Vk4ryJVPWXKqTyYWO4/s0sbxaE7Wlwaj0
ywFsTgV+L8rvSGiSfF2TXm+6k2jUCuMK5wwc+iXhR3IEVpvbDKCZlKIjFrO+8EH9
A3/UkHm5HhyNqAN+OZM+aOdNtOQmvzHoAMFfu4QbAoGBAJVGWW+0hTYdSIyDi0ML
hX/nMKCQmKwV2Tu8yoPyD2a7oEWkQxOnRrpMxHFcf60I+cmNvIVnrcXGwEm1tDH9
+GwmaxfVBkgs2mfFBDYlpfkx5ESV9GJnGmOXz+GLXIEdAk0nHWVrMKvsFqeb2ykd
MzNxjI1pMpDgJVeZmC9MYvxg
-----END PRIVATE KEY-----`;

const baseServiceAccount = {
  client_email: "test@edgepush-test.iam.gserviceaccount.com",
  private_key: TEST_RSA_PRIVATE_KEY,
  project_id: "edgepush-test",
};

const baseInput = {
  serviceAccountJson: JSON.stringify(baseServiceAccount),
  projectId: "edgepush-test",
};

/**
 * Mock fetch that returns different responses based on URL. The first
 * call is always OAuth2 (oauth2.googleapis.com/token), the second is
 * messages:send (fcm.googleapis.com/v1/projects/.../messages:send).
 */
function mockFcmFetchSequence(opts: {
  oauth?: { status: number; body: unknown };
  send?: { status: number; body: unknown };
}) {
  const mock = vi.fn((url: string) => {
    if (url.includes("oauth2.googleapis.com")) {
      const oauth = opts.oauth ?? {
        status: 200,
        body: { access_token: "fake-token", expires_in: 3600 },
      };
      return Promise.resolve({
        ok: oauth.status >= 200 && oauth.status < 300,
        status: oauth.status,
        text: () => Promise.resolve(JSON.stringify(oauth.body)),
        json: () => Promise.resolve(oauth.body),
      } as Response);
    }
    if (url.includes("fcm.googleapis.com")) {
      const send = opts.send ?? { status: 400, body: {} };
      return Promise.resolve({
        ok: send.status >= 200 && send.status < 300,
        status: send.status,
        text: () => Promise.resolve(JSON.stringify(send.body)),
      } as Response);
    }
    throw new Error(`unexpected fetch url: ${url}`);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("probeFcmCredentials", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ok when OAuth2 succeeds and FCM rejects bogus token as INVALID_ARGUMENT", async () => {
    mockFcmFetchSequence({
      send: {
        status: 400,
        body: { error: { status: "INVALID_ARGUMENT", message: "bad token" } },
      },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("ok");
  });

  it("returns ok when FCM rejects with UNREGISTERED", async () => {
    mockFcmFetchSequence({
      send: {
        status: 404,
        body: { error: { status: "UNREGISTERED", message: "unregistered" } },
      },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("ok");
  });

  it("returns broken when OAuth2 returns 401 (service account deleted)", async () => {
    mockFcmFetchSequence({
      oauth: { status: 401, body: { error: "invalid_grant" } },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("broken");
    expect(result.error).toContain("OAuth2");
  });

  it("returns broken when OAuth2 returns 400", async () => {
    mockFcmFetchSequence({
      oauth: { status: 400, body: { error: "invalid_client" } },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("broken");
  });

  it("returns transient when OAuth2 returns 5xx", async () => {
    mockFcmFetchSequence({
      oauth: { status: 503, body: {} },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("transient");
    expect(result.error).toContain("5xx");
  });

  it("returns broken on messages:send 401 UNAUTHENTICATED", async () => {
    mockFcmFetchSequence({
      send: {
        status: 401,
        body: { error: { status: "UNAUTHENTICATED", message: "auth rotten" } },
      },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("broken");
    expect(result.error).toContain("401");
  });

  it("returns broken on messages:send 403 PERMISSION_DENIED", async () => {
    mockFcmFetchSequence({
      send: {
        status: 403,
        body: {
          error: {
            status: "PERMISSION_DENIED",
            message: "missing cloudmessaging.messages:create",
          },
        },
      },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("broken");
    expect(result.error).toContain("permission");
  });

  it("returns broken on messages:send 404 NOT_FOUND (project gone)", async () => {
    mockFcmFetchSequence({
      send: {
        status: 404,
        body: {
          error: { status: "NOT_FOUND", message: "project not found" },
        },
      },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("broken");
    expect(result.error).toContain("project");
  });

  it("returns transient on messages:send 429", async () => {
    mockFcmFetchSequence({
      send: { status: 429, body: { error: { status: "RESOURCE_EXHAUSTED" } } },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("transient");
    expect(result.error).toContain("429");
  });

  it("returns transient on messages:send 5xx", async () => {
    mockFcmFetchSequence({
      send: { status: 503, body: {} },
    });
    const result = await probeFcmCredentials(baseInput);
    expect(result.state).toBe("transient");
  });

  it("returns broken when service account JSON is malformed", async () => {
    // No fetch mock needed — JSON.parse fails first.
    const result = await probeFcmCredentials({
      serviceAccountJson: "not json",
      projectId: "edgepush-test",
    });
    expect(result.state).toBe("broken");
    expect(result.error).toContain("malformed");
  });

  it("returns broken when service account JSON lacks client_email", async () => {
    const result = await probeFcmCredentials({
      serviceAccountJson: JSON.stringify({ private_key: TEST_RSA_PRIVATE_KEY }),
      projectId: "edgepush-test",
    });
    expect(result.state).toBe("broken");
  });

  it("hits /v1/projects/<projectId>/messages:send with the configured projectId", async () => {
    const mock = mockFcmFetchSequence({
      send: {
        status: 400,
        body: { error: { status: "INVALID_ARGUMENT" } },
      },
    });
    await probeFcmCredentials({ ...baseInput, projectId: "my-project" });
    const sendCall = mock.mock.calls.find((c) =>
      (c[0] as string).includes("fcm.googleapis.com"),
    );
    expect(sendCall).toBeDefined();
    expect(sendCall![0]).toContain("projects/my-project/messages:send");
  });
});
