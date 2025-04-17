import { html } from 'lit';

import { CodeBlockPreviewExtension } from '../code-preview-extension';

export const CodeBlockHtmlPreview = CodeBlockPreviewExtension('html', model => {
  if (model.props.language !== 'html') return null;

  const htmlSrc = `
      <style>
        body {
          margin: 0;
        }
      </style>
      ${model.text?.toString()}
    `;
  return html`
    <iframe
      class="affine-code-block-iframe"
      sandbox="allow-scripts allow-same-origin"
      scrolling="no"
      .srcdoc=${htmlSrc}
      loading="lazy"
      style="width:100%; border:none;"
      @load=${(e: Event) => {
        const iframe = e.target as HTMLIFrameElement;
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc)
            iframe.style.height = doc.documentElement.scrollHeight + 'px';
        } catch {}
      }}
    ></iframe>
  `;
});
