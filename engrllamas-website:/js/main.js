// ===== js/main.js =====
(function() {
  // Active navigation indicator + URL highlight
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('[data-nav-link]');
  let activeLink = null;
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '/' && href === '/') || (currentPath.endsWith('/index.html') && href === '/')) {
      link.classList.add('active');
      activeLink = link;
    } else if (currentPath !== '/' && href !== '/' && currentPath.includes(href) && href.length > 1) {
      link.classList.add('active');
      activeLink = link;
    }
  });

  // Sliding indicator (on desktop only)
  const indicator = document.querySelector('[data-nav-indicator]');
  function updateIndicator() {
    if (!indicator || window.innerWidth < 860) return;
    const active = document.querySelector('.nav-link.active');
    if (active && active.closest('.nav-list')) {
      const parentNav = active.parentElement;
      const navRect = active.closest('.primary-nav')?.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      if (navRect) {
        indicator.style.width = `${activeRect.width}px`;
        indicator.style.transform = `translateX(${activeRect.left - navRect.left}px)`;
        indicator.style.opacity = '1';
      }
    } else {
      indicator.style.opacity = '0';
    }
  }
  setTimeout(updateIndicator, 100);
  window.addEventListener('resize', () => setTimeout(updateIndicator, 80));

  // Mobile navigation
  const toggleBtn = document.querySelector('[data-mobile-toggle]');
  const navContainer = document.querySelector('[data-primary-nav]');
  if (toggleBtn && navContainer) {
    toggleBtn.addEventListener('click', () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true' ? false : true;
      toggleBtn.setAttribute('aria-expanded', expanded);
      navContainer.classList.toggle('mobile-open');
      const iconUse = toggleBtn.querySelector('svg use');
      if (iconUse && expanded) iconUse.setAttribute('href', '#icon-close');
      else if (iconUse) iconUse.setAttribute('href', '#icon-menu');
      if (expanded) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = '';
    });
    const mobileLinks = navContainer.querySelectorAll('.nav-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        navContainer.classList.remove('mobile-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        const iconUse = toggleBtn.querySelector('svg use');
        if (iconUse) iconUse.setAttribute('href', '#icon-menu');
      });
    });
  }

  // Scroll reveal IntersectionObserver
  const revealElements = document.querySelectorAll('.scroll-reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  revealElements.forEach(el => observer.observe(el));

  // Optional: Hero text staggered line via manual CSS but we add revealed class to parent of hero-content?
  const heroContent = document.querySelector('.hero-content');
  if (heroContent && !heroContent.classList.contains('revealed')) {
    setTimeout(() => {
      heroContent.classList.add('revealed');
    }, 100);
  }
  document.querySelectorAll('.hero-graphic, .featured-artifact .scroll-reveal, .pathway-card').forEach(el => {
    if (el.classList.contains('scroll-reveal')) observer.observe(el);
  });

  // manual set if hero text not yet revealed
  if (heroContent && !heroContent.classList.contains('revealed')) heroContent.classList.add('revealed');

  // Respect prefers-reduced-motion globally
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery.matches) {
    document.documentElement.style.setProperty('--duration-slow', '0.01ms');
    document.documentElement.style.setProperty('--duration-med', '0.01ms');
  }
})();