import { PundokEditorConfig } from "./editorConfiguration"
import { PundokEditorConfigInit } from "./editorConfigInit"
import { PundokEditorProject } from "./project"
import { isString } from "lodash-es"

/** A `PrecedenceObject` maps a key in a JSON file to its precedence
 * (order in the stringified JSON) */
type PrecedenceObject = Record<string, number>

/** An object to order the keys in configuration files. */
const CONFIG_KEYS_PRECEDENCE: PrecedenceObject = Object.fromEntries([
  '$schema',
  'name',
  'version',
  'description',
  'inherits',
  'format',
  'workingFormat',
  'copyFormat',
  'mainFormats',
  'customCss',
  'autoDelimiters',
  'noteStyles',
  'indices',
  'documentTemplate',
  'inputConverters',
  'outputConverters',
  'customStyles',
  'customClasses',
  'customAttributes',
  'customMetadata',
  'defaultRawFormat',
  'rawInlines',
  'rawBlocks',
  'automations',
  'tiptap',
].map((k, i) => [k, i + 1]))

/**
 * The `compareConfigKeys` function, used to sort keys in stringified JSONs,
 * sorts in different ways according to a `context`.
 * The next one is for the root elements of a pundok project file.
 */
const PROJECT_CONTEXT = 'project'
/**
 * The next `context` is the one of a configuration file.
 */
const PROJECT_CONFIG_CONTEXT_KEY = 'editorConfig'

/** An object to order the keys in pundok project files. */
const PROJECT_KEYS_PRECEDENCE: PrecedenceObject = Object.fromEntries([
  '$schema',
  'name',
  'description',
  'path',
  'rootDocument',
  'configurations',
  PROJECT_CONFIG_CONTEXT_KEY,
].map((k, i) => [k, i + 1]))

/** An object to order the keys in `Automation` objects. */
const AUTOMATION_KEYS_PRECEDENCE: PrecedenceObject = Object.fromEntries([
  'type',                  // common to all automations types
  'name',                  // common to all automations types
  'description',           // common to all automations types
  'search',                // search-replace type
  'replace',               // search-replace and elements-selection types
  'filterOnMarks',          // search-replace type
  'optionSearchOnly',      // search-replace type
  'optionCaseInsensitive', // search-replace type
  'optionRegex',           // search-replace type
  'optionCycle',           // search-replace type
  'optionWholeWord',       // search-replace type
  'actions',               // search-replace and elements-selection types
  'capitalize',            // search-replace type (deprecated)
  'addMarks',              // search-replace type (deprecated)
  'addStyles',             // search-replace type (deprecated)
  'addSpans',              // search-replace type (deprecated)
  'cssSelector',           // elements-selection type
  'tab',                   // elements-selection type
  'filters',               // pandoc-filter type
  'sources',               // pandoc-filter type
  'withResult',            // pandoc-filter type
  'variables',             // pandoc-filter type
  'metadata',              // pandoc-filter type
  'fromFormat',            // pandoc-filter type
  'toFormat',              // pandoc-filter type
  'pandocOptions',         // pandoc-filter type
].map((k, i) => [k, i + 1]))

/** Keys that are skipped when stringifying the JSON of a configuration or a project. */
const CONFIG_FORBIDDEN_KEY: Record<string, boolean> = Object.fromEntries([
  'customStylesInstances',
  'computedConfig',
].map(k => [k, true]))

/** `PrecedenceObject`s associated to different `context`s. */
const CONTEXT_TO_PRECEDENCE: Record<string, PrecedenceObject> = {
  [PROJECT_CONTEXT]: PROJECT_KEYS_PRECEDENCE,
  [PROJECT_CONFIG_CONTEXT_KEY]: CONFIG_KEYS_PRECEDENCE,
  automations: AUTOMATION_KEYS_PRECEDENCE,
}

const INFINITY = 1000000

/**
 * Return a function to compare the keys of a configuration or project JSON,
 * according to a particular context.
 * @param context the optional context.
 * @returns a compare function for keys relative to the context, or the default one
 *          when no context has been provided.
 */
function compareConfigKeys(context?: string): (k1: string, k2: string, context?: string) => number {
  return (k1, k2) => {
    // TODO: we can choose a precedence object dependent on context
    const precedence: PrecedenceObject = context && CONTEXT_TO_PRECEDENCE[context] || CONFIG_KEYS_PRECEDENCE
    const p1 = precedence[k1]
    const p2 = precedence[k2]
    if (p1 || p2)
      return (p1 || INFINITY) - (p2 || INFINITY)
    return k1.localeCompare(k2)
  }
}

