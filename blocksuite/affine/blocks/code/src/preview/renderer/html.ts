import { html } from 'lit';

import { CodeBlockPreviewExtension } from '../code-preview-extension';

// listen event from iframe
window.addEventListener('message', (evt: MessageEvent) => {
  if (evt.data?.type === 'code-block-html-iframe-height') {
    const blockId = evt.data.blockId;
    document
      .querySelectorAll(`[data-block-id="${blockId}"] iframe`)
      .forEach(iframe => {
        if ((iframe as HTMLIFrameElement).contentWindow === evt.source) {
          iframe.setAttribute(
            'style',
            `width:100%; border:none; height:${evt.data.height}px`
          );
        }
      });
  }
});

export const CodeBlockHtmlPreview = CodeBlockPreviewExtension('html', model => {
  if (model.props.language !== 'html') return null;

  const htmlSrc = `
    <style>
      body { margin: 0; }
    </style>
    ${model.text?.toString() || ''}
    <script>
      // calculate and report height
      function reportHeight() {
        const h = document.documentElement.scrollHeight;
        parent.postMessage({ type: 'code-block-html-iframe-height', height: h, blockId: ${JSON.stringify(model.id)} }, '*');
      }
      window.addEventListener('load', reportHeight);
      // listen content changes
      new ResizeObserver(reportHeight).observe(document.body);
    </script>
  `;

  return html`
    <iframe
      sandbox="allow-scripts"
      scrolling="no"
      .srcdoc=${htmlSrc}
      loading="lazy"
      style="width:100%; border:none;"
    ></iframe>
  `;
});
