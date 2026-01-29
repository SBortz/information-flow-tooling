import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSliceViewModel, exportSlicesToJson } from '../../../shared/slice-builder.js';
import type { InformationFlowModel } from '../../../shared/types.js';

export function generateSlicesCommand(): Command {
  return new Command('generate-slices')
    .description('Generate slices.json from a .giraflow.json model')
    .argument('<file>', 'Path to .giraflow.json file')
    .action((file: string) => {
      const filePath = path.resolve(file);

      if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const model = JSON.parse(content) as InformationFlowModel;
      const slices = buildSliceViewModel(model);

      // Write to asset folder: hotel.giraflow.json → hotel.giraflow/slices.json
      const giraflowDir = filePath.replace(/\.json$/i, '');
      if (!fs.existsSync(giraflowDir)) {
        fs.mkdirSync(giraflowDir, { recursive: true });
      }
      const slicesPath = path.join(giraflowDir, 'slices.json');
      fs.writeFileSync(slicesPath, exportSlicesToJson(slices.slices));

      console.log(`Slices written to ${slicesPath}`);
    });
}
