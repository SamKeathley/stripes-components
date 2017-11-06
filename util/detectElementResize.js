/**
* Detect Element Resize.
* https://github.com/sdecima/javascript-detect-element-resize
* Sebastian Decima
*
* Forked from version 0.5.3; includes the following modifications:
* 1) Guard against unsafe 'window' and 'document' references (to support SSR).
* 2) Defer initialization code via a top-level function wrapper (to support SSR).
* 3) Avoid unnecessary reflows by not measuring size for scroll events bubbling from children.
**/

export default function createDetectElementResize() {
  // Check `document` and `window` in case of server-side rendering
  let _window;
  if (typeof window !== 'undefined') {
    _window = window;
  } else if (typeof self !== 'undefined') {
    _window = self;
  } else {
    _window = this;
  }

  let attachEvent = typeof document !== 'undefined' && document.attachEvent;

  if (!attachEvent) {
    let requestFrame = (function () {
      let raf = _window.requestAnimationFrame || _window.mozRequestAnimationFrame || _window.webkitRequestAnimationFrame ||
                function (fn) { return _window.setTimeout(fn, 20); };
      return function (fn) { return raf(fn); };
    }());

    let cancelFrame = (function () {
      let cancel = _window.cancelAnimationFrame || _window.mozCancelAnimationFrame || _window.webkitCancelAnimationFrame ||
                   _window.clearTimeout;
      return function (id) { return cancel(id); };
    }());

    let resetTriggers = function (element) {
      let triggers = element.__resizeTriggers__;
      let expand = triggers.firstElementChild;
      let contract = triggers.lastElementChild;
      let expandChild = expand.firstElementChild;
      contract.scrollLeft = contract.scrollWidth;
      contract.scrollTop = contract.scrollHeight;
      expandChild.style.width = expand.offsetWidth + 1 + 'px';
      expandChild.style.height = expand.offsetHeight + 1 + 'px';
      expand.scrollLeft = expand.scrollWidth;
      expand.scrollTop = expand.scrollHeight;
    };

    let checkTriggers = function (element) {
      return element.offsetWidth !== element.__resizeLast__.width ||
             element.offsetHeight !== element.__resizeLast__.height;
    };

    let scrollListener = function (e) {
      // Don't measure (which forces) reflow for scrolls that happen inside of children!
      if (
        e.target.className.indexOf('contract-trigger') < 0 &&
        e.target.className.indexOf('expand-trigger') < 0
      ) {
        return;
      }

      let element = this;
      resetTriggers(this);
      if (this.__resizeRAF__) cancelFrame(this.__resizeRAF__);
      this.__resizeRAF__ = requestFrame(function () {
        if (checkTriggers(element)) {
          element.__resizeLast__.width = element.offsetWidth;
          element.__resizeLast__.height = element.offsetHeight;
          element.__resizeListeners__.forEach(function (fn) {
            fn.call(element, e);
          });
        }
      });
    };

    /* Detect CSS Animations support to detect element display/re-attach */
    let animation = false;
    let animationstring = 'animation';
    let keyframeprefix = '';
    let animationstartevent = 'animationstart';
    let domPrefixes = 'Webkit Moz O ms'.split(' ');
    let startEvents = 'webkitAnimationStart animationstart oAnimationStart MSAnimationStart'.split(' ');
    let pfx = '';
    {
      let elm = document.createElement('fakeelement');
      if (elm.style.animationName !== undefined) { animation = true; }

      if (animation === false) {
        for (let i = 0; i < domPrefixes.length; i++) {
          if (elm.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
            pfx = domPrefixes[i];
            animationstring = pfx + 'Animation';
            keyframeprefix = '-' + pfx.toLowerCase() + '-';
            animationstartevent = startEvents[i];
            animation = true;
            break;
          }
        }
      }
    }

    let animationName = 'resizeanim';
    let animationKeyframes = '@' + keyframeprefix + 'keyframes ' + animationName + ' { from { opacity: 0; } to { opacity: 0; } } ';
    let animationStyle = keyframeprefix + 'animation: 1ms ' + animationName + '; ';
  }

  let createStyles = function () {
    if (!document.getElementById('detectElementResize')) {
      // opacity:0 works around a chrome bug https://code.google.com/p/chromium/issues/detail?id=286360
      let css = (animationKeyframes: '') +
          '.resize-triggers { ' + (animationStyle: '') + 'visibility: hidden; opacity: 0; } ' +
          '.resize-triggers, .resize-triggers > div, .contract-trigger:before { content: \" \"; display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; z-index: -1; } .resize-triggers > div { background: #eee; overflow: auto; } .contract-trigger:before { width: 200%; height: 200%; }';
      let head = document.head || document.getElementsByTagName('head')[0];
      let style = document.createElement('style');

      style.id = 'detectElementResize';
      style.type = 'text/css';
      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }

      head.appendChild(style);
    }
  };

  let addResizeListener = function (element, fn) {
    if (attachEvent) element.attachEvent('onresize', fn);
    else {
      if (!element.__resizeTriggers__) {
        let elementStyle = _window.getComputedStyle(element);
        if (elementStyle && elementStyle.position === 'static') {
          element.style.position = 'relative';
        }
        createStyles();
        element.__resizeLast__ = {};
        element.__resizeListeners__ = [];
        (element.__resizeTriggers__ = document.createElement('div')).className = 'resize-triggers';
        element.__resizeTriggers__.innerHTML = '<div class="expand-trigger"><div></div></div>' +
                                            '<div class="contract-trigger"></div>';
        element.appendChild(element.__resizeTriggers__);
        resetTriggers(element);
        element.addEventListener('scroll', scrollListener, true);

        /* Listen for a css animation to detect element display/re-attach */
        if (animationstartevent) {
          element.__resizeTriggers__.__animationListener__ = function animationListener(e) {
            if (e.animationName === animationName) {
              resetTriggers(element);
            }
          };
          element.__resizeTriggers__.addEventListener(
            animationstartevent, element.__resizeTriggers__.__animationListener__,
          );
        }
      }
      element.__resizeListeners__.push(fn);
    }
  };

  let removeResizeListener = function (element, fn) {
    if (attachEvent) element.detachEvent('onresize', fn);
    else {
      element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
      if (!element.__resizeListeners__.length) {
        element.removeEventListener('scroll', scrollListener, true);
        if (element.__resizeTriggers__.__animationListener__) {
          element.__resizeTriggers__.removeEventListener(
            animationstartevent, element.__resizeTriggers__.__animationListener__,
          );
          element.__resizeTriggers__.__animationListener__ = null;
        }
        try {
          element.__resizeTriggers__ = !element.removeChild(element.__resizeTriggers__);
        } catch (e) {
          // Preact compat; see developit/preact-compat/issues/228
        }
      }
    }
  };

  return {
    addResizeListener,
    removeResizeListener,
  };
}
