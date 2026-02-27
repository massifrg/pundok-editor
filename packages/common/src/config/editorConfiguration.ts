import { isEqual, isString, omit, pick, uniq } from 'lodash-es';
import { CustomAttribute } from './customAttributes';
import { CustomClass } from './customClasses';
import {
  CustomStyleInstance,
  CustomStyleDef,
  customStylesFromDef,
} from './customStyles';
import { PrunableConfigInitField, PundokEditorConfigInit } from './editorConfigInit';
import { DEFAULT_COPY_FORMAT, DEFAULT_FORMAT, DEFAULT_MAIN_FORMATS } from '../pandocFormat';
import { CustomMetadata } from './customMetadata';
import { NoteStyle } from './notes';
import { Index, indexRefDecorationCss } from './indices';
import { InsertableRaw } from './rawElements';
import { InputConverter } from './inputConverters';
import { OutputConverter } from './outputConverters';
import { Automation, SearchAndReplace } from './automations';
import { NamedAndDescribed } from './types';

export class PundokEditorConfig implements PundokEditorConfigInit {
  /** The name of this configuration of the editor. */
  name: string;
  /** The version of this configuration (it's meant for compatibility, but it's not used yet). */
  version: number[];
  /** Description of the aim of this configuration. */
  description?: string;
  /** Options to configure [TipTap](https://tiptap.dev) components of the editor. */
  tiptap: { options?: Record<string, any> | undefined };
  /** the name of a pandoc format or an InputConverter used as default to open documents. */
  workingFormat?: string;
  /** the name of the format (pandoc or custom) used with "Save a copy" */
  copyFormat?: string;
  /** the names of the formats that are more visible in the GUI with this configuration */
  mainFormats?: string[];
  /** A JSON-stringified document used as a template for new documents. */
  documentTemplate?: string | undefined;
  /** Auto delimiters that get added to Pandoc's `Quoted(SingleQuote)` and `Quoted(DoubleQuote)
   * in the editor. */
  autoDelimiters?: Record<string, string[]>;
  /** Definitions of custom styles available with this configuration.
   * These definitions can encompass multiple elements (e.g. `span`, `paragraph`).
   * See [Pandoc custom styles](https://pandoc.org/MANUAL.html#custom-styles) */
  customStyles?: CustomStyleDef[] | undefined;
  /** Custom classes that can be added to Blocks or Inlines with an `Attr`. */
  customClasses?: CustomClass[] | undefined;
  /** Custom attributes that can be added to Blocks or Inlines with an `Attr`. */
  customAttributes?: CustomAttribute[] | undefined;
  /** custom metadata keys and types */
  customMetadata?: CustomMetadata[];
  /** Kinds of notes available to the documents in this configuration. */
  noteStyles?: NoteStyle[] | undefined;
  /** Filenames of CSS stylesheets to customize documents with this configuration. */
  customCss?: string[] | undefined;
  /** The indices available for the documents of this configuration. */
  indices?: Index[] | undefined;
  /** Default format when creating RawInline and RawBlock elements. */
  defaultRawFormat?: string;
  /** `RawInline` elements that are made available in the GUI. */
  rawInlines?: InsertableRaw[] | undefined;
  /** `RawBlock` elements that are made available in the GUI. */
  rawBlocks?: InsertableRaw[] | undefined;
  /** Definitions of converters to import documents of different formats. */
  inputConverters?: InputConverter[] | undefined;
  /** Definitions of converters to export documents into different formats. */
  outputConverters?: OutputConverter[] | undefined;
  /** Automations, e.g. pre-defined search-replace values, to speed up transformations of the documents. */
  automations?: Automation[] | undefined;
  /** Custom styles instances for a single element, derived from the definitions of the `CustomStyles` field. */
  customStylesInstances: CustomStyleInstance[] = [];

