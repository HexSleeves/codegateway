#!/usr/bin/env node

import { Command } from 'commander';
import { registerAnalyzeCommand } from './commands/analyze.js';
import { registerInitCommand } from './commands/init.js';

const program = new Command();

program
  .name('codegateway')
  .description('CodeGateway - AI Code Review Trust Layer')
  .version('1.0.0');

registerAnalyzeCommand(program);
registerInitCommand(program);

program.parse();
