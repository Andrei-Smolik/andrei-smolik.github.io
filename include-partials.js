/**
 * include-partials.js
 *
 * Shared behaviour for:
 * - HTML partials
 * - Navigation and search
 * - Splash images and video
 * - Page transitions
 * - Scroll fade-in
 * - Project videos
 * - Back button
 */

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

const DESKTOP_QUERY = '(min-width: 1000px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function isIndexPage() {
  const path = window.location.pathname;

  return (
    path === '/' ||
    path.endsWith('/index.html')
  );
}

function isTouchDevice() {
  return window.matchMedia(
    '(hover: none) and (pointer: coarse)'
  ).matches;
}

/* --------------------------------------------------------------------------
   Shared HTML partials
   -------------------------------------------------------------------------- */

async function includePartials() {
  const slots =
    document.querySelectorAll(
      '[data-include]'
    );

  await Promise.all(
    Array.from(slots).map(
      async (slot) => {
        const path =
          slot.getAttribute(
            'data-include'
          );

        try {
          const response =
            await fetch(path);

          if (!response.ok) {
            throw new Error(
              `${response.status} ` +
              response.statusText
            );
          }

          slot.outerHTML =
            await response.text();
        } catch (error) {
          console.error(
            `Failed to include "${path}":`,
            error
          );

          slot.textContent = '';
        }
      }
    )
  );
}

/* --------------------------------------------------------------------------
   Navigation search
   -------------------------------------------------------------------------- */

function initNavSearch() {
  const links =
    document.getElementById(
      'siteNavLinks'
    );

  const toggle =
    document.getElementById(
      'siteNavSearchToggle'
    );

  const input =
    document.getElementById(
      'siteNavSearchInput'
    );

  const close =
    document.getElementById(
      'siteNavSearchClose'
    );

  if (
    !links ||
    !toggle ||
    !input ||
    !close
  ) {
    return;
  }

  function openSearch() {
    links.classList.add(
      'is-searching'
    );

    input.focus();
  }

  function closeSearch({ restoreFocus = false } = {}) {
    // A pointer close must not transfer the input's focus-visible state to
    // the magnifier. Keyboard users still return to the opening control.
    if (document.activeElement === input || document.activeElement === close) {
      document.activeElement.blur();
    }
    links.classList.remove(
      'is-searching'
    );

    input.value = '';

    input.dispatchEvent(
      new Event('input')
    );

    if (restoreFocus) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener(
    'click',
    openSearch
  );

  close.addEventListener(
    'click',
    event => closeSearch({ restoreFocus: event.detail === 0 })
  );

  input.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeSearch({ restoreFocus: true });
      }
    }
  );
}

/* --------------------------------------------------------------------------
   Site configuration
   -------------------------------------------------------------------------- */

