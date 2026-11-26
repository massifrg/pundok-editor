import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import {
  findPandocParameterIssues,
  loadValidationSchema,
} from './check-json-schema.mjs';

function migratePandocOptions(options) {
  if (
    !Array.isArray(options) ||
    !options.every((option) => typeof option === 'string')
  )
    return options;

  const migrated = [];
  for (let index = 0; index < options.length; index += 1) {
    const match = options[index].trim().match(/^-{1,2}([^=]+)(?:=(.*))?$/);
    if (!match) return options;

    const [, name, inlineValue] = match;
    if (inlineValue !== undefined) migrated.push([name, inlineValue]);
    else if (options[index + 1] && !options[index + 1].startsWith('-'))
      migrated.push([name, options[++index]]);
    else migrated.push([name]);
  }
  return migrated;
}

function migratePandocParameterList(parameters) {
  if (parameters === undefined) return parameters;
  if (Array.isArray(parameters)) {
    return parameters.map((parameter) => {
      if (!parameter || typeof parameter !== 'object') return parameter;
      const migrated =
        parameter.value === undefined && parameter.type === undefined
          ? { ...parameter, type: 'string' }
          : { ...parameter };
      if (migrated.type === 'json' && typeof migrated.value === 'string') {
        const parsed = parseJsonObject(migrated.value);
        if (parsed !== undefined) migrated.value = parsed;
      }
      return migrated;
    });
  }
  if (!parameters || typeof parameters !== 'object') return parameters;
  return Object.entries(parameters).map(([name, value]) => ({ name, value }));
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value);
    return isParameterObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isParameterObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (child) =>
        typeof child === 'string' ||
        typeof child === 'boolean' ||
        isParameterObject(child),
    )
  );
}

function mergePandocParameters(base, override) {
  const merged = [...(base || [])];
  for (const parameter of override || []) {
    const index = merged.findIndex(({ name }) => name === parameter.name);
    if (index >= 0) merged[index] = parameter;
    else merged.push(parameter);
  }
  return merged;
}

function migratePandocFilter(filter) {
  if (!filter || typeof filter !== 'object' || typeof filter === 'string')
    return filter;
  return {
    ...filter,
    ...(filter.metadata !== undefined && {
      metadata: migratePandocParameterList(filter.metadata),
    }),
    ...(filter.variables !== undefined && {
      variables: migratePandocParameterList(filter.variables),
    }),
  };
}

function migratePandocFilterAutomation(automation) {
  if (!automation || automation.type !== 'pandoc-filter') return automation;
  const migrated = {
    ...automation,
    filters: (automation.filters || []).map(migratePandocFilter),
  };
  const legacyMetadata = migratePandocParameterList(automation.metadata);
  const legacyVariables = migratePandocParameterList(automation.variables);
  if (migrated.filters.length > 0) {
    const [first, ...rest] = migrated.filters;
    migrated.filters = [
      typeof first === 'string'
        ? {
            name: first,
            ...(legacyMetadata !== undefined && { metadata: legacyMetadata }),
            ...(legacyVariables !== undefined && {
              variables: legacyVariables,
            }),
          }
        : {
            ...first,
            ...(legacyMetadata !== undefined && {
              metadata: mergePandocParameters(legacyMetadata, first.metadata),
            }),
            ...(legacyVariables !== undefined && {
              variables: mergePandocParameters(
                legacyVariables,
                first.variables,
              ),
            }),
          },
      ...rest,
    ];
  }
  delete migrated.metadata;
  delete migrated.variables;
  return migrated;
}

