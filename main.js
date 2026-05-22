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

    // ═══════ VIDEO CARDS — Keyboard Accessibility ═══════
    document.querySelectorAll('.video-card[role="button"]').forEach(card => {
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
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
            '.hero__badge, .hero__title-line, .hero__subtitle, .hero__actions, .hero__trust, .hero__visual'
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

    const openVideoModal = (videoId) => {
        const consent = localStorage.getItem('cookieConsent');

        // If user chose "necessary only", show consent prompt instead of loading YouTube
        if (consent === 'necessary') {
            const consentOverlay = videoModal.querySelector('.video-modal__consent');
            const player = videoModal.querySelector('.video-modal__player');

            if (consentOverlay) {
                consentOverlay.style.display = 'flex';
                consentOverlay.dataset.videoId = videoId;
            }
            if (player) player.style.display = 'none';

            lastFocusedElement = document.activeElement;
            videoModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => modalClose?.focus(), 100);
            return;
        }

        lastFocusedElement = document.activeElement;
        videoIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
        videoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Focus close button for accessibility
        setTimeout(() => modalClose?.focus(), 100);
    };

    const closeVideoModal = () => {
        videoModal.classList.remove('active');
        document.body.style.overflow = '';
        // Stop video after transition
        setTimeout(() => {
            videoIframe.src = '';
            // Reset consent overlay state
            const consentOverlay = videoModal.querySelector('.video-modal__consent');
            const player = videoModal.querySelector('.video-modal__player');
            if (consentOverlay) consentOverlay.style.display = 'none';
            if (player) player.style.display = '';
        }, 350);
        // Restore focus to trigger element
        lastFocusedElement?.focus();
    };

    // "Accept & Play" button inside consent overlay
    const consentPlayBtn = document.querySelector('.video-modal__consent-btn');
    consentPlayBtn?.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'all');
        const consentOverlay = videoModal.querySelector('.video-modal__consent');
        const player = videoModal.querySelector('.video-modal__player');
        const videoId = consentOverlay?.dataset.videoId;

        if (consentOverlay) consentOverlay.style.display = 'none';
        if (player) player.style.display = '';

        if (videoId) {
            videoIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
        }
    });

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

    // ═══════ CONTACT FORM WITH VALIDATION ═══════
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('formToast');

    // Helper: get translation for current language
    function getTranslation(key) {
        const lang = document.documentElement.getAttribute('data-lang') || 'de';
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
        toast._timeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 6000);
    }

    // Close toast on click
    toast?.querySelector('.form-toast__close')?.addEventListener('click', () => {
        toast.classList.remove('visible');
        clearTimeout(toast._timeout);
    });

    // Form submit handler
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            const firstError = form.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            return;
        }

        setSubmitLoading(true);
        const action = form.getAttribute('action');

        if (action && !action.includes('YOUR_FORM_ID')) {
            try {
                const response = await fetch(action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    form.reset();
                    showToast('success', 'contact.successTitle', 'contact.successMsg');
                    setSubmitLoading(false);
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (err) {
                openMailto();
                return;
            }
        } else {
            openMailto();
            return;
        }
    });

    // Mailto fallback
    function openMailto() {
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

        showToast('success', 'contact.mailtoSuccess', 'contact.successMsg');
        setSubmitLoading(false);
    }

    // ═══════ COOKIE CONSENT BANNER + GOOGLE CONSENT MODE v2 ═══════
    // Bei jeder Banner-Entscheidung wird zusätzlich window.mbicsTracking.updateConsent(...)
    // aufgerufen (definiert in tracking.js), das gtag('consent','update') feuert.
    // Bei jedem Page-Load wird die gespeicherte Entscheidung erneut angewendet,
    // damit der Consent-State über Page-Loads hinweg konsistent bleibt — sonst
    // bliebe gtag nach Reload bei 'denied' und Analytics würde nichts senden.
    const cookieBanner = document.getElementById('cookieBanner');
    const cookieAcceptAll = document.getElementById('cookieAcceptAll');
    const cookieNecessary = document.getElementById('cookieNecessary');

    function applyConsent(value) {
        if (typeof window.mbicsTracking?.updateConsent === 'function') {
            const granted = value === 'all';
            window.mbicsTracking.updateConsent({
                marketing: granted ? 'granted' : 'denied',
                analytics: granted ? 'granted' : 'denied'
            });
        }
    }

    function hideCookieBanner(consent) {
        if (!cookieBanner) return;
        localStorage.setItem('cookieConsent', consent);
        cookieBanner.classList.remove('visible');
        applyConsent(consent);
    }

    const storedConsent = localStorage.getItem('cookieConsent');
    if (!storedConsent && cookieBanner) {
        setTimeout(() => {
            cookieBanner.classList.add('visible');
        }, 1500);
    } else if (storedConsent) {
        applyConsent(storedConsent);
    }

    cookieAcceptAll?.addEventListener('click', () => hideCookieBanner('all'));
    cookieNecessary?.addEventListener('click', () => hideCookieBanner('necessary'));

    // "Cookie-Einstellungen"-Link im Footer: macht den Banner wieder sichtbar,
    // damit User ihre Entscheidung jederzeit ändern können (DSGVO-Anforderung).
    document.getElementById('cookieSettingsLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        cookieBanner?.classList.add('visible');
    });

});
