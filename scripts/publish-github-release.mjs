import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'Ianmoone14';
const REPO = 'qakit';
const PACKAGES = ['contracts', 'core', 'playwright', 'api', 'cli'];

function tarballName(pkg) {
  return `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;
}

function tarballUrl(pkg, tag) {
  return `https://github.com/${OWNER}/${REPO}/releases/download/${tag}/${tarballName(pkg)}`;
}

function readPkg(dir) {
  return JSON.parse(readFileSync(path.join(repoRoot, 'packages', dir, 'package.json'), 'utf8'));
}

function releaseExists(tag) {
  try {
    execFileSync('gh', ['release', 'view', tag], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

const versions = Object.fromEntries(PACKAGES.map((dir) => [readPkg(dir).name, readPkg(dir)]));
const tag = `playground-${versions['@qakit/core'].version}`;

function rewriteQakitDeps(deps) {
  if (deps === undefined) {
    return undefined;
  }
  const next = { ...deps };
  for (const name of Object.keys(next)) {
    const dep = versions[name];
    if (dep !== undefined) {
      next[name] = tarballUrl(dep, tag);
    }
  }
  return next;
}

const work = mkdtempSync(path.join(tmpdir(), 'qakit-rel-'));
const tarballs = [];

try {
  for (const dir of PACKAGES) {
    const src = path.join(repoRoot, 'packages', dir);
    const dest = path.join(work, dir);
    const pkg = readPkg(dir);
    cpSync(path.join(src, 'dist'), path.join(dest, 'dist'), { recursive: true });

    const packed = {
      name: pkg.name,
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
        url: `git+https://github.com/${OWNER}/${REPO}.git`,
      },
    };
    if (pkg.dependencies !== undefined) {
      packed.dependencies = rewriteQakitDeps(pkg.dependencies);
    }

    writeFileSync(path.join(dest, 'package.json'), `${JSON.stringify(packed, null, 2)}\n`);
    execFileSync('npm', ['pack'], {
      cwd: dest,
      stdio: 'inherit',
      shell: true,
    });
    tarballs.push(path.join(dest, tarballName(pkg)));
  }

    const notesFile = path.join(work, 'notes.md');
    writeFileSync(
      notesFile,
      'Installable `@qakit/*` tarballs for a personal playground.\nThese are not the SixSentix GitLab registry packages.\n',
    );
    const title = `Playground packages ${versions['@qakit/core'].version}`;
    const ghArgs = !releaseExists(tag)
      ? ['release', 'create', tag, ...tarballs, '--title', title, '--notes-file', notesFile]
      : ['release', 'upload', tag, ...tarballs, '--clobber'];
    execFileSync('gh', ghArgs, {
      cwd: repoRoot,
      stdio: 'inherit',
    });

  console.log(`Published ${tag}`);
  for (const pkg of Object.values(versions)) {
    console.log(`  ${pkg.name}: ${tarballUrl(pkg, tag)}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