function migrateOutputConverter(converter) {
  if (!converter || converter.type !== 'pandoc') return converter;

  const migrated = { ...converter };
  migrated.filters = migrated.filters?.map(migratePandocFilter);
  migrated.pandocOptions = migratePandocOptions(migrated.pandocOptions) || [];
  const names = new Set(
    migrated.pandocOptions
      .filter((option) => Array.isArray(option))
      .map(([name]) => name),
  );

  if (migrated.referenceFile && !names.has('reference-doc'))
    migrated.pandocOptions.push(['reference-doc', migrated.referenceFile]);
  if (migrated.standalone && !names.has('standalone') && !names.has('s'))
    migrated.pandocOptions.push(['standalone']);
  if (migrated.pandocTemplate && !names.has('template'))
    migrated.pandocOptions.push(['template', migrated.pandocTemplate]);

  delete migrated.referenceFile;
  delete migrated.standalone;
  delete migrated.pandocTemplate;
  if (migrated.pandocOptions.length === 0) delete migrated.pandocOptions;
  return migrated;
}

function fixConfiguration(config) {
  const fixed = { ...config };
  delete fixed.tiptap;

  if (fixed.notesStyles !== undefined) {
    if (fixed.noteStyles === undefined) fixed.noteStyles = fixed.notesStyles;
    delete fixed.notesStyles;
  }
  delete fixed.rawBlockFormats;

  if (Array.isArray(fixed.inputConverters)) {
    fixed.inputConverters = fixed.inputConverters.map((converter) => ({
      ...converter,
      pandocOptions: migratePandocOptions(converter.pandocOptions),
      filters: converter.filters?.map(migratePandocFilter),
    }));
  }
  if (Array.isArray(fixed.outputConverters))
    fixed.outputConverters = fixed.outputConverters.map(migrateOutputConverter);
  if (Array.isArray(fixed.automations)) {
    fixed.automations = fixed.automations.map((automation) => {
      const migrated = migratePandocFilterAutomation(automation);
      return migrated?.type === 'pandoc-filter'
        ? {
            ...migrated,
            pandocOptions: migratePandocOptions(migrated.pandocOptions),
          }
        : migrated;
    });
  }
  return fixed;
}

function fixProject(project) {
  const fixed = { ...project };
  if (fixed.editorConfig)
    fixed.editorConfig = fixConfiguration(fixed.editorConfig);
  delete fixed.path;
  delete fixed.computedConfig;
  return fixed;
}

function formatErrors(errors) {
  return errors
    .map((error) => {
      const path = error.instancePath ?? error.dataPath ?? 'document';
      const property =
        error.keyword === 'additionalProperties'
          ? ` "${error.params.additionalProperty}"`
          : '';
      return `  ${path}${property}: ${error.message}`;
    })
    .join('\n');
}

export async function fixJsonFile({
  filename,
  schemaFilename,
  schemaDefinition,
  description,
}) {
  let value;
  try {
    value = JSON.parse(await readFile(filename, 'utf8'));
  } catch (error) {
    console.error(`ERROR: ${description} could not be read: ${error.message}`);
    return 1;
  }

  const fixed =
    schemaDefinition === 'PundokEditorProject'
      ? fixProject(value)
      : fixConfiguration(value);

  let schema;
  try {
    schema = await loadValidationSchema({ schemaFilename, schemaDefinition });
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return 1;
  }

  const validate = new Ajv({
    allErrors: true,
    removeAdditional: 'failing',
    strict: false,
  }).compile(schema);
  validate(fixed);
  const validationErrors = [
    ...(validate.errors ?? []),
    ...findPandocParameterIssues(fixed),
  ];
  if (validationErrors.length > 0) {
    console.error(`ERROR: Could not fix ${description}:`);
    console.error(formatErrors(validationErrors));
    return 1;
  }

  console.log(JSON.stringify(fixed, null, 2));
  return 0;
}

export async function runFix({
  schemaFilename,
  schemaDefinition,
  description,
  usage,
}) {
  const filename = process.argv[2];
  if (!filename || process.argv.length > 3) {
    console.error(`Usage: ${usage}`);
    return 2;
  }
  return fixJsonFile({
    filename,
    schemaFilename,
    schemaDefinition,
    description: `${description} ${filename}`,
  });
}
