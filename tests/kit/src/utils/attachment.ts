import type { Page } from '@playwright/test';

import { Path } from '../playwright';

const fixturesDir = Path.dir(import.meta.url).join('../../../fixtures');

export async function importAttachment(page: Page, file: string) {
  await page.evaluate(() => {
    // Force fallback to input[type=file] in tests
    // See https://github.com/microsoft/playwright/issues/8850
    window.showOpenFilePicker = undefined;
  });

  const fileChooser = page.waitForEvent('filechooser');

  // open slash menu
  await page.keyboard.type('/attachment', { delay: 50 });
  await page.keyboard.press('Enter');

  await (await fileChooser).setFiles(fixturesDir.join(file).value);
}
