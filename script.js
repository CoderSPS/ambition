const revealItems = document.querySelectorAll('.reveal');
const heroShell = document.querySelector('.hero-shell');
const progressBar = document.querySelector('.scroll-progress');
const root = document.documentElement;
const tiltedCards = document.querySelectorAll('[data-tilt]');
const backToTopBtn = document.querySelector('.back-to-top');
const particleLayer = document.querySelector('.particle-layer');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.2
});

revealItems.forEach((item) => observer.observe(item));

document.querySelectorAll('.btn').forEach((button) => {
  button.addEventListener('click', (event) => {
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    const rect = button.getBoundingClientRect();
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

tiltedCards.forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--card-rotateY', `${x * 8}deg`);
    card.style.setProperty('--card-rotateX', `${-y * 8}deg`);
    card.style.transform = `perspective(900px) rotateX(${ -y * 8 }deg) rotateY(${x * 8}deg) translateY(-6px) scale(1.01)`;
  });

  card.addEventListener('pointerleave', () => {
    card.style.transform = '';
    card.style.setProperty('--card-rotateY', '0deg');
    card.style.setProperty('--card-rotateX', '0deg');
  });
});

if (heroShell) {
  heroShell.addEventListener('pointermove', (event) => {
    const rect = heroShell.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    heroShell.style.setProperty('--rotateY', `${x * 8}deg`);
    heroShell.style.setProperty('--rotateX', `${-y * 8}deg`);
    heroShell.style.setProperty('--glowX', `${(x + 0.5) * 100}%`);
    heroShell.style.setProperty('--glowY', `${(y + 0.5) * 100}%`);
  });

  heroShell.addEventListener('pointerleave', () => {
    heroShell.style.setProperty('--rotateY', '0deg');
    heroShell.style.setProperty('--rotateX', '0deg');
    heroShell.style.setProperty('--glowX', '50%');
    heroShell.style.setProperty('--glowY', '50%');
  });
}

if (particleLayer) {
  for (let i = 0; i < 20; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.setProperty('--size', `${Math.random() * 5 + 3}px`);
    particle.style.setProperty('--drift', `${Math.random() * 80 - 40}px`);
    particle.style.animationDelay = `${Math.random() * 6}s`;
    particle.style.animationDuration = `${Math.random() * 8 + 6}s`;
    particleLayer.appendChild(particle);
  }
}

if (backToTopBtn) {
  const toggleBackToTop = () => {
    backToTopBtn.classList.toggle('show', window.scrollY > 450);
  };

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  toggleBackToTop();
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const element = entry.target;
    const target = Number(element.dataset.counter || 0);
    const duration = 1400;
    const start = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased).toString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = target.toString();
      }
    };

    requestAnimationFrame(animate);
    counterObserver.unobserve(element);
  });
}, {
  threshold: 0.6
});

document.querySelectorAll('[data-counter]').forEach((item) => counterObserver.observe(item));

const testimonialCards = Array.from(document.querySelectorAll('.testimonial-card'));
const testimonialDots = Array.from(document.querySelectorAll('.carousel-dot'));
const carouselButtons = document.querySelectorAll('.carousel-btn');

if (testimonialCards.length) {
  let currentCard = 0;

  const showCard = (index) => {
    currentCard = (index + testimonialCards.length) % testimonialCards.length;
    testimonialCards.forEach((card, cardIndex) => {
      card.classList.toggle('active', cardIndex === currentCard);
    });
    testimonialDots.forEach((dot, dotIndex) => {
      dot.classList.toggle('active', dotIndex === currentCard);
    });
  };

  carouselButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showCard(currentCard + Number(button.dataset.direction || 1));
    });
  });

  testimonialDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      showCard(Number(dot.dataset.index));
    });
  });

  setInterval(() => {
    showCard(currentCard + 1);
  }, 6000);
}

const updateProgressBar = () => {
  if (!progressBar) return;
  const scrollTop = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  progressBar.style.width = `${Math.min(progress, 100)}%`;
  root.style.setProperty('--scroll-tint', `${Math.min(progress / 100, 1)}`);
};

window.addEventListener('scroll', updateProgressBar, { passive: true });
window.addEventListener('resize', updateProgressBar);
updateProgressBar();