/**
 * Predicate function to be used in an `Array.filter` function to filter out
 * unwanted keys in configuration or project JSON files.
 * @param k The key under scrutiny.
 * @returns 
 */
function filterConfigKeys(k: string): boolean {
  return !CONFIG_FORBIDDEN_KEY[k]
}

function isObject(obj: any) {
  return obj && typeof obj === 'object'
}

/**
 * Check whether an object is a record with certain fields defined.
 * @param record 
 * @param fields 
 * @returns 
 */
function isObjectWithFields(record: object, fields: string[]): boolean {
  if (!isObject(record))
    return false
  return !fields.find(field => (record as Record<string, any>)[field] === undefined)
}

/**
 * Return a compare function that sorts according to some fields that must be defined
 * in the objects being sorted (they must verify the `isObjectWithFields` predicate).
 * @param fields The fields on which to sort (left to right: first on the 1st field,
 *               then the 2nd, and so on).
 * @returns 
 */
function sortOnFields(fields: string[]): (o1: object, o2: object) => number {
  return (o1, o2) => {
    let field
    for (let i = 0; i < fields.length; i++) {
      field = fields[i]
      const v1 = (o1 as Record<string, any>)[field]
      const v2 = (o2 as Record<string, any>)[field]
      let cmp
      if (isString(v1) && isString(v2))
        cmp = v1.localeCompare(v2)
      else
        cmp = v1 < v2
          ? -1
          : v1 > v2
            ? 1
            : 0
      if (cmp !== 0) return cmp
    }
    return 0
  }
}

/**
 * A criterium to know if an array is made of object where each one has
 * certain fields defined, in an optional context.
 */
interface SortableArrayCriterium {
  fields: string[],
  context?: string
}

const SORTABLE_OBJECTS_ARRAYS_CRITERIA: SortableArrayCriterium[] = [
  // for automations
  { fields: ['type', 'name'], context: 'automations' },
  // for generic named objects
  { fields: ['name'] },
]

/**
 * Used to sort keys in the JSON file of a pundosk configuration or project.
 * Forbidden keys are skipped (usually they are the ones of computed fields in configuration
 * and project objects).
 * @param value The object whose optional keys or values are to be sorted.
 * @param context The name of the context according to which the keys/values are sorted.
 * @returns a sorted and/or filtered version of the `value`.
 */
function sortConfigKeys(value: any, context?: string): any {
  if (Array.isArray(value)) {
    for (let i = 0; i < SORTABLE_OBJECTS_ARRAYS_CRITERIA.length; i++) {
      const { fields, context: criteriumContext } = SORTABLE_OBJECTS_ARRAYS_CRITERIA[i]
      const matchingContext = criteriumContext ? criteriumContext === context : true
      if (matchingContext && value.every(v => isObjectWithFields(v, fields)))
        return value
          .sort(sortOnFields(fields))
          .map(o => sortConfigKeys(o, context))
    }
    return value
  } else if (isObject(value)) {
    const sorted: Record<string, any> = {};
    Object.keys(value)
      .filter(filterConfigKeys)
      .sort(compareConfigKeys(context))
      .forEach(key => {
        sorted[key] = sortConfigKeys(value[key], key);
      });
    return sorted;
  }
  return value;
}

/**
 * Produce a JSON stringified version of a pundok configuration, sorting and filtering
 * its fields. It's used to save a configuration in a file.
 * @param config The configuration to be stringified.
 * @returns a JSON stringified version of a `PundokEditorConfigInit` object.
 */
export function serializeConfiguration(config: PundokEditorConfig | PundokEditorConfigInit): string {
  const sortedObj = sortConfigKeys(config, PROJECT_CONFIG_CONTEXT_KEY);
  return JSON.stringify(sortedObj, null, 2);
}

/**
 * Produce a JSON stringified version of a pundok project, sorting and filtering
 * its fields. It's used to save a project in a file.
 * @param project The pundok project to be stringified.
 * @returns a JSON stringified version of a `PundokEditorProject` object.
 */
export function serializeProject(project: PundokEditorProject): string {
  const sortedObj = sortConfigKeys(project, PROJECT_CONTEXT);
  return JSON.stringify(sortedObj, null, 2);
}