const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function isProjectName(value: string): boolean {
  return PROJECT_NAME_PATTERN.test(value);
}
