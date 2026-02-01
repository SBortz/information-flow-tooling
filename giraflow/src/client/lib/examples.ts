/**
 * Dynamically loaded example Giraflow models for public mode.
 * Uses Vite's import.meta.glob to automatically discover all examples.
 */

import type { InformationFlowModel } from './types';

export interface Example {
  id: string;
  name: string;
  description: string;
  model: InformationFlowModel;
  /** Folder name in public/examples/ (without .giraflow suffix) */
  folderName: string | null;
}

// Dynamically import all .giraflow.json files from example-giraflows
const exampleModules = import.meta.glob<{ default: InformationFlowModel }>(
  '../../../../example-giraflows/*.giraflow.json',
  { eager: true }
);

// Empty template for creating new models
const emptyTemplate: InformationFlowModel = {
  "$schema": "giraflow.schema.json",
  "name": "New Model",
  "description": "Start building your information flow model here",
  "version": "1.0.0",
  "timeline": [
    {
      "type": "state",
      "name": "InitialState",
      "tick": 1,
      "sourcedFrom": [],
      "example": {}
    },
    {
      "type": "actor",
      "name": "User",
      "tick": 2,
      "readsView": "InitialState",
      "sendsCommand": "DoSomething"
    },
    {
      "type": "command",
      "name": "DoSomething",
      "tick": 3,
      "example": { "data": "example" }
    },
    {
      "type": "event",
      "name": "SomethingHappened",
      "tick": 4,
      "producedBy": "DoSomething-3",
      "example": { "result": "success" }
    }
  ],
  "specifications": []
};

// Build examples array from discovered modules
export const examples: Example[] = [
  // Dynamically discovered examples
  ...Object.entries(exampleModules).map(([path, module]) => {
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
  }).sort((a, b) => a.name.localeCompare(b.name)),

  // Empty template (always last)
  {
    id: 'empty-template',
    name: 'Empty Template',
    description: 'A blank template to start your own model',
    model: emptyTemplate,
    folderName: null
  }
];

export function getExampleById(id: string): Example | undefined {
  return examples.find(e => e.id === id);
}

export function getDefaultExample(): Example {
  return examples[0];
}
