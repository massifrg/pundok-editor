import { runCheck } from './check-json-schema.mjs';

process.exitCode = await runCheck({
  schemaFilename: 'pundok-configuration.schema.json',
  schemaDefinition: 'PundokEditorConfigInit',
  description: `Configuration file ${process.argv[2] ?? ''}`.trim(),
  usage: 'npm run check:config -- <configfile>',
});
