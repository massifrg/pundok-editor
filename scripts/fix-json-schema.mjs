import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import { loadValidationSchema } from './check-json-schema.mjs';

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

function migrateOutputConverter(converter) {
  if (!converter || converter.type !== 'pandoc') return converter;

  const migrated = { ...converter };
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
    }));
  }
  if (Array.isArray(fixed.outputConverters))
    fixed.outputConverters = fixed.outputConverters.map(migrateOutputConverter);
  if (Array.isArray(fixed.automations)) {
    fixed.automations = fixed.automations.map((automation) =>
      automation?.type === 'pandoc-filter'
        ? {
            ...automation,
            pandocOptions: migratePandocOptions(automation.pandocOptions),
          }
        : automation,
    );
  }
  return fixed;
}

function fixProject(project) {
  const fixed = { ...project };
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
  if (!validate(fixed)) {
    console.error(`ERROR: Could not fix ${description}:`);
    console.error(formatErrors(validate.errors ?? []));
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
