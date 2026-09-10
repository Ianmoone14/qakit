import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'ianmoone14';
const PACKAGES = ['contracts', 'core', 'playwright', 'api', 'cli'];
const npmBin = 'npm';

function githubName(qakitName) {
  return `@${OWNER}/qakit-${qakitName.slice('@qakit/'.length)}`;
}

function rewriteQakitDeps(deps) {
  if (deps === undefined) {
    return undefined;
  }
  const next = { ...deps };
  for (const [name, spec] of Object.entries(next)) {
    if (!name.startsWith('@qakit/') || typeof spec !== 'string') {
      continue;
    }
    let version = spec;
    if (spec.startsWith('workspace:')) {
      const folder = name.slice('@qakit/'.length);
      const pkg = JSON.parse(
        readFileSync(path.join(repoRoot, 'packages', folder, 'package.json'), 'utf8'),
      );
      version = pkg.version;
    }
    next[name] = `npm:${githubName(name)}@${version}`;
  }
  return next;
}

const token = process.env.NODE_AUTH_TOKEN ?? process.env.GITHUB_TOKEN;
if (token === undefined || token.length === 0) {
  throw new Error('Set NODE_AUTH_TOKEN or GITHUB_TOKEN (GitHub PAT with write:packages).');
}

const work = mkdtempSync(path.join(tmpdir(), 'qakit-gh-'));
writeFileSync(
  path.join(work, '.npmrc'),
  `@${OWNER}:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${token}\n`,
);

try {
  for (const dir of PACKAGES) {
    const src = path.join(repoRoot, 'packages', dir);
    const dest = path.join(work, dir);
    const pkg = JSON.parse(readFileSync(path.join(src, 'package.json'), 'utf8'));
    cpSync(path.join(src, 'dist'), path.join(dest, 'dist'), { recursive: true });

    const published = {
      name: githubName(pkg.name),
      version: pkg.version,
      description: pkg.description,
      license: pkg.license,
      type: pkg.type,
      bin: pkg.bin,
      exports: pkg.exports,
      files: pkg.files,
      engines: pkg.engines,
      repository: {
        type: 'git',
        url: `https://github.com/${OWNER}/qakit.git`,
      },
      publishConfig: {
        registry: 'https://npm.pkg.github.com',
      },
    };
    if (pkg.dependencies !== undefined) {
      published.dependencies = rewriteQakitDeps(pkg.dependencies);
    }

    writeFileSync(path.join(dest, 'package.json'), `${JSON.stringify(published, null, 2)}\n`);
    writeFileSync(
      path.join(dest, '.npmrc'),
      `@${OWNER}:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${token}\n`,
    );
    execFileSync(npmBin, ['publish', '--access', 'public'], {
      cwd: dest,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_AUTH_TOKEN: token },
    });
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
