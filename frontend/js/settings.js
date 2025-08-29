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

// Initialize settings manager
window.settingsManager = new SettingsManager();

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}