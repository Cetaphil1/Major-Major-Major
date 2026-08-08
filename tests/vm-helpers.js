const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), "utf8");
}

function createLocalStorage(initial = {}) {
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

function runScript(file, sandbox) {
  const source = readRepoFile(file);
  vm.runInNewContext(source, sandbox, { filename: file });
  return sandbox;
}

function createBrowserSandbox(overrides = {}) {
  const sandbox = {
    console,
    Date,
    Promise,
    encodeURIComponent,
    setTimeout,
    clearTimeout,
    localStorage: createLocalStorage(),
    fetch: () => Promise.reject(new Error("Unexpected fetch in test")),
  };
  sandbox.window = sandbox;
  return Object.assign(sandbox, overrides);
}

module.exports = {
  ROOT,
  createBrowserSandbox,
  createLocalStorage,
  readRepoFile,
  runScript,
};
