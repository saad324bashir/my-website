/* ── Nav scroll state ── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, {passive:true});

/* ── Mobile menu ── */
const hamburger = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('navMobile');

if (hamburger && mobileMenu) {
  let savedScroll = 0;

  function openMenu() {
    savedScroll = window.scrollY;
    mobileMenu.style.display = 'flex';
    requestAnimationFrame(() => {
      mobileMenu.classList.add('open');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      // Lock body without jumping: fix it in place at current scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScroll}px`;
      document.body.style.width = '100%';
    });
  }

  function closeMenu() {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    // Restore body and scroll position
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScroll);
    setTimeout(() => {
      if (!mobileMenu.classList.contains('open')) {
        mobileMenu.style.display = 'none';
      }
    }, 300);
  }

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}
