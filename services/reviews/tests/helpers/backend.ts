import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A real child process and loopback HTTP, not a mocked listener or DB reopen.
export async function backend(serverPath: string, staticDir?: string) {
  const dir = await mkdtemp(join(tmpdir(), "reviews-process-"));
  const probe = createServer();
  try {
    await new Promise<void>((ok, no) => {
      probe.once("error", no);
      probe.listen(0, "127.0.0.1", ok);
    });
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((ok, no) => probe.close((e) => (e ? no(e) : ok())));
  const site = `http://127.0.0.1:${port}`;
  let child: ChildProcess | undefined;
  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const timer = setTimeout(() => child?.kill("SIGKILL"), 5000);
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  }
  async function start() {
    child = spawn(
      process.execPath,
      ["--experimental-strip-types", serverPath],
      {
        env: {
          ...process.env,
          REVIEWS_MODE: "local",
          REVIEWS_DATA_DIR: dir,
          REVIEWS_STATIC_DIR: staticDir ?? dir,
          REVIEWS_CLOSED: "false",
          HOST: "127.0.0.1",
          PORT: String(port),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    try {
      await new Promise<void>((ok, no) => {
        const timer = setTimeout(
          () => no(new Error("Backend readiness timeout")),
          10000,
        );
        const fail = () => {
          clearTimeout(timer);
          no(new Error("Backend exited before readiness"));
        };
        child!.once("error", fail);
        child!.once("exit", fail);
        child!.stdout!.on("data", (data) => {
          if (String(data).includes("listening on")) {
            clearTimeout(timer);
            child!.removeListener("exit", fail);
            child!.removeListener("error", fail);
            ok();
          }
        });
        child!.stderr!.resume(); // Never log private responses or local credentials.
      });
      const health = await fetch(site + "/v1/config");
      if (!health.ok || !(await health.json()).local)
        throw new Error("Backend health failed");
    } catch (e) {
      await stop();
      throw e;
    }
  }
  try {
    await start();
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
  return {
    site,
    get pid() {
      return child!.pid;
    },
    async restart() {
      await stop();
      await start();
    },
    async close() {
      await stop();
      await rm(dir, { recursive: true, force: true });
    },
    async json(path: string, body?: unknown, token?: string) {
      const response = await fetch(site + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          origin: site,
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
          ...(token ? { authorization: "Bearer " + token } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok)
        throw new Error(`Synthetic HTTP ${path}: ${response.status}`);
      return response.json();
    },
  };
}
