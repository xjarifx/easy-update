import { spawn } from "node:child_process";

const server = spawn("npm", ["run", "dev:server"], {
  stdio: "inherit",
});

const waitForServer = async () => {
  const maxAttempts = 120;
  const delayMs = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch("http://localhost:4000/api/health");

      if (response.ok) {
        return;
      }
    } catch {
      // Keep waiting until the backend is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Timed out waiting for the backend to start.");
};

const shutdown = () => {
  server.kill("SIGTERM");
  if (client) {
    client.kill("SIGTERM");
  }
};

let client = null;

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await waitForServer();
  client = spawn("npm", ["run", "dev:client"], {
    stdio: "inherit",
  });

  client.on("exit", (code) => {
    shutdown();
    process.exit(code ?? 0);
  });

  server.on("exit", (code) => {
    if (client) {
      client.kill("SIGTERM");
    }
    process.exit(code ?? 0);
  });
} catch (error) {
  console.error(error);
  shutdown();
  process.exit(1);
}