function parseIni(text) {
  const config = {};

  text
    .split('\n')
    .forEach((line) => {
      const trimmed =
        line
          .trim()
          .replace(/\r$/, '');

      if (
        !trimmed ||
        trimmed.startsWith(';') ||
        trimmed.startsWith('#')
      ) {
        return;
      }

      const equalsIndex =
        trimmed.indexOf('=');

      if (equalsIndex === -1) {
        return;
      }

      const key =
        trimmed
          .slice(0, equalsIndex)
          .trim();

      let value =
        trimmed
          .slice(equalsIndex + 1)
          .trim();

      value = value.replace(
        /^["'](.*)["']$/,
        '$1'
      );

      config[key] = value;
    });

  return config;
}

async function initContactLinks() {
  try {
    const response =
      await fetch('site.ini');

    if (!response.ok) {
      throw new Error(
        `${response.status} ` +
        response.statusText
      );
    }

    const text =
      await response.text();

    const config = parseIni(text);

    if (config.name) {
      document
        .querySelectorAll(
          '[data-site-name]'
        )
        .forEach((element) => {
          element.textContent =
            config.name;
        });
    }

    if (!config.email) {
      return;
    }

    document
      .querySelectorAll(
        '[data-contact-mailto]'
      )
      .forEach((element) => {
        element.href =
          `mailto:${config.email}`;

        if (
          element.hasAttribute(
            'data-contact-text'
          )
        ) {
          element.textContent =
            config.email;
        }
      });
  } catch (error) {
    console.error(
      'Failed to load site.ini:',
      error
    );
  }
}

/* --------------------------------------------------------------------------
   Navigation visibility
   -------------------------------------------------------------------------- */

function markCurrentNavLink() {
  const path = window.location.pathname;

  document.querySelectorAll('.site-nav__link').forEach((link) => {
    link.removeAttribute('aria-current');

    if (link.classList.contains('site-nav__link--portfolio')) {
      if (isIndexPage()) {
        link.setAttribute('aria-current', 'page');
      }
    } else if (new URL(link.href).pathname === path) {
      link.setAttribute('aria-current', 'page');
    }

    if (link.hasAttribute('aria-current')) {
      // Remove navigation for mouse, keyboard and assistive activation.
      link.removeAttribute('href');
      link.setAttribute('role', 'link');
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('tabindex', '-1');
    }
  });
}

function hideSearchOffIndex() {
  if (isIndexPage()) {
    return;
  }

  const search =
    document.querySelector(
      '.site-nav__search-group'
    );

  if (search) {
    search.style.display = 'none';
  }
}

/* --------------------------------------------------------------------------
   Project search
   -------------------------------------------------------------------------- */

function initProjectSearch() {
  const grid =
    document.querySelector(
      '.project-grid'
    );

  const input =
    document.getElementById(
      'siteNavSearchInput'
    );

  if (!grid || !input) {
    return;
  }

  const cards =
    Array.from(
      grid.querySelectorAll(
        '.project-card'
      )
    );

  input.addEventListener(
    'input',
    () => {
      const query =
        input.value
          .trim()
          .toLowerCase();

      cards.forEach((card) => {
        const searchText =
          (
            card.dataset.search ||
            card.textContent
          ).toLowerCase();

        const matches =
          !query ||
          searchText.includes(query);

        const item =
          card.closest('li') ||
          card;

        item.style.display =
          matches
            ? ''
            : 'none';
      });
    }
  );
}

/* --------------------------------------------------------------------------
   Splash image rotation
   -------------------------------------------------------------------------- */

function initSplashRotation() {
  const images =
    document.querySelectorAll(
      '.splash__image'
    );

  if (images.length < 2) {
    return;
  }

  let currentIndex = 0;

  window.setInterval(
    () => {
      images[currentIndex]
        .classList.remove(
          'is-active'
        );

      currentIndex =
        (
          currentIndex + 1
        ) %
        images.length;

      images[currentIndex]
        .classList.add(
          'is-active'
        );
    },
    5000
  );
}

/* --------------------------------------------------------------------------
   Splash video
   -------------------------------------------------------------------------- */

function initSplashVideo() {
  const video =
    document.querySelector(
      '.splash__video'
    );

  if (!video) {
    return;
  }

  const checkbox =
    document.getElementById(
      'splashUnlock'
    );

  const source =
    video.querySelector(
      'source'
    );

  const splash =
    video.closest(
      '.splash'
    );

  const playVideo = initVideoAutoplay(video, () => !checkbox?.checked);

  function revealVideo() {
    splash?.classList.add(
      'is-video-ready'
    );
  }

  function removeFailedVideo() {
    video.remove();

    splash?.classList.add(
      'is-video-unavailable'
    );
  }

  if (checkbox?.checked) {
    video.pause();
  }

  video.addEventListener('canplay', revealVideo);

  video.addEventListener(
    'error',
    removeFailedVideo
  );

  source?.addEventListener(
    'error',
    removeFailedVideo
  );

  if (video.readyState >= 3) {
    revealVideo();
  }

  checkbox?.addEventListener(
    'change',
    () => {
      if (checkbox.checked) {
        video.pause();
      } else {
        playVideo();
      }
    }
  );
}

/* --------------------------------------------------------------------------
   Project video autoplay
   -------------------------------------------------------------------------- */

function initVideoAutoplay(video, isEnabled = () => true) {
  video.autoplay = true;
  video.defaultMuted = true;
  video.muted = true;
  video.loop = true;
  video.controls = false;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  video.removeAttribute('controls');

  let pendingPlay = null;
  function attempt(userGesture = false) {
    if (!isEnabled() || document.hidden || video.isConnected === false || video.error) return;
    if (!video.paused || (pendingPlay && !userGesture)) return;
    // Keep play() directly inside touchend/click/keydown handlers: Safari
    // loses user activation if this is deferred to a promise, timer or frame.
    video.muted = true;
    try {
      const request = video.play();
      pendingPlay = request;
      const settled = () => { if (pendingPlay === request) pendingPlay = null; };
      request?.then(settled, settled);
    } catch {
      pendingPlay = null;
      // Policy/readiness failures are retried on the next lifecycle event.
    }
  }

  const retry = () => attempt();
  ['loadeddata', 'canplay'].forEach(type => video.addEventListener(type, retry));
  document.addEventListener('visibilitychange', retry);
  document.addEventListener('page-visible', retry);
  window.addEventListener('pageshow', retry);
  // A paused offscreen video needs another attempt when it enters either
  // the mobile page or the independently scrolling desktop media column.
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) retry();
    });
    observer.observe(video);
  }
  // Do not consume the gesture or remove the listener after a failed attempt.
  ['touchend', 'click', 'keydown'].forEach(type => {
    document.addEventListener(type, () => attempt(true), { passive: true });
  });
  retry();
  return retry;
}

