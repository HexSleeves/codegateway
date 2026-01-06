import { CONFIG_FILE_NAMES } from '@codegateway/shared';
import * as vscode from 'vscode';
import { isSupportedLanguage } from './constants.js';

/** Check if a document is a supported language for analysis */
export function isSupportedDocument(document: vscode.TextDocument): boolean {
  return isSupportedLanguage(document.languageId);
}

/** Check if a document is a CodeGateway config file */
export function isConfigFile(document: vscode.TextDocument): boolean {
  const fileName = document.uri.fsPath.split(/[/\\]/).pop() ?? '';
  return CONFIG_FILE_NAMES.includes(fileName);
}

/** Get workspace root directory */
export function getWorkspaceRoot(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0]!.uri.fsPath;
  }
  return process.cwd();
}