  /**
   * Creates a new configuration for the editor, with the properties passed in the argument.
   * @param init the options to initialize the configuration.
   */
  constructor(init: Partial<PundokEditorConfigInit>) {
    this.name = init.name || 'unknown';
    this.version = init.version || [];
    this.description = init.description || '';
    // this.inherits = init.inherits;
    this.tiptap = init.tiptap || { options: {} };
    this.workingFormat = init.workingFormat || DEFAULT_FORMAT;
    this.copyFormat = init.copyFormat || DEFAULT_COPY_FORMAT;
    this.mainFormats = init.mainFormats || DEFAULT_MAIN_FORMATS;
    this.documentTemplate = init.documentTemplate;
    this.autoDelimiters = init.autoDelimiters;
    this.customStyles = init.customStyles;
    this.customClasses = init.customClasses;
    this.customAttributes = init.customAttributes;
    this.customMetadata = init.customMetadata;
    this.noteStyles = init.noteStyles;
    this.customCss = init.customCss;
    this.indices = init.indices;
    this.defaultRawFormat = init.defaultRawFormat;
    this.rawInlines = init.rawInlines;
    this.rawBlocks = init.rawBlocks;
    this.inputConverters = init.inputConverters;
    this.outputConverters = init.outputConverters;
    this.automations = init.automations;
    this.computeCustomStylesInstances();
  }

  private computeCustomStylesInstances() {
    const styles: CustomStyleInstance[] = [];
    this.customStyles?.forEach((d) => {
      customStylesFromDef(d).forEach((s) => styles.push(s));
    });
    this.customStylesInstances = styles;
  }

  get tiptapOptions() {
    return { ...this.tiptap?.options };
  }

  /**
   * The search and replace automations of this configuration.
   */
  get searchAndReplaces(): SearchAndReplace[] {
    return (this.automations || []).filter(
      (a) => a.type === 'search-replace',
    ) as SearchAndReplace[];
  }

  /**
   * Add the CSS rules that derive from the indices definitions
   * to the current `document` in the browser.
   */
  appendIndicesCssToDocument() {
    this.indices?.forEach((index) => this.ensureIndexCssRules(index));
  }

  /**
   * Merge another configuration on top of this one.
   * @param onTop the configuration to be merged on top of this one.
   * @returns a new configuration resulting from the merge.
   */
  addConfiguration(onTop: PundokEditorConfig): PundokEditorConfig {
    return enrichConfiguration(onTop, this);
  }

  private ensureIndexCssRules(index: Index) {
    const sheetId = `${index.refClass}_index_stylesheet`;
    let style: HTMLStyleElement = document.getElementById(
      sheetId,
    ) as HTMLStyleElement;
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('id', sheetId);
      document.head.appendChild(style);
      // const contentBefore = index.iconSvg ?
      //   `url("data:image/svg+xml,%3Csvg class='v-icon__svg' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' role='img' aria-hidden='true'%3E%3Cpath d='${index.iconSvg}' fill='${encodeURIComponent(index.color || 'currentColor')}'/%3E%3C/svg%3E")`
      //   : `'${index.iconChar}'`;
      // style.sheet?.insertRule(`
      // .${index.refClass}::before {
      //   --v-icon-size-multiplier: 1;
      //   align-items: center;
      //   display: inline-flex;
      //   font-feature-settings: "liga";
      //   height: 1em;
      //   justify-content: center;
      //   letter-spacing: normal;
      //   line-height: 1;
      //   position: relative;
      //   text-indent: 0;
      //   user-select: none;
      //   vertical-align: middle;
      //   width: 1em;
      //   color: ${index.color};
      //   content: ${contentBefore};
      // }`);
      style.sheet?.insertRule(
        `.${index.refClass} { ${indexRefDecorationCss(index)} }`,
      );
    }
  }
}

/**
 * An object carrying only the name and optionally the description
 * of a PundokEditorConfig.
 */
export interface ConfigurationSummary {
  name: string;
  description?: string;
}

function mergeTiptapOptions(
  options1: Record<string, any>,
  options2: Record<string, any>,
): Record<string, any> {
  return {
    ...options1,
    ...options2,
  };
}

