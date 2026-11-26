import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

function formatError(error) {
  const path = error.instancePath ?? error.dataPath ?? '';
  const location = path || 'document';
  const property =
    error.keyword === 'additionalProperties'
      ? ` "${error.params.additionalProperty}"`
      : '';
  return `  ${location}${property}: ${error.message}`;
}

function addSchemaProperty(schema, schemaDefinition) {
  const definition = schema.definitions?.[schemaDefinition];
  if (!definition) return;

  definition.properties ??= {};
  definition.properties.$schema = { type: 'string' };
  if (schemaDefinition === 'PundokEditorConfigInit') {
    definition.properties.tiptap = { type: 'object' };
    definition.properties.notesStyles = { type: 'array' };
    definition.properties.rawBlockFormats = { type: 'array' };
  } else if (schemaDefinition === 'PundokEditorProject') {
    definition.required = definition.required.filter(
      (property) => property !== 'path',
    );
  }
}

function allowLegacyPandocOptions(schema) {
  if (schema.definitions?.PandocOption)
    schema.definitions.PandocOption.minItems = 1;

  const visited = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);

    if (value.properties?.pandocOptions) {
      const current = value.properties.pandocOptions;
      value.properties.pandocOptions = {
        anyOf: [
          current,
          {
            items: { type: 'string' },
            type: 'array',
          },
        ],
      };
    }

    for (const child of Object.values(value)) visit(child);
  };
  visit(schema);
}

function legacyPandocOptionSuggestion(options) {
  const migrated = [];
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index].trim();
    if (!option) continue;

    const match = option.match(/^-{1,2}([^=]+)(?:=(.*))?$/);
    if (!match) return undefined;

    const [, name, inlineValue] = match;
    if (inlineValue !== undefined) {
      migrated.push([name, inlineValue]);
    } else if (options[index + 1] && !options[index + 1].startsWith('-')) {
      migrated.push([name, options[++index]]);
    } else {
      migrated.push([name]);
    }
  }
  return JSON.stringify(migrated);
}

export function findPandocParameterIssues(value, path = '') {
  const issues = [];
  if (!value || typeof value !== 'object') return issues;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      issues.push(...findPandocParameterIssues(item, `${path}/${index}`));
    });
    return issues;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}/${key}`;
    if (['metadata', 'variables'].includes(key) && Array.isArray(child)) {
      child.forEach((parameter, index) => {
        if (!parameter || typeof parameter !== 'object') return;
        const parameterPath = `${childPath}/${index}`;
        if (
          parameter.ask !== undefined &&
          !['always', 'once'].includes(parameter.ask)
        ) {
          issues.push({
            instancePath: parameterPath,
            keyword: 'parameterAsk',
            message: `ask value "${parameter.ask}" must be "always" or "once"`,
            params: {},
          });
        }
        if (!Object.hasOwn(parameter, 'value')) return;
        const parameterType = parameter.type;
        const valid =
          parameterType === 'boolean'
            ? typeof parameter.value === 'boolean'
            : parameterType === 'string'
              ? typeof parameter.value === 'string'
              : parameterType === 'json'
                ? isJsonObject(parameter.value)
                : true;
        if (!valid) {
          issues.push({
            instancePath: parameterPath,
            keyword: 'parameterType',
            message: `type "${parameterType}" does not match the parameter value`,
            params: {},
          });
        }
      });
    }
    issues.push(...findPandocParameterIssues(child, childPath));
  }
  return issues;
}

function isJsonObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (child) =>
        typeof child === 'string' ||
        typeof child === 'boolean' ||
        isJsonObject(child),
    )
  );
}

function findLegacySyntaxes(value, path = '') {
  const warnings = [];
  if (!value || typeof value !== 'object') return warnings;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      warnings.push(...findLegacySyntaxes(item, `${path}/${index}`));
    });
    return warnings;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}/${key}`;
    if (key === 'tiptap') {
      warnings.push(
        `${childPath}: legacy "tiptap" settings; remove this property`,
      );
    } else if (['notesStyles', 'rawBlockFormats'].includes(key)) {
      const replacement =
        key === 'notesStyles'
          ? 'rename it to "noteStyles"'
          : 'replace it with "rawBlocks" entries containing format and content';
      warnings.push(
        `${childPath}: legacy configuration property; ${replacement}`,
      );
    } else if (
      key === 'pandocOptions' &&
      Array.isArray(child) &&
      child.every((option) => typeof option === 'string')
    ) {
      const suggestion = legacyPandocOptionSuggestion(child);
      warnings.push(
        `${childPath}: legacy shell-style Pandoc options; use option tuples${
          suggestion ? `, for example ${suggestion}` : ''
        }`,
      );
    } else if (
      ['referenceFile', 'standalone', 'pandocTemplate'].includes(key)
    ) {
      const replacements = {
        referenceFile: 'pandocOptions: [["reference-doc", value]]',
        standalone:
          child === true
            ? 'pandocOptions: [["standalone"]]'
            : 'omit the property',
        pandocTemplate: 'pandocOptions: [["template", value]]',
      };
      warnings.push(
        `${childPath}: legacy output converter property; use ${replacements[key]}`,
      );
    } else if (
      ['metadata', 'variables'].includes(key) &&
      child &&
      typeof child === 'object' &&
      !Array.isArray(child)
    ) {
      warnings.push(
        `${childPath}: legacy Pandoc parameter map; use an array of { name, description?, type?, value? } objects`,
      );
    } else if (
      ['metadata', 'variables'].includes(key) &&
      Array.isArray(child)
    ) {
      child.forEach((parameter, index) => {
        if (
          parameter &&
          parameter.type === 'json' &&
          typeof parameter.value === 'string' &&
          isJsonObject(parseJsonObject(parameter.value))
        ) {
          warnings.push(
            `${childPath}/${index}/value: stringified JSON parameter; use an object value`,
          );
        }
      });
    } else if (
      ['capitalize', 'addMarks', 'addStyles', 'addSpans'].includes(key)
    ) {
      warnings.push(
        `${childPath}: deprecated search-and-replace property; use the "actions" array`,
      );
    }
    warnings.push(...findLegacySyntaxes(child, childPath));
  }
  return warnings;
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

