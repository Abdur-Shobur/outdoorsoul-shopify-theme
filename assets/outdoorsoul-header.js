/* Outdoor Soul header behaviors — Slick announcement, search toggle, mega hover */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const hasSlick = () => window.jQuery && window.jQuery.fn && window.jQuery.fn.slick;

  /* Announcement bar: Slick slider */
  const initOfferSlick = () => {
    const el = $('[data-os-slick]');
    if (!el || !hasSlick()) return false;
    const $el = window.jQuery(el);
    if ($el.hasClass('slick-initialized')) return true;
    if ($el.children().length < 2) return true;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const autoplay = el.dataset.autoplay !== 'false' && !reduceMotion;
    const speed = Math.max(3000, parseInt(el.dataset.speed || '5000', 10));

    $el.slick({
      autoplay,
      autoplaySpeed: speed,
      arrows: true,
      dots: false,
      infinite: true,
      fade: false,
      speed: reduceMotion ? 0 : 450,
      cssEase: 'ease',
      adaptiveHeight: false,
      pauseOnHover: true,
      pauseOnFocus: true,
      accessibility: true,
      prevArrow: '<button type="button" class="slick-prev" aria-label="Previous announcement"></button>',
      nextArrow: '<button type="button" class="slick-next" aria-label="Next announcement"></button>',
    });
    return true;
  };

  /* Shop by Category: Slick slider */
  const initCategoriesSlick = () => {
    const els = $$('[data-os-categories-slick]');
    if (!els.length || !hasSlick()) return false;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ready = true;

    els.forEach((el) => {
      const $el = window.jQuery(el);
      if ($el.hasClass('slick-initialized')) return;
      if ($el.children().length < 2) return;

      const desktop = Math.max(4, parseInt(el.dataset.slidesDesktop || '7', 10));
      const tablet = Math.max(3, parseInt(el.dataset.slidesTablet || '4', 10));
      const mobile = Math.max(2, parseInt(el.dataset.slidesMobile || '3', 10));

      $el.slick({
        slidesToShow: desktop,
        slidesToScroll: 1,
        arrows: true,
        dots: false,
        infinite: false,
        speed: reduceMotion ? 0 : 400,
        cssEase: 'ease',
        adaptiveHeight: false,
        prevArrow: '<button type="button" class="slick-prev" aria-label="Previous categories"></button>',
        nextArrow: '<button type="button" class="slick-next" aria-label="Next categories"></button>',
        responsive: [
          {
            breakpoint: 990,
            settings: {
              slidesToShow: tablet,
              slidesToScroll: 1,
            },
          },
          {
            breakpoint: 750,
            settings: {
              slidesToShow: mobile,
              slidesToScroll: 1,
            },
          },
        ],
      });
    });

    return ready;
  };

  const initAllSlick = () => {
    if (!hasSlick()) return false;
    initOfferSlick();
    initCategoriesSlick();
    return true;
  };

  const waitForSlick = () => {
    if (initAllSlick()) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (initAllSlick() || tries > 40) window.clearInterval(timer);
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForSlick);
  } else {
    waitForSlick();
  }

  document.addEventListener('shopify:section:load', (event) => {
    if (
      event.target &&
      (event.target.querySelector('[data-os-slick]') ||
        event.target.querySelector('[data-os-categories-slick]') ||
        event.target.matches?.('[data-os-categories-slick]'))
    ) {
      waitForSlick();
    }
  });

  /* Mobile/tablet search row toggle */
  const searchToggle = $('[data-os-search-toggle]');
  const searchRow = $('[data-os-search-row]');
  searchToggle?.addEventListener('click', () => {
    if (!searchRow) return;
    const open = searchRow.classList.toggle('is-open');
    searchToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      const input = $('input[type="search"]', searchRow);
      input?.focus();
    }
  });

  /* Desktop mega menu: open on hover, stay open while over trigger or panel */
  const bindMegaHover = () => {
    const menus = $$('.section-header header-menu');
    if (!menus.length) return;

    let closeTimer;
    let openMenu = null;

    const isDesktop = () => matchMedia('(min-width: 990px)').matches;

    const closeAll = () => {
      menus.forEach((menu) => {
        const details = menu.querySelector('details.mega-menu, details');
        if (!details) return;
        details.removeAttribute('open');
        const summary = details.querySelector('summary');
        summary?.setAttribute('aria-expanded', 'false');
      });
      openMenu = null;
    };

    const open = (menu) => {
      const details = menu.querySelector('details.mega-menu, details');
      if (!details) return;
      clearTimeout(closeTimer);
      if (openMenu === menu && details.hasAttribute('open')) return;
      closeAll();
      details.setAttribute('open', '');
      details.querySelector('summary')?.setAttribute('aria-expanded', 'true');
      openMenu = menu;
    };

    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (!isDesktop()) return;
        closeAll();
      }, 320);
    };

    menus.forEach((menu) => {
      const details = menu.querySelector('details');
      if (!details) return;

      menu.addEventListener('mouseenter', () => {
        if (!isDesktop()) return;
        open(menu);
      });

      menu.addEventListener('mouseleave', () => {
        if (!isDesktop()) return;
        scheduleClose();
      });

      /* Panel is often position:absolute outside the trigger box — keep open while over it */
      const panel = details.querySelector('.mega-menu__content');
      panel?.addEventListener('mouseenter', () => {
        if (!isDesktop()) return;
        clearTimeout(closeTimer);
        open(menu);
      });
      panel?.addEventListener('mouseleave', () => {
        if (!isDesktop()) return;
        scheduleClose();
      });
    });

    /* Plain links: close mega when hovering non-dropdown items */
    $$('.section-header .header__inline-menu > ul > li > a.header__menu-item').forEach((link) => {
      link.addEventListener('mouseenter', () => {
        if (!isDesktop()) return;
        scheduleClose();
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindMegaHover);
  } else {
    bindMegaHover();
  }
})();