function initProjectVideos() {
  const videos =
    document.querySelectorAll(
      '.project-video video'
    );

  videos.forEach((video) => {
    initVideoAutoplay(video);
  });
}

/* --------------------------------------------------------------------------
   Splash interaction
   -------------------------------------------------------------------------- */

function initSplashScrollTrigger() {
  const splash =
    document.getElementById(
      'splash'
    );

  const checkbox =
    document.getElementById(
      'splashUnlock'
    );

  const pageScroll = document.getElementById('pageScroll');

  if (!splash || !checkbox || !pageScroll || checkbox.checked) {
    return;
  }

  const openingGesture = new AbortController();
  let scrollLocked = false;
  checkbox.addEventListener('change', () => {
    if (checkbox.checked && !scrollLocked) openingGesture.abort();
  });
  splash.querySelector('.splash__cta')?.addEventListener('click', () => {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
  });
  let touchActive = false;
  let transitionUntil = 0;
  let lastInputAt = 0;
  let releaseTimer;

  function releaseWhenIdle() {
    window.clearTimeout(releaseTimer);
    if (!scrollLocked || touchActive) {
      return;
    }

    const wait = Math.max(transitionUntil, lastInputAt + 180) - performance.now();
    if (wait > 0) {
      releaseTimer = window.setTimeout(releaseWhenIdle, wait);
      return;
    }

    pageScroll.scrollTop = 0;
    pageScroll.classList.remove('is-splash-scroll-locked');
    scrollLocked = false;
    // Do not retain a blocking wheel/touch listener after the splash exits.
    openingGesture.abort();
  }

  function consumeOpeningGesture(event) {
    if (checkbox.checked && !scrollLocked) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
    lastInputAt = performance.now();

    if (!scrollLocked) {
      scrollLocked = true;
      // Cover the 600ms splash transition, then wait for wheel momentum to end.
      transitionUntil = lastInputAt + 650;
      pageScroll.classList.add('is-splash-scroll-locked');
      pageScroll.scrollTop = 0;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
    }

    releaseWhenIdle();
  }

  // Capture at document level: the splash stops receiving events as it exits,
  // but the rest of that same gesture must not reach the tiles beneath it.
  document.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && (event.deltaX || event.deltaY)) {
      consumeOpeningGesture(event);
    }
  }, { passive: false, capture: true, signal: openingGesture.signal });

  document.addEventListener('touchstart', () => {
    if (!checkbox.checked || scrollLocked) {
      touchActive = true;
    }
  }, { passive: true, capture: true, signal: openingGesture.signal });

  document.addEventListener('touchmove', consumeOpeningGesture,
    { passive: false, capture: true, signal: openingGesture.signal });

  function endTouch(event) {
    if (event.touches.length === 0) {
      touchActive = false;
      if (scrollLocked) {
        lastInputAt = performance.now();
        releaseWhenIdle();
      }
    }
  }

  document.addEventListener('touchend', endTouch, { passive: true, capture: true, signal: openingGesture.signal });
  document.addEventListener('touchcancel', endTouch, { passive: true, capture: true, signal: openingGesture.signal });

  document.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
      consumeOpeningGesture(event);
    }
  }, { capture: true, signal: openingGesture.signal });

  pageScroll.addEventListener('scroll', () => {
    if (scrollLocked && pageScroll.scrollTop !== 0) {
      pageScroll.scrollTop = 0;
    }
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   Page entrance
   -------------------------------------------------------------------------- */

function initPageEntrance() {
  // Setup succeeded. The splash may intentionally stay open longer than
  // the failure timeout; only its unlock should reveal the page below it.
  window.clearTimeout(window.pageEntranceFallback);
  const navigation =
    document.querySelector(
      '.site-nav'
    );

  function revealPage() {
    navigation?.classList.add(
      'is-visible'
    );

    window.clearTimeout(window.pageEntranceFallback);
    document.documentElement.classList.remove('page-loading');
    document.dispatchEvent(new Event('page-visible'));
  }

  const checkbox =
    document.getElementById(
      'splashUnlock'
    );

  if (
    !checkbox ||
    checkbox.checked
  ) {
    requestAnimationFrame(() => {
      requestAnimationFrame(
        revealPage
      );
    });

    return;
  }

  checkbox.addEventListener(
    'change',
    () => {
      if (checkbox.checked) {
        requestAnimationFrame(() => requestAnimationFrame(revealPage));
      }
    }
  );
}

/* --------------------------------------------------------------------------
   Page exit
   -------------------------------------------------------------------------- */

const PAGE_EXIT_DURATION_MS =
  700;

function initPageExitTransition() {
  // Safari can restore the outgoing page from its back-forward cache.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    document.documentElement.classList.remove('page-loading');
    document.body.classList.remove('is-page-leaving');
    document.querySelectorAll('.page-leaving').forEach(element => {
      element.classList.remove('page-leaving');
    });
  });

  const navigation =
    document.querySelector(
      '.site-nav'
    );

  const content =
    document.querySelector(
      'main'
    );

  document.addEventListener(
    'click',
    (event) => {
      const link =
        event.target.closest(
          'a[href]'
        );

      if (!link) {
        return;
      }

      if (
        link.target === '_blank' ||
        link.hasAttribute(
          'download'
        )
      ) {
        return;
      }

      const href =
        link.getAttribute(
          'href'
        );

      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith(
          'mailto:'
        ) ||
        href.startsWith(
          'tel:'
        ) ||
        /^(?:https?:)?\/\//i.test(
          href
        )
      ) {
        return;
      }

      /*
       * Navigate project tiles
       * immediately on touchscreens.
       */

      const isTouchProjectTile =
        link.classList.contains(
          'project-card'
        ) &&
        isTouchDevice();

      if (isTouchProjectTile) {
        return;
      }

      event.preventDefault();

      document.body.classList.add('is-page-leaving');

      navigation?.classList.add(
        'page-leaving'
      );

      content?.classList.add(
        'page-leaving'
      );

      window.setTimeout(
        () => {
          window.location.href =
            href;
        },
        PAGE_EXIT_DURATION_MS
      );
    }
  );
}

