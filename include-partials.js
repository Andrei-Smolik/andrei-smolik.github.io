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

function hidePortfolioLinkOnIndex() {
  if (!isIndexPage()) {
    return;
  }

  const link =
    document.querySelector(
      '.site-nav__link--portfolio'
    );

  if (link) {
    link.style.display = 'none';
  }
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

  function removeFailedVideo() {
    video.remove();
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

  if (!splash || !checkbox) {
    return;
  }

  function dismissSplash() {
    if (checkbox.checked) {
      return;
    }

    checkbox.checked = true;

    checkbox.dispatchEvent(
      new Event('change')
    );
  }

  splash.addEventListener(
    'wheel',
    dismissSplash,
    {
      passive: true,
    }
  );

  splash.addEventListener(
    'touchmove',
    dismissSplash,
    {
      passive: true,
    }
  );

  splash.addEventListener(
    'keydown',
    (event) => {
      const keys = [
        'ArrowDown',
        'PageDown',
        ' ',
      ];

      if (keys.includes(event.key)) {
        dismissSplash();
      }
    }
  );
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
  }

  syncHeight();

  window.addEventListener(
    'resize',
    syncHeight
  );
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
        'contain';
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
   Project video autoplay
   -------------------------------------------------------------------------- */

function initVideosInView() {
  const videos =
    document.querySelectorAll(
      'video[data-autoplay-in-view]'
    );

  if (videos.length === 0) {
    return;
  }

  videos.forEach((video) => {
    video.muted = true;
  });

  if (
    !(
      'IntersectionObserver'
      in window
    )
  ) {
    videos.forEach((video) => {
      video
        .play()
        .catch(() => {});
    });

    return;
  }

  const pageScroll =
    document.getElementById(
      'pageScroll'
    );

  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (entry) => {
            const video =
              entry.target;

            if (
              entry.isIntersecting &&
              entry.intersectionRatio >=
                0.35
            ) {
              video
                .play()
                .catch(() => {});
            } else {
              video.pause();
            }
          }
        );
      },
      {
        root:
          pageScroll ||
          null,

        threshold: [
          0,
          0.35,
        ],
      }
    );

  videos.forEach((video) => {
    observer.observe(video);
  });
}

/* --------------------------------------------------------------------------
   Project video controls
   -------------------------------------------------------------------------- */

function initProjectVideoControls() {
  const videos =
    document.querySelectorAll(
      '.project-video video'
    );

  if (videos.length === 0) {
    return;
  }

  const supportsHover =
    window.matchMedia(
      '(hover: hover) and ' +
      '(pointer: fine)'
    ).matches;

  videos.forEach((video) => {
    if (!supportsHover) {
      video.controls = true;
      return;
    }

    function showControls() {
      video.controls = true;
    }

    function hideControls() {
      video.controls = false;
    }

    hideControls();

    video.addEventListener(
      'mouseenter',
      showControls
    );

    video.addEventListener(
      'mouseleave',
      hideControls
    );

    video.addEventListener(
      'focus',
      showControls
    );

    video.addEventListener(
      'blur',
      hideControls
    );
  });
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

includePartials()
  .then(async () => {
    initNavSearch();

    await initContactLinks();

    hidePortfolioLinkOnIndex();
    hideSearchOffIndex();

    initProjectSearch();
    initPageEntrance();
    initPageExitTransition();
    initNavHeightSync();

    resetIndexScrollOnProjectReturn();
    initScrollFadeIn();

    initProjectVideoControls();
    initVideosInView();
    initBackToTop();
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