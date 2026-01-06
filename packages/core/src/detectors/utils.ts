import { type Node, Project, SyntaxKind } from 'ts-morph';

/** Shared ts-morph Project configuration */
const PROJECT_OPTIONS = {
  useInMemoryFileSystem: true,
  compilerOptions: {
    allowJs: true,
    checkJs: false,
  },
} as const;

/** Create a new ts-morph Project with standard configuration */
export function createProject(): Project {
  return new Project(PROJECT_OPTIONS);
}

/** Truncate code to a maximum length, adding ellipsis if needed */
export function truncateCode(code: string, maxLength: number): string {
  if (code.length <= maxLength) return code;
  return `${code.slice(0, maxLength - 3)}...`;
}

/** Get the name of a function node, if available */
export function getFunctionName(func: Node): string | undefined {
  if (func.isKind(SyntaxKind.FunctionDeclaration)) {
    return func.asKind(SyntaxKind.FunctionDeclaration)?.getName();
  }
  if (func.isKind(SyntaxKind.MethodDeclaration)) {
    return func.asKind(SyntaxKind.MethodDeclaration)?.getName();
  }
  // Arrow functions don't have names, try to get from variable declaration
  const varDecl = func.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
  return varDecl?.getName();
}

/** Check if a node is a descendant of another node */
export function isDescendantOf(node: Node, ancestor: Node): boolean {
  let current: Node | undefined = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.getParent();
  }
  return false;
}