/**
 * The minimal usable version of pandoc-editor when merging two configurations.
 * It's the highest version.
 * @param v1 the minimal version of pandoc-editor suitable for the first configuration
 * @param v2 the minimal version of pandoc-editor suitable for the second configuration
 * @returns the highest of two versions
 */
function minSuitableVersion(v1: number[], v2: number[]): number[] {
  const minlength = Math.min((v1 && v1.length) || 0, (v2 && v2.length) || 0);
  for (let i = 0; i < minlength; i++) {
    const diff = v1![i] - v2![i];
    if (diff > 0) return v1;
    if (diff < 0) return v2;
  }
  return [];
}

/**
 * Merge two array of objects that have a name property, with the second array
 * taking the precedence in case of objects with the same name.
 * When the two arrays have no common names, the second array is
 * simply concatenated to the first array.
 * Objects of the first array are replaced by homonyms in the second array;
 * in this case the concatenated elements are only the ones of the second array
 * that have no homonyms in the first one.
 * When both arrays have an object with a default=true property,
 * only the one in the second array will keep the default=true property.
 * @param no1 the starting array of objects
 * @param no2 the added array of objects
 * @param nameProperty the property that carries the name of the objects (default: "name")
 * @returns the concatenation of the two arrays, with the replacement of
 */
function mergeNamedObjects(
  no1?: Record<string, any>[],
  no2?: Record<string, any>[],
  nameProperty?: string,
): Record<string, any>[] {
  const nobj1 = no1 || [];
  const nobj2 = no2 || [];
  const default1 = nobj1.find((n) => n.default === true);
  const default2 = nobj2.find((n) => n.default === true);
  const name = nameProperty || 'name';
  const merged = nobj1
    .map((nobj) => {
      const common = nobj2.find((n) => nobj[name] == n[name]);
      return common || nobj;
    })
    .concat(nobj2.filter((nobj) => !nobj1.find((n) => nobj[name] == n[name])));
  return default1 && default2
    ? merged.map((m) =>
      m[name] === default1[name] ? { ...m, default: false } : m,
    )
    : merged;
}

type HasDefault = InputConverter | OutputConverter
function onlyLastDefault(list: HasDefault[]): HasDefault[] {
  let index: number
  for (index = list.length - 1; index >= 0; index--) {
    if (list[index].default)
      break
  }
  return list.map((item, i) => ({ ...item, default: i === index }))
}

function mergeInsertableRaws(
  ir1?: InsertableRaw[],
  ir2?: InsertableRaw[],
): InsertableRaw[] {
  const raw1 = ir1 || [];
  const raw2 = ir2 || [];
  const commons: number[][] = [];
  raw1.forEach((r1, index1) => {
    const index2 = raw2.findIndex(
      (r) => r.format === r1.format && isEqual(r.content, r1.content),
    );
    if (index2 >= 0) commons.push([index1, index2]);
  });
  let nc = 0;
  return raw1
    .map((r1, index1) => {
      const nextCommon = commons[nc];
      if (nextCommon && nextCommon[0] === index1) {
        const r2 = raw2[nextCommon[1]];
        nc++;
        return { ...r1, title: r2.title || r1.title };
      } else return r1;
    })
    .concat(raw2.filter((r2, index2) => !commons.find((c) => c[1] === index2)));
}

/**
 * Enriches a base configuration with another one.
 * When the "enriching" configuration has elements that are present
 * with the same name in the "base" configuration, the latter are
 * present in the returned configuration.
 * @param base      the base configuration to be enriched
 * @param enriching the configuration whose properties will be added
 *                  unless they have counterparts with the same name
 *                  in the base configuration
 * @returns         the resulting configuration
 */