/* --------------------------------------------------------------------------
   Navigation height
   -------------------------------------------------------------------------- */

function initNavHeightSync() {
  const navigation =
    document.querySelector(
      '.site-nav'
    );

  if (!navigation) {
    return;
  }

  function syncHeight() {
    const height =
      navigation
        .getBoundingClientRect()
        .height;

    document.documentElement
      .style
      .setProperty(
        '--nav-height',
        `${height}px`
      );

    // Spacing is owned by CSS; only measure the fixed header's total height.
  }

  syncHeight();

  window.addEventListener(
    'resize',
    syncHeight
  );

  document.fonts.ready.then(syncHeight);
  new ResizeObserver(syncHeight).observe(navigation);
}

// Fixed navigation must use the same usable width as the scrolling content.
// Classic Windows scrollbars occupy space; macOS overlay scrollbars do not.
function initPageScrollbarSync() {
  const scroller = document.getElementById('pageScroll');
  if (!scroller) return;
  const sync = () => {
    document.documentElement.style.setProperty(
      '--page-scrollbar-width',
      `${scroller.offsetWidth - scroller.clientWidth}px`
    );
  };
  sync();
  new ResizeObserver(sync).observe(scroller);
  window.addEventListener('resize', sync);
}

/* --------------------------------------------------------------------------
   Index scroll reset
   -------------------------------------------------------------------------- */

