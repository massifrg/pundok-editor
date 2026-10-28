import type {
  CxDocument,
  EditorKeyType,
  RenderingBookmark,
} from '../../../common/src';
import { getConfigurationInit } from '../resourceManager';
import { exportDocument } from './saveDocument';
import { computeProjectFromFile, projectFileNameInDirectory } from './project';
import { isReadableFile } from '../resourceManager';
import { dirname, parse } from 'node:path';
import type { BackendDirectories } from '../resourceManager';
import type { FeedbackSink } from '../feedback';
import type { RendererHub } from '../rendererHub';
import type { RenderingJobStore } from '../documentHash';

export async function renderAgain(
  directories: BackendDirectories,
  events: RendererHub,
  feedback: FeedbackSink,
  renderingJobs: RenderingJobStore,
  bookmark: RenderingBookmark,
  editorKey: EditorKeyType,
): Promise<void> {
  const project = await findProject(directories, bookmark.documentPath);
  const configuration = project?.computedConfig ||
    await getConfigurationInit(directories, bookmark.configurationName);
  const converter = configuration?.outputConverters?.find(
    (item) => item.name === bookmark.converterName,
  );
  if (!converter)
    throw new Error(`Output converter "${bookmark.converterName}" is not available`);
  const document: CxDocument = {
    path: bookmark.documentPath,
    documentFormat: {
      ftype: 'output-converter',
      ...converter,
    },
    configurationName: bookmark.configurationName,
    content: '',
    project,
    editorKey,
  };
  await exportDocument(
    directories,
    events,
    feedback,
    renderingJobs,
    document,
    true,
  );
}

async function findProject(
  directories: BackendDirectories,
  documentPath: string,
) {
  let directory = dirname(documentPath);
  while (true) {
    const projectFile = projectFileNameInDirectory(directory);
    if (isReadableFile(projectFile))
      return computeProjectFromFile(directories, projectFile);
    const parent = parse(directory).dir;
    if (parent === directory) return undefined;
    directory = parent;
  }
}
