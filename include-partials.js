/**
 * include-partials.js
 *
 * Loads shared HTML partials and initializes the website’s navigation,
 * splash screen, page transitions, project search, scroll animations,
 * and video behaviour.
 */

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
            `Failed to include partial "${path}":`,
            error
          );

          slot.textContent = '';
        }
      }
    )
  );
}

// ---------------------------------------------------------------------
// Navigation search
// ---------------------------------------------------------------------

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

// ---------------------------------------------------------------------
// Site configuration
// ---------------------------------------------------------------------

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
        const trimmed = line
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

        const key = trimmed
          .slice(0, equalsIndex)
          .trim();

        let value = trimmed
          .slice(equalsIndex + 1)
          .trim();

        value = value.replace(
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

// ---------------------------------------------------------------------
// Page-specific navigation
// ---------------------------------------------------------------------

function hidePortfolioLinkOnIndex() {
  const path =
    window.location.pathname;

  const onIndex =
    path === '/' ||
    path.endsWith('/index.html');

  if (!onIndex) return;

  const link =
    document.querySelector(
      '.site-nav__link--portfolio'
    );

  if (link) {
    link.style.display = 'none';
  }
}

function hideSearchOffIndex() {
  const path =
    window.location.pathname;

  const onIndex =
    path === '/' ||
    path.endsWith('/index.html');

  if (onIndex) return;

  const search =
    document.querySelector(
      '.site-nav__search-group'
    );

  if (search) {
    search.style.display = 'none';
  }
}

// ---------------------------------------------------------------------
// Project search
// ---------------------------------------------------------------------

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

  const cards = Array.from(
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
        const haystack = (
          card.dataset.search ||
          card.textContent
        ).toLowerCase();

        const matches =
          !query ||
          haystack.includes(query);

        const item =
          card.closest('li') ||
          card;

        item.style.display =
          matches ? '' : 'none';
      });
    }
  );
}

// ---------------------------------------------------------------------
// Splash screen
// ---------------------------------------------------------------------

function initSplashRotation() {
  const images =
    document.querySelectorAll(
      '.splash__image'
    );

  if (images.length < 2) {
    return;
  }

  let current = 0;

  setInterval(() => {
    images[current]
      .classList.remove(
        'is-active'
      );

    current =
      (current + 1) %
      images.length;

    images[current]
      .classList.add(
        'is-active'
      );
  }, 5000);
}

function initSplashVideo() {
  const video =
    document.querySelector(
      '.splash__video'
    );

  if (!video) return;

  const checkbox =
    document.getElementById(
      'splashUnlock'
    );

  const source =
    video.querySelector('source');

  video.muted = true;

  function play() {
    video
      .play()
      .catch(() => {});
  }

  if (checkbox?.checked) {
    video.pause();
  } else {
    play();
  }

  checkbox?.addEventListener(
    'change',
    () => {
      if (checkbox.checked) {
        video.pause();
      } else {
        play();
      }
    }
  );

  source?.addEventListener(
    'error',
    () => {
      video.remove();
    }
  );
}

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

  function trigger() {
    if (!checkbox.checked) {
      checkbox.checked = true;

      checkbox.dispatchEvent(
        new Event('change')
      );
    }
  }

  splash.addEventListener(
    'wheel',
    trigger,
    { passive: true }
  );

  splash.addEventListener(
    'touchmove',
    trigger,
    { passive: true }
  );

  splash.addEventListener(
    'keydown',
    (event) => {
      const triggerKeys = [
        'ArrowDown',
        'PageDown',
        ' ',
      ];

      if (
        triggerKeys.includes(
          event.key
        )
      ) {
        trigger();
      }
    }
  );
}

// ---------------------------------------------------------------------
// Page transitions
// ---------------------------------------------------------------------

function initPageEntrance() {
  const nav =
    document.querySelector(
      '.site-nav'
    );

  const content =
    document.querySelector(
      'main'
    );

  function reveal() {
    if (nav) {
      nav.classList.add(
        'is-visible'
      );
    }

    if (content) {
      content.classList.remove(
        'page-enter'
      );
    }
  }

  if (content) {
    content.classList.add(
      'page-enter'
    );
  }

  const checkbox =
    document.getElementById(
      'splashUnlock'
    );

  if (
    !checkbox ||
    checkbox.checked
  ) {
    requestAnimationFrame(() =>
      requestAnimationFrame(reveal)
    );

    return;
  }

  checkbox.addEventListener(
    'change',
    () => {
      if (checkbox.checked) {
        reveal();
      }
    }
  );
}

const PAGE_EXIT_DURATION_MS = 700;

function initPageExitTransition() {
  const nav =
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

      if (!link) return;

      if (
        link.target === '_blank' ||
        link.hasAttribute(
          'download'
        )
      ) {
        return;
      }

      const href =
        link.getAttribute('href');

      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith(
          'mailto:'
        ) ||
        /^https?:\/\//.test(href)
      ) {
        return;
      }

      event.preventDefault();

      if (nav) {
        nav.classList.add(
          'page-leaving'
        );
      }

      if (content) {
        content.classList.add(
          'page-leaving'
        );
      }

      setTimeout(() => {
        window.location.href =
          href;
      }, PAGE_EXIT_DURATION_MS);
    }
  );
}

// ---------------------------------------------------------------------
// Navigation sizing
// ---------------------------------------------------------------------

function initNavHeightSync() {
  const nav =
    document.querySelector(
      '.site-nav'
    );

  if (!nav) return;

  function syncHeight() {
    const height =
      nav
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

// ---------------------------------------------------------------------
// Index return positioning
// ---------------------------------------------------------------------

function resetIndexScrollOnProjectReturn() {
  const path =
    window.location.pathname;

  const onIndex =
    path === '/' ||
    path.endsWith('/index.html');

  if (
    !onIndex ||
    window.location.hash !==
      '#projects'
  ) {
    return;
  }

  const pageScroll =
    document.getElementById(
      'pageScroll'
    );

  if (!pageScroll) return;

  function reset() {
    pageScroll.scrollTop = 0;
  }

  requestAnimationFrame(() =>
    requestAnimationFrame(reset)
  );

  window.addEventListener(
    'pageshow',
    reset
  );
}

// ---------------------------------------------------------------------
// Scroll fade-in
// ---------------------------------------------------------------------

function initScrollFadeIn() {
  const elements =
    document.querySelectorAll(
      '.fade-in'
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
      (element) =>
        element.classList.add(
          'is-visible'
        )
    );

    return;
  }

  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (entry) => {
            if (
              entry.isIntersecting
            ) {
              entry.target
                .classList.add(
                  'is-visible'
                );

              observer.unobserve(
                entry.target
              );
            }
          }
        );
      },
      {
        threshold: 0.15,
        rootMargin:
          '0px 0px -40px 0px',
      }
    );

  elements.forEach(
    (element) =>
      observer.observe(element)
  );
}

// ---------------------------------------------------------------------
// Project videos
// ---------------------------------------------------------------------

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
        threshold: [
          0,
          0.35,
        ],
      }
    );

  videos.forEach(
    (video) =>
      observer.observe(video)
  );
}

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
      '(hover: hover) and (pointer: fine)'
    ).matches;

  videos.forEach((video) => {
    if (!supportsHover) {
      video.controls = true;
      return;
    }

    const showControls = () => {
      video.controls = true;
    };

    const hideControls = () => {
      video.controls = false;
    };

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

// ---------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------

includePartials().then(
  async () => {
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
  }
);

initSplashRotation();
initSplashVideo();
initSplashScrollTrigger();