export function enrichConfiguration(
  base: PundokEditorConfig,
  enriching: PundokEditorConfig,
): PundokEditorConfig {
  console.log(`inheriting ${enriching.name} into ${base.name}...`);
  try {
    const ret = new PundokEditorConfig({
      name: base.name,
      version: minSuitableVersion(enriching.version, base.version || []),
      description: base.description,
      tiptap: {
        options: mergeTiptapOptions(
          enriching.tiptap?.options || {},
          base.tiptap?.options || {},
        ),
      },
      workingFormat: enriching.workingFormat || base.workingFormat,
      copyFormat: enriching.copyFormat || base.copyFormat,
      mainFormats: enriching.mainFormats || base.mainFormats,
      documentTemplate: enriching.documentTemplate || base.documentTemplate,
      autoDelimiters: { ...base.autoDelimiters, ...enriching.autoDelimiters },
      customStyles: mergeNamedObjects(
        enriching.customStyles,
        base.customStyles,
      ) as CustomStyleDef[],
      customClasses: mergeNamedObjects(
        enriching.customClasses,
        base.customClasses,
      ) as CustomClass[],
      customAttributes: mergeNamedObjects(
        enriching.customAttributes,
        base.customAttributes,
      ) as CustomAttribute[],
      customMetadata: mergeNamedObjects(
        enriching.customMetadata,
        base.customMetadata,
      ) as CustomMetadata[],
      noteStyles: mergeNamedObjects(
        enriching.noteStyles,
        base.noteStyles,
        'noteType',
      ) as NoteStyle[],
      customCss: uniq((enriching.customCss || []).concat(base.customCss || [])),
      indices: mergeNamedObjects(
        enriching.indices,
        base.indices,
        'indexName',
      ) as Index[],
      defaultRawFormat: enriching.defaultRawFormat || base.defaultRawFormat,
      rawInlines: mergeInsertableRaws(enriching.rawInlines, base.rawInlines),
      rawBlocks: mergeInsertableRaws(enriching.rawBlocks, base.rawBlocks),
      inputConverters: onlyLastDefault(mergeNamedObjects(
        enriching.inputConverters,
        base.inputConverters,
      ) as InputConverter[]) as InputConverter[],
      outputConverters: onlyLastDefault(mergeNamedObjects(
        enriching.outputConverters,
        base.outputConverters,
      ) as OutputConverter[]) as OutputConverter[],
      automations: mergeNamedObjects(
        enriching.automations,
        base.automations,
      ) as Automation[],
    });
    // console.log(JSON.stringify(ret));
    // console.log(ret.outputConverters);
    return ret;
  } catch (err) {
    console.log(err);
    return base;
  }
}

export interface PundokEditorConfigWithError {
  config: PundokEditorConfig;
  error: string;
}

export async function computeDerivedConfiguration(
  config: PundokEditorConfig,
  inherited: InheritedConfigurationSpec[],
  getConfiguration: (configurationName: string) => Promise<PundokEditorConfig>,
): Promise<PundokEditorConfig> {
  const not_inherited: string[] = [];
  const errors: string[] = [];
  let derived = config;
  while (inherited.length > 0) {
    const c = inherited.pop();
    let from: PundokEditorConfig | undefined = undefined;
    try {
      const configName = getInheritedConfigName(c!)
      from = await getConfiguration(configName!);
      if (from) {
        const { remove, keep } = getInheritedConfiguration(from)
        derived = getPrunedConfigInit(derived, remove, keep)
        derived = enrichConfiguration(derived, from);
      } else {
        not_inherited.push(configName!);
      }
    } catch (err) {
      const configName = getInheritedConfigName(c!) || 'unknown configuration'
      errors.push(
        `can't inherit config "${configName}"${isString(err) ? ': ' + err : ''}`,
      );
      not_inherited.push(configName);
    }
  }
  if (not_inherited.length > 0) {
    console.log(errors.join('; '));
    return Promise.reject({
      config: derived,
      error: errors.join('; '),
    } as PundokEditorConfigWithError);
  }
  return Promise.resolve(derived);
}

export function getRawInlineFormats(config: PundokEditorConfig | PundokEditorConfigInit): string[] {
  return uniq(config?.rawInlines?.map((r) => r.format)) || [];
}

export function getRawBlockFormats(config: PundokEditorConfig | PundokEditorConfigInit): string[] {
  return uniq(config?.rawBlocks?.map((r) => r.format)) || [];
}

/**
 * A description of the elements to prune from an inherited configuration.
 */
export type ConfigurationPruning = Record<PrunableConfigInitField, string[]>

