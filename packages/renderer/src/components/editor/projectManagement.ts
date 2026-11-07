import type { PundokEditorConfig, PundokEditorProject, GetProjectOptions } from '../../common';
import { isString } from 'lodash-es';
import { useProjectCache } from '../../stores';

export interface ProjectManagementHost {
  [key: string]: any;
}

export async function setProject(host: ProjectManagementHost, project: PundokEditorProject): Promise<void> {
  if (!project) return;
  host.updateEditorDocState({ project });
  await host.setConfiguration(project.computedConfig);
  useProjectCache().setIndices();
  host.updateEditorDocState({ projectStructure: null });
  if (!host.guiProps.isDevelopmentMode) void checkGitUpdates(host, project);
}

export async function checkGitUpdates(host: ProjectManagementHost, project: PundokEditorProject): Promise<void> {
  const backend = host.backend;
  if (!backend) return;
  try {
    const status = await backend.gitProjectStatus(project.path);
    if (!status.managed || !status.remote) return;
    const branches = await backend.gitProjectUpdates(project.path);
    const ahead: Array<{ name: string; ahead: number }> = branches.filter(
      (branch: { name: string; ahead: number }) => branch.ahead > 0,
    );
    const snapshot = new Map<string, number>(
      ahead.map((branch) => [branch.name, branch.ahead]),
    );
    const previousSnapshot = gitUpdateSnapshots.get(project.path);
    gitUpdateSnapshots.set(project.path, snapshot);
    const snapshotChanged =
      !previousSnapshot ||
      snapshot.size !== previousSnapshot.size ||
      [...snapshot].some(([name, count]) => previousSnapshot.get(name) !== count);
    if (!snapshotChanged || host.docState()?.project?.path !== project.path) return;
    host.message = {
      type: 'warning',
      source: ahead.length ? 'git-updates' : 'git-no-updates',
      message: ahead.length
        ? host.$t('gitUpdatesNotification.message', {
            branches: ahead.map((branch: { name: string; ahead: number }) => `${branch.name} (${branch.ahead})`).join(', '),
          })
        : host.$t('gitChangesDialog.noUpdates', { name: status.branch || '' }),
    };
  } catch (error) {
    console.error('Unable to check Git updates after loading project', error);
  }
}

const gitUpdateSnapshots = new Map<string, Map<string, number>>();

export function openGitUpdates(host: ProjectManagementHost): void {
  host.message = null;
  host.visibleGitUpdates = true;
}

export async function reloadProjectAfterGitMerge(host: ProjectManagementHost): Promise<void> {
  const projectPath = host.docState()?.project?.path;
  if (projectPath) await reloadProject(host, { path: projectPath });
}

export async function loadProjectStructure(host: ProjectManagementHost, project: PundokEditorProject): Promise<void> {
  const backend = host.backend;
  if (!backend) return;
  try {
    const structure = await backend.getInclusionTree(project);
    if (JSON.stringify(host.docState()?.project) === JSON.stringify(project)) {
      host.updateEditorDocState({ projectStructure: structure || null });
      host.documentMenuRefreshKey++;
    }
  } catch (error) {
    console.error('Unable to load project structure', error);
  }
}

export async function reloadProject(host: ProjectManagementHost, options: GetProjectOptions): Promise<void> {
  const project = await host.backend?.getProject({ ...options, computeConfig: true });
  if (project) {
    await setProject(host, project);
    await loadProjectStructure(host, project);
  }
}

export async function setConfiguration(
  host: ProjectManagementHost,
  nameOrConfig?: string | PundokEditorConfig,
): Promise<PundokEditorConfig> {
  try {
    if (!nameOrConfig) return Promise.reject("can't set the configuration");
    const configuration = isString(nameOrConfig) && host.backend
      ? await host.backend.configuration(nameOrConfig)
      : nameOrConfig;
    if (!configuration) return Promise.reject("can't set the configuration");
    const previous = host.configuration;
    host.configuration = configuration;
    if (previous?.customCss) host.removeCssStylesheets(previous.customCss);
    host.updateEditorDocState({ configuration });
    if (configuration.customCss) host.addCssStylesheets(configuration.customCss);
    return configuration;
  } catch (error) {
    return Promise.reject(`can't set the configuration: ${error}`);
  }
}

export async function saveProject(host: ProjectManagementHost, project: PundokEditorProject): Promise<void> {
  const { computedConfig: _computedConfig, ...projectToSave } = project;
  try {
    await host.backend?.storeInConfiguration({
      projectPath: project.path,
      value: JSON.stringify(projectToSave),
      operation: 'update',
    });
    await reloadProject(host, { path: project.path });
    host.visibleConfigurationEditor = false;
  } catch (error) {
    console.error('Unable to save project configuration', error);
    host.$q.notify({
      type: 'negative',
      message: 'Unable to save project configuration',
    });
  }
}
