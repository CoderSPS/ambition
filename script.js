document.addEventListener('DOMContentLoaded', () => {
  // Keep the page functional without the old design system.

  const config = window.SUPABASE_CONFIG;
  const hasConfig =
    config &&
    typeof config.url === 'string' &&
    typeof config.publishableKey === 'string' &&
    !config.url.includes('PASTE_YOUR_SUPABASE_API_URL_HERE') &&
    !config.publishableKey.includes('PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE');

  const supabaseClient =
    hasConfig && window.supabase
      ? window.supabase.createClient(config.url, config.publishableKey)
      : null;

  const adminContent = document.querySelector('#adminContent');
  const adminAccessMessage = document.querySelector('#adminAccessMessage');

  if (adminContent && adminAccessMessage) {
    const showAdminContent = async () => {
      if (!supabaseClient) {
        adminAccessMessage.textContent = 'Admin access is unavailable until Supabase is configured.';
        return;
      }

      const { data, error } = await supabaseClient.auth.getUser();
      const isAdmin = data.user && data.user.app_metadata && data.user.app_metadata.role === 'admin';

      if (error || !isAdmin) {
        adminAccessMessage.textContent = 'You must be signed in with an administrator account to view this page.';
        return;
      }

      adminContent.classList.remove('is-hidden');
    };

    showAdminContent();
  }

  const applicationStorageKey = 'ambitionApplications';

  const normalizeEmail = (email) => email.trim().toLowerCase();

  const hasSubmittedApplication = (email) => {
    try {
      const applications = JSON.parse(localStorage.getItem(applicationStorageKey) || '{}');
      const application = applications[normalizeEmail(email)];
      return Boolean(application && application.status === 'accepted');
    } catch (error) {
      return false;
    }
  };

  const recordApplication = (form) => {
    const applications = JSON.parse(localStorage.getItem(applicationStorageKey) || '{}');
    const formData = Object.fromEntries(new FormData(form).entries());
    const email = normalizeEmail(formData.email || '');
    applications[email] = {
      ...formData,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    localStorage.setItem(applicationStorageKey, JSON.stringify(applications));
  };

  const inappropriatePatterns = [
    /\b(?:fuck|shit|bitch|asshole|cunt|dick|piss|slut|whore)\b/i,
    /\b(?:kill|murder|bomb|terrorize)\s+(?:you|them|us|people)\b/i,
    /\b(?:nazi|nazis|white\s+power)\b/i
  ];

  const containsInappropriateContent = (values) =>
    values.some((value) => inappropriatePatterns.some((pattern) => pattern.test(value)));

  const showContentWarning = (message) => {
    message.textContent = 'Please remove inappropriate language or threatening content before submitting.';
  };

  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const passwordInput = document.querySelector(`#${button.dataset.passwordToggle}`);
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      button.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      button.setAttribute('title', isHidden ? 'Hide password' : 'Show password');
    });
  });

  const signupForm = document.querySelector('#signupForm');

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = document.querySelector('#signupMessage');
      const password = document.querySelector('#password');
      const confirmPassword = document.querySelector('#confirm-password');
      const nameInput = document.querySelector('#name');
      const emailInput = document.querySelector('#email');
      const turnstileToken = signupForm.querySelector('[name="cf-turnstile-response"]');
      const submitButton = signupForm.querySelector('button[type="submit"]');

      if (!supabaseClient) {
        message.textContent = 'Supabase is not configured yet. Add your API URL and project key in supabase-config.js.';
        return;
      }

      if (!signupForm.checkValidity()) {
        return;
      }

      if (containsInappropriateContent([nameInput.value])) {
        showContentWarning(message);
        nameInput.focus();
        return;
      }

      if (password.value !== confirmPassword.value) {
        message.textContent = 'Passwords do not match.';
        confirmPassword.focus();
        return;
      }

      if (!turnstileToken || !turnstileToken.value) {
        message.textContent = 'Please complete the security check.';
        return;
      }

      message.textContent = 'Creating account...';
      submitButton.disabled = true;

      const { error } = await supabaseClient.auth.signUp({
        email: emailInput.value,
        password: password.value,
        options: {
          data: {
            full_name: nameInput.value,
            terms_agreed: true,
            terms_agreed_at: new Date().toISOString()
          }
        }
      });

      submitButton.disabled = false;

      if (error) {
        message.textContent = error.message;
        return;
      }

      message.textContent = 'Account created. Check your email to verify, then log in.';
      signupForm.reset();
    });
  }

  const applyForm = document.querySelector('#applyForm');

  if (applyForm) {
    applyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = document.querySelector('#applyMessage');
      const emailInput = applyForm.querySelector('#email');
      const submitButton = applyForm.querySelector('button[type="submit"]');

      if (!applyForm.checkValidity()) {
        applyForm.reportValidity();
        return;
      }

      const applicationTextFields = Array.from(applyForm.querySelectorAll('input[type="text"], textarea'));
      if (containsInappropriateContent(applicationTextFields.map((field) => field.value))) {
        showContentWarning(message);
        return;
      }

      submitButton.disabled = true;
      message.textContent = 'Sending application...';

      try {
        const response = await fetch(applyForm.action, {
          method: 'POST',
          body: new FormData(applyForm),
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Application could not be sent. Please try again.');
        }

        recordApplication(applyForm);
        message.textContent = 'Application sent. The Ambition team will review it before you can create a project.';
        applyForm.reset();
      } catch (error) {
        message.textContent = error.message;
      } finally {
        submitButton.disabled = false;
      }
    });

    const emailFromQuery = new URLSearchParams(window.location.search).get('email');
    if (emailFromQuery) {
      applyForm.querySelector('#email').value = emailFromQuery;
    }
  }

  const loginForm = document.querySelector('#loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = document.querySelector('#loginMessage');
      const emailInput = loginForm.querySelector('#email');
      const passwordInput = loginForm.querySelector('#password');
      const submitButton = loginForm.querySelector('button[type="submit"]');

      if (!supabaseClient) {
        message.textContent = 'Supabase is not configured yet. Add your API URL and project key in supabase-config.js.';
        return;
      }

      message.textContent = 'Logging in...';
      submitButton.disabled = true;

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value
      });

      submitButton.disabled = false;

      if (error) {
        message.textContent = error.message;
        return;
      }

      message.textContent = 'Login successful. Redirecting...';
      window.location.href = 'projects.html';
    });
  }

  const galleryGrid = document.querySelector('.gallery-grid');

  const renderGalleryProject = (project) => {
    if (!galleryGrid || !project) {
      return;
    }

    const card = document.createElement('article');
    card.className = 'gallery-card';
    const art = document.createElement('div');
    art.className = 'gallery-art gallery-art-blue';
    art.innerHTML = '<span>NEW<br />PROJECT</span>';
    const copy = document.createElement('div');
    copy.className = 'gallery-card-copy';
    copy.innerHTML = '<span class="project-label">Community</span>';
    const title = document.createElement('h3');
    title.textContent = project.name;
    const description = document.createElement('p');
    description.textContent = project.description;
    const author = document.createElement('span');
    author.className = 'gallery-author';
    author.textContent = 'By Ambition Creator';
    copy.append(title, description, author);
    card.append(art, copy);

    galleryGrid.prepend(card);
  };

  const loadGalleryProjects = async () => {
    if (!supabaseClient || !galleryGrid) {
      return;
    }

    const { data, error } = await supabaseClient
      .from('projects')
      .select('name, description, created_at')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error || !Array.isArray(data)) {
      return;
    }

    data.forEach((project) => renderGalleryProject(project));
  };

  loadGalleryProjects();

  const newProjectPanel = document.querySelector('#newProjectPanel');

  if (newProjectPanel) {
    newProjectPanel.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = document.querySelector('#newProjectMessage');
      const submitButton = newProjectPanel.querySelector('button[type="submit"]');
      const nameInput = newProjectPanel.querySelector('[name="project-name"]');
      const descriptionInput = newProjectPanel.querySelector('[name="project-description"]');

      if (!supabaseClient) {
        message.textContent = 'Supabase is not configured yet. Add your API URL and project key in supabase-config.js.';
        return;
      }

      const { data: authData, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !authData.user) {
        message.textContent = 'Please log in before creating a project.';
        return;
      }

      if (!hasSubmittedApplication(authData.user.email || '')) {
        message.textContent = 'Your application must be accepted before you can create a project.';
        return;
      }

      if (!newProjectPanel.checkValidity()) {
        newProjectPanel.reportValidity();
        return;
      }

      if (containsInappropriateContent([nameInput.value, descriptionInput.value])) {
        showContentWarning(message);
        return;
      }

      submitButton.disabled = true;
      message.textContent = 'Creating project...';

      const newProject = {
        owner_id: authData.user.id,
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim()
      };

      const { data: insertedProjects, error } = await supabaseClient
        .from('projects')
        .insert(newProject)
        .select('name, description, created_at')
        .limit(1);

      submitButton.disabled = false;

      if (error) {
        message.textContent = error.message;
        return;
      }

      if (Array.isArray(insertedProjects) && insertedProjects[0]) {
        renderGalleryProject(insertedProjects[0]);
      }

      message.textContent = 'Project created and added to the gallery.';
      newProjectPanel.reset();
      newProjectPanel.classList.add('is-hidden');
    });
  }

  document.querySelectorAll('[data-toggle-panel]').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = document.querySelector(`#${button.dataset.togglePanel}`);
      panel.classList.toggle('is-hidden');
    });
  });

  const mediaInput = document.querySelector('.media-input');
  const mediaPreview = document.querySelector('.media-preview');

  if (mediaInput && mediaPreview) {
    mediaInput.addEventListener('change', () => {
      mediaPreview.replaceChildren();
      Array.from(mediaInput.files).forEach((file) => {
        const preview = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
        preview.src = URL.createObjectURL(file);
        preview.setAttribute('aria-label', file.name);
        if (preview.tagName === 'VIDEO') {
          preview.controls = true;
        }
        mediaPreview.appendChild(preview);
      });
    });
  }

  document.querySelectorAll('#updateForm').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const updateMessage = form.querySelector('.form-message') || document.createElement('p');
      if (containsInappropriateContent([
        form.querySelector('[name="update-title"]').value,
        form.querySelector('[name="update-body"]').value
      ])) {
        showContentWarning(updateMessage);
        if (!updateMessage.parentElement) {
          updateMessage.className = 'form-message';
          form.insertBefore(updateMessage, button);
        }
        return;
      }

      button.textContent = 'Saved locally';
      button.disabled = true;
    });
  });

  const applicationList = document.querySelector('#applicationList');

  if (applicationList) {
    const renderApplications = () => {
      let applications = {};
      try {
        applications = JSON.parse(localStorage.getItem(applicationStorageKey) || '{}');
      } catch (error) {
        applicationList.textContent = 'Applications could not be loaded.';
        return;
      }

      applicationList.replaceChildren();
      const entries = Object.entries(applications);

      if (!entries.length) {
        applicationList.textContent = 'No applications have been submitted yet.';
        return;
      }

      entries.forEach(([email, application]) => {
        const item = document.createElement('article');
        item.className = 'application-review-card';
        const title = document.createElement('h2');
        title.textContent = application.name || email;
        const status = document.createElement('span');
        status.className = `application-status application-status-${application.status || 'pending'}`;
        status.textContent = application.status || 'pending';
        const details = document.createElement('p');
        details.textContent = `${email} | ${application.project_idea || 'No idea provided'}`;
        const reason = document.createElement('p');
        reason.textContent = application.application_reason || '';
        const actions = document.createElement('div');
        actions.className = 'application-review-actions';

        ['accepted', 'rejected'].forEach((nextStatus) => {
          const button = document.createElement('button');
          button.className = nextStatus === 'accepted' ? 'btn btn-primary' : 'btn';
          button.type = 'button';
          button.textContent = nextStatus === 'accepted' ? 'Accept application' : 'Reject application';
          button.addEventListener('click', () => {
            applications[email] = { ...application, status: nextStatus };
            localStorage.setItem(applicationStorageKey, JSON.stringify(applications));
            renderApplications();
          });
          actions.appendChild(button);
        });

        item.append(title, status, details, reason, actions);
        applicationList.appendChild(item);
      });
    };

    renderApplications();
  }
});

