import type {
  Workspace,
  WorkspaceAction,
  ActionExecutionProgress,
  LaunchReport,
} from '../types/workspace';
import { isTauriEnvironment } from './storage';

export type ProgressCallback = (progress: ActionExecutionProgress) => void;

export class LauncherService {
  /**
   * Safely execute an individual action with proper runtime isolation and error catch
   */
  static async executeAction(action: WorkspaceAction): Promise<{ success: boolean; error?: string }> {
    const isTauri = isTauriEnvironment();
    const target = action.target.trim();

    if (!target) {
      return { success: false, error: 'Target path or URL is empty.' };
    }

    try {
      if (isTauri) {
        const { open } = await import('@tauri-apps/plugin-shell');

        switch (action.type) {
          case 'url': {
            const validUrl = /^https?:\/\//i.test(target) ? target : `https://${target}`;
            await open(validUrl);
            break;
          }
          case 'folder':
          case 'file':
          case 'app': {
            const normalizedTarget = target.replace(/\\/g, '/');
            await open(normalizedTarget);
            break;
          }
        }
        return { success: true };
      } else {
        // Web / Simulated Dev Mode fallback
        await new Promise((resolve) => setTimeout(resolve, 350)); // Realistic smooth execution delay

        switch (action.type) {
          case 'url': {
            const validUrl = /^https?:\/\//i.test(target) ? target : `https://${target}`;
            const opened = window.open(validUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
              console.log(`[InFlow Web] Open URL: ${validUrl} (Popup blocked or handled)`);
            }
            break;
          }
          case 'folder': {
            console.log(`[InFlow Web Mode] Opening Windows folder: ${target}`);
            break;
          }
          case 'file': {
            console.log(`[InFlow Web Mode] Opening File: ${target}`);
            break;
          }
          case 'app': {
            console.log(`[InFlow Web Mode] Spawning Executable: ${target}`);
            break;
          }
        }
        return { success: true };
      }
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

      // Mark current action as running
      progressList[i].status = 'running';
      onProgress?.({ ...progressList[i] });

      // Add a slight stagger delay for smooth visual feedback & OS buffer
      if (i > 0) {
        await new Promise((res) => setTimeout(res, 200));
      }

      const result = await this.executeAction(action);

      if (result.success) {
        progressList[i].status = 'success';
        progressList[i].timestamp = Date.now();
        succeeded++;
      } else {
        progressList[i].status = 'error';
        progressList[i].error = result.error;
        progressList[i].timestamp = Date.now();
        failed++;
      }

      onProgress?.({ ...progressList[i] });
    }

    const report: LaunchReport = {
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

    return report;
  }
}