function resetIndexScrollOnProjectReturn() {
  if (
    !isIndexPage() ||
    window.location.hash !==
      '#projects'
  ) {
    return;
  }

  const pageScroll =
    document.getElementById(
      'pageScroll'
    );

  if (!pageScroll) {
    return;
  }

  /*
   * Reset only on the initial navigation.
   * Do not use a pageshow listener because
   * Safari can otherwise jump to the top.
   */

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      pageScroll.scrollTop = 0;
    });
  });
}

/* --------------------------------------------------------------------------
   Scroll fade-in
   -------------------------------------------------------------------------- */

/**
 * On phone index pages:
 *
 * - Tiles visible on the first screen
 *   appear immediately.
 *
 * - Tiles farther down fade in.
 *
 * - Tiles fade using opacity only and
 *   do not move under the user's finger.
 */

function initScrollFadeIn() {
  const elements =
    Array.from(
      document.querySelectorAll(
        '.fade-in'
      )
    );

  if (elements.length === 0) {
    return;
  }

  if (
    !(
      'IntersectionObserver'
      in window
    )
  ) {
    elements.forEach(
      (element) => {
        element.classList.add(
          'is-visible'
        );
      }
    );

    return;
  }

  const isPhone =
    window.matchMedia(
      '(max-width: 700px)'
    ).matches;

  const pageScroll =
    document.getElementById(
      'pageScroll'
    );

  if (pageScroll) {
    pageScroll.style
      .webkitOverflowScrolling =
        'touch';

  }

  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (entry) => {
            if (
              !entry.isIntersecting
            ) {
              return;
            }

            entry.target
              .classList.add(
                'is-visible'
              );

            observer.unobserve(
              entry.target
            );
          }
        );
      },
      {
        root:
          pageScroll ||
          null,

        threshold:
          0.01,

        rootMargin:
          '0px 0px 25% 0px',
      }
    );

  const firstScreenBottom =
    pageScroll
      ? pageScroll
          .getBoundingClientRect()
          .bottom
      : window.innerHeight;

  elements.forEach(
    (element) => {
      const isIndexTile =
        element.matches(
          '.project-grid .fade-in'
        );

      if (
        isPhone &&
        isIndexTile
      ) {
        element.style.transform =
          'none';

        element.style.touchAction =
          'manipulation';

        element.style
          .webkitTapHighlightColor =
            'transparent';
      }

      const elementTop =
        element
          .getBoundingClientRect()
          .top;

      const isOnFirstScreen =
        elementTop <
        firstScreenBottom;

      if (isOnFirstScreen) {
        // The shared page fade reveals the first screen exactly once.
        // Do not multiply its opacity by a second image/tile transition.
        element.classList.add('is-page-initial');
        element.classList.add(
          'is-visible'
        );

        return;
      }

      observer.observe(element);
    }
  );
}

/* --------------------------------------------------------------------------
   Back button
   -------------------------------------------------------------------------- */

function initBackToTop() {
  const button =
    document.getElementById(
      'backToTop'
    );

  if (!button) {
    return;
  }

  const pageScroll =
    document.getElementById(
      'pageScroll'
    );

  const media = document.querySelector('main.project .project-media');
  const desktop = window.matchMedia(DESKTOP_QUERY);

  const reduceMotion =
    window.matchMedia(
      REDUCED_MOTION_QUERY
    ).matches;

  function getScrollPosition() {
    const target = getMediaScrollTarget();
    return target
      ? target.scrollTop
      : window.scrollY;
  }

  function updateButton() {
    const revealDistance =
      Math.max(
        window.innerHeight,
        700
      );

    const visible =
      getScrollPosition() >
      revealDistance;

    button.classList.toggle(
      'is-visible',
      visible
    );

    button.setAttribute(
      'aria-hidden',
      visible
        ? 'false'
        : 'true'
    );

    button.tabIndex =
      visible
        ? 0
        : -1;
  }

  button.addEventListener(
    'click',
    () => {
      (getMediaScrollTarget() || window).scrollTo({
        top: 0,

        behavior:
          reduceMotion
            ? 'auto'
            : 'smooth',
      });
    }
  );

  (pageScroll || window).addEventListener(
    'scroll',
    updateButton,
    {
      passive: true,
    }
  );

  media?.addEventListener('scroll', updateButton, { passive: true });
  desktop.addEventListener('change', updateButton);

  updateButton();
}

