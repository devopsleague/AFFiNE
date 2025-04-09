import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe.skip('AISettings/Embedding', () => {
  test.beforeEach(async ({ loggedInPage: page, utils }) => {
    await utils.settings.openSettingsPanel(page);
    await utils.chatPanel.openChatPanel(page);
    await utils.settings.enableWorkspaceEmbedding(page);
  });

  test.afterEach(async ({ loggedInPage: page, utils }) => {
    await utils.settings.closeSettingsPanel(page);
  });

  test('should show workspace embedding enabled status', async ({
    loggedInPage: page,
    utils,
  }) => {
    await utils.settings.waitForWorkspaceEmbeddingSwitchToBe(page, true);
  });

  test('should support disable workspace embedding', async ({
    loggedInPage: page,
    utils,
  }) => {
    await utils.settings.enableWorkspaceEmbedding(page);
    await utils.settings.disableWorkspaceEmbedding(page);
    await utils.settings.waitForWorkspaceEmbeddingSwitchToBe(page, false);
  });

  test('should support enable workspace embedding', async ({
    loggedInPage: page,
    utils,
  }) => {
    await utils.settings.disableWorkspaceEmbedding(page);
    await utils.settings.enableWorkspaceEmbedding(page);
    await utils.settings.waitForWorkspaceEmbeddingSwitchToBe(page, true);
  });

  test('should allow manual attachment upload for embedding', async ({
    loggedInPage: page,
    utils,
  }) => {
    await utils.settings.enableWorkspaceEmbedding(page);
    const textContent1 = 'WorkspaceEBEEE is a cute cat';
    const textContent2 = 'WorkspaceEBFFF is a cute dog';
    const buffer1 = Buffer.from(textContent1);
    const buffer2 = Buffer.from(textContent2);
    const attachments = [
      {
        name: 'document1.txt',
        mimeType: 'text/plain',
        buffer: buffer1,
      },
      {
        name: 'document2.txt',
        mimeType: 'text/plain',
        buffer: buffer2,
      },
    ];
    await utils.settings.uploadWorkspaceEmbedding(page, attachments);

    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'What is WorkspaceEBEEE? What is WorkspaceEBFFF?',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    await expect(async () => {
      const { content, message } =
        await utils.chatPanel.getLatestAssistantMessage(page);
      expect(content).toMatch(/WorkspaceEBEEE.*cat/);
      expect(content).toMatch(/WorkspaceEBFFF.*dog/);
      expect(await message.locator('affine-footnote-node').count()).toBe(2);
    }).toPass({ timeout: 20000 });
  });

  test('should support ignore docs for embedding', async ({
    loggedInPage: page,
    utils,
  }) => {
    await utils.settings.enableWorkspaceEmbedding(page);
    utils.editor.createDoc(page, 'WBIgnoreDoc1', 'WBIgnoreEEE is a cute cat');
    utils.editor.createDoc(page, 'WBIgnoreDoc2', 'WBIgnoreFFF is a cute dog');

    await utils.chatPanel.makeChat(
      page,
      'What is WBIgnoreEEE? What is WBIgnoreFFF?'
    );
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'What is WBIgnoreEEE? What is WBIgnoreFFF?',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    await expect(async () => {
      const { content, message } =
        await utils.chatPanel.getLatestAssistantMessage(page);
      expect(content).toMatch(/WBIgnoreEEE.*cat/);
      expect(content).toMatch(/WBIgnoreFFF.*dog/);
      expect(await message.locator('affine-footnote-node').count()).toBe(2);
    }).toPass({ timeout: 20000 });

    // Ignore docs
    await utils.settings.ignoreDocForEmbedding(page, 'WBIgnoreDoc1');
    await utils.settings.ignoreDocForEmbedding(page, 'WBIgnoreDoc2');

    // Clear history
    await utils.chatPanel.clearChat(page);

    // Ignored docs should not be used for embedding
    await utils.chatPanel.makeChat(
      page,
      'What is WBIgnoreEEE? What is WBIgnoreFFF?If you dont know, just say "I dont know"'
    );

    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'What is WBIgnoreEEE? What is WBIgnoreFFF?',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    await expect(async () => {
      const { content } = await utils.chatPanel.getLatestAssistantMessage(page);
      expect(content).toMatch(/I dont know/i);
    }).toPass({ timeout: 20000 });
  });
});
