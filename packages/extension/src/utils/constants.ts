/** Supported language IDs for analysis */
export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'typescriptreact',
  'javascriptreact',
] as const;

/** Check if a language ID is supported */
export function isSupportedLanguage(languageId: string): boolean {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(languageId);
}
