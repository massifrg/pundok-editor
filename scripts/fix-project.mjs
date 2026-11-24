import { runFix } from './fix-json-schema.mjs';

process.exitCode = await runFix({
  schemaFilename: 'pundok-project.schema.json',
  schemaDefinition: 'PundokEditorProject',
  description: 'project file',
  usage: 'npm run fix:project -- <projectfile>',
});
