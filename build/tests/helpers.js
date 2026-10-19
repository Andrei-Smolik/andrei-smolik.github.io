const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const runtimeSource = fs.readFileSync(path.join(ROOT, 'include-partials.js'), 'utf8');

function loadRuntime(globals = {}) {
  const context = {
    module: { exports: {} },
    URL,
    Event: class { constructor(type) { this.type = type; } },
    ...globals,
  };
  vm.runInNewContext(runtimeSource, context, { filename: 'include-partials.js' });
  return context.module.exports;
}

function element(document = {}) {
  const classes = new Set();
  return {
    attributes: {}, handlers: {}, style: {}, dataset: {}, value: '', textContent: '',
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
    },
    addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); },
    dispatchEvent(event) { for (const handler of this.handlers[event.type] || []) handler(event); },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    hasAttribute(key) { return Object.hasOwn(this.attributes, key); },
    removeAttribute(key) { delete this.attributes[key]; },
    focus(options) { document.activeElement = this; this.focusOptions = options; },
    blur() { if (document.activeElement === this) document.activeElement = null; },
  };
}

module.exports = { ROOT, loadRuntime, element };
