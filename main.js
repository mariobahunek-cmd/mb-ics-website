/* ═══════════════════════════════════════════
   MARIO BAHUNEK – Main JavaScript
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ═══════ NAV SCROLL EFFECT ═══════
    const nav = document.getElementById('nav');
    const handleScroll = () => {
        nav.classList.toggle('nav--scrolled', window.scrollY > 50);
    };
    // ═══════ BACK TO TOP BUTTON ═══════
    const backToTop = document.getElementById('backToTop');
    const toggleBackToTop = () => {
        backToTop?.classList.toggle('visible', window.scrollY > 600);
    };
    backToTop?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ═══════ SCROLL SPY – Active Nav Link ═══════
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__links a[href^="#"]');

    const updateActiveNav = () => {
        const scrollY = window.scrollY + 120;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    updateActiveNav();

    // ═══════ MOBILE MENU ═══════
    const burger = document.querySelector('.nav__burger');
    const mobileMenu = document.querySelector('.nav__mobile');

    burger?.addEventListener('click', () => {
        burger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    document.querySelectorAll('.nav__mobile a').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ═══════ SMOOTH SCROLL ═══════
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ═══════ TRAINING TABS ═══════
    const tabs = document.querySelectorAll('.training__tab');
    const panels = document.querySelectorAll('.training__panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`[data-panel="${target}"]`).classList.add('active');
        });
    });

    // ═══════ COUNTER ANIMATION ═══════
    const animateCounters = () => {
        document.querySelectorAll('.metric-card__number').forEach(el => {
            if (el.dataset.animated) return;
            const rect = el.getBoundingClientRect();
            if (rect.top > window.innerHeight || rect.bottom < 0) return;

            el.dataset.animated = 'true';
            const target = parseFloat(el.dataset.target);
            const suffix = el.dataset.suffix || '';
            const prefix = el.dataset.prefix || '';
            const isDecimal = target < 10;
            const duration = 2000;
            const startTime = performance.now();

            const update = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;

                if (isDecimal) {
                    el.textContent = prefix + current.toFixed(2) + suffix;
                } else {
                    el.textContent = prefix + Math.floor(current) + suffix;
                }

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    if (isDecimal) {
                        el.textContent = prefix + target.toFixed(2) + suffix;
                    } else {
                        el.textContent = prefix + target + suffix;
                    }
                }
            };
            requestAnimationFrame(update);
        });

        // Animate bar fills
        document.querySelectorAll('.metric-card__bar-fill').forEach(bar => {
            if (bar.dataset.animated) return;
            const rect = bar.getBoundingClientRect();
            if (rect.top > window.innerHeight) return;
            bar.dataset.animated = 'true';
            bar.style.width = bar.dataset.width + '%';
        });
    };

    animateCounters();

    // ═══════ SCROLL REVEAL ═══════
    const revealElements = document.querySelectorAll(
        '.metric-card, .testimonial-card, .video-card, .course-card, .corp-card, .testimonials__header, .video-section__header, .training__header, .corporate__header, .contact__info, .contact__form-wrapper, .metrics__detail-group'
    );

    revealElements.forEach(el => el.classList.add('reveal'));

    const revealOnScroll = () => {
        revealElements.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            const visible = rect.top < window.innerHeight - 60;
            if (visible && !el.classList.contains('visible')) {
                // Stagger within same parent
                const siblings = el.parentElement.querySelectorAll('.reveal:not(.visible)');
                const idx = Array.from(siblings).indexOf(el);
                setTimeout(() => {
                    el.classList.add('visible');
                }, idx * 80);
            }
        });
    };

    revealOnScroll();

    // ═══════ UNIFIED SCROLL HANDLER ═══════
    let scrollTicking = false;
    const onScroll = () => {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                handleScroll();
                toggleBackToTop();
                updateActiveNav();
                animateCounters();
                revealOnScroll();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ═══════ VIDEO GALLERY MODAL ═══════
    const videoModal = document.getElementById('videoModal');
    const videoIframe = document.getElementById('videoModalIframe');
    const videoCards = document.querySelectorAll('.video-card');
    const modalClose = document.querySelector('.video-modal__close');
    const modalBackdrop = document.querySelector('.video-modal__backdrop');

    let lastFocusedElement = null;

    const openVideoModal = (videoId) => {
        lastFocusedElement = document.activeElement;
        videoIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Focus close button for accessibility
        setTimeout(() => modalClose?.focus(), 100);
    };

    const closeVideoModal = () => {
        videoModal.classList.remove('active');
        document.body.style.overflow = '';
        // Stop video after transition
        setTimeout(() => { videoIframe.src = ''; }, 350);
        // Restore focus to trigger element
        lastFocusedElement?.focus();
    };

    videoCards.forEach(card => {
        card.addEventListener('click', () => {
            const videoId = card.dataset.videoId;
            if (videoId) openVideoModal(videoId);
        });
    });

    modalClose?.addEventListener('click', closeVideoModal);
    modalBackdrop?.addEventListener('click', closeVideoModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal?.classList.contains('active')) {
            closeVideoModal();
            return;
        }
        // Focus trap inside video modal
        if (e.key === 'Tab' && videoModal?.classList.contains('active')) {
            const focusable = videoModal.querySelectorAll('button, iframe, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // ═══════ CONTACT FORM ═══════
    const form = document.getElementById('contactForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        const action = form.getAttribute('action');

        btn.textContent = '⏳';
        btn.disabled = true;

        // Check if Formspree is configured
        if (action && !action.includes('YOUR_FORM_ID')) {
            try {
                const response = await fetch(action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    btn.textContent = '✓ Gesendet!';
                    btn.style.background = '#188918';
                    btn.style.borderColor = '#188918';
                    form.reset();
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (err) {
                // Fallback to mailto
                openMailto(form, btn, originalText);
                return;
            }
        } else {
            // No Formspree configured → mailto fallback
            openMailto(form, btn, originalText);
            return;
        }

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.disabled = false;
        }, 4000);
    });

    function openMailto(form, btn, originalText) {
        const name = form.querySelector('#name')?.value || '';
        const email = form.querySelector('#email')?.value || '';
        const company = form.querySelector('#company')?.value || '';
        const interest = form.querySelector('#interest')?.value || '';
        const message = form.querySelector('#message')?.value || '';

        const subject = encodeURIComponent(`Website Anfrage: ${interest} – ${name}`);
        const body = encodeURIComponent(
            `Name: ${name}\nE-Mail: ${email}\nUnternehmen: ${company}\nInteresse: ${interest}\n\n${message}`
        );
        window.location.href = `mailto:mario@mb-ics.com?subject=${subject}&body=${body}`;

        btn.textContent = '✓ E-Mail geöffnet!';
        btn.style.background = '#188918';
        btn.style.borderColor = '#188918';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.disabled = false;
        }, 4000);
    }

});
