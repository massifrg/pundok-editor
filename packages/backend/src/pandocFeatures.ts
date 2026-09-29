import {
  type DocumentFormat,
  documentFormatsFromFilename,
  formatDescriptionsFromFilename,
  type PandocConversionDir,
  type PandocFormatDescription,
  type PandocFormatExtension,
  pandocFormatsDefs,
  type PundokEditorConfig,
  type PundokEditorConfigInit,
} from '../../common/src';
import { runExternalProgram } from './runExternal';

async function runPandocForFeatureList(args: string[]): Promise<string[]> {
  const { result } = runExternalProgram('pandoc', args);
  const { error, exitCode, output } = await result;
  if (error) {
    return Promise.reject(
      `Command "pandoc ${args.join(' ')}" exited with code ${exitCode}: ${error}`,
    );
  }
  console.log(output)
  return output.split(/\s*[\r\n]+\s*/m).filter((feature) => feature.length > 0);
}

export class PandocFeatures {
  private pandocFormats: Record<string, PandocFormatDescription> | undefined;

  async getPandocFormats(reload?: boolean): Promise<PandocFormatDescription[]> {
    if (!this.pandocFormats || reload) {
      const inputFormats = await runPandocForFeatureList([
        '--list-input-formats',
      ]);
      const outputFormats = await runPandocForFeatureList([
        '--list-output-formats',
      ]);
      this.pandocFormats = Object.fromEntries(
        Object.values(pandocFormatsDefs).map((format) => [
          format.name!,
          {
            ...format,
            input: inputFormats.includes(format.name!),
            output: outputFormats.includes(format.name!),
          },
        ]),
      );
    }
    return Object.values(this.pandocFormats);
  }

  async inputFormatNames(): Promise<string[]> {
    return (await this.getPandocFormats())
      .filter((format) => format.input)
      .flatMap((format) => (format.name ? [format.name] : []));
  }

  async outputFormatNames(): Promise<string[]> {
    return (await this.getPandocFormats())
      .filter((format) => format.output)
      .flatMap((format) => (format.name ? [format.name] : []));
  }

  async getFormatExtensions(
    formatName: string,
  ): Promise<PandocFormatExtension[]> {
    const formats = await this.getPandocFormats();
    const format = formats.find(({ name }) => name === formatName);
    if (!format) return [];
    if (!format.formatExtensions) {
      format.formatExtensions = (
        await runPandocForFeatureList(['--list-extensions', formatName])
      ).map((extension) => ({
        name: extension.slice(1),
        default: extension.startsWith('+'),
      }));
    }
    return format.formatExtensions;
  }

  async formatDescriptionsFromFilename(
    filename: string,
    direction: PandocConversionDir,
  ): Promise<PandocFormatDescription[]> {
    return formatDescriptionsFromFilename(
      await this.getPandocFormats(),
      filename,
      direction,
    );
  }

  async documentFormatsFromFilename(
    filename: string,
    direction: PandocConversionDir = 'input',
    config?: PundokEditorConfig | PundokEditorConfigInit,
  ): Promise<DocumentFormat[]> {
    return documentFormatsFromFilename(
      await this.getPandocFormats(),
      filename,
      direction,
      config,
    );
  }
}

export const pandocFeatures = new PandocFeatures();
