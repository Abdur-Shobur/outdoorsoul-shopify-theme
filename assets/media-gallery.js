if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        this.bindThumbnailGalleryNav();
        this.enableMainImageDrag();
        if (this.elements.viewer?.resetPages) this.elements.viewer.resetPages();
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
      }

      // Pointer drag so desktop mouse users can slide the main image.
      // Clicks (incl. zoom icon) must still open the lightbox — only steal after a real drag.
      enableMainImageDrag() {
        const slider = this.elements.viewer?.slider;
        if (!slider) return;

        let pointerId = null;
        let startX = 0;
        let startScroll = 0;
        let tracking = false;
        let dragging = false;

        const isZoomCorner = (event) => {
          const opener = event.target.closest('.product__modal-opener');
          const icon = opener?.querySelector('.product__media-icon');
          if (!icon || getComputedStyle(icon).display === 'none') return false;
          const rect = icon.getBoundingClientRect();
          const pad = 12;
          return (
            event.clientX >= rect.left - pad &&
            event.clientX <= rect.right + pad &&
            event.clientY >= rect.top - pad &&
            event.clientY <= rect.bottom + pad
          );
        };

        const onMove = (event) => {
          if (!tracking || event.pointerId !== pointerId) return;
          const dx = event.clientX - startX;
          if (!dragging) {
            if (Math.abs(dx) < 10) return;
            dragging = true;
            slider.setPointerCapture?.(event.pointerId);
            slider.classList.add('is-dragging');
          }
          event.preventDefault();
          slider.scrollLeft = startScroll - dx;
        };

        const onUp = (event) => {
          if (event.pointerId !== pointerId) return;
          const didDrag = dragging;
          tracking = false;
          dragging = false;
          pointerId = null;
          slider.classList.remove('is-dragging');
          try {
            slider.releasePointerCapture?.(event.pointerId);
          } catch (error) {
            // Pointer was never captured (click without drag).
          }
          slider.removeEventListener('pointermove', onMove);
          slider.removeEventListener('pointerup', onUp);
          slider.removeEventListener('pointercancel', onUp);
          if (!didDrag) return;
          const suppress = (clickEvent) => {
            clickEvent.preventDefault();
            clickEvent.stopImmediatePropagation();
            slider.removeEventListener('click', suppress, true);
          };
          slider.addEventListener('click', suppress, true);
          window.setTimeout(() => slider.removeEventListener('click', suppress, true), 50);
        };

        slider.addEventListener('pointerdown', (event) => {
          if (event.pointerType === 'touch') return; // native touch scroll
          if (event.button !== 0) return;
          if (isZoomCorner(event)) return; // zoom icon → open lightbox
          const interactive = event.target.closest('a, input, textarea, select, button');
          if (interactive && !interactive.classList.contains('product__media-toggle')) return;
          pointerId = event.pointerId;
          startX = event.clientX;
          startScroll = slider.scrollLeft;
          tracking = true;
          dragging = false;
          slider.addEventListener('pointermove', onMove);
          slider.addEventListener('pointerup', onUp);
          slider.addEventListener('pointercancel', onUp);
        });
      }

      // Side arrows change the main gallery image (design), not only the thumb strip scroll.
      bindThumbnailGalleryNav() {
        if (!this.elements.thumbnails) return;
        const prev = this.elements.thumbnails.querySelector('button[name="previous"]');
        const next = this.elements.thumbnails.querySelector('button[name="next"]');
        if (!prev || !next) return;

        const step = (delta) => (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          const thumbs = Array.from(this.elements.thumbnails.querySelectorAll('[data-target]'));
          if (!thumbs.length) return;
          const currentIndex = Math.max(
            0,
            thumbs.findIndex((item) => item.querySelector('button[aria-current]'))
          );
          const nextIndex = (currentIndex + delta + thumbs.length) % thumbs.length;
          this.setActiveMedia(thumbs[nextIndex].dataset.target, false);
        };

        prev.addEventListener('click', step(-1), true);
        next.addEventListener('click', step(1), true);

        // Dawn disables these when all thumbs fit; keep them usable for gallery nav.
        const unlock = () => {
          prev.removeAttribute('disabled');
          next.removeAttribute('disabled');
        };
        unlock();
        const observer = new MutationObserver(unlock);
        observer.observe(prev, { attributes: true, attributeFilter: ['disabled'] });
        observer.observe(next, { attributes: true, attributeFilter: ['disabled'] });
      }

      onSlideChanged(event) {
        const activeMedia = event.detail.currentElement;
        if (!activeMedia) return;

        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.toggle('is-active', element === activeMedia);
        });

        if (!this.elements.thumbnails) return;
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${activeMedia.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }

      setActiveMedia(mediaId, prepend) {
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');
        if (!activeMedia) {
          return;
        }
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia?.classList?.add('is-active');

        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia);

          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.firstChild !== activeThumbnail && activeThumbnail.parentElement.prepend(activeThumbnail);
          }

          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          // Don't scroll if the image is already in view
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        this.playActiveMedia(activeMedia);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}
