import { type BlockModel } from '@blocksuite/affine/store';
import type { Command, TextSelection } from '@blocksuite/std';
import { match } from 'ts-pattern';

type SnapshotPattern = {
  first: 'paragraph' | 'other';
  last: 'paragraph' | 'other';
  multiple: boolean;
};

const getBlocksPattern = (blocks: BlockModel[]): SnapshotPattern => {
  const firstBlock = blocks[0];
  const lastBlock = blocks[blocks.length - 1];
  return {
    first: firstBlock.flavour === 'affine:paragraph' ? 'paragraph' : 'other',
    last: lastBlock.flavour === 'affine:paragraph' ? 'paragraph' : 'other',
    multiple: blocks.length > 1,
  };
};

const mergeText = (
  targetModel: BlockModel,
  sourceBlock: BlockModel,
  offset: number
) => {
  if (targetModel.text && sourceBlock.text) {
    const sourceText = sourceBlock.text.toString();
    if (sourceText.length > 0) {
      targetModel.text.insert(sourceText, offset);
    }
  }
};

const splitParagraph = (
  doc: any,
  parent: any,
  blockModel: BlockModel,
  index: number,
  splitOffset: number
) => {
  const newBlockId = doc.addBlock('affine:paragraph', {}, parent, index + 1);
  const nextBlock = doc.getBlock(newBlockId);
  if (nextBlock?.model.text && blockModel.text) {
    const textToMove = blockModel.text.toString().slice(splitOffset);
    nextBlock.model.text.insert(textToMove, 0);
    blockModel.text.delete(splitOffset, blockModel.text.length - splitOffset);
  }
  return nextBlock.model;
};

const getSelectedBlocks = (
  doc: any,
  textSelection: TextSelection
): BlockModel[] | null => {
  const selectedBlocks: BlockModel[] = [];
  const fromBlock = doc.getBlock(textSelection.from.blockId)?.model;
  if (!fromBlock) return null;
  selectedBlocks.push(fromBlock);

  // If the selection spans multiple blocks, add the blocks in between
  if (textSelection.to) {
    const toBlock = doc.getBlock(textSelection.to.blockId)?.model;
    if (!toBlock) return null;

    if (fromBlock.id !== toBlock.id) {
      let currentBlock = fromBlock;
      while (currentBlock.id !== toBlock.id) {
        const nextBlock = doc.getNext(currentBlock);
        if (!nextBlock) break;
        selectedBlocks.push(nextBlock);
        currentBlock = nextBlock;
      }
    }
  }

  return selectedBlocks;
};

const deleteSelectedText = (doc: any, textSelection: TextSelection) => {
  const selectedBlocks = getSelectedBlocks(doc, textSelection);
  if (!selectedBlocks || selectedBlocks.length === 0) return null;

  const firstBlock = selectedBlocks[0];
  const lastBlock = selectedBlocks[selectedBlocks.length - 1];
  const startOffset = textSelection.from.index;

  if (textSelection.to) {
    // Delete text from startOffset to the end in the first block
    if (firstBlock.text) {
      firstBlock.text.delete(startOffset, firstBlock.text.length - startOffset);
    }

    // Delete text from the beginning to endOffset in the last block
    if (lastBlock.text) {
      lastBlock.text.delete(textSelection.to.index, textSelection.to.length);
    }

    // Merge first block and last block
    if (firstBlock.text && lastBlock.text) {
      firstBlock.text.insert(lastBlock.text.toString(), startOffset);
    }

    // Delete the blocks in between
    selectedBlocks.slice(1).forEach(block => {
      doc.deleteBlock(block);
    });
  } else {
    // Single block selection case
    if (firstBlock.text) {
      firstBlock.text.delete(startOffset, textSelection.from.length);
    }
  }

  return { startBlockModel: firstBlock, startOffset };
};

