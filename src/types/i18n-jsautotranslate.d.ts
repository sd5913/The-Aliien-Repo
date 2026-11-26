declare module "i18n-jsautotranslate" {
  const translate: {
    service: { use(name: "client.edge"): void; edge: { api: { translate: string } } };
    request: {
      api: { translate: string };
      post(path: string, data: { from: string; to: string; text: string },
        success: (data: { result?: number; to?: string; text?: unknown[] }) => void,
        failure: () => void): void;
    };
  };
  export default translate;
}
