import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { colors } from './colors.js';

/**
 * Get the path to the bundled schema (copied during build)
 */
export function getBundledSchemaPath(): string | null {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Check multiple locations: dist/server/ (production) and monorepo root (development with tsx)
  const candidates = [
    join(__dirname, '..', 'giraflow.schema.json'),           // dist/server/giraflow.schema.json
    join(__dirname, '..', '..', '..', '..', 'giraflow.schema.json'),  // monorepo root (dev mode from src/server/cli/)
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Validate a JSON document against a JSON Schema
 */
export async function validateAgainstSchema(
  json: unknown,
  schemaPath: string
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const schemaContent = await readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    const ajv = new Ajv.default({
      allErrors: true,
      verbose: true,
    });
    addFormats.default(ajv);

    const validate = ajv.compile(schema);
    const valid = validate(json);

    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors = (validate.errors || []).map((err: { instancePath?: string; message?: string }) => {
      const path = err.instancePath || '(root)';
      return `${path}: ${err.message}`;
    });

    return { valid: false, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, errors: [`Failed to load or parse schema: ${message}`] };
  }
}

/**
 * Print validation result
 */
export function printValidationResult(result: { valid: boolean; errors: string[] }): void {
  if (result.valid) {
    console.log(colors.green.bold('✓ Schema validation passed!'));
    console.log();
  } else {
    console.log(colors.red(`Schema validation failed with ${result.errors.length} error(s):`));
    for (const error of result.errors) {
      console.log(`  ${colors.red('•')} ${error}`);
    }
    console.log();
  }
}
