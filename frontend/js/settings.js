// Settings Manager - Handles form types and other settings management
class SettingsManager {
    constructor() {
        this.formTypes = [];
        this.currentEditingId = null;
        this.currentDeleteId = null;
        
        // Emoji pool for form types
        this.emojiPool = [
            '📚', '📖', '📝', '📄', '📰', '📑', '📊', '📈', '📉', '📋',
            '🎓', '🎯', '🎨', '🎭', '🎪', '🎬', '🎤', '🎸', '🎹', '🎺',
            '💻', '⌨️', '🖱️', '📱', '💾', '💿', '📀', '🖥️', '📟', '📠',
            '🔬', '🔭', '⚗️', '🧪', '🧮', '📏', '📐', '✏️', '🖊️', '🖌️',
            '🏀', '⚽', '🏈', '🎾', '🏐', '🎳', '🏓', '🏸', '🥊', '🥋',
            '🧘', '🤸', '🏃', '🚴', '🏊', '🧗', '🤺', '🏇', '⛷️', '🏂',
            '🎮', '🎲', '🧩', '♟️', '🎰', '🧸', '🪀', '🪁', '🛹', '🎪',
            '💡', '🔦', '🕯️', '📡', '📻', '📺', '🔧', '🔨', '⚙️', '🔩',
            '🌟', '⭐', '🌠', '☀️', '🌙', '⚡', '🔥', '💧', '🌊', '🌈',
            '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎀'
        ];
    }

    async init() {
        console.log('🚀 初始化设置管理器');
        await this.loadFormTypes();
        this.setupEmojiPicker();
    }

    // Form Types Management
    async loadFormTypes() {
        try {
            console.log('📦 加载学习形式类别');
            const response = await window.apiService.request('/form-types/form-types');
            
            this.formTypes = response || [];
            this.renderFormTypes();
            if (window.templateManager) {
                await window.templateManager.syncFormTypes();
                window.templateManager.renderTemplateFormTypes();
                window.templateManager.populateDetailFormTypeOptions();
            }
            console.log('✅ 学习形式类别加载完成:', this.formTypes.length);
        } catch (error) {
            console.error('❌ 加载学习形式类别失败:', error);
            this.showAlert('danger', '加载学习形式类别失败: ' + error.message);
        }
    }

    renderFormTypes() {
        const grid = document.getElementById('formTypesGrid');
        if (!grid) return;

        grid.innerHTML = '';

        this.formTypes.forEach(formType => {
            const card = this.createFormTypeCard(formType);
            grid.appendChild(card);
        });
    }

    createFormTypeCard(formType) {
        const card = document.createElement('div');
        card.className = `form-type-card ${formType.is_default ? 'default' : 'custom'}`;
        
        const badgeClass = formType.is_default ? 'badge-default' : 'badge-custom';
        const badgeText = formType.is_default ? '默认' : '自定义';
        
        // For default types, only show the emoji and name (no actions)
        const actions = formType.is_default ? '' : `
            <div class="form-type-actions">
                <button class="btn btn-sm btn-outline" onclick="showEditFormTypeModal(${formType.type_id})">
                    ✏️ 编辑
                </button>
                <button class="btn btn-sm btn-danger" onclick="showDeleteConfirmModal(${formType.type_id})">
                    🗑️ 删除
                </button>
            </div>
        `;

        card.innerHTML = `
            <div class="form-type-header">
                <div class="form-type-info">
                    <div class="form-type-emoji">${formType.emoji}</div>
                    <div class="form-type-details">
                        <div class="form-type-name">${formType.type_name}</div>
                        <div class="form-type-code">${formType.type_code}</div>
                    </div>
                </div>
                <span class="form-type-badge ${badgeClass}">${badgeText}</span>
            </div>
            ${actions}
        `;

        return card;
    }

