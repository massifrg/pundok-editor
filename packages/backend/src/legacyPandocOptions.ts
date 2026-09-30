import {
  PANDOC_OPTIONS_SPECS,
  type PandocOption,
  type PandocOptionSpec,
  type PandocOptionValue,
} from '../../common/src';

function splitArguments(value: string): string[] {
  const args: string[] = [];
  let argument = '';
  let quote: '"' | "'" | undefined;
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      argument += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (quote) {
      if (character === quote) quote = undefined;
      else argument += character;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (/\s/.test(character)) {
      if (argument) {
        args.push(argument);
        argument = '';
      }
    } else {
      argument += character;
    }
  }

  if (quote) throw new Error(`Unterminated quote in Pandoc option "${value}"`);
  if (escaped) argument += '\\';
  if (argument) args.push(argument);
  return args;
}

function optionSpec(name: string): PandocOptionSpec {
  const spec = PANDOC_OPTIONS_SPECS.find((candidate) =>
    candidate.name.includes(name),
  );
  if (!spec) throw new Error(`Unknown Pandoc option "${name}"`);
  return spec;
}

function valueTypes(spec: PandocOptionSpec): string[] {
  return Array.isArray(spec.valueType) ? spec.valueType : [spec.valueType];
}

function optionValue(value: string, spec: PandocOptionSpec): PandocOptionValue {
  const types = valueTypes(spec);
  if (types.includes('boolean') && (value === 'true' || value === 'false'))
    return value === 'true';
  if (types.includes('number') && value !== '' && Number.isFinite(Number(value)))
    return Number(value);
  return value;
}

/**
 * Convert legacy shell-style Pandoc arguments to configured option tuples.
 */
export function migrateLegacyPandocOptions(
  legacyOptions: readonly string[],
): PandocOption[] {
  const arguments_ = legacyOptions.flatMap(splitArguments);
  const options: PandocOption[] = [];

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!argument.startsWith('-') || argument === '-')
      throw new Error(`Expected a Pandoc option, received "${argument}"`);

    const withoutPrefix = argument.replace(/^-{1,2}/, '');
    const equalsIndex = withoutPrefix.indexOf('=');
    const name =
      equalsIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, equalsIndex);
    const spec = optionSpec(name);
    const types = valueTypes(spec);
    let value =
      equalsIndex === -1 ? undefined : withoutPrefix.slice(equalsIndex + 1);

    if (
      value === undefined &&
      !types.includes('flag') &&
      arguments_[index + 1] !== undefined &&
      !arguments_[index + 1].startsWith('-')
    ) {
      value = arguments_[index + 1];
      index += 1;
    } else if (value === undefined && !types.includes('flag')) {
      throw new Error(`Pandoc option "${name}" requires a value`);
    }

    options.push(
      value === undefined ? [name] : [name, optionValue(value, spec)],
    );
  }

  return options;
}
