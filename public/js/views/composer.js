const ComposerView = {
  state: {
    templates: [],
    students: [],
    colleges: [],
    uploadBatches: [],
    selectedTemplateId: null,
    selectedPreviewStudentId: null,
    targetType: 'all', // 'all', 'college', 'batch', 'selected', 'import_batch'
    selectedColleges: [],
    selectedBatches: [],
    selectedStudentIds: [],
    targetBatchId: '',
    targetBatchName: '',
    lastFocusedField: 'subject', // 'subject' or 'body'
    campaignTitle: 'Aparaitech Campus Placement Outreach 2026',
    subject: 'Campus Placement Drive 2026: Career Opportunity for {Name} from {College}',
    bodyHtml: ''
  },

  async render(container, routeParams = {}) {
    container.innerHTML = `
      <div class="view-loading">
        <div class="spinner"></div>
        <p>Loading Email Composer Studio...</p>
      </div>
    `;

    try {
      const [tplData, stdData, colData, batchData] = await Promise.all([
        api.getTemplates(),
        api.getStudents({ limit: 50 }),
        api.getColleges(),
        api.getUploadBatches()
      ]);

      this.state.templates = tplData.templates || [];
      this.state.students = stdData.students || [];
      this.state.colleges = colData.colleges || [];
      this.state.uploadBatches = batchData.batches || [];

      if (this.state.students.length > 0 && !this.state.selectedPreviewStudentId) {
        this.state.selectedPreviewStudentId = this.state.students[0].id;
      }

      // If routed with preselected student IDs from the Student Pool table
      if (routeParams && routeParams.selectedIds && routeParams.selectedIds.length > 0) {
        this.state.targetType = 'selected';
        this.state.selectedStudentIds = routeParams.selectedIds;
      }

      // If routed with a specific bulk upload batch
      if (routeParams && (routeParams.target_type === 'import_batch' || routeParams.target_batch_id)) {
        this.state.targetType = 'import_batch';
        this.state.targetBatchId = routeParams.target_batch_id;
        this.state.targetBatchName = routeParams.target_batch_name || '';
      }

      // Default to first template if body is empty
      if (!this.state.bodyHtml && this.state.templates.length > 0) {
        const firstTpl = this.state.templates[0];
        this.state.selectedTemplateId = firstTpl.id;
        this.state.subject = firstTpl.subject;
        this.state.bodyHtml = firstTpl.body_html;
      }

      this.renderComposerUI(container);
      this.updateLivePreview();
    } catch (error) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px;">
          <h3 style="color: var(--color-danger);">Failed to load composer</h3>
          <p style="color: var(--text-muted);">${error.message}</p>
        </div>
      `;
    }
  },

  renderComposerUI(container) {
    container.innerHTML = `
      <div class="view-header">
        <div class="view-title-group">
          <h1>Email Blast Composer &amp; Personalization Studio</h1>
          <p>Design personalized campus emails with dynamic tags &bull; Real-time rendering preview</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" onclick="ComposerView.openTestEmailModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>Send Test Email</span>
          </button>
          <button class="btn btn-primary btn-sm" onclick="ComposerView.openLaunchModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>Launch Email Blast &rarr;</span>
          </button>
        </div>
      </div>

      <!-- Main Dual Split Layout -->
      <div class="composer-split">
        <!-- Left Column: Form & Editor -->
        <div class="composer-left">
          <!-- Campaign Settings Card -->
          <div class="card" style="margin-bottom: 20px;">
            <div class="form-group">
              <label class="form-label">Internal Campaign Title</label>
              <input type="text" id="campaignTitleInput" class="form-input" value="${this.state.campaignTitle}" oninput="ComposerView.state.campaignTitle = this.value" placeholder="e.g. Campus Placement Drive 2026 - Phase 1" />
            </div>

            <!-- Audience Filter Selectors -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Target Audience</label>
              <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.86rem; cursor: pointer;">
                  <input type="radio" name="targetTypeRadio" value="all" ${this.state.targetType === 'all' ? 'checked' : ''} onchange="ComposerView.handleTargetTypeChange(this.value)" />
                  <span>All Active Students (${this.state.students.length}+)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.86rem; cursor: pointer;">
                  <input type="radio" name="targetTypeRadio" value="college" ${this.state.targetType === 'college' ? 'checked' : ''} onchange="ComposerView.handleTargetTypeChange(this.value)" />
                  <span>Filter by College</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.86rem; cursor: pointer;">
                  <input type="radio" name="targetTypeRadio" value="batch" ${this.state.targetType === 'batch' ? 'checked' : ''} onchange="ComposerView.handleTargetTypeChange(this.value)" />
                  <span>Filter by Batch Year</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.86rem; cursor: pointer;">
                  <input type="radio" name="targetTypeRadio" value="import_batch" ${this.state.targetType === 'import_batch' ? 'checked' : ''} onchange="ComposerView.handleTargetTypeChange(this.value)" />
                  <span>Filter by Bulk Upload Spreadsheet</span>
                </label>
                ${this.state.selectedStudentIds.length > 0 ? `
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 0.86rem; cursor: pointer;">
                    <input type="radio" name="targetTypeRadio" value="selected" ${this.state.targetType === 'selected' ? 'checked' : ''} onchange="ComposerView.handleTargetTypeChange(this.value)" />
                    <span>Selected Students (${this.state.selectedStudentIds.length})</span>
                  </label>
                ` : ''}
              </div>

              <!-- Upload Batch Container -->
              <div id="targetUploadBatchContainer" style="display: ${this.state.targetType === 'import_batch' ? 'block' : 'none'}; margin-top: 10px; background: #f8fafc; padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                <label class="form-label" style="font-size: 0.84rem; margin-bottom: 6px;">Select Bulk Upload Spreadsheet:</label>
                <select class="form-select" id="targetUploadBatchSelect" onchange="ComposerView.handleUploadBatchSelect(this.value)">
                  <option value="">-- Choose Bulk Upload Batch --</option>
                  ${this.state.uploadBatches.map(b => `
                    <option value="${b.import_batch_id}" ${this.state.targetBatchId === b.import_batch_id ? 'selected' : ''}>
                      📄 ${b.import_source} (${b.student_count} candidates &bull; ${new Date(b.created_at).toLocaleDateString()})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- College Chips Container -->
              <div id="targetCollegesContainer" style="display: ${this.state.targetType === 'college' ? 'flex' : 'none'}; flex-wrap: wrap; gap: 8px; margin-top: 10px; background: #f8fafc; padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                ${this.state.colleges.map(c => `
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; background: #fff; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer;">
                    <input type="checkbox" value="${c.college}" onchange="ComposerView.toggleTargetCollege('${c.college}', this.checked)" ${this.state.selectedColleges.includes(c.college) ? 'checked' : ''} />
                    <span>${c.college} (${c.student_count})</span>
                  </label>
                `).join('')}
              </div>

              <!-- Batch Chips Container -->
              <div id="targetBatchesContainer" style="display: ${this.state.targetType === 'batch' ? 'flex' : 'none'}; flex-wrap: wrap; gap: 8px; margin-top: 10px; background: #f8fafc; padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                ${['2026', '2025', '2027', '2024'].map(b => `
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 0.84rem; background: #fff; padding: 5px 12px; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer;">
                    <input type="checkbox" value="${b}" onchange="ComposerView.toggleTargetBatch('${b}', this.checked)" ${this.state.selectedBatches.includes(b) ? 'checked' : ''} />
                    <span>Batch ${b}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Template Preset Selector Card -->
          <div class="card" style="margin-bottom: 20px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Pre-Built Placement Templates</label>
              <select class="form-select" id="templatePresetSelect" onchange="ComposerView.loadTemplatePreset(this.value)">
                ${this.state.templates.map(t => `
                  <option value="${t.id}" ${this.state.selectedTemplateId == t.id ? 'selected' : ''}>[${t.category}] ${t.name}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Personalization Variables Bar -->
          <div class="variables-bar">
            <span class="variables-title">Insert Tag:</span>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{Name}')" title="Student full name">{Name}</button>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{College}')" title="Student college">{College}</button>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{Branch}')" title="Branch / Stream">{Branch}</button>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{Batch}')" title="Graduation Year">{Batch}</button>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{Job_Role}')" title="Target Job Role">{Job_Role}</button>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{Drive_Date}')" title="Drive Date">{Drive_Date}</button>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{Package}')" title="Salary / CTC">{Package}</button>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{Company}')" title="Aparaitech Software">{Company}</button>
            <button type="button" class="var-pill" onclick="ComposerView.insertTag('{Phone}')" title="Mobile Number">{Phone}</button>
          </div>

          <!-- Email Subject Line -->
          <div class="form-group">
            <label class="form-label">Email Subject Line *</label>
            <input type="text" id="emailSubjectInput" class="form-input" style="font-weight: 600;" value="${this.state.subject}" onfocus="ComposerView.state.lastFocusedField = 'subject'" oninput="ComposerView.handleSubjectChange(this.value)" placeholder="e.g. Career Opportunity at Aparaitech for {Name}" />
          </div>

          <!-- Rich Email Body Editor -->
          <div class="form-group">
            <label class="form-label">Email Body (HTML / Visual)</label>
            
            <div class="editor-toolbar">
              <button type="button" class="editor-btn" onclick="ComposerView.formatDoc('bold')" title="Bold"><strong>B</strong></button>
              <button type="button" class="editor-btn" onclick="ComposerView.formatDoc('italic')" title="Italic"><em>I</em></button>
              <button type="button" class="editor-btn" onclick="ComposerView.formatDoc('underline')" title="Underline"><u>U</u></button>
              <button type="button" class="editor-btn" onclick="ComposerView.formatDoc('insertUnorderedList')" title="Bullet List">&bull; List</button>
              <button type="button" class="editor-btn" onclick="ComposerView.formatDoc('insertOrderedList')" title="Numbered List">1. List</button>
              <button type="button" class="editor-btn" onclick="ComposerView.insertCallout()" title="Add Highlight Box">&#x25A4; Callout</button>
              <button type="button" class="editor-btn" onclick="ComposerView.insertCtaButton()" title="Add Call to Action Button">&#x25AC; CTA Button</button>
              <button type="button" class="editor-btn" onclick="ComposerView.formatDoc('createLink', prompt('Enter URL:'))" title="Insert Link">&#x1F517; Link</button>
              <button type="button" class="editor-btn" onclick="ComposerView.toggleHtmlMode()" id="btnToggleSource" title="Toggle Raw HTML">&lt;/&gt; Source</button>
            </div>

            <div id="visualEditor" class="editor-content-area" contenteditable="true" onfocus="ComposerView.state.lastFocusedField = 'body'" oninput="ComposerView.handleBodyChange()">
              ${this.state.bodyHtml}
            </div>

            <textarea id="rawHtmlTextarea" class="form-textarea" style="display: none; font-family: var(--font-mono); font-size: 0.8rem; min-height: 280px;" oninput="ComposerView.handleRawHtmlChange(this.value)">${this.state.bodyHtml}</textarea>
          </div>
        </div>

        <!-- Right Column: Live Dual Preview with Recipient Switcher -->
        <div class="composer-right">
          <div class="preview-pane">
            <div class="preview-header">
              <div>
                <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">Live Recipient Preview</span>
                <div style="font-size: 0.74rem; color: var(--text-muted);">Dynamic tags render automatically below</div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">Simulate as:</span>
                <select class="form-select" style="padding: 4px 8px; font-size: 0.8rem; width: auto; max-width: 180px;" id="previewStudentSelect" onchange="ComposerView.switchPreviewStudent(this.value)">
                  ${this.state.students.map(s => `
                    <option value="${s.id}" ${this.state.selectedPreviewStudentId == s.id ? 'selected' : ''}>${s.name} (${s.college})</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Subject Preview Banner -->
            <div style="background: #ffffff; padding: 14px 20px; border-bottom: 1px solid var(--border-light);">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Subject:</div>
              <div id="previewSubjectText" style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
                ${this.state.subject}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                From: <strong>Aparaitech Software Recruitment Team &lt;recruitment@aparaitech.org&gt;</strong>
              </div>
            </div>

            <!-- Body Frame Preview -->
            <div class="preview-body-frame">
              <div class="preview-rendered-box" id="previewRenderedHtml">
                <!-- Rendered output -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  handleSubjectChange(val) {
    this.state.subject = val;
    this.updateLivePreview();
  },

  handleBodyChange() {
    const editor = document.getElementById('visualEditor');
    if (editor) {
      this.state.bodyHtml = editor.innerHTML;
      const rawArea = document.getElementById('rawHtmlTextarea');
      if (rawArea) rawArea.value = this.state.bodyHtml;
      this.updateLivePreview();
    }
  },

  handleRawHtmlChange(val) {
    this.state.bodyHtml = val;
    const editor = document.getElementById('visualEditor');
    if (editor) editor.innerHTML = val;
    this.updateLivePreview();
  },

  formatDoc(cmd, val = null) {
    document.execCommand(cmd, false, val);
    this.handleBodyChange();
  },

  insertCallout() {
    const html = `
      <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1e293b;"><strong>Important Drive Notice:</strong> Please bring your updated resume and college ID card.</p>
      </div>
    `;
    document.execCommand('insertHTML', false, html);
    this.handleBodyChange();
  },

  insertCtaButton() {
    const html = `
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://aparaitech.org/careers" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Register for Placement Drive &rarr;</a>
      </div>
    `;
    document.execCommand('insertHTML', false, html);
    this.handleBodyChange();
  },

  toggleHtmlMode() {
    const visual = document.getElementById('visualEditor');
    const raw = document.getElementById('rawHtmlTextarea');
    const btn = document.getElementById('btnToggleSource');

    if (raw.style.display === 'none') {
      raw.value = visual.innerHTML;
      raw.style.display = 'block';
      visual.style.display = 'none';
      btn.style.background = '#cbd5e1';
      btn.textContent = '👁 Visual';
    } else {
      visual.innerHTML = raw.value;
      visual.style.display = 'block';
      raw.style.display = 'none';
      btn.style.background = 'transparent';
      btn.textContent = '</> Source';
    }
  },

  insertTag(tag) {
    if (this.state.lastFocusedField === 'subject') {
      const input = document.getElementById('emailSubjectInput');
      if (input) {
        const start = input.selectionStart || input.value.length;
        const end = input.selectionEnd || input.value.length;
        input.value = input.value.substring(0, start) + tag + input.value.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + tag.length;
        this.handleSubjectChange(input.value);
      }
    } else {
      document.execCommand('insertText', false, tag);
      this.handleBodyChange();
    }
  },

  loadTemplatePreset(templateId) {
    const tpl = this.state.templates.find(t => t.id == templateId);
    if (tpl) {
      this.state.selectedTemplateId = tpl.id;
      this.state.subject = tpl.subject;
      this.state.bodyHtml = tpl.body_html;

      const subjInput = document.getElementById('emailSubjectInput');
      if (subjInput) subjInput.value = tpl.subject;

      const visual = document.getElementById('visualEditor');
      if (visual) visual.innerHTML = tpl.body_html;

      const raw = document.getElementById('rawHtmlTextarea');
      if (raw) raw.value = tpl.body_html;

      this.updateLivePreview();
      app.showToast(`Loaded template: "${tpl.name}"`, 'info');
    }
  },

  switchPreviewStudent(studentId) {
    this.state.selectedPreviewStudentId = parseInt(studentId, 10);
    this.updateLivePreview();
  },

  handleTargetTypeChange(type) {
    this.state.targetType = type;
    const colContainer = document.getElementById('targetCollegesContainer');
    const batchContainer = document.getElementById('targetBatchesContainer');
    const uploadBatchContainer = document.getElementById('targetUploadBatchContainer');

    if (colContainer) colContainer.style.display = type === 'college' ? 'flex' : 'none';
    if (batchContainer) batchContainer.style.display = type === 'batch' ? 'flex' : 'none';
    if (uploadBatchContainer) uploadBatchContainer.style.display = type === 'import_batch' ? 'block' : 'none';
  },

  handleUploadBatchSelect(batchId) {
    this.state.targetBatchId = batchId;
    const found = this.state.uploadBatches.find(b => b.import_batch_id === batchId);
    if (found) {
      this.state.targetBatchName = found.import_source;
      app.showToast(`Selected bulk upload: "${found.import_source}" (${found.student_count} candidates)`, 'info');
    }
  },

  toggleTargetCollege(college, checked) {
    if (checked) {
      this.state.selectedColleges.push(college);
    } else {
      this.state.selectedColleges = this.state.selectedColleges.filter(c => c !== college);
    }
  },

  toggleTargetBatch(batch, checked) {
    if (checked) {
      this.state.selectedBatches.push(batch);
    } else {
      this.state.selectedBatches = this.state.selectedBatches.filter(b => b !== batch);
    }
  },

  async updateLivePreview() {
    try {
      const res = await api.renderPreview({
        subject: this.state.subject,
        body_html: this.state.bodyHtml,
        studentId: this.state.selectedPreviewStudentId
      });

      const subjEl = document.getElementById('previewSubjectText');
      if (subjEl) subjEl.textContent = res.renderedSubject;

      const bodyEl = document.getElementById('previewRenderedHtml');
      if (bodyEl) bodyEl.innerHTML = res.renderedBody;
    } catch (error) {
      console.error('Preview render error:', error);
    }
  },

  openTestEmailModal() {
    app.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Send Single Test Blast Email</h3>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>
      <form id="testEmailForm" onsubmit="ComposerView.submitTestEmail(event)">
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 16px;">
          Send a rendered preview of this email with personalized tags to your own email address to check formatting across email clients.
        </p>
        <div class="form-group">
          <label class="form-label">Recipient Test Email *</label>
          <input type="email" name="test_email" class="form-input" placeholder="recruiter@aparaitech.org" value="careers@aparaitech.org" required />
        </div>
        <div class="form-group">
          <label class="form-label">Substitute Tags From Student Profile</label>
          <select name="studentId" class="form-select">
            ${this.state.students.map(s => `
              <option value="${s.id}" ${this.state.selectedPreviewStudentId == s.id ? 'selected' : ''}>${s.name} (${s.college})</option>
            `).join('')}
          </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="btnSendTest">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            <span>Dispatch Test Email</span>
          </button>
        </div>
      </form>
    `);
  },

  async submitTestEmail(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSendTest');
    if (btn) btn.disabled = true;

    const formData = new FormData(event.target);
    const payload = {
      test_email: formData.get('test_email'),
      studentId: formData.get('studentId'),
      subject: this.state.subject,
      body_html: this.state.bodyHtml
    };

    try {
      const res = await api.sendTestEmail(payload);
      app.showToast(res.message, 'success');
      app.closeModal();
    } catch (error) {
      if (btn) btn.disabled = false;
      app.showToast('Test email failed: ' + error.message, 'error');
    }
  },

  openLaunchModal() {
    let targetLabel = 'All Registered Students';
    if (this.state.targetType === 'college') {
      targetLabel = this.state.selectedColleges.length > 0
        ? `Colleges: ${this.state.selectedColleges.join(', ')}`
        : 'All Colleges (No specific college selected)';
    } else if (this.state.targetType === 'batch') {
      targetLabel = this.state.selectedBatches.length > 0
        ? `Batches: ${this.state.selectedBatches.join(', ')}`
        : 'All Batches';
    } else if (this.state.targetType === 'import_batch') {
      targetLabel = this.state.targetBatchName
        ? `Bulk Upload Batch: "${this.state.targetBatchName}"`
        : 'Selected Bulk Upload Batch';
    } else if (this.state.targetType === 'selected') {
      targetLabel = `${this.state.selectedStudentIds.length} Selected Candidates`;
    }

    app.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Confirm Email Blast Launch</h3>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>
      <div>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">
          You are about to launch an automated email blast. Each student will receive a unique personalized message rendered with their individual credentials.
        </p>

        <div style="background: #f8fafc; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 24px;">
          <div style="margin-bottom: 8px;"><strong>Campaign Title:</strong> ${this.state.campaignTitle}</div>
          <div style="margin-bottom: 8px;"><strong>Subject:</strong> ${this.state.subject}</div>
          <div><strong>Target Audience:</strong> <span style="color: var(--brand-sapphire); font-weight: 600;">${targetLabel}</span></div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Back to Editing</button>
          <button type="button" class="btn btn-primary" id="btnConfirmLaunch" onclick="ComposerView.executeLaunch()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>Start Real-time Blast Now</span>
          </button>
        </div>
      </div>
    `);
  },

  async executeLaunch() {
    const btn = document.getElementById('btnConfirmLaunch');
    if (btn) btn.disabled = true;

    try {
      const payload = {
        title: this.state.campaignTitle,
        subject: this.state.subject,
        body_html: this.state.bodyHtml,
        target_type: this.state.targetType,
        target_colleges: this.state.selectedColleges,
        target_batches: this.state.selectedBatches,
        target_batch_id: this.state.targetBatchId,
        target_upload_batches: this.state.targetBatchId ? [this.state.targetBatchId] : [],
        selected_student_ids: this.state.selectedStudentIds
      };

      const res = await api.launchCampaign(payload);
      app.closeModal();
      app.showToast(res.message || 'Email blast initiated!', 'success');

      // Navigate to Live Monitor Cockpit
      app.navigate('blast-monitor', { campaignId: res.campaignId });
    } catch (error) {
      if (btn) btn.disabled = false;
      app.showToast('Launch failed: ' + error.message, 'error');
    }
  }
};
