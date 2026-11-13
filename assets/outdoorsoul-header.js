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

    let closeTimer = null;
    let openMenu = null;
    const CLOSE_DELAY = 500;

    const isDesktop = () => matchMedia('(min-width: 990px)').matches;

    const getPanel = (menu) =>
      menu?.querySelector('details.mega-menu .mega-menu__content, details .mega-menu__content');

    const isPointerOverMega = () =>
      Boolean(
        document.querySelector('.section-header header-menu:hover') ||
          document.querySelector('.section-header .mega-menu[open] > .mega-menu__content:hover')
      );

    const closeAll = () => {
      menus.forEach((menu) => {
        const details = menu.querySelector('details.mega-menu, details');
        if (!details) return;
        details.removeAttribute('open');
        details.querySelector('summary')?.setAttribute('aria-expanded', 'false');
      });
      openMenu = null;
    };

    const open = (menu) => {
      const details = menu.querySelector('details.mega-menu, details');
      if (!details) return;
      clearTimeout(closeTimer);
      closeTimer = null;
      if (openMenu === menu && details.hasAttribute('open')) return;

      menus.forEach((other) => {
        if (other === menu) return;
        const otherDetails = other.querySelector('details.mega-menu, details');
        if (!otherDetails) return;
        otherDetails.removeAttribute('open');
        otherDetails.querySelector('summary')?.setAttribute('aria-expanded', 'false');
      });

      details.setAttribute('open', '');
      details.querySelector('summary')?.setAttribute('aria-expanded', 'true');
      openMenu = menu;
    };

    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (!isDesktop()) return;
        if (isPointerOverMega()) return;
        closeAll();
      }, CLOSE_DELAY);
    };

    const cancelClose = () => {
      clearTimeout(closeTimer);
      closeTimer = null;
    };

    menus.forEach((menu) => {
      const details = menu.querySelector('details');
      if (!details) return;
      const panel = getPanel(menu);

      menu.addEventListener('mouseenter', () => {
        if (!isDesktop()) return;
        open(menu);
      });

      menu.addEventListener('mouseleave', (event) => {
        if (!isDesktop()) return;
        if (panel && event.relatedTarget && panel.contains(event.relatedTarget)) {
          cancelClose();
          return;
        }
        scheduleClose();
      });

      /* Panel sits outside the trigger box — keep open while over it / the bridge */
      panel?.addEventListener('mouseenter', () => {
        if (!isDesktop()) return;
        open(menu);
      });
      panel?.addEventListener('mouseleave', (event) => {
        if (!isDesktop()) return;
        if (menu.contains(event.relatedTarget)) {
          cancelClose();
          return;
        }
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
