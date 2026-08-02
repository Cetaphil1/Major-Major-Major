const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function makeLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    snapshot() {
      return Object.fromEntries(store.entries());
    },
  };
}

function makeBrowserContext(overrides = {}) {
  const localStorage = overrides.localStorage || makeLocalStorage();
  const context = {
    console,
    localStorage,
    setTimeout,
    clearTimeout,
    Date,
    URL,
    encodeURIComponent,
    window: {},
    ...overrides,
  };

  context.window = {
    localStorage,
    ...context.window,
    ...(overrides.window || {}),
  };
  context.globalThis = context;
  return vm.createContext(context);
}

function runRepoScript(context, relativePath, suffix = "") {
  const source = readRepoFile(relativePath) + suffix;
  return vm.runInContext(source, context, { filename: relativePath });
}

module.exports = {
  makeBrowserContext,
  makeLocalStorage,
  readRepoFile,
  repoRoot,
  runRepoScript,
};
