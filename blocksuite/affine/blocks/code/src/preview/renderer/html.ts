import { html } from 'lit';

import { CodeBlockPreviewExtension } from '../code-preview-extension';

export const CodeBlockHtmlPreview = CodeBlockPreviewExtension('html', model => {
  if (model.props.language !== 'html') return null;

  const abortController = new AbortController();
  window.addEventListener(
    'message',
    (evt: MessageEvent) => {
      if (evt.data?.type === 'code-block-html-iframe-height') {
        document
          .querySelectorAll(`[data-block-id="${model.id}"] iframe`)
          .forEach(iframe => {
            if ((iframe as HTMLIFrameElement).contentWindow === evt.source) {
              iframe.setAttribute(
                'style',
                `width:100%; border:none; height:${evt.data.height}px`
              );
            }
          });
      }
    },
    { signal: abortController.signal }
  );
  model.deleted.subscribe(() => {
    abortController.abort();
  });

  const htmlSrc = `
    <style>
      body { margin: 0; }
    </style>
    ${model.text?.toString() || ''}
    <script>
      // calculate and report height
      function reportHeight() {
        const h = document.documentElement.scrollHeight;
        parent.postMessage({ type: 'code-block-html-iframe-height', height: h }, '*');
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
