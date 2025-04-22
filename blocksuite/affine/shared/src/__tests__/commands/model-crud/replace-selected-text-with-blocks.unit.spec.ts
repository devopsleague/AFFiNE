/**
 * @vitest-environment happy-dom
 */
import '../../helpers/affine-test-utils';

import type { TextSelection } from '@blocksuite/std';
import { describe, expect, it } from 'vitest';

import { replaceSelectedTextWithBlocksCommand } from '../../../commands/model-crud/replace-selected-text-with-blocks';
import { affine, block } from '../../helpers/affine-template';

describe('commands/model-crud', () => {
  describe('replaceSelectedTextWithBlocksCommand', () => {
    it('should replace selected text with blocks when both first and last blocks are paragraphs', () => {
      const host = affine`
        <affine-page id="page">
          <affine-note id="note">
            <affine-paragraph id="paragraph-1">Hel<anchor />lo</affine-paragraph>
            <affine-paragraph id="paragraph-2">Wor<focus />ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [
        block`<affine-paragraph id="111">111</affine-paragraph>`,
        block`<affine-code id="code"></affine-code>`,
        block`<affine-paragraph id="222">222</affine-paragraph>`,
      ]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page id="page">
          <affine-note id="note">
            <affine-paragraph id="paragraph-1">Hel111</affine-paragraph>
            <affine-code id="code"></affine-code>
            <affine-paragraph id="paragraph-2">222ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when both first and last blocks are paragraphs in single paragraph', () => {
      const host = affine`
        <affine-page id="page">
          <affine-note id="note">
            <affine-paragraph id="paragraph-1">Hel<anchor></anchor>lo Wor<focus></focus>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [
        block`<affine-paragraph id="111">111</affine-paragraph>`,
        block`<affine-code id="code"></affine-code>`,
        block`<affine-paragraph id="222">222</affine-paragraph>`,
      ]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page id="page">
          <affine-note id="note">
            <affine-paragraph id="paragraph-1">Hel111</affine-paragraph>
            <affine-code id="code"></affine-code>
            <affine-paragraph id="222">222ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when blocks contains only one paragraph', () => {
      const host = affine`
        <affine-page id="page">
          <affine-note id="note">
            <affine-paragraph id="paragraph-1">Hel<anchor />lo</affine-paragraph>
            <affine-paragraph id="paragraph-2">Wor<focus />ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [block`<affine-paragraph id="111">111</affine-paragraph>`]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page id="page">
          <affine-note id="note">
            <affine-paragraph id="paragraph-1">Hel111ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when blocks contains only one paragraph in single paragraph', () => {
      const host = affine`
        <affine-page id="page">
          <affine-note id="note">
            <affine-paragraph id="paragraph-1">Hel<anchor></anchor>lo Wor<focus></focus>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [block`<affine-paragraph id="111">111</affine-paragraph>`]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page id="page">
          <affine-note id="note">
            <affine-paragraph id="paragraph-1">Hel111ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when only first block is paragraph', () => {
      const host = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel<anchor />lo</affine-paragraph>
            <affine-paragraph>Wor<focus />ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [
        block`<affine-paragraph>111</affine-paragraph>`,
        block`<affine-code></affine-code>`,
        block`<affine-code></affine-code>`,
      ]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page>
          <affine-note >
            <affine-paragraph>Hel111</affine-paragraph>
            <affine-code></affine-code>
            <affine-code></affine-code>
            <affine-paragraph>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when only first block is paragraph in single paragraph', () => {
      const host = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel<anchor></anchor>lo Wor<focus></focus>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [
        block`<affine-paragraph>111</affine-paragraph>`,
        block`<affine-code></affine-code>`,
        block`<affine-code></affine-code>`,
      ]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel111</affine-paragraph>
            <affine-code></affine-code>
            <affine-code></affine-code>
            <affine-paragraph>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when only last block is paragraph', () => {
      const host = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel<anchor />lo</affine-paragraph>
            <affine-paragraph>Wor<focus />ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [
        block`<affine-code></affine-code>`,
        block`<affine-code></affine-code>`,
        block`<affine-paragraph>111</affine-paragraph>`,
      ]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page>
          <affine-note >
            <affine-paragraph>Hel</affine-paragraph>
            <affine-code></affine-code>
            <affine-code></affine-code>
            <affine-paragraph>111ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;
      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when only last block is paragraph in single paragraph', () => {
      const host = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel<anchor></anchor>lo Wor<focus></focus>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [
        block`<affine-code></affine-code>`,
        block`<affine-code></affine-code>`,
        block`<affine-paragraph>111</affine-paragraph>`,
      ]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel</affine-paragraph>
            <affine-code></affine-code>
            <affine-code></affine-code>
            <affine-paragraph>111ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;
      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when neither first nor last block is paragraph', () => {
      const host = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel<anchor />lo</affine-paragraph>
            <affine-paragraph>Wor<focus />ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [
        block`<affine-code></affine-code>`,
        block`<affine-code></affine-code>`,
      ]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page>
          <affine-note >
            <affine-paragraph>Hel</affine-paragraph>
            <affine-code></affine-code>
            <affine-code></affine-code>
            <affine-paragraph>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;
      expect(host.doc).toEqualDoc(expected.doc);
    });

    it('should replace selected text with blocks when neither first nor last block is paragraph in single paragraph', () => {
      const host = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel<anchor></anchor>lo Wor<focus></focus>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const blocks = [
        block`<affine-code></affine-code>`,
        block`<affine-code></affine-code>`,
      ]
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(b => b.model);

      const textSelection = host.selection.value[0] as TextSelection;

      host.command.exec(replaceSelectedTextWithBlocksCommand, {
        textSelection,
        blocks,
      });

      const expected = affine`
        <affine-page>
          <affine-note>
            <affine-paragraph>Hel</affine-paragraph>
            <affine-code></affine-code>
            <affine-code></affine-code>
            <affine-paragraph>ld</affine-paragraph>
          </affine-note>
        </affine-page>
      `;
      expect(host.doc).toEqualDoc(expected.doc);
    });
  });
});
