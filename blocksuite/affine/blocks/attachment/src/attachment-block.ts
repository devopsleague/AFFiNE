import { getEmbedCardIcons } from '@blocksuite/affine-block-embed';
import { CaptionedBlockComponent } from '@blocksuite/affine-components/caption';
import { getAttachmentFileIcon } from '@blocksuite/affine-components/icons';
import { Peekable } from '@blocksuite/affine-components/peek';
import { toast } from '@blocksuite/affine-components/toast';
import {
  type AttachmentBlockModel,
  AttachmentBlockStyles,
} from '@blocksuite/affine-model';
import { ThemeProvider } from '@blocksuite/affine-shared/services';
import { humanFileSize } from '@blocksuite/affine-shared/utils';
import { AttachmentIcon, UpgradeIcon } from '@blocksuite/icons/lit';
import { BlockSelection } from '@blocksuite/std';
import { Slice } from '@blocksuite/store';
import { type BlobState } from '@blocksuite/sync';
import { effect, signal } from '@preact/signals-core';
import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { type ClassInfo,classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { when } from 'lit/directives/when.js';

import { AttachmentEmbedProvider } from './embed';
import { styles } from './styles';
import { checkAttachmentBlob, downloadAttachmentBlob } from './utils';

@Peekable({
  enableOn: ({ model }: AttachmentBlockComponent) => {
    return !model.doc.readonly && model.props.type.endsWith('pdf');
  },
})
export class AttachmentBlockComponent extends CaptionedBlockComponent<AttachmentBlockModel> {
  static override styles = styles;

  blockDraggable = true;

  blobState$ = signal<Partial<BlobState & { loading: boolean }>>({});

  protected containerStyleMap = styleMap({
    position: 'relative',
    width: '100%',
    margin: '18px 0px',
  });

  private get _maxFileSize() {
    return this.std.store.blobSync.maxFileSize;
  }

  convertTo = () => {
    return this.std
      .get(AttachmentEmbedProvider)
      .convertTo(this.model, this._maxFileSize);
  };

  copy = () => {
    const slice = Slice.fromModels(this.doc, [this.model]);
    this.std.clipboard.copySlice(slice).catch(console.error);
    toast(this.host, 'Copied to clipboard');
  };

  download = () => {
    downloadAttachmentBlob(this);
  };

  embedded = () => {
    return this.std
      .get(AttachmentEmbedProvider)
      .embedded(this.model, this._maxFileSize);
  };

  open = () => {
    if (!this.blobUrl) {
      return;
    }
    window.open(this.blobUrl, '_blank');
  };

  refreshData = () => {
    checkAttachmentBlob(this).catch(console.error);
  };

  protected get embedView() {
    return this.std
      .get(AttachmentEmbedProvider)
      .render(this.model, this.blobUrl, this._maxFileSize);
  }

  private _selectBlock() {
    const selectionManager = this.host.selection;
    const blockSelection = selectionManager.create(BlockSelection, {
      blockId: this.blockId,
    });
    selectionManager.setGroup('note', [blockSelection]);
  }

  override connectedCallback() {
    super.connectedCallback();

    this.refreshData();

    this.contentEditable = 'false';

    if (!this.model.props.style) {
      this.doc.withoutTransact(() => {
        this.doc.updateBlock(this.model, {
          style: AttachmentBlockStyles[1],
        });
      });
    }

    this.model.propsUpdated.subscribe(({ key }) => {
      if (key === 'sourceId') {
        // Reset the blob url when the sourceId is changed
        if (this.blobUrl) {
          URL.revokeObjectURL(this.blobUrl);
          this.blobUrl = undefined;
        }
        this.refreshData();
      }
    });

    this.disposables.add(
      effect(() => {
        const blobId = this.model.props.sourceId$.value;
        if (!blobId) {
          this.blobState$.value = { uploading: true };
          return;
        }

        const blobState$ = this.std.store.blobSync.blobState$(blobId);
        if (!blobState$) return;

        const subscription = blobState$.subscribe(state => {
          this.blobState$.value = {
            uploading: state.uploading,
            errorMessage: state.errorMessage,
            overSize: state.overSize,
          };
        });

        return () => {
          subscription.unsubscribe();
          console.log('unsubscribe');
        };
      })
    );
  }

  override disconnectedCallback() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
    super.disconnectedCallback();
  }

  override firstUpdated() {
    // lazy bindings
    this.disposables.addFromEvent(this, 'click', this.onClick);
  }

  protected onClick(event: MouseEvent) {
    // the peek view need handle shift + click
    if (event.defaultPrevented) return;

    event.stopPropagation();

    if (!this.selected$.peek()) {
      this._selectBlock();
    }
  }

  protected renderWithHorizontal(
    classInfo: ClassInfo,
    icon: TemplateResult,
    title: string,
    description: string,
    kind: TemplateResult
  ) {
    return html`<div class=${classMap(classInfo)}>
      <div class="affine-attachment-content">
        <div class="affine-attachment-content-title">
          <div class="affine-attachment-content-title-icon">${icon}</div>

          <div class="affine-attachment-content-title-text truncate">
            ${title}
          </div>
        </div>

        <div class="affine-attachment-content-description">
          <div class="affine-attachment-content-info truncate">
            ${description}
          </div>
          <button class="affine-attachment-content-button">
            ${UpgradeIcon()} Upgrade
          </button>
        </div>
      </div>

      <div class="affine-attachment-banner">${kind}</div>
    </div>`;
  }

  protected renderWithVertical(
    classInfo: ClassInfo,
    icon: TemplateResult,
    title: string,
    description: string,
    kind: TemplateResult
  ) {
    return html`<div class=${classMap(classInfo)}>
      <div class="affine-attachment-content">
        <div class="affine-attachment-content-title">
          <div class="affine-attachment-content-title-icon">${icon}</div>

          <div class="affine-attachment-content-title-text truncate">
            ${title}
          </div>
        </div>

        <div class="affine-attachment-content-info truncate">
          ${description}
        </div>
      </div>

      <div class="affine-attachment-banner">
        ${kind}
        <button class="affine-attachment-content-button">
          ${UpgradeIcon()} Upgrade
        </button>
      </div>
    </div>`;
  }

  override renderBlock() {
    const { name, size, style } = this.model.props;
    const cardStyle = style ?? AttachmentBlockStyles[1];

    const theme = this.std.get(ThemeProvider).theme$.value;
    const { LoadingIcon } = getEmbedCardIcons(theme);

    const classInfo = {
      'affine-attachment-card': true,
      [cardStyle]: true,
      loading: this.loading,
      error: this.error,
      unsynced: false,
    };

    const icon = this.loading ? LoadingIcon : AttachmentIcon();
    const title = this.loading ? 'Loading...' : name;
    const description = this.error
      ? 'File loading failed.'
      : humanFileSize(size);

    const fileType = name.split('.').pop() ?? '';
    const kind = getAttachmentFileIcon(fileType);

    const embedView = this.embedView;

    return html`
      <div class="affine-attachment-container" style=${this.containerStyleMap}>
        ${when(
          embedView,
          () =>
            html`<div class="affine-attachment-embed-container">
              ${embedView}
            </div>`,
          () =>
            when(
              cardStyle === 'cubeThick',
              () =>
                this.renderWithVertical(
                  classInfo,
                  icon,
                  title,
                  description,
                  kind
                ),
              () =>
                this.renderWithHorizontal(
                  classInfo,
                  icon,
                  title,
                  description,
                  kind
                )
            )
        )}
      </div>
    `;
  }

  @property({ attribute: false })
  accessor allowEmbed = false;

  @property({ attribute: false })
  accessor blobUrl: string | undefined = undefined;

  @property({ attribute: false })
  accessor downloading = false;

  @property({ attribute: false })
  accessor error = false;

  @property({ attribute: false })
  accessor loading = false;

  override accessor useCaptionEditor = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-attachment': AttachmentBlockComponent;
  }
}
