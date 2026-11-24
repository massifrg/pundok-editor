import { runCheck } from './check-json-schema.mjs';

process.exitCode = await runCheck({
  schemaFilename: 'pundok-project.schema.json',
  schemaDefinition: 'PundokEditorProject',
  description: `Project file ${process.argv[2] ?? ''}`.trim(),
  usage: 'npm run check:project -- <projectfile>',
});
