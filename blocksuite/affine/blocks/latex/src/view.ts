import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { SlashMenuConfigExtension } from '@blocksuite/affine-widget-slash-menu';
import { BlockViewExtension } from '@blocksuite/std';
import { literal } from 'lit/static-html.js';

import { latexSlashMenuConfig } from './configs/slash-menu';

export class LatexViewExtension extends ViewExtensionProvider {
  override name = 'affine-latex-block';

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register([
      BlockViewExtension('affine:latex', literal`affine-latex`),
      SlashMenuConfigExtension('affine:latex', latexSlashMenuConfig),
    ]);
  }
}
