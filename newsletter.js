// Binds all .newsletter-form elements and saves emails via the API
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.newsletter-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const input = form.querySelector('input[type="email"]');
      const email = input?.value.trim();
      if (!email) return;

      const btn = form.querySelector('button[type="submit"]');
      const col = form.closest('.newsletter-col');
      const successEl = col?.querySelector('.newsletter-success');

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Subscribing...';
      }

      const source = form.id === 'newsletter-form-profile' ? 'profile' : 'index';
      const result = await GW.newsletter.subscribe(email, source);

      if (result?.success) {
        form.style.display = 'none';
        if (successEl) {
          successEl.textContent = '🌿 ' + (result.message || "Thanks! You're subscribed.");
          successEl.style.display = 'block';
        }
        return;
      }

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Subscribe';
      }
      if (successEl) {
        successEl.textContent = result?.message || 'Could not subscribe. Please try again.';
        successEl.style.display = 'block';
        successEl.style.color = '#ffcdd2';
      }
    });
  });
});
