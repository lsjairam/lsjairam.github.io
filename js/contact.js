(function () {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  const status = form.querySelector('[data-form-status]');
  const submitButton = form.querySelector('[data-submit-button]');
  const defaultLabel = submitButton.innerHTML;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';
    status.textContent = 'Sending your message…';
    status.dataset.state = '';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) throw new Error('Form service returned an error');

      form.reset();
      status.textContent = 'Message sent. Thank you—I’ll reply by email.';
      status.dataset.state = 'success';
    } catch (_) {
      status.innerHTML = 'The message could not be sent. Please email <a href="mailto:lsjairam@gmail.com">lsjairam@gmail.com</a> instead.';
      status.dataset.state = 'error';
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = defaultLabel;
    }
  });
})();