export const replaceSelectedTextWithBlocksCommand: Command<{
  textSelection: TextSelection;
  blocks: BlockModel[];
}> = (ctx, next) => {
  const { textSelection, blocks, std } = ctx;
  const doc = std.host.doc;

  // Delete selected text and get startOffset
  const result = deleteSelectedText(doc, textSelection);
  if (!result) return next();
  const { startBlockModel, startOffset } = result;

  const parent = doc.getParent(startBlockModel.id);
  if (!parent) return next();

  const pattern = getBlocksPattern(blocks);
  const index = parent.children.findIndex(x => x.id === startBlockModel.id);

  match(pattern)
    .with({ first: 'paragraph', multiple: false }, () => {
      /**
       * Case: Only one paragraph block
       *
       * ```tsx
       * const doc = (
       *   <doc>
       *     <paragraph>Hel<anchor />lo</paragraph>
       *     <paragraph>Wor<focus />ld</paragraph>
       *   </doc>
       * );
       *
       * const snapshot = [
       *   <paragraph>111</paragraph>,
       * ];
       *
       * const expected = (
       *   <doc>
       *     <paragraph>Hel111ld</paragraph>
       *   </doc>
       * );
       * ```
       */
      mergeText(startBlockModel, blocks[0], startOffset);
    })
    .with({ first: 'other', multiple: false }, () => {
      /**
       * Case: Only one paragraph block
       *
       * ```tsx
       * const doc = (
       *   <doc>
       *     <paragraph>Hel<anchor />lo</paragraph>
       *     <paragraph>Wor<focus />ld</paragraph>
       *   </doc>
       * );
       *
       * const snapshot = [
       *   <code />,
       * ];
       *
       * const expected = (
       *   <doc>
       *     <paragraph>Hel</paragraph>
       *     <code />
       *     <paragraph>ld</paragraph>
       *   </doc>
       * );
       * ```
       */
      doc.addBlocks(blocks, parent, index);
    })
    .with({ first: 'paragraph', last: 'paragraph', multiple: true }, () => {
      /**
       * Case: Both first and last blocks are paragraphs
       *
       * ```tsx
       * const doc = (
       *   <doc>
       *     <paragraph>Hel<anchor />lo</paragraph>
       *     <paragraph>Wor<focus />ld</paragraph>
       *   </doc>
       * );
       *
       * const snapshot = [
       *   <paragraph>111</paragraph>,
       *   <code />,
       *   <paragraph>222</paragraph>
       * ];
       *
       * const expected = (
       *   <doc>
       *     <paragraph>Hel111</paragraph>
       *     <code />
       *     <paragraph>222ld</paragraph>
       *   </doc>
       * );
       * ```
       */
      const nextBlockModel = splitParagraph(
        doc,
        parent,
        startBlockModel,
        index,
        startOffset
      );
      mergeText(startBlockModel, blocks[0], startOffset);
      mergeText(nextBlockModel, blocks[blocks.length - 1], 0);
      const restBlocks = blocks.slice(1, -1);
      if (restBlocks.length > 0) {
        doc.addBlocks(restBlocks, parent, index + 1);
      }
    })
    .with({ first: 'paragraph' }, () => {
      /**
       * Case: Only first block is a paragraph
       *
       * ```tsx
       * const doc = (
       *   <doc>
       *     <paragraph>Hel<anchor />lo</paragraph>
       *     <paragraph>Wor<focus />ld</paragraph>
       *   </doc>
       * );
       *
       * const snapshot = [
       *   <paragraph>111</paragraph>,
       *   <code />,
       *   <image />
       * ];
       *
       * const expected = (
       *   <doc>
       *     <paragraph>Hel111</paragraph>
       *     <code />
       *     <image />
       *     <paragraph>ld</paragraph>
       *   </doc>
       * );
       * ```
       */
      splitParagraph(doc, parent, startBlockModel, index, startOffset);
      mergeText(startBlockModel, blocks[0], startOffset);
      const restBlocks = blocks.slice(1);
      if (restBlocks.length > 0) {
        doc.addBlocks(restBlocks, parent, index + 1);
      }
    })
    .with({ last: 'paragraph' }, () => {
      /**
       * Case: Only last block is a paragraph
       *
       * ```tsx
       * const doc = (
       *   <doc>
       *     <paragraph>Hel<anchor />lo</paragraph>
       *     <paragraph>Wor<focus />ld</paragraph>
       *   </doc>
       * );
       *
       * const snapshot = [
       *   <code />,
       *   <image />,
       *   <paragraph>111</paragraph>
       * ];
       *
       * const expected = (
       *   <doc>
       *     <paragraph>Hel</paragraph>
       *     <code />
       *     <image />
       *     <paragraph>111ld</paragraph>
       *   </doc>
       * );
       * ```
       */
      const nextBlockModel = splitParagraph(
        doc,
        parent,
        startBlockModel,
        index,
        startOffset
      );
      mergeText(nextBlockModel, blocks[blocks.length - 1], 0);
      const restBlocks = blocks.slice(0, -1);
      if (restBlocks.length > 0) {
        doc.addBlocks(restBlocks, parent, index + 1);
      }
    })
    .otherwise(() => {
      /**
       * Case: Neither first nor last block is a paragraph
       *
       * ```tsx
       * const doc = (
       *   <doc>
       *     <paragraph>Hel<anchor />lo</paragraph>
       *     <paragraph>Wor<focus />ld</paragraph>
       *   </doc>
       * );
       *
       * const snapshot = [
       *   <code />,
       *   <image />
       * ];
       *
       * const expected = (
       *   <doc>
       *     <paragraph>Hel</paragraph>
       *     <code />
       *     <image />
       *     <paragraph>ld</paragraph>
       *   </doc>
       * );
       * ```
       */
      splitParagraph(doc, parent, startBlockModel, index, startOffset);
      doc.addBlocks(blocks, parent, index + 1);
    });

  return next();
};
