import { compileAST, compileQuery, matches } from 'media-query-fns';
import { isParserError, parseMediaQueryList } from 'media-query-parser';

/** @param {import('media-query-parser').MediaCondition} condition */
function correctLandscapeBoundary(condition) {
  condition.children.forEach((child, index) => {
    if (child.type === 'condition') {
      correctLandscapeBoundary(child);
    } else if (child.feature === 'orientation' && child.context === 'value' &&
      child.value.type === 'ident' && child.value.value === 'landscape') {
      // media-query-fns 2.1.2 includes squares in landscape. CSS requires
      // width > height. Work on the maintained parser's decoded feature AST so
      // comments, CSS escapes and nested conditions receive the same correction.
      condition.children[index] = {
        type: 'feature',
        context: 'range',
        feature: 'aspect-ratio',
        range: { rightOp: '>', rightToken: { type: 'ratio', numerator: 1, denominator: 1 } },
      };
    }
  });
}

// CSS closes open parentheses at end of input. The app currently relies on that
// recovery for "(max-width:48em"; the evaluator otherwise treats it as invalid.
// Leave all query grammar and evaluation to the maintained parser/evaluator.
function recoverEndOfInput(query) {
  let depth = 0;
  let quote = '';
  for (let index = 0; index < query.length; index += 1) {
    const character = query[index];
    if (character === '\\') {
      index += 1;
    } else if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '/' && query[index + 1] === '*') {
      const end = query.indexOf('*/', index + 2);
      if (end < 0) return query.slice(0, index) + ')'.repeat(depth);
      index = end + 1;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth < 0) return query;
    }
  }
  return quote ? query : query + ')'.repeat(depth);
}

/**
 * Viewport-aware matchMedia for jsdom, using its real EventTarget semantics.
 * It intentionally supplies no layout engine or WebGL renderer.
 * @param {Window & typeof globalThis} browser
 */
export function installMatchMedia(browser) {
  if (typeof browser.matchMedia === 'function') return () => {};
  const lists = new Set();
  const originalResizeTo = browser.resizeTo;

  function environment() {
    return {
      widthPx: browser.innerWidth,
      heightPx: browser.innerHeight,
      deviceWidthPx: browser.screen.width || browser.innerWidth,
      deviceHeightPx: browser.screen.height || browser.innerHeight,
      dppx: browser.devicePixelRatio,
      mediaType: /** @type {const} */ ('screen'),
    };
  }

  class ViewportMediaQueryListEvent extends browser.Event {
    /** @param {string} type @param {MediaQueryListEventInit} [options] */
    constructor(type, options = {}) {
      super(type, options);
      this.matches = Boolean(options.matches);
      this.media = options.media || '';
    }
  }

  class ViewportMediaQueryList extends browser.EventTarget {
    #compiled;
    #media;
    #previousMatches;
    /** @type {((this: MediaQueryList, event: MediaQueryListEvent) => any) | null} */
    #onchange = null;
    #onchangeListener = (event) => this.#onchange?.call(this, event);

    constructor(query) {
      super();
      this.#media = recoverEndOfInput(String(query));
      try {
        const parsed = parseMediaQueryList(this.#media);
        if (isParserError(parsed)) throw new Error('Invalid CSS media query');
        parsed.mediaQueries.forEach((item) => {
          if (item.mediaCondition) correctLandscapeBoundary(item.mediaCondition);
        });
        this.#compiled = compileAST(parsed);
        // Some syntactically valid but unsupported features may throw on match.
        matches(this.#compiled, environment());
      } catch {
        this.#media = 'not all';
        this.#compiled = compileQuery('not all');
      }
      this.#previousMatches = this.matches;
      lists.add(this);
    }

    get media() { return this.#media; }
    get matches() { return matches(this.#compiled, environment()); }
    get onchange() { return this.#onchange; }
    set onchange(callback) {
      const nextCallback = typeof callback === 'function' ? callback : null;
      if (!this.#onchange && nextCallback) this.addEventListener('change', this.#onchangeListener);
      if (this.#onchange && !nextCallback) this.removeEventListener('change', this.#onchangeListener);
      this.#onchange = nextCallback;
    }
    addListener(callback) { this.addEventListener('change', callback); }
    removeListener(callback) { this.removeEventListener('change', callback); }

    refresh() {
      const nextMatches = this.matches;
      if (nextMatches === this.#previousMatches) return;
      this.#previousMatches = nextMatches;
      this.dispatchEvent(new ViewportMediaQueryListEvent('change', {
        matches: nextMatches,
        media: this.media,
      }));
    }
  }

  const refresh = () => lists.forEach((list) => list.refresh());
  Object.defineProperties(browser, {
    matchMedia: {
      configurable: true,
      writable: true,
      value: (query) => new ViewportMediaQueryList(query),
    },
    MediaQueryListEvent: { configurable: true, writable: true, value: ViewportMediaQueryListEvent },
    resizeTo: {
      configurable: true,
      writable: true,
      value(width, height) {
        Object.assign(browser, { innerWidth: width, innerHeight: height });
        browser.dispatchEvent(new browser.Event('resize'));
      },
    },
  });
  browser.addEventListener('resize', refresh);
  browser.addEventListener('orientationchange', refresh);
  return () => {
    browser.removeEventListener('resize', refresh);
    browser.removeEventListener('orientationchange', refresh);
    lists.clear();
    Reflect.deleteProperty(browser, 'matchMedia');
    Reflect.deleteProperty(browser, 'MediaQueryListEvent');
    browser.resizeTo = originalResizeTo;
  };
}