/* --------------------------------------------------------------------------
   Initialise
   -------------------------------------------------------------------------- */

function getMediaScrollTarget() {
  const media = document.querySelector('main.project .project-media');
  return media && window.matchMedia(DESKTOP_QUERY).matches
    ? media : document.getElementById('pageScroll');
}

// Use the browser's complete scrolling pipeline, including boundary physics.
// contain keeps the columns independent; unlike none, it allows local bounce.
function initNativeScrollLayout() {
  const page = document.getElementById('pageScroll');
  const media = document.querySelector('main.project .project-media');
  const footer = page?.querySelector('.site-footer');
  if (!page || !footer) return;
  const desktop = window.matchMedia(DESKTOP_QUERY);
  const spacer = document.createElement('div');
  if (media) {
    media.tabIndex = 0;
    media.setAttribute('role', 'region');
    media.setAttribute('aria-label', 'Project images and videos');
  }
  spacer.className = 'page-footer-space';
  spacer.setAttribute('aria-hidden', 'true');
  page.classList.add('native-scroll-layout');
  let frame = null;
  let footerHeight = 0;

  function updateFooter() {
    frame = null;
    const scroller = getMediaScrollTarget();
    const limit = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    // Safari reports scrollTop beyond both bounds during native elasticity.
    // Clamp only the chrome calculation, never the scroller itself.
    const position = Math.max(0, Math.min(limit, scroller.scrollTop));
    const remaining = limit - position <= 1 ? 0 : limit - position;
    footer.style.setProperty('--footer-offset', `${Math.min(footerHeight, remaining)}px`);
    footer.classList.toggle('is-scroll-visible', remaining < footerHeight);
  }

  function scheduleFooter() {
    if (frame === null) frame = requestAnimationFrame(updateFooter);
  }

  function measureFooter() {
    footerHeight = footer.offsetHeight;
    page.style.setProperty('--page-footer-height', `${footerHeight}px`);
    scheduleFooter();
  }

  function updateLayout() {
    const split = !!media && desktop.matches;
    page.classList.toggle('native-project-columns', split);
    if (split) media.append(spacer);
    else page.insertBefore(spacer, footer);
    measureFooter();
  }

  page.addEventListener('scroll', scheduleFooter, { passive: true });
  media?.addEventListener('scroll', scheduleFooter, { passive: true });
  desktop.addEventListener('change', updateLayout);
  window.addEventListener('resize', scheduleFooter);
  window.addEventListener('pageshow', scheduleFooter);
  const observer = new ResizeObserver(measureFooter);
  observer.observe(footer);
  observer.observe(page.querySelector('main'));
  media?.querySelectorAll('.project-lead-media, .project-gallery').forEach(element => observer.observe(element));
  document.fonts?.ready.then(measureFooter);
  updateLayout();
}

function getMobileTextFade(rect, viewportTop, viewportBottom) {
  const height = Math.max(0, rect.bottom - rect.top);
  const top = Math.min(height, Math.max(0, viewportTop - rect.top));
  const bottom = Math.max(top, Math.min(height, viewportBottom - rect.top));
  const fade = (bottom - top) * 0.08;
  return {
    top, bottom,
    fadeTop: Math.min(fade, top),
    fadeBottom: Math.min(fade, height - bottom),
  };
}

