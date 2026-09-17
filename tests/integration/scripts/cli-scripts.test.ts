import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);

/**
 * The CLI entry points are the one thing the rest of the suite cannot cover: every other test
 * imports modules directly, and `tests/setup.ts` mocks `server-only` away, so a module that would
 * blow up under `tsx` still looks fine. Here the script is spawned for real.
 *
 * Regression: the bot modules import `server-only`, which throws outside Next. The scripts pass
 * `--conditions=react-server` so the package resolves to its own empty module — without it the
 * worker died on the first import and the queue was never drained.
 */
async function runScript(script: string, env: Record<string, string | undefined>) {
  try {
    const { stdout, stderr } = await run('pnpm', [script], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      timeout: 60_000,
    });
    return { code: 0, output: stdout + stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

describe('Scripts de línea de comandos', () => {
  it('the worker loads its modules outside Next and reaches its own startup check', async () => {
    // Without a key it must stop on OUR message, not on a module-resolution error.
    const { code, output } = await runScript('bot:worker', { GOOGLE_API_KEY: '' });

    expect(output).toContain('Falta GOOGLE_API_KEY');
    expect(output).not.toContain('cannot be imported from a Client Component');
    expect(code).toBe(1);
  }, 70_000);

  it('the knowledge ingest script runs end to end', async () => {
    const { output } = await runScript('knowledge:ingest', {});

    expect(output).toMatch(/Documentos tomados: \d+/);
    expect(output).not.toContain('cannot be imported from a Client Component');
  }, 70_000);

  it('the sales expiration job still runs', async () => {
    const { code, output } = await runScript('sales:expire', {});

    expect(output).toMatch(/Ventas expiradas: \d+/);
    expect(code).toBe(0);
  }, 70_000);
});
