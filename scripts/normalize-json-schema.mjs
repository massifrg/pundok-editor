import { readFile, writeFile } from 'node:fs/promises';

const [filename] = process.argv.slice(2);
if (!filename || process.argv.length !== 3) {
  console.error('Usage: node scripts/normalize-json-schema.mjs <schema>');
  process.exitCode = 2;
} else {
  try {
    const schema = JSON.parse(await readFile(filename, 'utf8'));
    const definition = schema.definitions?.ParameterTreeArray;
    if (!definition)
      throw new Error('Schema has no ParameterTreeArray definition');

    schema.definitions.ParameterTreeArray = {
      type: 'array',
      items: { $ref: '#/definitions/ParameterTree' },
    };
    await writeFile(filename, `${JSON.stringify(schema, null, 2)}\n`);
  } catch (error) {
    console.error(`Could not normalize ${filename}: ${error.message}`);
    process.exitCode = 1;
  }
}
