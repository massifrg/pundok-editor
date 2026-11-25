import {
  isDocumentPathAbsolute,
  relativeDocumentPath,
  type Automation,
  type InputConverter,
  type OutputConverter,
  type PandocFilter,
  type PandocOption,
  PANDOC_OPTIONS_SPECS,
} from '../common';

function relativePath(projectPath: string, value: string): string {
  return isDocumentPathAbsolute(value)
    ? relativeDocumentPath(projectPath, value)
    : value;
}

function relativeProjectResourcePath(projectPath: string, value: string): string {
  const relative = relativePath(projectPath, value);
  return relative === '..' || relative.startsWith('../')
    ? value.replace(/^.*[\\/]/, '')
    : relative;
}

function relativeFilter(filter: string | PandocFilter): string | PandocFilter {
  const pathlessResource = (value: string) =>
    value.replace(/^.*[\\/]/, '');
  return typeof filter === 'string'
    ? pathlessResource(filter)
    : { ...filter, name: pathlessResource(filter.name) };
}

function relativePandocOption(
  projectPath: string,
  option: PandocOption,
): PandocOption {
  const [name, value] = option;
  if (typeof value !== 'string') return option;

  const spec = PANDOC_OPTIONS_SPECS.find((candidate) =>
    candidate.name.includes(name),
  );
  const valueTypes = spec
    ? Array.isArray(spec.valueType)
      ? spec.valueType
      : [spec.valueType]
    : [];
  if (valueTypes.includes('SEARCHPATH')) {
    const separator = value.includes(';') ? ';' : ':';
    return [
      name,
      value
        .split(separator)
        .map((part) => relativePath(projectPath, part))
        .join(separator),
    ];
  }
  if (
    valueTypes.some(
      (valueType) =>
        valueType === 'FILE' ||
        valueType === 'DIRECTORY' ||
        valueType === 'FILE|URL' ||
        valueType === 'DIRECTORY|FILE' ||
        valueType === 'STYLE|FILE',
    )
  )
    return [name, relativePath(projectPath, value)];
  return option;
}

function relativeInputConverter(
  projectPath: string,
  converter: InputConverter,
): InputConverter {
  return converter.type === 'pandoc'
    ? {
        ...converter,
        filters: converter.filters?.map((filter) =>
          relativeFilter(filter),
        ),
        pandocOptions: converter.pandocOptions?.map((option) =>
          relativePandocOption(projectPath, option),
        ),
      }
    : converter;
}

function relativeOutputConverter(
  projectPath: string,
  converter: OutputConverter,
): OutputConverter {
  const resultFile = converter.resultFile
    ? relativePath(projectPath, converter.resultFile)
    : converter.resultFile;
  return converter.type === 'pandoc'
    ? {
        ...converter,
        resultFile,
        filters: converter.filters?.map((filter) =>
          relativeFilter(filter),
        ),
        pandocOptions: converter.pandocOptions?.map((option) =>
          relativePandocOption(projectPath, option),
        ),
      }
    : { ...converter, resultFile };
}

function relativeAutomation(
  projectPath: string,
  automation: Automation,
): Automation {
  if (automation.type !== 'pandoc-filter') return automation;
  return {
    ...automation,
    filters: automation.filters?.map((filter: string | PandocFilter) =>
      relativeFilter(filter),
    ),
    sources: automation.sources?.map((source: string) =>
      relativePath(projectPath, source),
    ),
    pandocOptions: automation.pandocOptions?.map((option: PandocOption) =>
      relativePandocOption(projectPath, option),
    ),
  };
}

export function makeProjectConfigPathsRelative<
  T extends Record<string, unknown>,
>(projectPath: string, config: T): T {
  return {
    ...config,
    documentTemplate:
      typeof config.documentTemplate === 'string'
        ? relativeProjectResourcePath(projectPath, config.documentTemplate)
        : config.documentTemplate,
    customCss: Array.isArray(config.customCss)
      ? config.customCss.map((path) =>
          typeof path === 'string' ? relativePath(projectPath, path) : path,
        )
      : config.customCss,
    inputConverters: Array.isArray(config.inputConverters)
      ? config.inputConverters.map((converter: InputConverter) =>
          relativeInputConverter(projectPath, converter as InputConverter),
        )
      : config.inputConverters,
    outputConverters: Array.isArray(config.outputConverters)
      ? config.outputConverters.map((converter: OutputConverter) =>
          relativeOutputConverter(projectPath, converter as OutputConverter),
        )
      : config.outputConverters,
    automations: Array.isArray(config.automations)
      ? config.automations.map((automation: Automation) =>
          relativeAutomation(projectPath, automation as Automation),
        )
      : config.automations,
  };
}
