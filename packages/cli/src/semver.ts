export interface Triple {
  major: number;
  minor: number;
  patch: number;
}

/** Strip a leading ^ or ~ from an exact x.y.z pin. */
export function parsePinnedVersion(spec: string): Triple | undefined {
  const cleaned = spec.trim().replace(/^[~^]/, '');
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(cleaned);
  if (match === null) {
    return undefined;
  }
  const major = match[1];
  const minor = match[2];
  const patch = match[3];
  if (major === undefined || minor === undefined || patch === undefined) {
    return undefined;
  }
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
}

export function formatTriple(version: Triple): string {
  return `${String(version.major)}.${String(version.minor)}.${String(version.patch)}`;
}

export function compareTriples(a: Triple, b: Triple): number {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

export function isMajorUpgrade(from: Triple, to: Triple): boolean {
  return to.major > from.major;
}
