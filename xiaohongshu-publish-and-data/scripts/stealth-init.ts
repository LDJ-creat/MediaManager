export const STEALTH_INIT_SCRIPT = `
(() => {
  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined,
    configurable: true,
  });

  if (!window.chrome) {
    Object.defineProperty(window, "chrome", {
      value: { runtime: {} },
      configurable: true,
    });
  }

  const originalQuery = window.navigator.permissions.query;
  if (originalQuery) {
    window.navigator.permissions.query = (parameters) =>
      parameters.name === "notifications"
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  }
})();
`;

export const DEFAULT_LAUNCH_ARGS = [
  "--disable-blink-features=AutomationControlled",
];

export const DEFAULT_IGNORE_DEFAULT_ARGS = ["--enable-automation"];
