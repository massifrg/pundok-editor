import { FeedbackMessage, PundokEditorProject, ServerMessage, ViewerSetup } from "src/common";
import { isAbsolute, parse, resolve } from "path";
import { existsSync, readFileSync } from "fs";

export async function preparePdfForViewer(
  filename: string,
  commandLine: string,
  project?: PundokEditorProject): Promise<ServerMessage> {
  let filepath = filename
  if (!isAbsolute(filepath)) {
    const projectpath = project?.path
    if (projectpath)
      filepath = resolve(projectpath, filepath)
  }
  try {
    if (existsSync(filepath)) {
      const content = readFileSync(filepath).toString()
      const name = parse(filepath).base
      return {
        type: 'viewer',
        setup: { name, content, commandLine } as ViewerSetup
      }
    } else {
      return {
        type: 'feedback',
        message: {
          type: 'error',
          message: `can't open "${filepath}" in the viewer`
        } as FeedbackMessage
      }
    }
  } catch (err) {
    console.log(err)
    return Promise.reject(err)
  }
}