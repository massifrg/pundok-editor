/**
 * The result of the execution of an external program.
 */
export interface ExternalProgramResult {
  /** The command line used to call the external program. */
  commandLine: string;
  /** The directory where the command has been run */
  cwd: string;
  /** The execution exit code. */
  exitCode: number;
  /** The output from `stdout`. */
  output: string;
  /** The output from `stderr`. */
  error: string;
}
