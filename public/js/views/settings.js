/**
 * Settings & SMTP Configuration View
 * Switch between Sandbox and Live SMTP, test connection, configure send rate throttle and company branding
 */
const SettingsView = {
  state: {
    settings: {}
  },

  async render(container) {
    container.innerHTML = `
      <div class="view-loading">
        <div class="spinner"></div>
        <p>Loading System &amp; SMTP Settings...</p>
      </div>
    `;

    try {
      const data = await api.getSettings();
      this.state.settings = data.settings || {};

      const s = this.state.settings;

      container.innerHTML = `
        <div class="view-header">
          <div class="view-title-group">
            <h1>Settings &amp; SMTP Delivery Configuration</h1>
            <p>Configure email delivery servers, rate-limiting throttle, and Aparaitech company branding</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary btn-sm" onclick="SettingsView.testConnection()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Test Connection</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="SettingsView.saveSettings()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        <form id="settingsForm" onsubmit="event.preventDefault(); SettingsView.saveSettings();">
          <!-- Mailer Mode Card -->
          <div class="card" style="margin-bottom: 24px;">
            <div class="card-header">
              <h3 class="card-title">1. Email Delivery Engine</h3>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <label style="border: 2px solid ${s.mailer_mode === 'sandbox' ? 'var(--brand-sapphire)' : 'var(--border-light)'}; border-radius: var(--radius-md); padding: 18px; cursor: pointer; background: ${s.mailer_mode === 'sandbox' ? '#eff6ff' : '#ffffff'};">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                  <input type="radio" name="mailer_mode" value="sandbox" ${s.mailer_mode === 'sandbox' ? 'checked' : ''} onchange="SettingsView.handleModeChange(this.value)" />
                  <strong style="font-size: 1rem; color: var(--text-primary);">High-Fidelity Sandbox / Simulator (Recommended for Testing)</strong>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.84rem; line-height: 1.5; margin-left: 24px;">
                  Simulates realistic transmission latency, logs deliveries to the <strong>Student Mailbox Inspector</strong>, and preserves your real SMTP email limits.
                </p>
              </label>

              <label style="border: 2px solid ${s.mailer_mode === 'smtp' ? 'var(--brand-sapphire)' : 'var(--border-light)'}; border-radius: var(--radius-md); padding: 18px; cursor: pointer; background: ${s.mailer_mode === 'smtp' ? '#eff6ff' : '#ffffff'};">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                  <input type="radio" name="mailer_mode" value="smtp" ${s.mailer_mode === 'smtp' ? 'checked' : ''} onchange="SettingsView.handleModeChange(this.value)" />
                  <strong style="font-size: 1rem; color: var(--text-primary);">Live External SMTP Server</strong>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.84rem; line-height: 1.5; margin-left: 24px;">
                  Delivers real emails directly to students' inboxes via Gmail App Password, Brevo, SendGrid, Amazon SES, or custom corporate SMTP.
                </p>
              </label>
            </div>
          </div>

          <!-- SMTP Server Settings Card (shown conditionally) -->
          <div class="card" id="smtpConfigCard" style="margin-bottom: 24px; opacity: ${s.mailer_mode === 'smtp' ? '1' : '0.6'};">
            <div class="card-header">
              <h3 class="card-title">2. SMTP Server Credentials</h3>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
              <div class="form-group">
                <label class="form-label">SMTP Host</label>
                <input type="text" name="smtp_host" class="form-input" value="${s.smtp_host || 'smtp.gmail.com'}" placeholder="smtp.gmail.com" />
              </div>
              <div class="form-group">
                <label class="form-label">SMTP Port</label>
                <input type="number" name="smtp_port" class="form-input" value="${s.smtp_port || '587'}" placeholder="587 or 465" />
              </div>
              <div class="form-group">
                <label class="form-label">SMTP Username / Email</label>
                <input type="text" name="smtp_user" class="form-input" value="${s.smtp_user || 'recruitment@aparaitech.org'}" placeholder="your-email@gmail.com" />
              </div>
              <div class="form-group">
                <label class="form-label">SMTP Password / App Password</label>
                <input type="password" name="smtp_pass" class="form-input" placeholder="Enter app password (leave blank to keep unchanged)" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px;">
              <div class="form-group">
                <label class="form-label">Sender Display Name</label>
                <input type="text" name="from_name" class="form-input" value="${s.from_name || 'Aparaitech Software Recruitment Team'}" />
              </div>
              <div class="form-group">
                <label class="form-label">Sender Email Address</label>
                <input type="email" name="from_email" class="form-input" value="${s.from_email || 'recruitment@aparaitech.org'}" />
              </div>
            </div>
          </div>

          <!-- Rate Limiting & Throttling Card -->
          <div class="card" style="margin-bottom: 24px;">
            <div class="card-header">
              <h3 class="card-title">3. Blast Throttling &amp; Simulation Controls</h3>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
              <div class="form-group">
                <label class="form-label">Delay Between Each Email: <span id="delayValText" style="color: var(--brand-sapphire); font-weight: 700;">${s.send_delay_ms || 300} ms</span></label>
                <input type="range" name="send_delay_ms" class="form-range" min="50" max="2000" step="50" value="${s.send_delay_ms || 300}" oninput="document.getElementById('delayValText').textContent = this.value + ' ms'" style="width: 100%; accent-color: var(--brand-sapphire);" />
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Controls sending speed (~${Math.round(1000 / (parseInt(s.send_delay_ms || 300)))} emails/sec) to avoid provider rate limits.</p>
              </div>

              <div class="form-group">
                <label class="form-label">Simulated Failure Rate (for Testing Diagnostics): <span id="failValText" style="color: var(--color-danger); font-weight: 700;">${s.simulate_failure_rate || 5}%</span></label>
                <input type="range" name="simulate_failure_rate" min="0" max="30" step="1" value="${s.simulate_failure_rate || 5}" oninput="document.getElementById('failValText').textContent = this.value + '%'" style="width: 100%; accent-color: var(--color-danger);" />
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Injects simulated bounce/DNS failures in sandbox mode to demonstrate the "1-Click Retry" feature.</p>
              </div>
            </div>
          </div>

          <!-- Company Branding Card -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">4. Aparaitech Corporate Branding</h3>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label class="form-label">Organization Name</label>
                <input type="text" name="company_name" class="form-input" value="${s.company_name || 'Aparaitech Software'}" />
              </div>
              <div class="form-group">
                <label class="form-label">Official Website</label>
                <input type="text" name="company_website" class="form-input" value="${s.company_website || 'https://aparaitech.org'}" />
              </div>
              <div class="form-group">
                <label class="form-label">Corporate Office Locations</label>
                <input type="text" name="company_location" class="form-input" value="${s.company_location || 'Baramati (Pune) & Bengaluru, India'}" />
              </div>
              <div class="form-group">
                <label class="form-label">Recruitment Inquiries Reply-To</label>
                <input type="email" name="reply_to" class="form-input" value="${s.reply_to || 'careers@aparaitech.org'}" />
              </div>
            </div>
          </div>
        </form>
      `;
    } catch (error) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px;">
          <h3 style="color: var(--color-danger);">Failed to load settings</h3>
          <p style="color: var(--text-muted);">${error.message}</p>
        </div>
      `;
    }
  },

  handleModeChange(mode) {
    const card = document.getElementById('smtpConfigCard');
    if (card) {
      card.style.opacity = mode === 'smtp' ? '1' : '0.6';
    }
  },

  async saveSettings() {
    const form = document.getElementById('settingsForm');
    if (!form) return;

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await api.updateSettings(payload);
      app.showToast(res.message || 'Settings saved successfully!', 'success');

      // Update header badge
      const badge = document.getElementById('envBadgeText');
      if (badge) {
        badge.textContent = payload.mailer_mode === 'smtp' ? 'Live SMTP' : 'Sandbox Mode';
      }
    } catch (error) {
      app.showToast('Failed to save settings: ' + error.message, 'error');
    }
  },

  async testConnection() {
    const form = document.getElementById('settingsForm');
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    app.showToast('Testing mail server connection...', 'info');

    try {
      const res = await api.testSmtp(payload);
      app.showToast(res.message, 'success');
    } catch (error) {
      app.showToast('Connection Test Failed: ' + error.message, 'error');
    }
  }
};
