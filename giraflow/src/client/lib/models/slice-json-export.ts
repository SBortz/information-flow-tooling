import type { Slice } from './slice-model';
import { exportSlicesToJson } from './slice-model';

function extractBaseName(filePath: string): string {
  // Get filename from path
  const fileName = filePath.split('/').pop() ?? filePath;
  // Remove .giraflow.json suffix
  const match = fileName.match(/^(.+)\.giraflow\.json$/i);
  return match ? match[1] : 'slices';
}

export function downloadSlicesJson(slices: Slice[], giraflowFilePath: string): void {
  const json = exportSlicesToJson(slices);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const baseName = extractBaseName(giraflowFilePath);
  const filename = `${baseName}.giraflow-slices.json`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
