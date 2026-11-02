/* ═══════════════════════════════════════════
   MARIO BAHUNEK – Main JavaScript
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ═══════ NAV SCROLL EFFECT ═══════
    const nav = document.getElementById('nav');
    const handleScroll = () => {
        nav?.classList.toggle('nav--scrolled', window.scrollY > 50);
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
    const mobileNavQuery = window.matchMedia('(max-width: 1180px)');

    const closeMobileMenu = (restoreFocus = false) => {
        burger?.classList.remove('active');
        mobileMenu?.classList.remove('active');
        burger?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        if (restoreFocus) burger?.focus();
    };

    burger?.addEventListener('click', () => {
        burger.classList.toggle('active');
        mobileMenu?.classList.toggle('active');
        const isOpen = mobileMenu?.classList.contains('active') ?? false;
        burger.setAttribute('aria-expanded', String(isOpen));
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close mobile menu on link click, Escape, or a switch back to desktop navigation.
    document.querySelectorAll('.nav__mobile a').forEach(link => {
        link.addEventListener('click', () => closeMobileMenu());
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu?.classList.contains('active')) closeMobileMenu(true);
    });
    mobileNavQuery.addEventListener('change', (e) => {
        if (!e.matches) closeMobileMenu();
    });

    // ═══════ SMOOTH SCROLL ═══════
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ═══════ FAQ ACCORDION ═══════
    document.querySelectorAll('.faq__question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const answer = item.querySelector('.faq__answer');
            const isOpen = btn.getAttribute('aria-expanded') === 'true';

            // Close all other items
            document.querySelectorAll('.faq__item').forEach(other => {
                if (other !== item) {
                    other.classList.remove('active');
                    other.querySelector('.faq__question')?.setAttribute('aria-expanded', 'false');
                    const otherAnswer = other.querySelector('.faq__answer');
                    if (otherAnswer) otherAnswer.style.maxHeight = null;
                }
            });

            // Toggle current
            if (isOpen) {
                item.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
                answer.style.maxHeight = null;
            } else {
                item.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
                answer.style.maxHeight = answer.scrollHeight + 'px';
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
            document.querySelector(`[data-panel="${target}"]`)?.classList.add('active');
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
            // Localized decimal separator for grade displays (de/es: comma).
            const decimal = el.dataset.decimal || '.';
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
                    el.textContent = prefix + current.toFixed(2).replace('.', decimal) + suffix;
                } else {
                    el.textContent = prefix + Math.floor(current) + suffix;
                }

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    if (isDecimal) {
                        el.textContent = prefix + target.toFixed(2).replace('.', decimal) + suffix;
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

    // ═══════ SCROLL REVEAL (IntersectionObserver with scroll fallback) ═══════
    const revealElements = document.querySelectorAll(
        '.metric-card, .testimonial-card, .video-card, .course-card, .corp-card, .testimonials__header, .video-section__header, .training__header, .corporate__header, .contact__info, .contact__form-wrapper, .metrics__detail-group, .faq__header, .faq__item'
    );

    // Skip animations entirely if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        // Make everything visible immediately – no animations
        revealElements.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
    } else {
        revealElements.forEach(el => el.classList.add('reveal'));
    }

    const revealOnScroll = () => {
        if (prefersReducedMotion) return;
        revealElements.forEach((el) => {
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

    // Use IntersectionObserver for reliable mobile reveal (fallback to scroll)
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('visible')) {
                    const el = entry.target;
                    const siblings = el.parentElement.querySelectorAll('.reveal:not(.visible)');
                    const idx = Array.from(siblings).indexOf(el);
                    setTimeout(() => {
                        el.classList.add('visible');
                    }, idx * 80);
                    revealObserver.unobserve(el);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    revealOnScroll();

    // ═══════ HERO SAFETY FALLBACK ═══════
    // If CSS animations fail (e.g. browser throttling, power save mode),
    // force hero elements visible after animations should have completed
    setTimeout(() => {
        const heroAnimated = document.querySelectorAll(
            '.hero__badge, .hero__title-line, .hero__subtitle, .hero__entity, .hero__actions, .hero__trust, .hero__visual'
        );
        heroAnimated.forEach(el => {
            if (parseFloat(getComputedStyle(el).opacity) < 0.1) {
                el.style.opacity = '1';
                el.style.transform = 'none';
            }
        });
    }, 2500);

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
    let activeVideoId = null;
    const videoOverlay = videoModal?.querySelector('.video-modal__consent');
    const videoPlayer = videoModal?.querySelector('.video-modal__player');
    const consentPlayBtn = videoModal?.querySelector('.video-modal__consent-btn');
    function stopVideo() { videoIframe?.removeAttribute('src'); }
    function renderVideo() {
        if (!videoModal || !activeVideoId) return;
        const allowed = window.mbicsTracking?.getConsent().video === true;
        videoOverlay.hidden = allowed;
        videoPlayer.hidden = !allowed;
        if (allowed) videoIframe.src = `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0`;
        else stopVideo();
    }
    function openVideoModal(videoId) {
        if (!videoModal || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
        lastFocusedElement = document.activeElement;
        activeVideoId = videoId;
        renderVideo();
        videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Make background content unavailable to keyboard and assistive technology.
        document.querySelectorAll('body > *, main > section').forEach(el => {
            if (el.contains(videoModal) || el.tagName === 'SCRIPT' || el.inert) return;
            el.inert = true; el.dataset.videoInert = 'true';
        });
        modalClose?.focus({ preventScroll: true });
    }
    function closeVideoModal() {
        if (!videoModal) return;
        stopVideo(); activeVideoId = null;
        videoModal.classList.remove('active');
        document.body.style.overflow = '';
        document.querySelectorAll('[data-video-inert]').forEach(el => { el.inert = false; delete el.dataset.videoInert; });
        lastFocusedElement?.focus();
    }
    consentPlayBtn?.addEventListener('click', () => {
        window.mbicsTracking?.setConsent({ video: true });
        modalClose?.focus();
    });
    document.querySelectorAll('[data-video-revoke]').forEach(button => button.addEventListener('click', () => {
        window.mbicsTracking?.setConsent({ video: false });
    }));
    window.addEventListener('mbics:consent', () => {
        if (videoModal?.classList.contains('active')) { renderVideo(); modalClose?.focus(); }
        else if (window.mbicsTracking?.getConsent().video !== true) stopVideo();
    });
    videoCards.forEach(card => {
        card.addEventListener('click', () => openVideoModal(card.dataset.videoId));

    });
    modalClose?.addEventListener('click', closeVideoModal);
    modalBackdrop?.addEventListener('click', closeVideoModal);
    document.addEventListener('keydown', e => {
        if (!videoModal?.classList.contains('active')) return;
        if (e.key === 'Escape') { closeVideoModal(); return; }
        if (e.key === 'Tab') {
            const focusable = Array.from(videoModal.querySelectorAll('button, a[href], iframe, [tabindex]:not([tabindex="-1"])')).filter(el => el.getClientRects().length && !el.disabled);
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    // ═══════ CONTACT FORM WITH VALIDATION ═══════
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('formToast');

    // Helper: get translation for current language
    function getTranslation(key) {
        const lang = document.documentElement.getAttribute('data-lang') || document.documentElement.lang || 'en';
        return (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) || key;
    }

    // Show inline error on a field
    function showFieldError(input, messageKey) {
        input.classList.add('error');
        const errorEl = input.parentElement.querySelector('.form-error');
        if (errorEl) {
            errorEl.textContent = getTranslation(messageKey);
            errorEl.setAttribute('data-i18n-error', messageKey);
            errorEl.classList.add('visible');
        }
    }

    // Clear inline error on a field
    function clearFieldError(input) {
        input.classList.remove('error');
        const errorEl = input.parentElement.querySelector('.form-error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('visible');
        }
    }

    // Validate all required fields
    function validateForm() {
        let isValid = true;
        const nameInput = form.querySelector('#name');
        const emailInput = form.querySelector('#email');
        const messageInput = form.querySelector('#message');

        // Clear previous errors
        [nameInput, emailInput, messageInput].forEach(clearFieldError);

        // Name: required
        if (!nameInput.value.trim()) {
            showFieldError(nameInput, 'contact.errorRequired');
            isValid = false;
        }

        // Email: required + format
        if (!emailInput.value.trim()) {
            showFieldError(emailInput, 'contact.errorRequired');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
            showFieldError(emailInput, 'contact.errorEmail');
            isValid = false;
        }

        // Message: required + min length
        if (!messageInput.value.trim()) {
            showFieldError(messageInput, 'contact.errorRequired');
            isValid = false;
        } else if (messageInput.value.trim().length < 10) {
            showFieldError(messageInput, 'contact.errorMinLength');
            isValid = false;
        }

        return isValid;
    }

    // Real-time: clear error when user starts typing
    form?.querySelectorAll('input[required], textarea[required]').forEach(input => {
        input.addEventListener('input', () => clearFieldError(input));
    });

    // Set loading state on submit button
    function setSubmitLoading(loading) {
        if (!submitBtn) return;
        if (loading) {
            submitBtn.classList.add('btn--loading');
            submitBtn.querySelector('.btn__text').textContent = getTranslation('contact.sending');
            submitBtn.disabled = true;
        } else {
            submitBtn.classList.remove('btn--loading');
            submitBtn.classList.remove('btn--success');
            submitBtn.querySelector('.btn__text').textContent = getTranslation('contact.submit');
            submitBtn.disabled = false;
        }
    }

    // Show toast notification (success or error)
    function showToast(type, titleKey, msgKey) {
        if (!toast) return;
        toast.className = 'form-toast form-toast--' + type;
        toast.querySelector('.form-toast__title').textContent = getTranslation(titleKey);
        toast.querySelector('.form-toast__msg').textContent = getTranslation(msgKey);

        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        clearTimeout(toast._timeout);
        // Status stays available until dismissed or another submission changes it.
    }

    // Close toast on click
    toast?.querySelector('.form-toast__close')?.addEventListener('click', () => {
        toast.classList.remove('visible');
        clearTimeout(toast._timeout);
    });

    let submitting = false;
    let acceptedFingerprint = null;
    const draftLink = document.getElementById('contactMailDraft');
    function draftUrl() {
        const value = id => form.querySelector('#' + id)?.value || '';
        return 'mailto:mario@mb-ics.com?subject=' + encodeURIComponent(getTranslation('contact.draftSubject') + ' – ' + value('name')) +
            '&body=' + encodeURIComponent(['Name: ' + value('name'), 'Email: ' + value('email'), value('company'), value('interest'), '', value('message')].join('\n'));
    }
    draftLink?.addEventListener('click', () => { draftLink.href = draftUrl(); });
    form?.addEventListener('submit', async e => {
        e.preventDefault();
        if (submitting) return;
        if (!validateForm()) { form.querySelector('.error')?.focus(); return; }
        const data = new FormData(form);
        window.mbicsTracking?.sanitizeFormData(data);
        const fingerprint = JSON.stringify(Array.from(data.entries()));
        if (fingerprint === acceptedFingerprint) {
            showToast('success', 'contact.successTitle', 'contact.successMsg'); return;
        }
        submitting = true; setSubmitLoading(true);
        if (draftLink) draftLink.hidden = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const action = form.getAttribute('action');
            if (!action || action.includes('YOUR_FORM_ID')) throw new Error('Missing endpoint');
            const response = await fetch(action, { method: 'POST', body: data,
                headers: { Accept: 'application/json' }, signal: controller.signal, referrerPolicy: 'strict-origin-when-cross-origin' });
            const result = await response.json();
            // Formspree's official client recognizes a string `next` as acceptance.
            // A provider error must take precedence even on HTTP 200.
            if (!response.ok || !result || result.error || result.errors ||
                (result.ok !== true && typeof result.next !== 'string')) throw new Error('No confirmed acceptance');
            acceptedFingerprint = fingerprint;
            form.reset();
            showToast('success', 'contact.successTitle', 'contact.successMsg');
        } catch (_) {
            showToast('error', 'contact.errorTitle', 'contact.errorMsg');
            if (draftLink) { draftLink.href = draftUrl(); draftLink.hidden = false; }
        } finally {
            clearTimeout(timeout); submitting = false; setSubmitLoading(false);
        }
    });

    // Consent controls are shared by home, blog and legal pages.
    const cookieBanner = document.getElementById('cookieBanner');
    let settingsTrigger = null;
    function reflectConsent() {
        const state = window.mbicsTracking?.getConsent() || {};
        ['analytics', 'marketing', 'video'].forEach(key => {
            const input = document.getElementById('consent-' + key);
            if (input) input.checked = state[key] === true;
        });
    }
    function showSettings(focus) {
        if (!cookieBanner) return;
        reflectConsent(); cookieBanner.hidden = false;
        cookieBanner.classList.add('visible');
        if (focus) cookieBanner.querySelector('input,button')?.focus();
    }
    function saveSettings(choice) {
        window.mbicsTracking?.setConsent(choice);
        cookieBanner?.classList.remove('visible');
        if (cookieBanner) cookieBanner.hidden = true;
        settingsTrigger?.focus();
    }
    const storedConsent = window.mbicsTracking?.getConsent();
    if (storedConsent?.analytics === null || storedConsent?.marketing === null) showSettings(false);
    else if (cookieBanner) cookieBanner.hidden = true;
    document.getElementById('cookieAcceptAll')?.addEventListener('click', () => saveSettings({ analytics: true, marketing: true }));
    document.getElementById('cookieNecessary')?.addEventListener('click', () => saveSettings({ analytics: false, marketing: false, video: false }));
    document.getElementById('cookieSave')?.addEventListener('click', () => {
        const choice = {};
        ['analytics', 'marketing', 'video'].forEach(key => { choice[key] = document.getElementById('consent-' + key)?.checked === true; });
        saveSettings(choice);
    });
    document.getElementById('cookieSettingsLink')?.addEventListener('click', e => {
        e.preventDefault(); settingsTrigger = e.currentTarget; showSettings(true);
    });
    window.addEventListener('mbics:consent', reflectConsent);

});
