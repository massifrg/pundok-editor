import {
  DocumentFormat,
  documentFormatsFromFilename,
  formatDescriptionsFromFilename,
  PandocConversionDir,
  PandocFormatDescription,
  PandocFormatExtension,
  pandocFormatsDefs,
  PundokEditorConfig,
  PundokEditorConfigInit
} from "./common";
import { runExternalProgram } from './runExternal';

async function runPandocForFeatureList(args: string[]): Promise<string[]> {
  const command = 'pandoc';
  const { result } = runExternalProgram(command, args);
  const { error, exitCode, output } = await result;
  if (error)
    return Promise.reject(
      `Command "${command} ${args.join(
        ' '
      )} exited with code ${exitCode}: ${error}`
    );
  const list = output.split(/\s*[\r\n]+\s*/m).filter((f) => f.length > 0);
  console.log(list.join(','));
  return list;
}


class PandocFeatures {
  private pandocFormats: Record<string, PandocFormatDescription> | undefined

  constructor() {

  }

  async getPandocFormats(reload?: boolean): Promise<PandocFormatDescription[]> {
    if (!this.pandocFormats || reload) {
      try {
        const inputFormats = await runPandocForFeatureList(['--list-input-formats']);
        Object.values(pandocFormatsDefs).forEach(f => {
          pandocFormatsDefs[f.name!].input = !!inputFormats.find(n => f.name === n)
        });
        const outputFormats = await runPandocForFeatureList(['--list-output-formats']);
        Object.values(pandocFormatsDefs).forEach(f => {
          pandocFormatsDefs[f.name!].output = !!outputFormats.find(n => f.name === n)
        });
        this.pandocFormats = { ...pandocFormatsDefs }
      } catch (err) {
        console.log(err)
      }
    }
    return Object.values(this.pandocFormats || {})
  }

  async inputFormatNames(): Promise<string[]> {
    return Object.values(this.getPandocFormats())
      .filter(f => f.input === true)
      .map(f => f.name)
  }

  async outputFormatNames(): Promise<string[]> {
    return Object.values(this.getPandocFormats())
      .filter(f => f.output === true)
      .map(f => f.name)
  }

  async getFormatExtensions(formatName: string): Promise<PandocFormatExtension[]> {
    try {
      const format = (await this.getPandocFormats()).find(f => f.name === formatName)
      const formats = this.pandocFormats!
      if (format) {
        let extensions = formats[formatName].formatExtensions
        if (!extensions) {
          const extsInfo = await runPandocForFeatureList([`--list-extensions=${formatName}`])
          extensions = extsInfo.map(ei => ({
            name: ei.substring(1),
            default: !!ei.startsWith('+')
          } as PandocFormatExtension))
          formats[formatName].formatExtensions = extensions
        }
        return extensions
      }
    } catch (err) {
      console.log(err)
    }
    return []
  }

  async formatDescriptionsFromFilename(
    filename: string,
    direction: PandocConversionDir
  ): Promise<PandocFormatDescription[]> {
    const formats = await this.getPandocFormats()
    return formatDescriptionsFromFilename(formats, filename, direction)
  }

  async documentFormatsFromFilename(
    filename: string,
    direction: PandocConversionDir = 'input',
    config?: PundokEditorConfig | PundokEditorConfigInit
  ): Promise<DocumentFormat[]> {
    const formats = await this.getPandocFormats()
    return documentFormatsFromFilename(formats, filename, direction, config)
  }

}

export const pandocFeatures = new PandocFeatures()