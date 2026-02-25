import { OutputConverter, PundokEditorProject } from "./config";

export interface RenderingJob {
  path: string,
  converter: OutputConverter,
  configurationName?: string,
  project?: PundokEditorProject,
}
