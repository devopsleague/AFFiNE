export function getWorkerUrl(name: string) {
  return (
    environment.publicPath +
    'js/' +
    `${name}-${BUILD_CONFIG.appVersion}.worker.js`
  );
}
