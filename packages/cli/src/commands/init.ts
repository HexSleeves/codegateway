import { createDefaultConfigFile, findConfigFile } from '@codegateway/shared';
import type { Command } from 'commander';

interface InitOptions {
  force?: boolean;
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Create a codegateway.config.json file')
    .option('-f, --force', 'Overwrite existing config file')
    .action((options: InitOptions) => {
      const existingConfig = findConfigFile(process.cwd());

      if (existingConfig && !options.force) {
        console.error(`Config file already exists: ${existingConfig}`);
        console.error('Use --force to overwrite.');
        process.exit(1);
      }

      const configPath = createDefaultConfigFile(process.cwd());
      console.log(`Created config file: ${configPath}`);
    });
}
