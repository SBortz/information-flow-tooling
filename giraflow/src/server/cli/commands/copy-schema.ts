import { Command } from 'commander';
import { copyFileSync } from 'fs';
import { join } from 'path';
import { getBundledSchemaPath } from '../validation.js';

export function copySchemaCommand(): Command {
  return new Command('copy-schema')
    .description('Copy giraflow.schema.json to the current directory')
    .action(() => {
      const schemaSource = getBundledSchemaPath();
      if (!schemaSource) {
        console.error('Error: Bundled schema not found');
        process.exit(1);
      }
      const dest = join(process.cwd(), 'giraflow.schema.json');
      copyFileSync(schemaSource, dest);
      console.log(`Schema copied to ${dest}`);
    });
}
