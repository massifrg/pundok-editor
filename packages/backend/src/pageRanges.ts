import { readFile } from 'node:fs/promises';
import type { ProjectComponent } from '../../common/src';
import { withPageRangesFromSynctex } from '../../common/src';

/**
 * Populates project components with the PDF page ranges found in SyncTeX
 * output.
 */
export function populatePageRangesFromSynctex(
  structure: ProjectComponent,
  synctexOutput: string,
  projectPath?: string,
): ProjectComponent {
  return withPageRangesFromSynctex(structure, synctexOutput, projectPath);
}

/**
 * Reads a SyncTeX file and populates project components with its page ranges.
 */
export async function populatePageRangesFromSynctexFile(
  structure: ProjectComponent,
  synctexFile: string,
  projectPath?: string,
): Promise<ProjectComponent> {
  const synctexOutput = await readFile(synctexFile, 'utf8');
  return populatePageRangesFromSynctex(
    structure,
    synctexOutput,
    projectPath,
  );
}