function initProjectTextScroll() {
  const panel = document.getElementById('projectInformation');
  if (!panel) return;

  // Both controls live directly under body, outside the scrolling content.
  // Create the text control here rather than in individual generated pages.
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'project-text-scroll';
  button.hidden = true;
  button.setAttribute('aria-controls', panel.id);
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 20 20" focusable="false"><path d="M10 3v14M5 12l5 5 5-5" /></svg>';
  button.append(icon);
  document.body.append(button);

  // A visual thumb gives Safari a reliable opacity fade, independent of
  // the OS's auto-hiding scrollbar setting. Native scrolling stays intact.
  const scrollbar = document.createElement('div');
  scrollbar.className = 'project-text-scrollbar';
  scrollbar.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('span');
  scrollbar.append(thumb);
  panel.parentElement.append(scrollbar);

  const desktop = window.matchMedia(DESKTOP_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  const textColumn = panel.querySelector('.project-header');
  const mediaColumn = document.querySelector('.project-media');
  const gallery = document.querySelector('.project-gallery');
  const page = document.getElementById('pageScroll');
  const navigation = document.querySelector('.site-nav');
  const atBottom = () => panel.scrollHeight - panel.clientHeight - panel.scrollTop <= 2;

  function updatePositions() {
    // Measure the rendered columns: viewport formulas can drift when a
    // browser reserves space for scrollbars or the layout changes size.
    const textRect = textColumn.getBoundingClientRect();
    const mediaRect = (desktop.matches ? mediaColumn : gallery).getBoundingClientRect();
    document.documentElement.style.setProperty('--project-text-control-x', `${textRect.left + textRect.width / 2}px`);
    document.documentElement.style.setProperty('--project-media-control-x', `${mediaRect.left + mediaRect.width / 2}px`);
  }

  function update() {
    // Read layout once before updating controls; avoid forced reflows per
    // wheel event and do not remeasure horizontal alignment during scrolling.
    const trackHeight = panel.clientHeight;
    const scrollHeight = panel.scrollHeight;
    const scrollTop = panel.scrollTop;
    const scrollable = desktop.matches && scrollHeight > trackHeight + 2;
    const bottom = scrollHeight - trackHeight - scrollTop <= 2;
    button.hidden = !scrollable;
    scrollbar.hidden = !scrollable;
    if (scrollable) {
      const thumbHeight = Math.max(24, trackHeight * trackHeight / scrollHeight);
      const progress = Math.max(0, Math.min(1, scrollTop / (scrollHeight - trackHeight)));
      scrollbar.style.height = `${trackHeight}px`;
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${progress * (trackHeight - thumbHeight)}px)`;
    }
    panel.classList.toggle('is-text-scrollable', scrollable);
    panel.classList.toggle('has-more-text', scrollable && !bottom);
    panel.style.setProperty('--text-overflow-above', `${scrollTop <= 1 ? 0 : scrollTop}px`);
    panel.style.setProperty('--text-overflow-remaining', `${bottom ? 0 : scrollHeight - trackHeight - scrollTop}px`);
    if (!desktop.matches) {
      const viewport = window.visualViewport;
      const viewportTop = Math.max(navigation.getBoundingClientRect().bottom, viewport?.offsetTop || 0);
      const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const fade = getMobileTextFade(panel.getBoundingClientRect(), viewportTop, viewportBottom);
      for (const [property, value] of Object.entries({
        top: fade.top, bottom: fade.bottom,
        'fade-top': fade.fadeTop, 'fade-bottom': fade.fadeBottom,
      })) panel.style.setProperty(`--mobile-text-${property}`, `${value}px`);
    }
    const label = bottom ? 'Scroll to top of project text' : 'Scroll to bottom of project text';
    if (button.getAttribute('aria-label') !== label) {
      icon.querySelector('path').setAttribute('d', bottom
        ? 'M10 17V3M5 8l5-5 5 5'
        : 'M10 3v14M5 12l5 5 5-5');
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  }

  let updateFrame = null;
  let positionsDirty = true;
  function scheduleUpdate(layoutChanged = false) {
    positionsDirty ||= layoutChanged;
    if (updateFrame !== null) return;
    updateFrame = requestAnimationFrame(() => {
      updateFrame = null;
      if (positionsDirty) updatePositions();
      positionsDirty = false;
      update();
    });
  }

  button.addEventListener('click', () => {
    panel.scrollTo({
      top: atBottom() ? 0 : panel.scrollHeight,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  });
  panel.addEventListener('scroll', () => scheduleUpdate(), { passive: true });
  page?.addEventListener('scroll', () => { if (!desktop.matches) scheduleUpdate(); }, { passive: true });
  window.visualViewport?.addEventListener('resize', () => scheduleUpdate());
  window.visualViewport?.addEventListener('scroll', () => scheduleUpdate());
  desktop.addEventListener('change', () => scheduleUpdate(true));
  window.addEventListener('resize', () => scheduleUpdate(true));
  const observer = new ResizeObserver(() => scheduleUpdate(true));
  observer.observe(panel);
  observer.observe(mediaColumn);
  observer.observe(gallery);
  panel.querySelectorAll('.project-header, .project-columns').forEach(element => observer.observe(element));
  document.fonts.ready.then(() => scheduleUpdate(true));
  scheduleUpdate(true);
  initProjectTextDrag(panel, desktop);
}

function initProjectTextDrag(panel, desktop) {
  let drag = null;

  function endDrag() {
    if (!drag) return;
    const pointerId = drag.pointerId;
    drag = null;
    panel.classList.remove('is-text-dragging');
    if (panel.hasPointerCapture(pointerId)) panel.releasePointerCapture(pointerId);
  }

  panel.addEventListener('pointerdown', event => {
    if (!desktop.matches || !panel.classList.contains('is-text-scrollable') ||
        event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary ||
        event.target.closest('a, button, input, textarea, select, [contenteditable]')) return;

    // Leave the native scrollbar available for normal thumb dragging.
    const bounds = panel.getBoundingClientRect();
    if (event.clientX >= bounds.left + panel.clientLeft + panel.clientWidth) return;

    event.preventDefault();
    panel.scrollTo({ top: panel.scrollTop, behavior: 'instant' });
    drag = { pointerId: event.pointerId, startY: event.clientY, startScroll: panel.scrollTop };
    panel.setPointerCapture(event.pointerId);
    panel.classList.add('is-text-dragging');
  });

  panel.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!desktop.matches || !(event.buttons & 1)) {
      endDrag();
      return;
    }
    event.preventDefault();
    const target = drag.startScroll + drag.startY - event.clientY;
    const limit = panel.scrollHeight - panel.clientHeight;
    panel.scrollTop = Math.max(0, Math.min(limit, target));
  });

  panel.addEventListener('pointerup', endDrag);
  panel.addEventListener('pointercancel', endDrag);
  panel.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('blur', endDrag);
  desktop.addEventListener('change', endDrag);
}

async function initSite() {
  await includePartials();
  initNavSearch();

  await initContactLinks();

  markCurrentNavLink();
  hideSearchOffIndex();

  initProjectSearch();
  initPageExitTransition();
  initNavHeightSync();
  initNativeScrollLayout();
  initPageScrollbarSync();

  resetIndexScrollOnProjectReturn();
  initScrollFadeIn();
  initProjectVideos();

  initBackToTop();
  initProjectTextScroll();
  // Avoid swapping font metrics halfway through the entrance, but never
  // leave the page waiting indefinitely for a remote font server.
  if (document.fonts) {
    await Promise.race([
      document.fonts.ready,
      new Promise(resolve => window.setTimeout(resolve, 1000)),
    ]);
  }
  initPageEntrance();
}

function handleInitialisationError(error) {
  window.clearTimeout(window.pageEntranceFallback);
  document.documentElement.classList.remove('page-loading');
  document.querySelector('.site-nav')?.classList.add('is-visible');
  document.querySelectorAll('.fade-in').forEach(element => element.classList.add('is-visible'));
  console.error(
    'Page initialisation failed:',
    error
  );
}

// Plain browser script in production; explicit exports let Node tests load the
// actual implementation without slicing source text or starting the website.
if (typeof module === 'object' && module.exports) {
  module.exports = {
    parseIni, isIndexPage, initNavSearch, initProjectSearch, markCurrentNavLink,
    getMediaScrollTarget, initNativeScrollLayout, initBackToTop,
    initSplashScrollTrigger, initProjectTextDrag, initProjectVideos, initVideoAutoplay, initSplashVideo, getMobileTextFade,
  };
} else {
  initSite().catch(handleInitialisationError);
  initSplashRotation();
  initSplashVideo();
  initSplashScrollTrigger();
}
