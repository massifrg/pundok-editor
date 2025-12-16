import { OutputConverter } from "./config";

export interface ExportJob {
  path: string,
  converter: OutputConverter,
  configurationName?: string,
  projectAsJsonString?: string,
}
