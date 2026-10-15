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

  function closeSearch() {
    links.classList.remove(
      'is-searching'
    );

    input.value = '';

    input.dispatchEvent(
      new Event('input')
    );

    toggle.focus();
  }

  toggle.addEventListener(
    'click',
    openSearch
  );

  close.addEventListener(
    'click',
    closeSearch
  );

  input.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closeSearch();
      }
    }
  );
}

/* --------------------------------------------------------------------------
   Site configuration
   -------------------------------------------------------------------------- */

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
            .slice(
              0,
              equalsIndex
            )
            .trim();

        let value =
          trimmed
            .slice(
              equalsIndex + 1
            )
            .trim();

        value =
          value.replace(
            /^["'](.*)["']$/,
            '$1'
          );

        config[key] = value;
      });

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

  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;

  function playVideo() {
    const request =
      video.play();

    if (
      request &&
      typeof request.catch ===
      'function'
    ) {
      request.catch(() => {
        /*
         * Autoplay may temporarily be
         * blocked by the browser.
         */
      });
    }
  }

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
  } else {
    playVideo();
  }

  video.addEventListener(
    'loadeddata',
    () => {
      if (!checkbox?.checked) {
        playVideo();
      }
    }
  );

  video.addEventListener(
    'canplay',
    () => {
      revealVideo();

      if (!checkbox?.checked) {
        playVideo();
      }
    }
  );

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

  document.addEventListener(
    'touchstart',
    () => {
      if (!checkbox?.checked) {
        playVideo();
      }
    },
    {
      passive: true,
      once: true,
    }
  );
}

/* --------------------------------------------------------------------------
   Project video autoplay
   -------------------------------------------------------------------------- */

