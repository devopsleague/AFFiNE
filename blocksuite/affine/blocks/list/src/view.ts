import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { BlockViewExtension, FlavourExtension } from '@blocksuite/std';
import { literal } from 'lit/static-html.js';

import { ListKeymapExtension, ListTextKeymapExtension } from './list-keymap.js';

export class ListViewExtension extends ViewExtensionProvider {
  override name = 'affine-list-block';

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register([
      FlavourExtension('affine:list'),
      BlockViewExtension('affine:list', literal`affine-list`),
      ListKeymapExtension,
      ListTextKeymapExtension,
    ]);
  }
}
