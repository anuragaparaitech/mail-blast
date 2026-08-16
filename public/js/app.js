/**
 * Aparaitech Software - Single Page Application Core
 * Routing, View Management, Modals, and Notifications
 */
class App {
  constructor() {
    this.currentView = 'dashboard';
    this.viewContainer = null;
    this.views = {
      'dashboard': DashboardView,
      'students': StudentsView,
      'import': ImportView,
      'composer': ComposerView,
      'blast-monitor': BlastMonitorView,
      'history': HistoryView,
      'inbox': InboxView,
      'settings': SettingsView,
      'demo-tour': DemoTourView
    };
  }

  async init() {
    this.viewContainer = document.getElementById('viewContainer');

    // Handle hash change events
    window.addEventListener('hashchange', () => this.handleRoute());

    // Close modal on backdrop click or ESC key
    const modalOverlay = document.getElementById('modalContainer');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Refresh settings / badge state
    await this.refreshEnvironmentBadge();
    await this.refreshCounters();

    // Initial routing
    this.handleRoute();
  }

  async refreshEnvironmentBadge() {
    try {
      const data = await api.getSettings();
      const settings = data.settings || {};
      const badge = document.getElementById('envBadgeText');
      if (badge) {
        badge.textContent = settings.mailer_mode === 'smtp' ? 'Live SMTP' : 'Sandbox Mode';
      }
    } catch (err) {
      console.error('Settings badge error:', err);
    }
  }

  async refreshCounters() {
    try {
      const statsData = await api.getDashboardStats();
      const countEl = document.getElementById('navStudentCount');
      if (countEl && statsData.stats) {
        countEl.textContent = statsData.stats.totalStudents || 0;
      }
    } catch (err) {
      console.error('Counter refresh error:', err);
    }
  }

  handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const [viewName] = hash.split('?');
    this.navigate(viewName, null, false);
  }

  navigate(viewName, params = null, updateHash = true) {
    if (!this.views[viewName]) {
      viewName = 'dashboard';
    }

    // Clean up previous view if needed
    if (this.views[this.currentView] && typeof this.views[this.currentView].destroy === 'function') {
      this.views[this.currentView].destroy();
    }

    this.currentView = viewName;

    if (updateHash) {
      window.location.hash = viewName;
    }

    // Update active nav class
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Scroll to top
    window.scrollTo(0, 0);

    // Render target view
    const viewObj = this.views[viewName];
    if (viewObj && typeof viewObj.render === 'function') {
      viewObj.render(this.viewContainer, params);
    }
  }

  openModal(htmlContent) {
    const overlay = document.getElementById('modalContainer');
    const card = document.getElementById('modalCard');
    if (overlay && card) {
      card.innerHTML = htmlContent;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    const overlay = document.getElementById('modalContainer');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  showToast(message, type = 'info', title = null) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const titles = {
      success: title || 'Success',
      error: title || 'Error',
      warning: title || 'Warning',
      info: title || 'Notice'
    };

    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${titles[type]}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 250);
    }, 4500);
  }
}

// Global App Instance
const app = new App();

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