function initProjectVideos() {
  const videos =
    document.querySelectorAll(
      '.project-video video'
    );

  videos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.controls = false;
    video.playsInline = true;

    function play() {
      video.play().catch(() => {});
    }

    video.addEventListener(
      'loadeddata',
      play,
      { once: true }
    );

    video.addEventListener(
      'canplay',
      play,
      { once: true }
    );

    play();
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

  if (!splash || !checkbox || !pageScroll) {
    return;
  }

  let scrollLocked = false;
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
  }, { passive: false, capture: true });

  document.addEventListener('touchstart', () => {
    if (!checkbox.checked || scrollLocked) {
      touchActive = true;
    }
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', consumeOpeningGesture,
    { passive: false, capture: true });

  function endTouch(event) {
    if (event.touches.length === 0) {
      touchActive = false;
      if (scrollLocked) {
        lastInputAt = performance.now();
        releaseWhenIdle();
      }
    }
  }

  document.addEventListener('touchend', endTouch, { passive: true, capture: true });
  document.addEventListener('touchcancel', endTouch, { passive: true, capture: true });

  document.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
      consumeOpeningGesture(event);
    }
  }, { capture: true });

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
  const navigation =
    document.querySelector(
      '.site-nav'
    );

  const content =
    document.querySelector(
      'main'
    );

  function revealPage() {
    navigation?.classList.add(
      'is-visible'
    );

    content?.classList.remove(
      'page-enter'
    );
  }

  content?.classList.add(
    'page-enter'
  );

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
        revealPage();
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

  const textMeasure = document.createElement('canvas').getContext('2d');
  const contactLink = navigation.querySelector('[data-contact-mailto]');

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

    // Opening a second search row should move content down with the nav,
    // without also enlarging the established gap below the divider.
    if (navigation.querySelector('.site-nav__links.is-searching') ||
        !textMeasure || !contactLink || !contactLink.getClientRects().length) {
      return;
    }

    const textStyle = getComputedStyle(contactLink);
    textMeasure.font = `${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
    const label = contactLink.textContent.trim();
    const renderedLabel = textStyle.textTransform === 'uppercase'
      ? label.toUpperCase()
      : label;
    const metrics = textMeasure.measureText(renderedLabel);

    // A zero-sized inline box sits on the actual text baseline. Canvas ink
    // metrics exclude the font's invisible leading and descender space.
    const baseline = document.createElement('span');
    baseline.setAttribute('aria-hidden', 'true');
    baseline.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline;';
    contactLink.append(baseline);
    const textBottom = baseline.getBoundingClientRect().top
      + metrics.actualBoundingBoxDescent;
    baseline.remove();

    const dividerThickness = parseFloat(getComputedStyle(navigation, '::after').height);
    const dividerTop = navigation.getBoundingClientRect().bottom - dividerThickness;
    const gap = Math.max(0, dividerTop - textBottom);

    // Keep the space below the divider twice the visible space above it.
    document.documentElement.style.setProperty('--nav-content-gap', `${gap * 2}px`);
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

    pageScroll.style
      .overscrollBehaviorY =
        'auto';
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

        element.style.transition =
          'opacity 0.45s ease';

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

      if (
        isPhone &&
        isIndexTile &&
        isOnFirstScreen
      ) {
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
   Touch rubber-band overscroll
   -------------------------------------------------------------------------- */

function initTouchRubberBand() {
  const pageScroll =
    document.getElementById(
      'pageScroll'
    );

  const content =
    pageScroll?.querySelector(
      'main'
    );

  if (
    !pageScroll ||
    !content ||
    !isTouchDevice()
  ) {
    return;
  }

  let startY = 0;
  let offset = 0;

  function release() {
    if (offset === 0) {
      return;
    }

    content.classList.add(
      'is-rubberband-releasing'
    );

    offset = 0;
    content.style.setProperty(
      '--rubberband-offset',
      '0px'
    );

    window.setTimeout(
      () => {
        content.classList.remove(
          'is-rubberband-active'
        );

        content.classList.remove(
          'is-rubberband-releasing'
        );
      },
      450
    );
  }

  pageScroll.addEventListener(
    'touchstart',
    (event) => {
      startY = event.touches[0].clientY;
      offset = 0;

    content.classList.remove(
      'is-rubberband-releasing'
    );
    },
    {
      passive: true,
    }
  );

  pageScroll.addEventListener(
    'touchmove',
    (event) => {
      const currentY =
        event.touches[0].clientY;

      const distance =
        currentY - startY;

      const atTop =
        pageScroll.scrollTop <= 0;

      const atBottom =
        pageScroll.scrollTop >=
        pageScroll.scrollHeight -
          pageScroll.clientHeight -
          1;

      const pullingPastTop =
        atTop && distance > 0;

      const pullingPastBottom =
        atBottom && distance < 0;

      if (
        !pullingPastTop &&
        !pullingPastBottom
      ) {
        return;
      }

      event.preventDefault();

      offset = Math.max(
        -96,
        Math.min(
          96,
          distance * 0.35
        )
      );

      content.classList.add(
        'is-rubberband-active'
      );

      content.style.setProperty(
        '--rubberband-offset',
        `${offset}px`
      );
    },
    {
      passive: false,
    }
  );

  pageScroll.addEventListener(
    'touchend',
    release,
    {
      passive: true,
    }
  );

  pageScroll.addEventListener(
    'touchcancel',
    release,
    {
      passive: true,
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

  const scrollTarget =
    pageScroll ||
    window;

  const reduceMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  function getScrollPosition() {
    return pageScroll
      ? pageScroll.scrollTop
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
      scrollTarget.scrollTo({
        top: 0,

        behavior:
          reduceMotion
            ? 'auto'
            : 'smooth',
      });
    }
  );

  scrollTarget.addEventListener(
    'scroll',
    updateButton,
    {
      passive: true,
    }
  );

  updateButton();
}

/* --------------------------------------------------------------------------
   Initialise
   -------------------------------------------------------------------------- */

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

  const desktop = window.matchMedia('(min-width: 1000px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const textColumn = panel.querySelector('.project-header');
  const mediaColumn = document.querySelector('.project-media');
  const gallery = document.querySelector('.project-gallery');
  const atBottom = () => panel.scrollHeight - panel.clientHeight - panel.scrollTop <= 2;

  function update() {
    // Measure the rendered columns: viewport formulas can drift when a
    // browser reserves space for scrollbars or the layout changes size.
    const textRect = textColumn.getBoundingClientRect();
    const mediaRect = (desktop.matches ? mediaColumn : gallery).getBoundingClientRect();
    document.documentElement.style.setProperty('--project-text-control-x', `${textRect.left + textRect.width / 2}px`);
    document.documentElement.style.setProperty('--project-media-control-x', `${mediaRect.left + mediaRect.width / 2}px`);
    const scrollable = desktop.matches && panel.scrollHeight > panel.clientHeight + 2;
    button.hidden = !scrollable;
    scrollbar.hidden = !scrollable;
    if (scrollable) {
      const trackHeight = panel.clientHeight;
      const thumbHeight = Math.max(24, trackHeight * trackHeight / panel.scrollHeight);
      const progress = Math.max(0, Math.min(1, panel.scrollTop / (panel.scrollHeight - trackHeight)));
      scrollbar.style.height = `${trackHeight}px`;
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${progress * (trackHeight - thumbHeight)}px)`;
    }
    panel.classList.toggle('is-text-scrollable', scrollable);
    const label = atBottom() ? 'Scroll to top of project text' : 'Scroll to bottom of project text';
    icon.querySelector('path').setAttribute('d', atBottom()
      ? 'M10 17V3M5 8l5-5 5 5'
      : 'M10 3v14M5 12l5 5 5-5');
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  button.addEventListener('click', () => {
    panel.scrollTo({
      top: atBottom() ? 0 : panel.scrollHeight,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  });
  panel.addEventListener('scroll', update, { passive: true });
  desktop.addEventListener('change', update);
  window.addEventListener('resize', update);
  const observer = new ResizeObserver(update);
  observer.observe(panel);
  observer.observe(mediaColumn);
  observer.observe(gallery);
  panel.querySelectorAll('.project-header, .project-columns').forEach(element => observer.observe(element));
  document.fonts.ready.then(update);
  update();
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
    panel.scrollTop = drag.startScroll + drag.startY - event.clientY;
  });

  panel.addEventListener('pointerup', endDrag);
  panel.addEventListener('pointercancel', endDrag);
  panel.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('blur', endDrag);
  desktop.addEventListener('change', endDrag);
}

includePartials()
  .then(async () => {
    initNavSearch();

    await initContactLinks();

    markCurrentNavLink();
    hideSearchOffIndex();

    initProjectSearch();
    initPageEntrance();
    initPageExitTransition();
    initNavHeightSync();
    initPageScrollbarSync();

    resetIndexScrollOnProjectReturn();
    initScrollFadeIn();
    initTouchRubberBand();
    initProjectVideos();

    initBackToTop();
    initProjectTextScroll();
  })
  .catch((error) => {
    console.error(
      'Page initialisation failed:',
      error
    );
  });

initSplashRotation();
initSplashVideo();
initSplashScrollTrigger();
