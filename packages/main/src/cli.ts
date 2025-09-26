import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { WindowWithIpc } from "./mainWindow"
import { isAbsolute, resolve } from "path"

export function parseCommandLineOpts(
  windowWithIpc: WindowWithIpc,
  argv?: string[],
  pwd?: string
) {
  const parsed = yargs(hideBin(argv || process.argv))
    .scriptName("pundok-editor")
    .usage('$0 filename')
    .option('c', {
      alias: 'config',
      describe: 'name of the configuration to use for the document',
      type: 'string'
    })
    .option('l', {
      alias: 'line',
      describe: 'line (Para, Header, Plain, line of LineBlock) to move the selection to',
      type: 'number'
    })
    .help()
    .parse()
  //@ts-ignore
  const { _: filenames, config, line } = parsed
  let filename = filenames && filenames[0]
  if (filename) {
    if (!isAbsolute(filename)) filename = resolve(pwd || process.cwd(), filename)
    windowWithIpc.ipcHub.fireEventOpenDocument(filename, config, line)
  }
}