/**
 * Description of an inherited configuration, where some elements are removed.
 */
export interface InheritedConfiguration {
  name: string,
  /** The elements to be removed. */
  remove?: ConfigurationPruning,
  keep?: ConfigurationPruning,
}

/**
 * An inherited configuration can be specified:
 * - with its name (it's inherited as is)
 * - as an {@link InheritedConfiguration}, that specifies which elements are to be removed
 */
export type InheritedConfigurationSpec = string | InheritedConfiguration

/**
 * Gets the name of an inherited configuration, regardless of how it is specified.
 * @param c 
 * @returns 
 */
export function getInheritedConfigName(c?: InheritedConfigurationSpec): string | undefined {
  if (c) {
    if (isString(c))
      return c
    return c.name
  }
}

/**
 * Gets an {@link InheritedConfiguration}, regardless of how it is specified.
 * @param c 
 * @returns an {@link InheritedConfiguration} or an empty object if `c` is falsy.
 */
export function getInheritedConfiguration(c?: InheritedConfigurationSpec): InheritedConfiguration {
  if (c) {
    if (isString(c))
      return { name: c }
    return c
  }
  return {} as InheritedConfiguration
}

function removeOrKeepFromConfig(
  kr: 'keep' | 'remove',
  pruning: ConfigurationPruning,
  c: PundokEditorConfigInit | PundokEditorConfig,
  init: Partial<Record<PrunableConfigInitField, any>> = {}
): Partial<Record<PrunableConfigInitField, any>> {
  const modified = { ...init }
  const omit_or_pick = kr === 'remove' ? omit : pick
  const notIfRemoving = kr === 'remove'
    ? (b: boolean) => !b
    : (b: boolean) => b
  Object.entries(pruning).forEach(entry => {
    const k = entry[0] as PrunableConfigInitField
    const ids: string[] = entry[1] || []
    const oldValue = (c as PundokEditorConfigInit)[k]
    if (oldValue) {
      let newValue = undefined
      switch (k as PrunableConfigInitField) {
        case 'autoDelimiters':
          newValue = omit_or_pick(oldValue as object, ids) as Record<string, string[]>
          break
        case 'automations':
        case 'customAttributes':
        case 'customClasses':
        case 'customMetadata':
        case 'customStyles':
        case 'inputConverters':
        case 'outputConverters':
          newValue = (oldValue as NamedAndDescribed[])
            .filter(o => notIfRemoving(ids.includes(o.name)))
          break
        case 'indices':
          newValue = (oldValue as Index[]).filter(o =>
            notIfRemoving(ids.includes(o.indexName)))
          break
        case 'noteStyles':
          newValue = (oldValue as NoteStyle[])
            .filter(o => notIfRemoving(ids.includes(o.noteType)))
          break
        case 'customCss':
        case 'mainFormats':
          newValue = (oldValue as string[])
            .filter(o => notIfRemoving(ids.includes(o)))
          break
      }
      if (newValue !== undefined) {
        modified[k] = newValue
        console.log(`prune(${kr}) Config ${c.name}: ${JSON.stringify(oldValue)} => ${JSON.stringify(newValue)} `)
      }
    }
  })
  return modified
}

/**
 * Return a modified {@link PundokEditorConfig} where the values of some properties
 * are removed and other ones are kept (the removal goes first).
 * @param c The initial configuration.
 * @param remove The values to be removed in specific fields of the configuration.
 * @param keep The values to be kept in specific fields of the configuration.
 * @returns A modified configuration.
 */
export function getPrunedConfigInit(
  c: PundokEditorConfigInit | PundokEditorConfig,
  remove?: ConfigurationPruning,
  keep?: ConfigurationPruning,
): PundokEditorConfig {
  let modified: Partial<Record<PrunableConfigInitField, any>> = {}
  if (remove)
    modified = removeOrKeepFromConfig('remove', remove, c, modified)
  if (keep)
    modified = removeOrKeepFromConfig('keep', keep, c, modified)
  return new PundokEditorConfig({ ...c, ...modified })
}