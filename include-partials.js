/**
 * include-partials.js
 *
 * Loads shared HTML partials and initializes navigation,
 * splash behaviour, page transitions, search, scroll
 * animations, videos, and the back-to-top button.
 */

async function includePartials() {
  const slots =
    document.querySelectorAll(
      '[data-include]'
    );

  await Promise.all(
    Array.from(slots).map(
      async (slot) => {
        const includePath =
          slot.getAttribute(
            'data-include'
          );

        try {
          const response =
            await fetch(includePath);

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
            `Failed to include partial "${includePath}":`,
            error
          );

          slot.textContent = '';
        }
      }
    )
  );
}

/* ------------------------------------------------------------------
   Navigation search
   ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------
   Site configuration
   ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------
   Page-specific navigation
   ------------------------------------------------------------------ */

function isIndexPage() {
  const pagePath =
    window.location.pathname;

  return (
    pagePath === '/' ||
    pagePath.endsWith(
      '/index.html'
    )
  );
}

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

/* ------------------------------------------------------------------
   Project search
   ------------------------------------------------------------------ */

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
        const searchableText = (
          card.dataset.search ||
          card.textContent
        ).toLowerCase();

        const matches =
          !query ||
          searchableText.includes(
            query
          );

        const item =
          card.closest('li') ||
          card;

        item.style.display =
          matches ? '' : 'none';
      });
    }
  );
}

/* ------------------------------------------------------------------
   Splash screen
   ------------------------------------------------------------------ */

function initSplashRotation() {
  const images =
    document.querySelectorAll(
      '.splash__image'
    );

  if (images.length < 2) {
    return;
  }

  let currentIndex = 0;

  window.setInterval(() => {
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
  }, 5000);
}

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

  video.muted = true;

  function playVideo() {
    video
      .play()
      .catch(() => {});
  }

  if (checkbox?.checked) {
    video.pause();
  } else {
    playVideo();
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

  function unlockSplash() {
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
    unlockSplash,
    { passive: true }
  );

  splash.addEventListener(
    'touchmove',
    unlockSplash,
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
        unlockSplash();
      }
    }
  );
}

/* ------------------------------------------------------------------
   Page transitions
   ------------------------------------------------------------------ */

function initPageEntrance() {
  const nav =
    document.querySelector(
      '.site-nav'
    );

  const content =
    document.querySelector(
      'main'
    );

  function revealPage() {
    nav?.classList.add(
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
        /^https?:\/\//.test(href)
      ) {
        return;
      }

      event.preventDefault();

      nav?.classList.add(
        'page-leaving'
      );

      content?.classList.add(
        'page-leaving'
      );

      window.setTimeout(() => {
        window.location.href =
          href;
      }, PAGE_EXIT_DURATION_MS);
    }
  );
}

/* ------------------------------------------------------------------
   Navigation sizing
   ------------------------------------------------------------------ */

function initNavHeightSync() {
  const nav =
    document.querySelector(
      '.site-nav'
    );

  if (!nav) {
    return;
  }

  function syncHeight() {
    const navHeight =
      nav
        .getBoundingClientRect()
        .height;

    document.documentElement
      .style
      .setProperty(
        '--nav-height',
        `${navHeight}px`
      );
  }

  syncHeight();

  window.addEventListener(
    'resize',
    syncHeight
  );
}

/* ------------------------------------------------------------------
   Scroll fade-in
   ------------------------------------------------------------------ */

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
      (element) => {
        element.classList.add(
          'is-visible'
        );
      }
    );

    return;
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
        threshold: 0.01,
        rootMargin: '0px 0px 30% 0px',
      }
    );

  elements.forEach(
    (element) => {
      observer.observe(
        element
      );
    }
  );
}

/* ------------------------------------------------------------------
   Back to top
   ------------------------------------------------------------------ */

function initBackToTop() {
  const pageScroll =
    document.getElementById(
      'pageScroll'
    );

  const button =
    document.getElementById(
      'backToTop'
    );

  if (!pageScroll || !button) {
    return;
  }

  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

  function updateVisibility() {
    const showButton =
  pageScroll.scrollTop > 600;

    button.classList.toggle(
      'is-visible',
      showButton
    );

    button.setAttribute(
      'aria-hidden',
      String(!showButton)
    );

    button.tabIndex =
      showButton ? 0 : -1;
  }

  pageScroll.addEventListener(
    'scroll',
    updateVisibility,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    updateVisibility
  );

  button.addEventListener(
    'click',
    () => {
      pageScroll.scrollTo({
        top: 0,
        left: 0,
        behavior:
          reducedMotion.matches
            ? 'auto'
            : 'smooth',
      });
    }
  );

  updateVisibility();
}

/* ------------------------------------------------------------------
   Project videos
   ------------------------------------------------------------------ */

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

  videos.forEach((video) => {
    observer.observe(video);
  });
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

/* ------------------------------------------------------------------
   Initialization
   ------------------------------------------------------------------ */

initSplashRotation();
initSplashVideo();
initSplashScrollTrigger();

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
    initScrollFadeIn();
    initBackToTop();
    initProjectVideoControls();
    initVideosInView();
  }
);