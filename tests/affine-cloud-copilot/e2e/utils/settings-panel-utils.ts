import { expect, type Page } from '@playwright/test';

const WORKSPACE_EMBEDDING_SWITCH_TEST_ID = 'workspace-embedding-setting-switch';

export class SettingsPanelUtils {
  public static async openSettingsPanel(page: Page) {
    await page.getByTestId('ai-settings-panel-toggle').click();
    await page.getByTestId('ai-settings-panel').waitFor({
      state: 'visible',
    });
  }

  public static async closeSettingsPanel(page: Page) {
    await page.getByTestId('ai-settings-panel-toggle').click();
    await page.getByTestId('ai-settings-panel').waitFor({
      state: 'hidden',
    });
  }

  public static async isWorkspaceEmbeddingEnabled(page: Page) {
    const input = await page.getByTestId(WORKSPACE_EMBEDDING_SWITCH_TEST_ID);
    return (await input.getAttribute('value')) === 'on';
  }

  public static async waitForWorkspaceEmbeddingSwitchToBe(
    page: Page,
    enabled: boolean
  ) {
    const input = await page.getByTestId(WORKSPACE_EMBEDDING_SWITCH_TEST_ID);
    await expect
      .poll(async () => {
        return await input.getAttribute('value');
      })
      .toBe(enabled ? 'on' : 'off');
  }

  public static async switchWorkspaceEmbedding(page: Page) {
    const input = await page.getByTestId(WORKSPACE_EMBEDDING_SWITCH_TEST_ID);
    await input.click();
  }

  public static async enableWorkspaceEmbedding(page: Page) {
    const enabled = await this.isWorkspaceEmbeddingEnabled(page);
    if (!enabled) {
      await this.switchWorkspaceEmbedding(page);
    }
    await this.waitForWorkspaceEmbeddingSwitchToBe(page, true);
  }

  public static async disableWorkspaceEmbedding(page: Page) {
    const enabled = await this.isWorkspaceEmbeddingEnabled(page);
    if (enabled) {
      await this.switchWorkspaceEmbedding(page);
    }
    await this.waitForWorkspaceEmbeddingSwitchToBe(page, false);
  }

  public static async uploadWorkspaceEmbedding(
    page: Page,
    attachments: { name: string; mimeType: string; buffer: Buffer }[]
  ) {
    await page.evaluate(() => {
      delete window.showOpenFilePicker;
    });

    for (const attachment of attachments) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page
        .getByTestId('workspace-embedding-setting-upload-button')
        .click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(attachment);
    }

    const attachmentList = await page.getByTestId(
      'workspace-embedding-setting-attachment-list'
    );
    await expect(
      attachmentList.getByTestId('workspace-embedding-setting-attachment-item')
    ).toHaveCount(attachments.length);

    // TODO: wait for attachment embedding to be done
  }

  public static async ignoreDocForEmbedding(page: Page, doc: string) {
    // Open Dos Searcher
    const ignoreDocsButton = await page.getByTestId(
      'workspace-embedding-setting-ignore-docs-button'
    );
    await ignoreDocsButton.click();
    const ignoredDocs = await page.getByTestId(
      'workspace-embedding-setting-ignore-docs-list'
    );
    await expect(
      ignoredDocs
        .getByTestId('workspace-embedding-setting-ignore-docs-list-item')
        .filter({ hasText: doc })
    ).toBeVisible();
  }
}
