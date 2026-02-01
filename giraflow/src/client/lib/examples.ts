/**
 * Dynamically loaded example Giraflow models for public mode.
 * Uses Vite's import.meta.glob to automatically discover all examples.
 */

import type { GiraflowModel } from './types';

export interface Example {
  id: string;
  name: string;
  description: string;
  model: GiraflowModel;
  /** Folder name in public/examples/ (without .giraflow suffix) */
  folderName: string | null;
}

// Dynamically import all .giraflow.json files from example-giraflows
const exampleModules = import.meta.glob<{ default: GiraflowModel }>(
  '../../../../example-giraflows/*.giraflow.json',
  { eager: true }
);

// Build examples array from discovered modules
export const examples: Example[] = Object.entries(exampleModules)
  .map(([path, module]) => {
    // Extract folder name from path: "../../../../example-giraflows/simple-todo-app.giraflow.json" -> "simple-todo-app"
    const fileName = path.split('/').pop() || '';
    const folderName = fileName.replace('.giraflow.json', '');
    const model = module.default;

    return {
      id: folderName,
      name: model.name || folderName,
      description: model.description || '',
      model,
      folderName
    };
  })
  .sort((a, b) => {
    // Empty template always last
    if (a.id === 'empty-template') return 1;
    if (b.id === 'empty-template') return -1;
    return a.name.localeCompare(b.name);
  });

export function getExampleById(id: string): Example | undefined {
  return examples.find(e => e.id === id);
}

export function getDefaultExample(): Example {
  return examples[0];
}

export function getEmptyTemplate(): Example | undefined {
  return examples.find(e => e.id === 'empty-template');
}
