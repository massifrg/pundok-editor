import type {
  EditorKeyType,
  RenderingJob,
  ServerMessageForViewer,
} from '../../../common/src';
import type { RendererHub } from '../rendererHub';

export function showAgain(
  events: RendererHub,
  job: RenderingJob | undefined,
  documentHash: string,
  editorKey: EditorKeyType,
): void {
  if (!job) throw new Error('Export job no longer available');
  const projectAsJson =
    typeof job.project === 'string' ? job.project : JSON.stringify(job.project);
  const message: ServerMessageForViewer = {
    type: 'viewer',
    editorKey,
    setup: {
      name: job.path,
      content: '',
      projectAsJson,
      documentHash,
    },
  };
  events.send('show-in-viewer', message);
}
