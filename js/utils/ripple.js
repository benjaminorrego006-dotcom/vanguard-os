// js/utils/ripple.js
export function attachRipple(element) {
  element.addEventListener('click', function(e) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = \\px\;
    ripple.style.left = \\px\;
    ripple.style.top = \\px\;
    ripple.style.position = 'absolute';
    ripple.style.background = 'rgba(255, 255, 255, 0.3)';
    ripple.style.borderRadius = '50%';
    ripple.style.transform = 'scale(0)';
    ripple.style.pointerEvents = 'none';
    ripple.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
    
    // Make sure element has position relative and overflow hidden
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
    element.style.overflow = 'hidden';
    
    element.appendChild(ripple);
    
    // Trigger animation
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(2)';
      ripple.style.opacity = '0';
    });
    
    setTimeout(() => ripple.remove(), 400);
  });
}
