import { runFix } from './fix-json-schema.mjs';

process.exitCode = await runFix({
  schemaFilename: 'pundok-configuration.schema.json',
  schemaDefinition: 'PundokEditorConfigInit',
  description: 'configuration file',
  usage: 'npm run fix:config -- <configfile>',
});
