/**
 * Student Mailbox Inspector View
 * Real-time recipient inbox simulation to inspect delivered personalized emails and links
 */
const InboxView = {
  state: {
    emails: [],
    selectedEmailId: null,
    selectedEmail: null,
    search: '',
    campaignId: '',
    page: 1,
    limit: 15,
    totalPages: 1,
    total: 0
  },

  async render(container, routeParams = {}) {
    if (routeParams && routeParams.campaign_id) {
      this.state.campaignId = routeParams.campaign_id;
    }

    container.innerHTML = `
      <div class="view-loading">
        <div class="spinner"></div>
        <p>Loading Student Mailbox Inspector...</p>
      </div>
    `;

    await this.fetchEmails(container);
  },

  async fetchEmails(container) {
    try {
      const data = await api.getInbox({
        search: this.state.search,
        campaign_id: this.state.campaignId,
        page: this.state.page,
        limit: this.state.limit
      });

      this.state.emails = data.emails || [];
      this.state.total = data.pagination.total || 0;
      this.state.totalPages = data.pagination.totalPages || 1;

      if (!this.state.selectedEmailId && this.state.emails.length > 0) {
        this.state.selectedEmailId = this.state.emails[0].id;
        this.state.selectedEmail = await api.getInboxEmail(this.state.selectedEmailId).then(r => r.email);
      }

      this.renderInboxUI(container || document.getElementById('viewContainer'));
    } catch (error) {
      const el = container || document.getElementById('viewContainer');
      if (el) {
        el.innerHTML = `
          <div class="card" style="text-align: center; padding: 48px;">
            <h3 style="color: var(--color-danger);">Failed to load Mailbox</h3>
            <p style="color: var(--text-muted);">${error.message}</p>
          </div>
        `;
      }
    }
  },

  renderInboxUI(container) {
    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Student Mailbox Inspector &bull; Live Sandbox</h1>
          <p>Inspect how emails render in student mailboxes with personalized tags, CTA links, and headers</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" onclick="InboxView.clearMailbox()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Clear Mailbox</span>
          </button>
        </div>
      </div>

      <!-- Two-column Mailbox Layout -->
      <div style="display: grid; grid-template-columns: 360px 1fr; gap: 20px; height: calc(100vh - 190px);">
        <!-- Email List Pane -->
        <div class="card" style="padding: 16px; display: flex; flex-direction: column; height: 100%;">
          <div style="margin-bottom: 12px;">
            <input type="text" class="form-input" style="padding: 7px 10px; font-size: 0.82rem;" placeholder="Search candidate or subject..." value="${this.state.search}" oninput="InboxView.handleSearch(this.value)" />
          </div>

          <div style="flex: 1; overflow-y: auto; border: 1px solid var(--border-light); border-radius: var(--radius-sm);">
            ${this.state.emails.length === 0 ? `
              <div style="text-align: center; padding: 40px 16px; color: var(--text-muted); font-size: 0.86rem;">
                No simulated emails received yet. Run a blast to inspect deliveries.
              </div>
            ` : this.state.emails.map(e => `
              <div 
                onclick="InboxView.selectEmail(${e.id})"
                style="padding: 12px 14px; border-bottom: 1px solid var(--border-light); cursor: pointer; transition: background 0.15s ease; ${this.state.selectedEmailId == e.id ? 'background: #eff6ff; border-left: 3px solid var(--brand-sapphire);' : 'background: #ffffff;'}"
              >
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 2px;">
                  <span style="font-weight: 700; color: var(--text-primary);">${e.recipient_name}</span>
                  <span>${new Date(e.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style="font-size: 0.82rem; font-weight: 600; color: var(--brand-sapphire); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${e.subject}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 2px;">
                  ${e.college ? e.college + ' &bull; ' : ''}${e.recipient_email}
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.78rem; color: var(--text-muted);">
            <span>${this.state.total} Total in Inbox</span>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" style="padding: 2px 8px;" ${this.state.page <= 1 ? 'disabled' : ''} onclick="InboxView.goToPage(${this.state.page - 1})">&larr;</button>
              <button class="btn btn-secondary btn-sm" style="padding: 2px 8px;" ${this.state.page >= this.state.totalPages ? 'disabled' : ''} onclick="InboxView.goToPage(${this.state.page + 1})">&rarr;</button>
            </div>
          </div>
        </div>

        <!-- Email Viewer Pane -->
        <div class="card" style="padding: 0; display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          ${this.state.selectedEmail ? `
            <div style="padding: 18px 24px; background: #f8fafc; border-bottom: 1px solid var(--border-light);">
              <h2 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--text-primary); margin-bottom: 8px;">
                ${this.state.selectedEmail.subject}
              </h2>
              <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 0.82rem; color: var(--text-secondary);">
                <div>
                  <div>From: <strong>${this.state.selectedEmail.from_address || 'Aparaitech Recruitment Team &lt;recruitment@aparaitech.org&gt;'}</strong></div>
                  <div>To: <strong>${this.state.selectedEmail.recipient_name} &lt;${this.state.selectedEmail.recipient_email}&gt;</strong> ${this.state.selectedEmail.college ? `(${this.state.selectedEmail.college})` : ''}</div>
                </div>
                <div style="color: var(--text-muted); font-size: 0.78rem;">
                  Received: ${new Date(this.state.selectedEmail.received_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div style="flex: 1; padding: 24px; overflow-y: auto; background: #f1f5f9;">
              <div style="background: #ffffff; border-radius: 8px; box-shadow: var(--shadow-sm); max-width: 650px; margin: 0 auto; overflow: hidden;">
                ${this.state.selectedEmail.body_html}
              </div>
            </div>
          ` : `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">
              Select an email from the left pane to preview details
            </div>
          `}
        </div>
      </div>
    `;
  },

  handleSearch: debounce(function(val) {
    InboxView.state.search = val;
    InboxView.state.page = 1;
    InboxView.fetchEmails();
  }, 300),

  async selectEmail(id) {
    this.state.selectedEmailId = id;
    try {
      const data = await api.getInboxEmail(id);
      this.state.selectedEmail = data.email;
      this.renderInboxUI(document.getElementById('viewContainer'));
    } catch (error) {
      app.showToast('Failed to load email: ' + error.message, 'error');
    }
  },

  goToPage(page) {
    this.state.page = page;
    this.fetchEmails();
  },

  async clearMailbox() {
    if (!confirm('Clear all simulated emails from mailbox?')) return;
    try {
      const res = await api.clearInbox();
      app.showToast(res.message, 'success');
      this.state.selectedEmail = null;
      this.state.selectedEmailId = null;
      this.fetchEmails();
    } catch (error) {
      app.showToast('Failed to clear: ' + error.message, 'error');
    }
  }
};