    setupEmojiPicker() {
        const picker = document.getElementById('emojiPicker');
        if (!picker) return;

        picker.innerHTML = '';
        
        this.emojiPool.forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'emoji-option';
            button.type = 'button';
            button.textContent = emoji;
            button.onclick = () => this.selectEmoji(emoji);
            picker.appendChild(button);
        });
    }

    selectEmoji(emoji) {
        // Clear previous selection
        document.querySelectorAll('.emoji-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Select current emoji
        const selectedOption = [...document.querySelectorAll('.emoji-option')]
            .find(opt => opt.textContent === emoji);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Update hidden input
        document.getElementById('selectedEmoji').value = emoji;
    }

    // Utility function to generate type code from type name
    generateTypeCode(typeName) {
        if (!typeName) return '';
        
        // Convert Chinese characters and other characters to pinyin-like representation
        let code = typeName
            .toLowerCase()
            .replace(/[\u4e00-\u9fff]/g, (match) => {
                // Basic Chinese character mapping for common learning terms
                const mapping = {
                    '视': 'video', '频': 'video', '播': 'podcast', '客': 'podcast',
                    '书': 'book', '籍': 'book', '课': 'course', '程': 'course',
                    '文': 'article', '章': 'article', '题': 'exercise', '目': 'exercise',
                    '项': 'project', '运': 'sport', '动': 'sport', '论': 'paper', '文': 'paper',
                    '其': 'other', '他': 'other', '学': 'study', '习': 'study',
                    '音': 'audio', '乐': 'music', '影': 'movie', '电': 'movie'
                };
                return mapping[match] || 'custom';
            })
            .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
        
        // If result is empty or too generic, use timestamp-based code
        if (!code || code === 'custom' || code.length < 2) {
            code = `custom-${Date.now().toString(36)}`;
        }
        
        // Ensure uniqueness by checking existing codes
        const existingCodes = this.formTypes.map(ft => ft.type_code);
        let finalCode = code;
        let counter = 1;
        
        while (existingCodes.includes(finalCode)) {
            finalCode = `${code}-${counter}`;
            counter++;
        }
        
        return finalCode;
    }

    // Modal Management
    showCreateFormTypeModal() {
        this.currentEditingId = null;
        document.getElementById('modalTitle').textContent = '新增学习形式';
        document.getElementById('submitButtonText').textContent = '创建类别';
        
        // Clear form
        document.getElementById('formTypeForm').reset();
        document.getElementById('selectedEmoji').value = '';
        document.querySelectorAll('.emoji-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Hide type code field for creation - system will auto-generate
        document.getElementById('typeCodeGroup').style.display = 'none';
        document.getElementById('typeCode').required = false;
        
        document.getElementById('formTypeModal').classList.remove('hidden');
    }

    async showEditFormTypeModal(typeId) {
        const formType = this.formTypes.find(ft => ft.type_id === typeId);
        if (!formType) return;

        if (formType.is_default) {
            this.showAlert('warning', '默认类别不支持编辑');
            return;
        }

        this.currentEditingId = typeId;
        document.getElementById('modalTitle').textContent = '编辑学习形式';
        document.getElementById('submitButtonText').textContent = '保存修改';
        
        // Hide type code field for editing (users don't need to see it)
        document.getElementById('typeCodeGroup').style.display = 'none';
        document.getElementById('typeCode').required = false;
        
        // Fill form with current data
        document.getElementById('typeCode').value = formType.type_code; // Keep for form submission
        document.getElementById('typeName').value = formType.type_name;
        document.getElementById('selectedEmoji').value = formType.emoji;
        
        // Select the emoji
        this.selectEmoji(formType.emoji);
        
        document.getElementById('formTypeModal').classList.remove('hidden');
    }

    closeFormTypeModal() {
        document.getElementById('formTypeModal').classList.add('hidden');
        this.currentEditingId = null;
    }

    async handleFormTypeSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const typeName = formData.get('type_name');
        
        const data = {
            type_name: typeName,
            emoji: formData.get('emoji') || '📝', // Default emoji if none selected
            display_order: this.formTypes.length + 1
        };

        // For new types, auto-generate type code from type name
        if (!this.currentEditingId) {
            data.type_code = this.generateTypeCode(typeName);
            console.log('🔧 自动生成类别代码:', data.type_code);
        }

        console.log('📝 表单提交数据:', data);

        try {
            // Validate required fields
            if (!data.type_name) {
                this.showAlert('danger', '类别名称是必填项');
                return;
            }

            if (this.currentEditingId) {
                console.log('🔄 更新学习形式类别:', this.currentEditingId);
                // Update existing form type
                await this.updateFormType(this.currentEditingId, data);
            } else {
                console.log('➕ 创建新学习形式类别');
                // Create new form type
                await this.createFormType(data);
            }

            this.closeFormTypeModal();
            await this.loadFormTypes(); // Reload to get updated data
            
            const action = this.currentEditingId ? '更新' : '创建';
            this.showAlert('success', `学习形式类别${action}成功`);
            
        } catch (error) {
            console.error('❌ 表单提交失败:', error);
            console.error('错误详情:', error.stack);
            this.showAlert('danger', error.message || '操作失败，请重试');
        }
    }

    async createFormType(data) {
        console.log('📤 发送创建请求:', data);
        try {
            const response = await window.apiService.request('/form-types/form-types', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            console.log('✅ 创建成功:', response);
            return response;
        } catch (error) {
            console.error('❌ 创建失败:', error);
            throw error;
        }
    }

    async updateFormType(typeId, data) {
        // Remove type_code from update data since it shouldn't be changed
        const { type_code, display_order, ...updateData } = data;
        
        console.log('📤 发送更新请求:', typeId, updateData);
        try {
            const response = await window.apiService.request(`/form-types/form-types/${typeId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            console.log('✅ 更新成功:', response);
            return response;
        } catch (error) {
            console.error('❌ 更新失败:', error);
            throw error;
        }
    }

    // Delete Confirmation
    async showDeleteConfirmModal(typeId) {
        const formType = this.formTypes.find(ft => ft.type_id === typeId);
        if (!formType) return;

        if (formType.is_default) {
            this.showAlert('warning', '默认类别不能删除');
            return;
        }

        this.currentDeleteId = typeId;
        
        // Check if this form type is being used
        try {
            // Here we'd normally check for usage, but the backend already handles this
            // So we'll show a generic confirmation message
            const message = `
                确定要删除学习形式类别 <strong>${formType.emoji} ${formType.type_name}</strong> 吗？
                <br><br>
                <small>如果该类别正在被使用，将无法删除。</small>
            `;
            
            document.getElementById('confirmMessage').innerHTML = message;
            document.getElementById('confirmDeleteModal').classList.remove('hidden');
            
        } catch (error) {
            console.error('❌ 检查类别使用情况失败:', error);
            this.showAlert('danger', '检查类别使用情况失败');
        }
    }

    closeConfirmDeleteModal() {
        document.getElementById('confirmDeleteModal').classList.add('hidden');
        this.currentDeleteId = null;
    }

    async confirmDelete() {
        if (!this.currentDeleteId) return;

        try {
            await window.apiService.request(`/form-types/form-types/${this.currentDeleteId}`, {
                method: 'DELETE'
            });

            this.closeConfirmDeleteModal();
            await this.loadFormTypes(); // Reload to get updated data
            this.showAlert('success', '学习形式类别删除成功');
            
        } catch (error) {
            console.error('❌ 删除学习形式类别失败:', error);
            this.closeConfirmDeleteModal();
            
            let errorMessage = '删除失败，请重试';
            
            // Handle specific error messages
            if (error.message.includes('being used')) {
                errorMessage = '该类别正在被使用，无法删除。请先删除相关记录或选择其他类别。';
            } else if (error.message.includes('default')) {
                errorMessage = '默认类别无法删除';
            }
            
            this.showAlert('danger', errorMessage);
        }
    }

    // Utility Methods
    showAlert(type, message) {
        const alertContainer = document.getElementById('form-types-alert');
        if (!alertContainer) return;

        alertContainer.innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }

        // Scroll to top to show the alert
        document.querySelector('.settings-container').scrollTop = 0;
    }

    // Public API for other modules
    getFormTypes() {
        return [...this.formTypes]; // Return a copy
    }

    refreshFormTypes() {
        return this.loadFormTypes();
    }
}

class TemplateManager {
    constructor() {
        this.templates = [];
        this.formTypes = [];
        this.currentStep = 1;
        this.templateDraft = { tags: [] };
        this.currentTemplateId = null;
        this.currentTemplateData = null;
        this.creatingFromQuick = false;
        this.isDetailEditMode = false;
        this.pendingDeleteId = null;
        this.recentTags = [];
        this.isQuickSubmitting = false;
        this.detailTagInputInitialized = false;
        this.currentTemplateTags = [];
    }

    async init() {
        await this.syncFormTypes();
        await this.loadRecentTags();
        this.renderTemplateFormTypes();
        this.setupQuickFormListeners();
        await this.loadTemplates();
        this.populateDetailFormTypeOptions();
    }

    async syncFormTypes() {
        if (window.settingsManager) {
            this.formTypes = window.settingsManager.getFormTypes();
        }
        if (!this.formTypes || this.formTypes.length === 0) {
            try {
                this.formTypes = await window.apiService.getFormTypes();
            } catch (error) {
                console.error('❌ 获取学习形式失败:', error);
                this.formTypes = [];
            }
        }
    }

    async loadRecentTags() {
        try {
            this.recentTags = await window.apiService.getRecentTags();
        } catch (error) {
            console.warn('⚠️ 获取最近标签失败:', error);
            this.recentTags = [];
        }
    }

    async loadTemplates() {
        try {
            const data = await window.apiService.getRecordTemplates({ limit: 100 });
            this.templates = data?.templates || [];
            this.renderTemplates();
        } catch (error) {
            console.error('❌ 加载模板失败:', error);
            this.showTemplateAlert('danger', error.message || '加载模板失败，请稍后重试');
        }
    }

    async refreshTemplates() {
        await this.loadTemplates();
    }

    renderTemplates() {
        const list = document.getElementById('templateList');
        const emptyState = document.getElementById('templatesEmptyState');
        if (!list || !emptyState) return;

        if (!this.templates.length) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        list.innerHTML = this.templates.map(template => {
            const typeInfo = this.getFormTypeInfo(template.form_type);
            const tagLine = (template.tags || []).filter(Boolean).join(' · ');

            return `
                <div class="record-item template-card" onclick="window.templateManager.openTemplateDetail(${template.template_id})">
                    <div class="record-type">${typeInfo.emoji}</div>
                    <div class="record-content">
                        <div class="record-title">${template.title}</div>
                        <div class="record-meta">
                            <span class="record-tags">${tagLine || '未设置标签'}</span>
                            <span>${typeInfo.type_name}</span>
                            <span class="record-duration">${this.formatDuration(template.duration_min)}</span>
                        </div>
                    </div>
                    <div class="record-actions" onclick="event.stopPropagation()">
                        <button class="btn-action btn-detail" onclick="window.templateManager.openTemplateDetail(${template.template_id})">
                            📄 详情
                        </button>
                        <button class="btn-action btn-delete" onclick="window.templateManager.promptDeleteTemplate(${template.template_id})">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatDuration(minutes) {
        if (!minutes && minutes !== 0) return '未设时长';
        if (minutes < 60) return `${minutes} 分钟`;
        const hours = Math.floor(minutes / 60);
        const rest = minutes % 60;
        if (!rest) return `${hours} 小时`;
        return `${hours} 小时 ${rest} 分钟`;
    }

    getFormTypeInfo(typeCode) {
        if (!typeCode) {
            return { emoji: '📘', type_name: '未分类', type_code: 'other' };
        }
        const match = this.formTypes.find(ft => ft.type_code === typeCode);
        if (match) {
            return match;
        }
        return { emoji: '📘', type_name: typeCode, type_code: typeCode };
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    normalizeTag(value) {
        if (typeof value !== 'string') return '';
        try {
            return decodeURIComponent(value);
        } catch (error) {
            return value;
        }
    }

    showTemplateAlert(type, message) {
        const container = document.getElementById('templates-alert');
        if (!container) return;
        container.innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;
        if (type === 'success') {
            setTimeout(() => {
                if (container.innerHTML.includes(message)) {
                    container.innerHTML = '';
                }
            }, 4000);
        }
    }

    setupQuickFormListeners() {
        const presets = document.querySelectorAll('#templateQuickModal .preset-btn');
        presets.forEach(btn => {
            btn.addEventListener('click', () => {
                const duration = parseInt(btn.getAttribute('data-duration'), 10);
                document.getElementById('templateDurationInput').value = duration;
            });
        });

        const tagInput = document.getElementById('templateTagInput');
        if (tagInput) {
            tagInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const value = tagInput.value.trim();
                    if (value) {
                        this.addTag(value);
                        tagInput.value = '';
                    }
                }
            });
        }
    }

    resetQuickForm() {
        this.templateDraft = {
            title: '',
            form_type: this.formTypes[0]?.type_code || 'other',
            tags: [],
            duration_min: null
        };
        this.currentStep = 1;
        this.creatingFromQuick = false;
        this.currentTemplateId = null;

        const titleInput = document.getElementById('templateTitleInput');
        const durationInput = document.getElementById('templateDurationInput');
        if (titleInput) titleInput.value = '';
        if (durationInput) durationInput.value = '';

        const tagInput = document.getElementById('templateTagInput');
        if (tagInput) tagInput.value = '';

        const submitBtn = document.getElementById('templateSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '保存模板';
        }

        this.renderTemplateFormTypes();
        this.renderSelectedTags();
        this.renderTagSuggestions();
        this.updateQuickFormStep();
    }

    renderTemplateFormTypes() {
        const container = document.getElementById('templateTypeGrid');
        if (!container) return;

        if (!this.templateDraft.form_type && this.formTypes.length) {
            this.templateDraft.form_type = this.formTypes[0].type_code;
        }

        container.innerHTML = this.formTypes.map(formType => `
            <button type="button"
                    class="type-btn ${this.templateDraft.form_type === formType.type_code ? 'selected' : ''}"
                    data-type="${formType.type_code}">
                ${formType.emoji} ${formType.type_name}
            </button>
        `).join('');

        container.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                const typeCode = btn.dataset.type;
                this.templateDraft.form_type = typeCode;
                container.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    renderSelectedTags() {
        const container = document.getElementById('templateSelectedTags');
        if (!container) return;

        if (!this.templateDraft.tags) {
            this.templateDraft.tags = [];
        }

        if (this.templateDraft.tags.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.templateDraft.tags.map(tag => {
            const safeLabel = this.escapeHtml(tag);
            const encoded = encodeURIComponent(tag);
            return `
                <span class="tag">
                    ${safeLabel}
                    <span class="tag-remove" data-tag="${encoded}">×</span>
                </span>
            `;
        }).join('');

        container.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const tag = this.normalizeTag(event.currentTarget.dataset.tag);
                this.removeTag(tag);
            });
        });
    }

    renderTagSuggestions() {
        const container = document.getElementById('templateTagSuggestions');
        if (!container) return;

        const defaults = ['英语', '数学', 'AI', '编程', '历史'];
        const suggestions = [...new Set([...this.recentTags, ...defaults])].slice(0, 10);

        container.innerHTML = suggestions.map(tag => {
            const safeLabel = this.escapeHtml(tag);
            const encoded = encodeURIComponent(tag);
            const isSelected = this.templateDraft.tags.includes(tag);
            return `
                <span class="tag-suggestion ${isSelected ? 'selected' : ''}"
                      data-tag="${encoded}">
                    ${safeLabel}
                </span>
            `;
        }).join('');

        container.querySelectorAll('.tag-suggestion').forEach(el => {
            el.addEventListener('click', (event) => {
                const tag = this.normalizeTag(event.currentTarget.dataset.tag);
                this.toggleTag(tag);
            });
        });
    }

    toggleTag(tag) {
        tag = this.normalizeTag(tag);
        if (!tag) return;
        if (!this.templateDraft.tags) this.templateDraft.tags = [];
        const index = this.templateDraft.tags.indexOf(tag);
        if (index >= 0) {
            this.templateDraft.tags.splice(index, 1);
        } else {
            this.templateDraft.tags.push(tag);
        }
        this.renderSelectedTags();
        this.renderTagSuggestions();
    }

    addTag(tag) {
        let value = this.normalizeTag(tag);
        value = value.trim();
        if (!value) return;
        if (!this.templateDraft.tags.includes(value)) {
            this.templateDraft.tags.push(value);
            this.renderSelectedTags();
            this.renderTagSuggestions();
        }
    }

    removeTag(tag) {
        const value = this.normalizeTag(tag);
        this.templateDraft.tags = this.templateDraft.tags.filter(t => t !== value);
        this.renderSelectedTags();
        this.renderTagSuggestions();
    }

    updateQuickFormStep() {
        const steps = document.querySelectorAll('#templateQuickModal .form-step');
        steps.forEach(step => {
            const stepNumber = parseInt(step.dataset.step, 10);
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        const prevBtn = document.querySelector('#templateQuickModal .btn-secondary');
        const nextBtn = document.querySelector('#templateQuickModal .btn-primary');
        const submitBtn = document.getElementById('templateSubmitBtn');

        if (prevBtn) prevBtn.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
        if (nextBtn) nextBtn.style.display = this.currentStep === 4 ? 'none' : 'inline-flex';
        if (submitBtn) submitBtn.style.display = this.currentStep === 4 ? 'inline-flex' : 'none';
    }

    nextStep() {
        if (this.currentStep >= 4) return;
        if (!this.validateCurrentStep()) return;
        this.currentStep += 1;
        this.updateQuickFormStep();
    }

    prevStep() {
        if (this.currentStep <= 1) return;
        this.currentStep -= 1;
        this.updateQuickFormStep();
    }

    validateCurrentStep() {
        if (this.currentStep === 1) {
            const titleInput = document.getElementById('templateTitleInput');
            if (!titleInput || !titleInput.value.trim()) {
                this.showTemplateAlert('danger', '请填写模板标题');
                return false;
            }
            this.templateDraft.title = titleInput.value.trim();
        }
        if (this.currentStep === 4) {
            const durationInput = document.getElementById('templateDurationInput');
            if (durationInput && durationInput.value) {
                const duration = parseInt(durationInput.value, 10);
                if (duration < 0) {
                    this.showTemplateAlert('danger', '学习时长不能为负数');
                    return false;
                }
                this.templateDraft.duration_min = duration;
            } else {
                this.templateDraft.duration_min = null;
            }
        }
        return true;
    }

    async submitQuickForm(event) {
        event.preventDefault();
        if (!this.validateCurrentStep()) return;
        if (this.isQuickSubmitting) return;

        this.isQuickSubmitting = true;
        const submitBtn = document.getElementById('templateSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '保存中...';
        }

        try {
            const payload = this.buildQuickTemplatePayload();
            await window.apiService.createRecordTemplate(payload);
            this.showTemplateAlert('success', '模板创建成功');
            this.closeQuickModal();
            await this.loadTemplates();
        } catch (error) {
            console.error('❌ 创建模板失败:', error);
            this.showTemplateAlert('danger', error.message || '创建模板失败，请重试');
        } finally {
            this.isQuickSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '保存模板';
            }
        }
    }

    buildQuickTemplatePayload() {
        const titleInput = document.getElementById('templateTitleInput');
        const durationInput = document.getElementById('templateDurationInput');
        const payload = {
            title: titleInput ? titleInput.value.trim() : '',
            form_type: this.templateDraft.form_type,
            tags: [...(this.templateDraft.tags || [])]
        };
        if (durationInput && durationInput.value) {
            payload.duration_min = parseInt(durationInput.value, 10);
        }
        return payload;
    }

    openQuickModal() {
        this.resetQuickForm();
        const modal = document.getElementById('templateQuickModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeQuickModal() {
        const modal = document.getElementById('templateQuickModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    openDetailFromQuick() {
        if (!this.validateCurrentStep()) return;
        const payload = this.buildQuickTemplatePayload();
        this.creatingFromQuick = true;
        this.currentTemplateId = null;
        this.currentTemplateData = { ...payload };

        this.closeQuickModal();
        this.showDetailModal({
            template_id: null,
            ...payload,
            tags: payload.tags.map(tag => ({ tag_name: tag })),
            privacy: 'private'
        }, true);
        this.toggleDetailEditMode(true);
    }

    async openTemplateDetail(templateId) {
        try {
            const detail = await window.apiService.getRecordTemplate(templateId);
            this.currentTemplateId = templateId;
            this.currentTemplateData = detail;
            this.creatingFromQuick = false;
            this.showDetailModal(detail, false);
        } catch (error) {
            console.error('❌ 获取模板详情失败:', error);
            this.showTemplateAlert('danger', error.message || '加载模板详情失败');
        }
    }

    showDetailModal(detail, isNew) {
        const modal = document.getElementById('templateDetailModal');
        if (!modal) return;

        this.populateDetail(detail);
        this.toggleDetailEditMode(isNew);
        this.setupRatingInteractions();

        const heading = document.getElementById('templateDetailHeading');
        if (heading) {
            heading.textContent = isNew ? '新建模板' : `模板详情 - ${detail.title}`;
        }

        const deleteBtn = modal.querySelector('.modal-actions .btn.btn-danger');
        if (deleteBtn) {
            deleteBtn.style.display = isNew ? 'none' : 'inline-flex';
        }

        modal.classList.remove('hidden');
    }

    populateDetail(data) {
        if (!data) return;
        const titleInput = document.getElementById('templateDetailTitleInput');
        const titlePreview = document.querySelector('#templateDetailTitlePreview .preview-value');
        if (titleInput) titleInput.value = data.title || '';
        if (titlePreview) titlePreview.textContent = data.title || '未命名模板';

        const formTypeSelect = document.getElementById('templateDetailFormType');
        if (formTypeSelect) {
            this.populateDetailFormTypeOptions();
            formTypeSelect.value = data.form_type || '';
        }
        const formTypePreview = document.querySelector('#templateDetailFormTypePreview .preview-value');
        if (formTypePreview) {
            const info = this.getFormTypeInfo(data.form_type);
            formTypePreview.textContent = `${info.emoji} ${info.type_name}`;
        }

        const durationInput = document.getElementById('templateDetailDuration');
        if (durationInput) durationInput.value = data.duration_min || '';
        const durationPreview = document.querySelector('#templateDetailDurationPreview .preview-value');
        if (durationPreview) durationPreview.textContent = this.formatDuration(data.duration_min);

        const bodyInput = document.getElementById('templateDetailBody');
        if (bodyInput) bodyInput.value = data.body_md || '';
        const bodyPreview = document.getElementById('templateDetailBodyPreview');
        if (bodyPreview) {
            if (data.body_md) {
                bodyPreview.innerHTML = window.marked ? window.marked.parse(data.body_md) : data.body_md;
                bodyPreview.style.display = 'block';
            } else {
                bodyPreview.style.display = 'none';
            }
        }

        this.setRatingDisplay('templateDetailDifficulty', data.difficulty || 0);
        this.setRatingDisplay('templateDetailFocus', data.focus || 0);
        this.setRatingDisplay('templateDetailEnergy', data.energy || 0);

        const moodInput = document.getElementById('templateDetailMood');
        if (moodInput) moodInput.value = data.mood || '';

        const normalizedTags = (data.tags || []).map(tag => typeof tag === 'string' ? tag : tag.tag_name).filter(Boolean);
        this.currentTemplateTags = normalizedTags;
        this.renderDetailTags(normalizedTags);
        this.renderDetailTagSuggestions();

        const privacySelect = document.getElementById('templateDetailPrivacy');
        if (privacySelect) privacySelect.value = data.privacy || 'private';
        const privacyPreview = document.querySelector('#templateDetailPrivacyPreview .preview-value');
        if (privacyPreview) {
            const privacyText = this.getPrivacyText(data.privacy || 'private');
            privacyPreview.textContent = privacyText;
        }

        this.populateResourceSection(data.resource || {});
    }

    populateDetailFormTypeOptions() {
        const formTypeSelect = document.getElementById('templateDetailFormType');
        if (!formTypeSelect) return;
        formTypeSelect.innerHTML = this.formTypes.map(formType => `
            <option value="${formType.type_code}">
                ${formType.emoji} ${formType.type_name}
            </option>
        `).join('');
    }

    populateResourceSection(resource) {
        const titleInput = document.getElementById('templateResourceTitle');
        const titlePreview = document.querySelector('#templateResourceTitlePreview .preview-value');
        if (titleInput) titleInput.value = resource?.title || '';
        if (titlePreview) titlePreview.textContent = resource?.title || '未设置';

        const typeInput = document.getElementById('templateResourceType');
        const typePreview = document.querySelector('#templateResourceTypePreview .preview-value');
        if (typeInput) typeInput.value = resource?.type || '';
        if (typePreview) typePreview.textContent = resource?.type || '未设置';

        const authorInput = document.getElementById('templateResourceAuthor');
        const authorPreview = document.querySelector('#templateResourceAuthorPreview .preview-value');
        if (authorInput) authorInput.value = resource?.author || '';
        if (authorPreview) authorPreview.textContent = resource?.author || '未设置';

        const urlInput = document.getElementById('templateResourceUrl');
        const urlPreview = document.querySelector('#templateResourceUrlPreview .preview-link');
        if (urlInput) urlInput.value = resource?.url || '';
        if (urlPreview) {
            if (resource?.url) {
                urlPreview.href = resource.url;
                urlPreview.textContent = resource.url;
                urlPreview.style.display = 'inline';
            } else {
                urlPreview.href = '#';
                urlPreview.textContent = '';
                urlPreview.style.display = 'none';
            }
        }

        const platformInput = document.getElementById('templateResourcePlatform');
        const platformPreview = document.querySelector('#templateResourcePlatformPreview .preview-value');
        if (platformInput) platformInput.value = resource?.platform || '';
        if (platformPreview) platformPreview.textContent = resource?.platform || '未设置';

        const isbnInput = document.getElementById('templateResourceIsbn');
        const isbnPreview = document.querySelector('#templateResourceIsbnPreview .preview-value');
        if (isbnInput) isbnInput.value = resource?.isbn || '';
        if (isbnPreview) isbnPreview.textContent = resource?.isbn || '未设置';

        const descInput = document.getElementById('templateResourceDescription');
        if (descInput) descInput.value = resource?.description || '';
    }

    getPrivacyText(value) {
        switch (value) {
            case 'public':
                return '公开分享';
            case 'buddies':
                return '学习搭子可见';
            default:
                return '仅自己可见';
        }
    }

    renderDetailTags(tags) {
        const container = document.getElementById('templateDetailTags');
        if (!container) return;

        const tagList = (tags || []).map(tag => typeof tag === 'string' ? tag : tag?.tag_name).filter(Boolean);
        this.currentTemplateTags = tagList;
        if (this.currentTemplateData) {
            this.currentTemplateData.tags = [...tagList];
        }

        if (!tagList.length) {
            container.innerHTML = '<span class="no-tags">暂无标签</span>';
            return;
        }

        container.innerHTML = tagList.map(tag => {
            const safeLabel = this.escapeHtml(tag);
            const encoded = encodeURIComponent(tag);
            return `
                <div class="tag-item">
                    <span>${safeLabel}</span>
                    <span class="tag-remove" data-tag="${encoded}" style="display: ${this.isDetailEditMode ? 'inline' : 'none'};">×</span>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const tagName = this.normalizeTag(event.currentTarget.dataset.tag);
                this.removeDetailTag(tagName);
            });
        });

        if (this.isDetailEditMode) {
            this.updateTemplateDetailTagSuggestionsState();
        }
    }

    renderDetailTagSuggestions() {
        const container = document.getElementById('templateDetailTagSuggestions');
        if (!container) return;

        const defaults = ['英语', '数学', 'AI', '编程', '历史'];
        const suggestions = [...new Set([...this.recentTags, ...defaults])].slice(0, 10);

        if (!suggestions.length) {
            container.innerHTML = '<div class="section-label">暂无推荐标签</div>';
            return;
        }

        container.innerHTML = `
            <div class="section-label">推荐标签（点击添加）</div>
            <div class="tag-suggestions">
                ${suggestions.map(tag => `
                    <span class="tag-suggestion" data-tag="${encodeURIComponent(tag)}">
                        ${this.escapeHtml(tag)}
                    </span>
                `).join('')}
            </div>
        `;

        this.bindTemplateDetailTagSuggestionEvents();
        this.updateTemplateDetailTagSuggestionsState();
    }

    bindTemplateDetailTagSuggestionEvents() {
        const suggestionElements = document.querySelectorAll('#templateDetailTagSuggestions .tag-suggestion');
        suggestionElements.forEach(element => {
            element.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!this.isDetailEditMode) {
                    return;
                }
                const tagName = this.normalizeTag(element.dataset.tag);
                this.addDetailTag(tagName);
            });
        });
    }

    updateTemplateDetailTagSuggestionsState() {
        const current = this.getCurrentTemplateDetailTags();
        document.querySelectorAll('#templateDetailTagSuggestions .tag-suggestion').forEach(element => {
            const tagName = this.normalizeTag(element.dataset.tag);
            if (current.includes(tagName)) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
    }

    getCurrentTemplateDetailTags() {
        return (this.currentTemplateTags || []).map(tag => typeof tag === 'string' ? tag : tag?.tag_name).filter(Boolean);
    }

    setupTemplateDetailTagControls() {
        const tagInput = document.getElementById('templateDetailTagInput');
        const addBtn = document.getElementById('templateDetailAddTagBtn');
        if (!tagInput || !addBtn) return;

        addBtn.textContent = '添加标签';
        addBtn.classList.remove('btn-success');
        addBtn.classList.add('btn-primary');

        if (!this.detailTagInputInitialized) {
            addBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const value = tagInput.value.trim();
                if (value) {
                    this.addDetailTag(value);
                    tagInput.value = '';
                }
            });

            tagInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const value = tagInput.value.trim();
                    if (value) {
                        this.addDetailTag(value);
                        tagInput.value = '';
                    }
                }
            });

            this.detailTagInputInitialized = true;
        }
    }

    setRatingDisplay(elementId, value) {
        const container = document.getElementById(elementId);
        if (!container) return;
        const stars = container.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('filled');
                star.textContent = '★';
            } else {
                star.classList.remove('filled');
                star.textContent = '☆';
            }
        });
        container.dataset.value = value;
    }

    setupRatingInteractions() {
        if (this.ratingListenersAttached) return;
        const ratingIds = ['templateDetailDifficulty', 'templateDetailFocus', 'templateDetailEnergy'];
        ratingIds.forEach(id => {
            const container = document.getElementById(id);
            if (!container) return;
            const stars = container.querySelectorAll('.star');
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    if (!this.isDetailEditMode) return;
                    this.setRatingDisplay(id, index + 1);
                });
            });
        });
        this.ratingListenersAttached = true;
    }

    toggleDetailEditMode(forceEdit = null) {
        const shouldEdit = forceEdit !== null ? forceEdit : !this.isDetailEditMode;
        this.isDetailEditMode = shouldEdit;

        const editableInputs = [
            'templateDetailTitleInput',
            'templateDetailFormType',
            'templateDetailDuration',
            'templateDetailBody',
            'templateDetailMood',
            'templateDetailPrivacy',
            'templateResourceTitle',
            'templateResourceType',
            'templateResourceAuthor',
            'templateResourceUrl',
            'templateResourcePlatform',
            'templateResourceIsbn',
            'templateResourceDescription'
        ];

        editableInputs.forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;
            if (element.tagName === 'SELECT') {
                element.disabled = !shouldEdit;
            } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
                element.readOnly = !shouldEdit;
            }
        });

        const previewPairs = [
            ['templateDetailTitleInput', 'templateDetailTitlePreview'],
            ['templateDetailFormType', 'templateDetailFormTypePreview'],
            ['templateDetailDuration', 'templateDetailDurationPreview'],
            ['templateDetailPrivacy', 'templateDetailPrivacyPreview'],
            ['templateResourceTitle', 'templateResourceTitlePreview'],
            ['templateResourceType', 'templateResourceTypePreview'],
            ['templateResourceAuthor', 'templateResourceAuthorPreview'],
            ['templateResourceUrl', 'templateResourceUrlPreview'],
            ['templateResourcePlatform', 'templateResourcePlatformPreview'],
            ['templateResourceIsbn', 'templateResourceIsbnPreview']
        ];

        previewPairs.forEach(([inputId, previewId]) => {
            const inputEl = document.getElementById(inputId);
            const previewEl = document.getElementById(previewId);
            if (inputEl) inputEl.style.display = shouldEdit ? 'block' : 'none';
            if (!previewEl) return;
            previewEl.style.display = shouldEdit ? 'none' : 'block';
        });

        const bodyInput = document.getElementById('templateDetailBody');
        const bodyPreview = document.getElementById('templateDetailBodyPreview');
        if (bodyInput) bodyInput.style.display = shouldEdit ? 'block' : 'none';
        if (bodyPreview) {
            if (shouldEdit) {
                bodyPreview.style.display = 'none';
            } else {
                bodyPreview.style.display = bodyInput && bodyInput.value ? 'block' : 'none';
            }
        }

        const tagEditor = document.getElementById('templateTagEditor');
        if (tagEditor) tagEditor.style.display = shouldEdit ? 'block' : 'none';

        const ratingIds = ['templateDetailDifficulty', 'templateDetailFocus', 'templateDetailEnergy'];
        ratingIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (shouldEdit) {
                el.classList.add('interactive');
            } else {
                el.classList.remove('interactive');
            }
        });

        ['templateDetailEditBtn', 'templateDetailSaveBtn', 'templateDetailCancelBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (id === 'templateDetailEditBtn') {
                el.style.display = shouldEdit ? 'none' : 'inline-flex';
            } else {
                el.style.display = shouldEdit ? 'inline-flex' : 'none';
            }
        });

        if (shouldEdit) {
            this.setupTemplateDetailTagControls();
        }

        this.renderDetailTags(this.currentTemplateTags);
        this.updateTemplateDetailTagSuggestionsState();
    }

    cancelEdit() {
        if (!this.currentTemplateData) return;
        this.populateDetail(this.currentTemplateData);
        this.toggleDetailEditMode(false);
    }

    closeDetailModal() {
        const modal = document.getElementById('templateDetailModal');
        if (modal) modal.classList.add('hidden');
        this.isDetailEditMode = false;
        this.creatingFromQuick = false;
    }

    collectDetailData() {
        const data = {};
        const titleInput = document.getElementById('templateDetailTitleInput');
        if (titleInput) data.title = titleInput.value.trim();

        const formType = document.getElementById('templateDetailFormType');
        if (formType) data.form_type = formType.value;

        const durationInput = document.getElementById('templateDetailDuration');
        if (durationInput && durationInput.value !== '') {
            data.duration_min = parseInt(durationInput.value, 10);
        } else {
            data.duration_min = null;
        }

        const bodyInput = document.getElementById('templateDetailBody');
        if (bodyInput) data.body_md = bodyInput.value;

        const moodInput = document.getElementById('templateDetailMood');
        if (moodInput) data.mood = moodInput.value;

        const privacySelect = document.getElementById('templateDetailPrivacy');
        if (privacySelect) data.privacy = privacySelect.value;

        data.difficulty = parseInt(document.getElementById('templateDetailDifficulty')?.dataset.value || '0', 10) || null;
        data.focus = parseInt(document.getElementById('templateDetailFocus')?.dataset.value || '0', 10) || null;
        data.energy = parseInt(document.getElementById('templateDetailEnergy')?.dataset.value || '0', 10) || null;

        data.tags = this.collectDetailTags();

        // Resource fields
        data.resource_title = document.getElementById('templateResourceTitle')?.value || null;
        data.resource_type = document.getElementById('templateResourceType')?.value || null;
        data.resource_author = document.getElementById('templateResourceAuthor')?.value || null;
        data.resource_url = document.getElementById('templateResourceUrl')?.value || null;
        data.resource_platform = document.getElementById('templateResourcePlatform')?.value || null;
        data.resource_isbn = document.getElementById('templateResourceIsbn')?.value || null;
        data.resource_description = document.getElementById('templateResourceDescription')?.value || null;

        return data;
    }

    collectDetailTags() {
        return [...(this.currentTemplateTags || [])];
    }

    removeDetailTag(tag) {
        const value = this.normalizeTag(tag);
        this.currentTemplateTags = this.getCurrentTemplateDetailTags().filter(t => t !== value);
        this.renderDetailTags(this.currentTemplateTags);
        if (this.isDetailEditMode) {
            this.updateTemplateDetailTagSuggestionsState();
        }
    }

    addDetailTag(tag) {
        const value = this.normalizeTag(tag).trim();
        if (!value) return;
        const current = this.getCurrentTemplateDetailTags();
        if (current.includes(value)) return;
        this.currentTemplateTags = [...current, value];
        this.renderDetailTags(this.currentTemplateTags);
        if (this.isDetailEditMode) {
            this.updateTemplateDetailTagSuggestionsState();
        }
    }

    async saveDetail() {
        const data = this.collectDetailData();
        if (!data.title) {
            this.showTemplateAlert('danger', '请填写模板标题');
            return;
        }
        if (!data.form_type) {
            this.showTemplateAlert('danger', '请选择学习形式');
            return;
        }
        try {
            let result;
            if (this.currentTemplateId) {
                result = await window.apiService.updateRecordTemplate(this.currentTemplateId, data);
                this.showTemplateAlert('success', '模板修改成功');
            } else {
                result = await window.apiService.createRecordTemplate(data);
                this.currentTemplateId = result?.template_id || result?.templateId;
                this.showTemplateAlert('success', '模板创建成功');
            }
            this.currentTemplateData = result;
            await this.loadTemplates();
            this.populateDetail(result);
            this.toggleDetailEditMode(false);
            const deleteBtn = document.querySelector('#templateDetailModal .btn.btn-danger');
            if (deleteBtn) deleteBtn.style.display = 'inline-flex';
        } catch (error) {
            console.error('❌ 保存模板失败:', error);
            this.showTemplateAlert('danger', error.message || '保存失败，请重试');
        }
    }

    promptDeleteTemplate(templateId) {
        this.pendingDeleteId = templateId;
        const modal = document.getElementById('templateDeleteModal');
        const message = document.getElementById('templateDeleteMessage');
        if (message) {
            const template = this.templates.find(t => t.template_id === templateId);
            const title = template ? template.title : '该模板';
            message.innerHTML = `确定要删除模板 <strong>${title}</strong> 吗？删除后无法恢复。`;
        }
        if (modal) modal.classList.remove('hidden');
    }

    closeDeleteModal() {
        const modal = document.getElementById('templateDeleteModal');
        if (modal) modal.classList.add('hidden');
        this.pendingDeleteId = null;
    }

    async executeDelete() {
        if (!this.pendingDeleteId) return;
        try {
            await window.apiService.deleteRecordTemplate(this.pendingDeleteId);
            this.showTemplateAlert('success', '模板删除成功');
            this.closeDeleteModal();
            await this.loadTemplates();
            const detailModal = document.getElementById('templateDetailModal');
            if (detailModal) detailModal.classList.add('hidden');
            this.currentTemplateId = null;
            this.currentTemplateData = null;
        } catch (error) {
            console.error('❌ 删除模板失败:', error);
            this.showTemplateAlert('danger', error.message || '删除失败，请稍后再试');
            this.closeDeleteModal();
        }
    }
}

// Initialize managers
window.settingsManager = new SettingsManager();
window.templateManager = new TemplateManager();

// Expose helper functions to templates
window.showTemplateCreateModal = function () {
    window.templateManager.openQuickModal();
};

window.closeTemplateQuickModal = function () {
    window.templateManager.closeQuickModal();
};

window.submitTemplateQuickForm = function (event) {
    return window.templateManager.submitQuickForm(event);
};

window.templateNextStep = function () {
    window.templateManager.nextStep();
};

window.templatePrevStep = function () {
    window.templateManager.prevStep();
};

window.openTemplateDetailFromQuick = function () {
    window.templateManager.openDetailFromQuick();
};

window.closeTemplateDetailModal = function () {
    window.templateManager.closeDetailModal();
};

window.toggleTemplateEditMode = function () {
    window.templateManager.toggleDetailEditMode();
};

window.cancelTemplateEdit = function () {
    window.templateManager.cancelEdit();
};

window.saveTemplateDetail = function () {
    window.templateManager.saveDetail();
};

window.confirmTemplateDelete = function () {
    if (window.templateManager.currentTemplateId) {
        window.templateManager.promptDeleteTemplate(window.templateManager.currentTemplateId);
    }
};

window.closeTemplateDeleteModal = function () {
    window.templateManager.closeDeleteModal();
};

window.executeTemplateDelete = function () {
    window.templateManager.executeDelete();
};

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
    module.exports.TemplateManager = TemplateManager;
}
