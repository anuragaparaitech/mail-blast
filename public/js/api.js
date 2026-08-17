/**
 * Aparaitech API Client
 * Centralized fetch interface with error handling and response unwrapping
 */
const api = {
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // If body is FormData, delete Content-Type to allow browser to set boundary
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  },

  // Students API
  getStudents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/students?${query}`);
  },

  getStudent(id) {
    return this.request(`/students/${id}`);
  },

  createStudent(data) {
    return this.request('/students', { method: 'POST', body: data });
  },

  updateStudent(id, data) {
    return this.request(`/students/${id}`, { method: 'PUT', body: data });
  },

  deleteStudent(id) {
    return this.request(`/students/${id}`, { method: 'DELETE' });
  },

  bulkDeleteStudents(ids) {
    return this.request('/students/bulk-delete', { method: 'POST', body: { ids } });
  },

  getColleges() {
    return this.request('/students/colleges');
  },

  getUploadBatches() {
    return this.request('/students/batches');
  },

  deleteUploadBatch(batchId) {
    return this.request(`/students/batch/${encodeURIComponent(batchId)}`, { method: 'DELETE' });
  },

  // Bulk Upload API
  parseSpreadsheet(formData) {
    return this.request('/upload/parse', { method: 'POST', body: formData });
  },

  revalidateSpreadsheet(rawRows, mapping) {
    return this.request('/upload/revalidate', { method: 'POST', body: { rawRows, mapping } });
  },

  commitSpreadsheet(rawRows, mapping, duplicateStrategy, filename) {
    return this.request('/upload/commit', { method: 'POST', body: { rawRows, mapping, duplicateStrategy, filename } });
  },

  // Templates API
  getTemplates() {
    return this.request('/templates');
  },

  getTemplate(id) {
    return this.request(`/templates/${id}`);
  },

  createTemplate(data) {
    return this.request('/templates', { method: 'POST', body: data });
  },

  updateTemplate(id, data) {
    return this.request(`/templates/${id}`, { method: 'PUT', body: data });
  },

  deleteTemplate(id) {
    return this.request(`/templates/${id}`, { method: 'DELETE' });
  },

  renderPreview(data) {
    return this.request('/templates/preview', { method: 'POST', body: data });
  },

  // Campaigns API
  getCampaigns() {
    return this.request('/campaigns');
  },

  getCampaign(id) {
    return this.request(`/campaigns/${id}`);
  },

  getCampaignRecipients(id, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/campaigns/${id}/recipients?${query}`);
  },

  launchCampaign(data) {
    return this.request('/campaigns', { method: 'POST', body: data });
  },

  sendTestEmail(data) {
    return this.request('/campaigns/test-send', { method: 'POST', body: data });
  },

  pauseCampaign(id) {
    return this.request(`/campaigns/${id}/pause`, { method: 'POST' });
  },

  resumeCampaign(id) {
    return this.request(`/campaigns/${id}/resume`, { method: 'POST' });
  },

  cancelCampaign(id) {
    return this.request(`/campaigns/${id}/cancel`, { method: 'POST' });
  },

  retryFailedCampaign(id) {
    return this.request(`/campaigns/${id}/retry-failed`, { method: 'POST' });
  },

  // Stats & Dashboard
  getDashboardStats() {
    return this.request('/stats/dashboard');
  },

  // Settings
  getSettings() {
    return this.request('/settings');
  },

  updateSettings(data) {
    return this.request('/settings', { method: 'POST', body: data });
  },

  testSmtp(data) {
    return this.request('/settings/test-smtp', { method: 'POST', body: data });
  },

  // Multi-SMTP Account Pool API
  getSmtpAccounts() {
    return this.request('/settings/smtp-accounts');
  },

  createSmtpAccount(data) {
    return this.request('/settings/smtp-accounts', { method: 'POST', body: data });
  },

  updateSmtpAccount(id, data) {
    return this.request(`/settings/smtp-accounts/${id}`, { method: 'PUT', body: data });
  },

  toggleSmtpAccount(id) {
    return this.request(`/settings/smtp-accounts/${id}/toggle`, { method: 'PATCH' });
  },

  deleteSmtpAccount(id) {
    return this.request(`/settings/smtp-accounts/${id}`, { method: 'DELETE' });
  },

  testSmtpAccount(data) {
    return this.request('/settings/smtp-accounts/test', { method: 'POST', body: data });
  },

  resetSmtpCounters() {
    return this.request('/settings/smtp-accounts/reset-counters', { method: 'POST' });
  },

  // MongoDB Atlas API
  testMongoDb(uri) {
    return this.request('/settings/test-mongodb', { method: 'POST', body: { uri } });
  },

  saveMongoDb(uri) {
    return this.request('/settings/save-mongodb', { method: 'POST', body: { uri } });
  },

  syncToMongoDb(uri) {
    return this.request('/settings/sync-to-mongodb', { method: 'POST', body: { uri } });
  },

  // Mailbox Inspector
  getInbox(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/inbox?${query}`);
  },

  getInboxEmail(id) {
    return this.request(`/inbox/${id}`);
  },

  clearInbox() {
    return this.request('/inbox/clear', { method: 'DELETE' });
  }
};
