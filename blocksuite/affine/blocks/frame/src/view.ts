import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import { effects } from './effects';
import { FrameBlockSpec } from './frame-spec';

export class FrameViewExtension extends ViewExtensionProvider {
  override name = 'affine-frame-block';

  override effect(): void {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext): void {
    super.setup(context);
    if (
      context.scope === 'edgeless' ||
      context.scope === 'preview-edgeless' ||
      context.scope === 'mobile-edgeless'
    ) {
      context.register(FrameBlockSpec);
    }
  }
}
