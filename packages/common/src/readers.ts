import { ExternalProgramResult } from '.';

export interface CustomPandocReader {
  name: string;
  readFile: (
    path: string,
    options?: string[],
  ) => Promise<ExternalProgramResult>;
}

export const CUSTOM_PANDOC_READERS: Record<string, CustomPandocReader> = {};
