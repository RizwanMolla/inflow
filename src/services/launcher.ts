import type {
  Workspace,
  WorkspaceAction,
  ActionExecutionProgress,
  LaunchReport,
} from '../types/workspace';
import { Native, isTauriEnvironment } from './native';

export type ProgressCallback = (progress: ActionExecutionProgress) => void;

const MAX_DELAY_MS = 60_000;
// Small gap between steps so windows open in order and the OS can keep up.
const STEP_STAGGER_MS = 200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class LauncherService {
  /**
   * Safely execute an individual action with proper runtime isolation and error catch
   */
  static async executeAction(action: WorkspaceAction): Promise<{ success: boolean; error?: string }> {
    const isTauri = isTauriEnvironment();
    const target = action.target.trim();

    if (action.type === 'delay') {
      const ms = Math.min(Math.max(Number(target) || 0, 0), MAX_DELAY_MS);
      await sleep(ms);
      return { success: true };
    }

    if (!target) {
      return { success: false, error: 'This step has no target configured.' };
    }

    try {
      if (isTauri) {
        switch (action.type) {
          case 'url': {
            const { open } = await import('@tauri-apps/plugin-shell');
            await open(/^[a-z][\w+.-]*:/i.test(target) ? target : `https://${target}`);
            break;
          }
          case 'folder':
          case 'file':
          case 'app': {
            const { open } = await import('@tauri-apps/plugin-shell');
            await open(target.replace(/\\/g, '/'));
            break;
          }
          case 'text':
            // Keep the snippet exactly as written; trailing newlines are intentional "Enter" presses.
            await Native.runNativeAction('text', action.target);
            break;
          case 'command':
          case 'hotkey':
          case 'media':
            await Native.runNativeAction(action.type, target);
            break;
        }
        return { success: true };
      }

      // Browser simulator: only URLs can really be opened; everything else is logged.
      await sleep(250);
      if (action.type === 'url') {
        const validUrl = /^https?:\/\//i.test(target) ? target : `https://${target}`;
        window.open(validUrl, '_blank', 'noopener,noreferrer');
      } else {
        console.log(`[InFlow Simulator] ${action.type}: ${target}`);
      }
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Error executing action [${action.label}]:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Sequentially launch all actions for a given workspace
   */
  static async launchWorkspace(
    workspace: Workspace,
    onProgress?: ProgressCallback
  ): Promise<LaunchReport> {
    const startTime = Date.now();
    const progressList: ActionExecutionProgress[] = workspace.actions.map((act) => ({
      actionId: act.id,
      label: act.label,
      type: act.type,
      target: act.target,
      status: 'pending',
    }));

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < workspace.actions.length; i++) {
      const action = workspace.actions[i];

      progressList[i].status = 'running';
      onProgress?.({ ...progressList[i] });

      if (i > 0 && action.type !== 'delay') {
        await sleep(STEP_STAGGER_MS);
      }

      const result = await this.executeAction(action);

      progressList[i].timestamp = Date.now();
      if (result.success) {
        progressList[i].status = 'success';
        succeeded++;
      } else {
        progressList[i].status = 'error';
        progressList[i].error = result.error;
        failed++;
      }

      onProgress?.({ ...progressList[i] });
    }

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      startTime,
      endTime: Date.now(),
      totalActions: workspace.actions.length,
      succeededActions: succeeded,
      failedActions: failed,
      progressList,
      isComplete: true,
    };
  }
}