export async function loadValidationSchema({
  schemaFilename,
  schemaDefinition,
}) {
  let schema;
  try {
    schema = JSON.parse(
      await readFile(
        resolve(repositoryRoot, 'schemas', schemaFilename),
        'utf8',
      ),
    );
  } catch (error) {
    throw new Error(`Could not read validation schema: ${error.message}`);
  }

  if (schemaDefinition) addSchemaProperty(schema, schemaDefinition);
  allowLegacyPandocOptions(schema);
  return schemaDefinition
    ? { ...schema, $ref: `#/definitions/${schemaDefinition}` }
    : schema;
}

export async function checkJsonFile({
  filename,
  schemaFilename,
  schemaDefinition,
  description,
}) {
  let value;
  try {
    value = JSON.parse(await readFile(filename, 'utf8'));
  } catch (error) {
    const message =
      error instanceof SyntaxError ? error.message : error.message;
    console.error(`ERROR: ${description} could not be read: ${message}`);
    return false;
  }

  let validationSchema;
  try {
    validationSchema = await loadValidationSchema({
      schemaFilename,
      schemaDefinition,
    });
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }

  const validate = new Ajv({ allErrors: true, strict: false }).compile(
    validationSchema,
  );
  const errors = [...(validate.errors ?? [])];
  errors.push(...findPandocParameterIssues(value));
  if (
    schemaDefinition === 'PundokEditorProject' &&
    value &&
    typeof value === 'object' &&
    Object.hasOwn(value, 'path')
  ) {
    errors.push({
      instancePath: '',
      keyword: 'runtimeProperty',
      message: 'must not contain the runtime-only "path" property',
      params: {},
    });
  }

  if (errors.length === 0) {
    console.log(`OK: ${description} is valid`);
    for (const warning of findLegacySyntaxes(value)) {
      console.warn(`WARNING: ${warning}`);
    }
    return true;
  }

  console.error(`ERROR: ${description} is invalid:`);
  for (const error of errors) {
    console.error(formatError(error));
  }
  return false;
}

export async function runCheck({
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

  return (await checkJsonFile({
    filename,
    schemaFilename,
    schemaDefinition,
    description,
  }))
    ? 0
    : 1;
}
