// Learning Buddy App - Main JavaScript
class LearningBuddyApp {
    constructor() {
        this.currentPage = 'home';
        this.currentStep = 1;
        this.recordData = {};
        this.records = [];
        this.currentMonth = new Date();
        this.currentPeriod = 'week'; // week, month, year
        this.isSubmitting = false; // 防止重复提交
        this.isCreatingNew = false; // 标记是否正在创建新记录
        this.formTypes = []; // 用户的学习形式类型
        this.init();
    }

    async init() {
        // 🚫 暂时禁用缓存服务初始化
        // if (window.cacheService) {
        //     await window.cacheService.init();
        // }
        
        await this.loadData();
        await this.loadFormTypes();
        this.setupEventListeners();
        this.updateDashboard();
        this.renderRecentRecords();
        this.updateConditionalSections();
        
        // 🚫 暂时禁用缓存清理
        // if (window.cacheService && window.cacheService.isInitialized) {
        //     setTimeout(() => {
        //         window.cacheService.cleanupExpired();
        //     }, 5000);
        // }
    }

    // Load data from backend API - 超级优化版本
    async loadData() {
        try {
            this.showLoading(true);
            
            // 🚀 简单前端缓存：检查是否有最近的数据（2分钟内）
            const cacheKey = 'app_init_data';
            const cacheExpiry = 2 * 60 * 1000; // 2分钟
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                console.log('🗄️ 使用缓存数据');
                this.processInitData(cached);
                return;
            }
            
            // 🚀 使用新的聚合初始化API，一次调用获取所有数据
            const initData = await window.apiService.getInitData();
            
            // 缓存数据
            this.setToCache(cacheKey, initData, cacheExpiry);
            this.processInitData(initData);
            
        } catch (error) {
            console.error('❌ 加载数据失败:', error);
            this.showError('加载数据失败，请检查网络连接和后端服务');
            
            // 降级到原有API调用方式
            try {
                console.log('🔄 降级到原有API调用方式...');
                const [weekResult, monthResult, recentResult] = await Promise.allSettled([
                    window.apiService.getDashboardSummary(7),
                    window.apiService.getDashboardSummary(30), 
                    window.apiService.getRecords({ limit: 20, skip: 0 })
                ]);
                
                this.weekSummary = weekResult.status === 'fulfilled' ? weekResult.value : null;
                this.monthSummary = monthResult.status === 'fulfilled' ? monthResult.value : null;
                this.dashboardSummary = this.weekSummary || this.monthSummary;
                
                const recentRecordsData = recentResult.status === 'fulfilled' ? recentResult.value : null;
                this.records = recentRecordsData?.records ? 
                    recentRecordsData.records.map(record => this.convertBackendRecord(record)) : [];
                    
            } catch (fallbackError) {
                console.error('❌ 降级方案也失败:', fallbackError);
                this.records = [];
                this.dashboardSummary = null;
            }
        } finally {
            this.showLoading(false);
        }
    }
    
    // Load user's form types (default + custom) - 优化版本
    async loadFormTypes() {
        try {
            // 如果已经在初始化时加载了，直接使用
            if (this.formTypes && this.formTypes.length > 0) {
                console.log('📝 使用已缓存的学习形式类型:', this.formTypes.length);
                this.refreshFormTypeDisplay();
                return;
            }
            
            // 否则单独加载
            await new Promise(resolve => setTimeout(resolve, 100));
            this.formTypes = await window.apiService.getFormTypes();
            console.log('📝 已加载学习形式类型:', this.formTypes.length);
            this.refreshFormTypeDisplay();
        } catch (error) {
            console.error('❌ 加载学习形式类型失败:', error);
            
            // If it's an authentication error, try again after a delay
            if (error.message.includes('401') || error.message.includes('authentication') || error.message.includes('未登录')) {
                console.log('🔄 认证问题，2秒后重试加载学习形式类型...');
                setTimeout(async () => {
                    try {
                        this.formTypes = await window.apiService.getFormTypes();
                        console.log('📝 重试成功！已加载学习形式类型:', this.formTypes.length);
                        this.refreshFormTypeDisplay();
                    } catch (retryError) {
                        console.error('❌ 重试仍然失败:', retryError);
                        // Use fallback default types
                        this.formTypes = [
                            {type_code: 'video', type_name: '视频', emoji: '📹', is_default: true, display_order: 1},
                            {type_code: 'podcast', type_name: '播客', emoji: '🎙️', is_default: true, display_order: 2},
                            {type_code: 'book', type_name: '书籍', emoji: '📚', is_default: true, display_order: 3},
                            {type_code: 'course', type_name: '课程', emoji: '🎓', is_default: true, display_order: 4},
                            {type_code: 'article', type_name: '文章', emoji: '📄', is_default: true, display_order: 5},
                            {type_code: 'exercise', type_name: '题目', emoji: '✏️', is_default: true, display_order: 6},
                            {type_code: 'project', type_name: '项目', emoji: '💻', is_default: true, display_order: 7},
                            {type_code: 'workout', type_name: '运动', emoji: '🏃', is_default: true, display_order: 8},
                            {type_code: 'paper', type_name: '论文', emoji: '📑', is_default: true, display_order: 9},
                            {type_code: 'other', type_name: '其他', emoji: '📌', is_default: true, display_order: 10}
                        ];
                        this.refreshFormTypeDisplay();
                    }
                }, 2000);
                return;
            }
            
            // Use fallback default types if API fails
            console.log('🔄 使用默认学习形式类型作为后备');
            this.formTypes = [
                {type_code: 'video', type_name: '视频', emoji: '📹', is_default: true, display_order: 1},
                {type_code: 'podcast', type_name: '播客', emoji: '🎙️', is_default: true, display_order: 2},
                {type_code: 'book', type_name: '书籍', emoji: '📚', is_default: true, display_order: 3},
                {type_code: 'course', type_name: '课程', emoji: '🎓', is_default: true, display_order: 4},
                {type_code: 'article', type_name: '文章', emoji: '📄', is_default: true, display_order: 5},
                {type_code: 'exercise', type_name: '题目', emoji: '✏️', is_default: true, display_order: 6},
                {type_code: 'project', type_name: '项目', emoji: '💻', is_default: true, display_order: 7},
                {type_code: 'workout', type_name: '运动', emoji: '🏃', is_default: true, display_order: 8},
                {type_code: 'paper', type_name: '论文', emoji: '📑', is_default: true, display_order: 9},
                {type_code: 'other', type_name: '其他', emoji: '📌', is_default: true, display_order: 10}
            ];
        }
    }
    
    // 刷新界面中的学习形式类型显示（更新图标等）
    refreshFormTypeDisplay() {
        // 更新已转换records的图标
        if (this.records && this.records.length > 0) {
            console.log('🔄 更新已有记录的图标');
            this.records.forEach(record => {
                const typeInfo = this.getFormTypeInfo(record.type);
                record.icon = typeInfo.emoji;
            });
        }
        
        // 重新渲染最近记录（更新图标）
        if (this.currentPage === 'home') {
            this.renderRecentRecords();
        }
        
        // 重新渲染记录列表（如果在记录页面）
        if (this.currentPage === 'records') {
            this.renderAllRecords();
        }
        
        console.log('🎨 已刷新学习形式类型显示');
    }
    
    // Load all records for the records page (not just 20 recent)
    async loadAllRecords() {
        try {
            this.showLoading(true);
            
            
            // 分批加载所有记录（由于API限制每次最多100条）
            let allRecords = [];
            let skip = 0;
            const batchSize = 100;
            
            while (true) {
                const recordsData = await window.apiService.getRecords({
                    skip: skip,
                    limit: batchSize
                });
                
                if (!recordsData?.records || recordsData.records.length === 0) {
                    break; // 没有更多记录了
                }
                
                allRecords = allRecords.concat(recordsData.records);
                
                // 如果返回的记录数少于批次大小，说明已经加载完所有记录
                if (recordsData.records.length < batchSize) {
                    break;
                }
                
                skip += batchSize;
            }
            
            // 转换记录格式
            this.records = allRecords.map(record => this.convertBackendRecord(record));
            
            
        } catch (error) {
            console.error('❌ 加载记录列表失败:', error);
            this.showError('加载记录列表失败，请检查网络连接和后端服务');
            this.records = [];
        } finally {
            this.showLoading(false);
        }
    }
    
    // 获取学习形式类型信息（emoji和名称）
    getFormTypeInfo(typeCode) {
        const formType = this.formTypes.find(ft => ft.type_code === typeCode);
        return {
            emoji: formType?.emoji || '📌',
            name: formType?.type_name || typeCode || '其他'
        };
    }
    
    // 转换最近记录格式（轻量版）
    convertRecentRecord(backendRecord) {
        const recordDate = new Date(backendRecord.occurred_at);
        const typeCode = backendRecord.form_type || backendRecord.type;
        const typeInfo = this.getFormTypeInfo(typeCode);
        
        // 处理标签数据 - 可能来自不同的字段
        let categories = [];
        if (backendRecord.tags && Array.isArray(backendRecord.tags)) {
            categories = backendRecord.tags.map(tag => tag.tag_name || tag.name || tag).filter(Boolean);
        } else if (backendRecord.categories && Array.isArray(backendRecord.categories)) {
            categories = backendRecord.categories.filter(Boolean);
        } else if (typeof backendRecord.tags === 'string' && backendRecord.tags.trim()) {
            categories = [backendRecord.tags];
        }
        
        return {
            id: backendRecord.record_id,  // 使用正确的record_id字段
            record_id: backendRecord.record_id,  // 保持双重兼容性
            type: typeCode, // 使用form_type作为主要类型字段
            icon: typeInfo.emoji,
            title: backendRecord.title,
            duration: backendRecord.duration_min || 0,
            date: recordDate,
            dateString: recordDate.toLocaleDateString('zh-CN'), // 添加日期字符串
            time: recordDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            categories: categories // 添加标签数据
        };
    }
    
    // 转换后端记录格式为前端格式
    convertBackendRecord(backendRecord) {
        const recordDate = new Date(backendRecord.occurred_at);
        const typeCode = backendRecord.form_type || backendRecord.type;
        const typeInfo = this.getFormTypeInfo(typeCode);
        
        // 处理标签数据 - 统一处理各种可能的标签字段
        let categories = [];
        
        if (backendRecord.tags && Array.isArray(backendRecord.tags)) {
            categories = backendRecord.tags.map(tag => tag.tag_name || tag.name || tag).filter(Boolean);
        } else if (backendRecord.tag_names && Array.isArray(backendRecord.tag_names)) {
            categories = backendRecord.tag_names.filter(Boolean);
        } else if (typeof backendRecord.tags === 'string' && backendRecord.tags.trim()) {
            categories = backendRecord.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        } else if (backendRecord.categories && Array.isArray(backendRecord.categories)) {
            categories = backendRecord.categories.filter(Boolean);
        }
        

        return {
            id: backendRecord.record_id,
            record_id: backendRecord.record_id,  // 保留原始ID用于API调用
            type: typeCode,
            icon: typeInfo.emoji,
            title: backendRecord.title,
            categories: categories, // 使用处理后的标签数据
            duration: backendRecord.duration_min || 0,
            difficulty: backendRecord.difficulty || null,
            focus: backendRecord.focus || null,
            mood: backendRecord.mood || '',
            tags: categories, // 保持向后兼容
            date: recordDate,
            dateString: recordDate.toLocaleDateString('zh-CN'), // 添加日期字符串
            time: recordDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('href').replace('#/', '');
                this.navigateTo(page || 'home');
            });
        });
        
        // Hash route handling for direct links like "查看全部"
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash;
            if (hash) {
                const page = hash.replace('#/', '');
                this.navigateTo(page || 'home');
            }
        });
        
        // Handle initial hash on page load
        const initialHash = window.location.hash;
        if (initialHash) {
            const page = initialHash.replace('#/', '');
            this.navigateTo(page || 'home');
        }

        // Type buttons
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.recordData.type = e.target.dataset.type;
            });
        });

        // Tag suggestions
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', (e) => {
                this.addTag(e.target.textContent);
            });
        });

        // Duration presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('recordDuration').value = e.target.dataset.duration;
            });
        });

        // Rating stars
        document.querySelectorAll('.rating').forEach(rating => {
            rating.querySelectorAll('.star').forEach((star, index) => {
                star.addEventListener('click', () => {
                    const field = rating.dataset.field;
                    this.setRating(rating, index + 1);
                    this.recordData[field] = index + 1;
                });
            });
        });

        // Form submission
        document.getElementById('recordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (!this.isSubmitting) {
                this.saveRecord();
            }
        });

        // Filters
        document.getElementById('typeFilter')?.addEventListener('change', () => {
            this.filterRecords();
        });

        document.getElementById('searchInput')?.addEventListener('input', () => {
            this.filterRecords();
        });

        // Tag input handler
        document.getElementById('tagInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                e.preventDefault();
                this.addTag(e.target.value.trim());
                e.target.value = '';
            }
        });
    }

    navigateTo(page) {
        // Update URL hash without triggering hashchange event
        if (window.location.hash !== `#/${page}`) {
            window.location.hash = `#/${page}`;
        }
        this.showPage(page);
    }

    showPage(page) {
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#/${page}`) {
                link.classList.add('active');
            }
        });

        // Update active page - 使用display而不是class
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
        const pageId = page === 'home' ? 'homePage' : `${page}Page`;
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
        }

        this.currentPage = page;

        // Page-specific initialization
        if (page === 'home') {
            // 重新加载首页数据以确保最新状态
            this.loadData();
            this.updateDashboard();
            this.renderRecentRecords();
        } else if (page === 'records') {
            // 渲染学习形式类型过滤器
            this.renderTypeFilter();
            
            // 为records页面加载完整的记录列表（不是仅最近20条）
            // 如果数据最近刚更新过，直接渲染不重新加载
            if (this.lastRecordUpdate && (Date.now() - this.lastRecordUpdate < 5000)) {
                this.renderAllRecords();
            } else {
                this.loadAllRecords().then(() => {
                    this.renderAllRecords();
                });
            }
        } else if (page === 'analytics') {
            this.loadAnalyticsData();
        }
    }

    async showQuickRecord() {
        console.log('🚀 打开快速记录页面');
        
        // 1. 重置所有状态（关键！）
        this.recordData = {};
        this.currentStep = 1;
        
        // 2. 显示模态框
        document.getElementById('quickRecordModal').classList.add('active');
        this.showStep(1);
        
        // 3. 渲染动态学习形式类型
        this.renderQuickRecordFormTypes();
        
        // 4. 初始化已选标签显示（先绑定事件）
        this.renderTags();
        
        // 5. 渲染智能标签建议（异步操作）
        try {
            await this.renderSmartTagSuggestions();
            console.log('✅ 标签建议渲染完成');
        } catch (error) {
            console.error('❌ 标签建议渲染失败:', error);
        }
        
        // 6. 确保标签建议正确显示选中状态
        this.bindTagSuggestionEvents();
        
        console.log('✅ 快速记录页面初始化完成');
    }

    // 渲染智能标签建议
    async renderSmartTagSuggestions() {
        console.log('🏷️ 开始渲染智能标签建议');
        
        try {
            // 默认标签（核心常用标签）
            const defaultTags = ['英语', 'AI', '数学', '编程', '历史'];
            console.log('🏷️ 默认标签:', defaultTags);
            
            // 获取最近使用的标签
            console.log('🏷️ 正在获取最近使用的标签...');
            let recentTags = [];
            
            try {
                recentTags = await window.apiService.getRecentTags() || [];
                console.log('🏷️ 最近标签获取成功:', recentTags);
            } catch (apiError) {
                console.warn('⚠️ 获取最近标签失败，使用空数组:', apiError);
                recentTags = [];
            }
            
            // 智能组合标签逻辑
            let finalTags = [];
            if (recentTags.length < 5) {
                // 情况1: 最近标签少于5个，显示所有最近标签 + 所有默认标签
                finalTags = [...recentTags, ...defaultTags.filter(t => !recentTags.includes(t))];
                console.log('🏷️ 情况1: 最近标签 + 默认标签', finalTags);
            } else if (recentTags.length >= 5 && recentTags.length < 10) {
                // 情况2: 最近标签5-9个，显示所有最近标签 + 补充默认标签至10个
                const remaining = 10 - recentTags.length;
                const unusedDefaults = defaultTags.filter(t => !recentTags.includes(t));
                finalTags = [...recentTags, ...unusedDefaults.slice(0, remaining)];
                console.log('🏷️ 情况2: 补充至10个标签', finalTags);
            } else {
                // 情况3: 最近标签10个或以上，只显示最近的10个标签
                finalTags = recentTags.slice(0, 10);
                console.log('🏷️ 情况3: 最近10个标签', finalTags);
            }
            
            // 渲染标签建议
            this.updateTagSuggestions(finalTags);
            console.log('✅ 智能标签建议渲染完成, 总数:', finalTags.length);
            
        } catch (error) {
            console.error('❌ 渲染智能标签建议失败:', error);
            // 失败时显示默认标签
            const defaultTags = ['英语', 'AI', '数学', '编程', '历史'];
            this.updateTagSuggestions(defaultTags);
            console.log('🔄 使用默认标签作为备用方案:', defaultTags);
        }
    }
    
    // 更新标签建议显示
    updateTagSuggestions(tags) {
        const suggestionsContainer = document.querySelector('.tag-suggestions');
        if (!suggestionsContainer) return;
        
        // 清空现有标签
        suggestionsContainer.innerHTML = '';
        
        // 获取当前已选择的标签
        const selectedTags = this.recordData.tags || [];
        
        // 创建新的标签元素
        tags.forEach(tagName => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-suggestion';
            
            // 如果标签已被选择，添加选中状态
            if (selectedTags.includes(tagName)) {
                tagElement.classList.add('selected');
            }
            
            tagElement.textContent = tagName;
            
            // 直接绑定点击事件
            tagElement.addEventListener('click', () => {
                const currentSelectedTags = this.recordData.tags || [];
                
                // 切换标签选中状态
                if (currentSelectedTags.includes(tagName)) {
                    this.removeTag(tagName);
                } else {
                    this.addTag(tagName);
                }
            });
            
            suggestionsContainer.appendChild(tagElement);
        });
    }
    
    // 更新标签建议的选中状态（不重新创建DOM元素）
    updateTagSuggestionsState() {
        const selectedTags = this.recordData.tags || [];
        const suggestionElements = document.querySelectorAll('.tag-suggestion');
        
        suggestionElements.forEach(element => {
            const tagName = element.textContent;
            if (selectedTags.includes(tagName)) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
    }

    // 渲染快速记录模态框的学习形式类型
    renderQuickRecordFormTypes() {
        const typeGrid = document.querySelector('#quickRecordModal .type-grid');
        if (!typeGrid) return;
        
        // 清空现有按钮
        typeGrid.innerHTML = '';
        
        // 添加现有的学习形式类型
        this.formTypes.forEach(formType => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'type-btn';
            button.dataset.type = formType.type_code;
            button.innerHTML = `${formType.emoji} ${formType.type_name}`;
            
            // 添加点击事件监听器（选中逻辑）
            button.addEventListener('click', (e) => {
                // 移除其他按钮的选中状态
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                // 添加当前按钮的选中状态
                e.target.classList.add('selected');
                // 保存选中的类型
                this.recordData.type = e.target.dataset.type;
                console.log('选中类型:', this.recordData.type);
            });
            
            // 如果不是默认类型，添加删除功能（长按）
            if (!formType.is_default) {
                let longPressTimer;
                button.addEventListener('mousedown', (e) => {
                    longPressTimer = setTimeout(() => {
                        this.showDeleteFormTypeConfirm(formType);
                    }, 1000); // 长按1秒
                });
                button.addEventListener('mouseup', () => {
                    clearTimeout(longPressTimer);
                });
                button.addEventListener('mouseleave', () => {
                    clearTimeout(longPressTimer);
                });
            }
            
            typeGrid.appendChild(button);
        });
        
        // 添加"➕ 添加类型"按钮
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'type-btn add-type-btn';
        addButton.innerHTML = '➕ 添加类型';
        // 注意：添加类型按钮不设置 data-type，避免被选中
        addButton.addEventListener('click', () => {
            this.showCreateFormTypeModal();
        });
        
        typeGrid.appendChild(addButton);
    }

    // 显示创建新学习形式类型的模态框
    showCreateFormTypeModal() {
        this.showCustomTypeModal();
    }

    showCustomTypeModal() {
        // 检查是否已存在弹窗，避免重复创建
        let existingModal = document.querySelector('.custom-type-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'custom-type-modal';
        modal.innerHTML = `
            <div class="custom-type-overlay">
                <div class="custom-type-content">
                    <div class="custom-type-header">
                        <h3>添加学习形式类型</h3>
                    </div>
                    <div class="custom-type-body">
                        <label>请输入新的学习形式类型名称：</label>
                        <input type="text" id="customTypeInput" class="custom-type-input" placeholder="例如：书法、编程、英语等" maxlength="20" />
                    </div>
                    <div class="custom-type-actions">
                        <button class="btn btn-secondary" onclick="app.closeCustomTypeModal()">取消</button>
                        <button class="btn btn-primary" onclick="app.confirmCreateCustomType()">确定</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加动画效果
        setTimeout(() => modal.classList.add('active'), 10);
        
        // 聚焦输入框
        setTimeout(() => {
            const input = document.getElementById('customTypeInput');
            if (input) {
                input.focus();
            }
        }, 100);

        // 支持回车键确认
        const input = document.getElementById('customTypeInput');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.confirmCreateCustomType();
                }
            });
        }
    }

    closeCustomTypeModal() {
        const modal = document.querySelector('.custom-type-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }

    async confirmCreateCustomType() {
        const input = document.getElementById('customTypeInput');
        const typeName = input ? input.value.trim() : '';
        
        if (!typeName) {
            this.showError('请输入类型名称');
            return;
        }

        // 关闭弹窗
        this.closeCustomTypeModal();
        
        // 创建自定义类型
        this.createCustomFormType(typeName);
    }
    
    // 创建自定义学习形式类型
    async createCustomFormType(typeName) {
        try {
            // 生成唯一的type_code（使用时间戳+随机数确保唯一性）
            const typeCode = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            
            const newFormType = await window.apiService.createFormType({
                type_code: typeCode,
                type_name: typeName,
                // emoji will be randomly assigned by backend
                display_order: 999
            });
            
            // 添加到本地formTypes数组
            this.formTypes.push(newFormType);
            
            // 重新渲染快速记录的类型按钮
            this.renderQuickRecordFormTypes();
            
            // 如果详细记录页面打开，也更新
            this.renderDetailRecordFormTypes();
            
            this.showSuccessMessage(`学习形式类型"${typeName}"创建成功！`);
            
        } catch (error) {
            console.error('❌ 创建学习形式类型失败:', error);
            this.showError('创建学习形式类型失败：' + error.message);
        }
    }
    
    // 显示删除学习形式类型确认
    showDeleteFormTypeConfirm(formType) {
        if (confirm(`确定要删除学习形式类型"${formType.type_name}"吗？\n\n注意：只有当该类型没有被任何记录使用时才能删除。`)) {
            this.deleteCustomFormType(formType);
        }
    }
    
    // 删除自定义学习形式类型
    async deleteCustomFormType(formType) {
        try {
            await window.apiService.deleteFormType(formType.type_id);
            
            // 从本地formTypes数组中移除
            this.formTypes = this.formTypes.filter(ft => ft.type_id !== formType.type_id);
            
            // 重新渲染快速记录的类型按钮
            this.renderQuickRecordFormTypes();
            
            // 如果详细记录页面打开，也更新
            this.renderDetailRecordFormTypes();
            
            this.showSuccessMessage(`学习形式类型"${formType.type_name}"删除成功！`);
            
        } catch (error) {
            console.error('❌ 删除学习形式类型失败:', error);
            this.showError('删除学习形式类型失败：' + error.message);
        }
    }
    
    // 渲染详细记录页面的学习形式类型下拉菜单
    renderDetailRecordFormTypes() {
        const select = document.getElementById('recordDetailFormType');
        if (!select) return;
        
        // 清空现有选项
        select.innerHTML = '';
        
        // 添加现有的学习形式类型
        this.formTypes.forEach(formType => {
            const option = document.createElement('option');
            option.value = formType.type_code;
            option.textContent = `${formType.emoji} ${formType.type_name}`;
            select.appendChild(option);
        });
        
        // 添加"+ 新增类型"选项
        const addOption = document.createElement('option');
        addOption.value = '__add_new__';
        addOption.textContent = '+ 新增类型';
        addOption.style.color = '#666';
        select.appendChild(addOption);
        
        // 监听选择事件
        select.addEventListener('change', (e) => {
            if (e.target.value === '__add_new__') {
                this.showCreateFormTypeModal();
                // 重置选择到第一个有效选项
                setTimeout(() => {
                    if (this.formTypes.length > 0) {
                        e.target.value = this.formTypes[0].type_code;
                    }
                }, 100);
            }
        });
    }
    
    // 渲染学习记录页面的学习形式类型过滤器
    renderTypeFilter() {
        const select = document.getElementById('typeFilter');
        if (!select) return;
        
        // 保存当前选择的值
        const currentValue = select.value;
        
        // 清空现有选项
        select.innerHTML = '';
        
        // 添加"所有类型"选项
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = '所有类型';
        select.appendChild(allOption);
        
        // 添加现有的学习形式类型
        this.formTypes.forEach(formType => {
            const option = document.createElement('option');
            option.value = formType.type_code;
            option.textContent = `${formType.emoji} ${formType.type_name}`;
            select.appendChild(option);
        });
        
        // 恢复之前的选择（如果仍然存在）
        if (currentValue) {
            const optionExists = Array.from(select.options).some(option => option.value === currentValue);
            if (optionExists) {
                select.value = currentValue;
            }
        }
    }

    closeQuickRecord() {
        document.getElementById('quickRecordModal').classList.remove('active');
        this.resetForm();
    }
    
    bindTagSuggestionEvents() {
        // 由于现在在 updateTagSuggestions 中直接绑定事件，这里只需要确保选中状态正确
        this.updateTagSuggestionsState();
    }

    switchRecordTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tab === 'form') {
            document.querySelector('.tab-btn[onclick*="form"]').classList.add('active');
            document.getElementById('formRecord').classList.add('active');
        } else {
            document.querySelector('.tab-btn[onclick*="quick"]').classList.add('active');
            document.getElementById('quickNote').classList.add('active');
        }
    }

    showStep(step) {
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
        document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
        
        // Update navigation buttons
        const prevBtn = document.querySelector('.form-nav .btn-secondary');
        const nextBtn = document.querySelector('.form-nav .btn-primary');
        const submitBtn = document.querySelector('.form-nav .btn-success');
        
        prevBtn.style.display = step === 1 ? 'none' : 'block';
        
        if (step === 5) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitBtn.style.display = 'none';
        }
        
        this.currentStep = step;
    }

    nextStep() {
        if (this.currentStep < 5) {
            this.showStep(this.currentStep + 1);
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    addTag(tagName) {
        console.log('➕ 添加标签:', tagName);
        console.log('➕ 添加前的标签:', this.recordData.tags);
        
        if (!this.recordData.tags) {
            this.recordData.tags = [];
            console.log('➕ 初始化标签数组');
        }
        
        if (!this.recordData.tags.includes(tagName)) {
            this.recordData.tags.push(tagName);
            console.log('➕ 标签添加成功, 当前标签:', this.recordData.tags);
            
            this.renderTags();
            // 更新标签建议的选中状态
            this.updateTagSuggestionsState();
        } else {
            console.log('⚠️ 标签已存在，跳过添加');
        }
    }

    renderTags() {
        const container = document.getElementById('selectedTags');
        if (!container) {
            console.warn('⚠️ selectedTags容器不存在');
            return;
        }
        
        const tags = this.recordData.tags || [];
        console.log('🏷️ 渲染已选标签:', tags);
        
        if (tags.length === 0) {
            container.innerHTML = '';
            console.log('🏷️ 没有已选标签，清空容器');
            return;
        }
        
        container.innerHTML = tags.map((tag, index) => `
            <span class="tag">
                ${this.escapeHtml(tag)}
                <span class="tag-remove" data-tag="${this.escapeHtml(tag)}" data-index="${index}" style="margin-left: 6px; cursor: pointer;">×</span>
            </span>
        `).join('');
        
        // 移除旧的事件监听器
        if (this.tagRemoveHandler) {
            container.removeEventListener('click', this.tagRemoveHandler);
        }
        
        // 使用箭头函数保持词法作用域，确保this指向正确
        this.tagRemoveHandler = (e) => {
            console.log('🏷️ 标签区域点击事件:', e.target);
            
            if (e.target.classList.contains('tag-remove')) {
                e.preventDefault();
                e.stopPropagation();
                
                const tagName = e.target.dataset.tag;
                console.log('🏷️ 点击删除标签:', tagName);
                console.log('🏷️ this.recordData:', this.recordData);
                
                if (tagName) {
                    // 确保 recordData 和 tags 数组存在
                    if (!this.recordData) {
                        this.recordData = {};
                        console.log('🗑️ 初始化recordData对象');
                    }
                    if (!this.recordData.tags) {
                        this.recordData.tags = [];
                        console.log('🗑️ 初始化标签数组');
                    }
                    
                    console.log('🗑️ 删除标签:', tagName);
                    console.log('🗑️ 删除前的标签:', this.recordData.tags);
                    
                    // 执行删除
                    const originalLength = this.recordData.tags.length;
                    this.recordData.tags = this.recordData.tags.filter(t => t !== tagName);
                    
                    console.log('🗑️ 删除后的标签:', this.recordData.tags);
                    console.log('🗑️ 删除了', originalLength - this.recordData.tags.length, '个标签');
                    
                    // 重新渲染标签
                    this.renderTags();
                    
                    // 更新标签建议的选中状态
                    this.updateTagSuggestionsState();
                    
                    console.log('✅ 标签删除完成');
                } else {
                    console.error('❌ 标签名称为空', {tagName});
                }
            }
        };
        
        container.addEventListener('click', this.tagRemoveHandler);
        console.log('✅ 标签删除事件绑定完成, 标签数量:', tags.length);
    }
    
    // HTML转义函数
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    removeTag(tagName) {
        console.log('🗑️ 删除标签:', tagName);
        console.log('🗑️ 删除前的标签:', this.recordData.tags);
        
        if (!this.recordData.tags) {
            this.recordData.tags = [];
            console.log('🗑️ 初始化标签数组');
        }
        
        const originalLength = this.recordData.tags.length;
        this.recordData.tags = this.recordData.tags.filter(t => t !== tagName);
        
        console.log('🗑️ 删除后的标签:', this.recordData.tags);
        console.log('🗑️ 删除了', originalLength - this.recordData.tags.length, '个标签');
        
        // 重新渲染标签
        this.renderTags();
        
        // 更新标签建议的选中状态
        this.updateTagSuggestionsState();
    }

    setRating(ratingElement, value) {
        ratingElement.querySelectorAll('.star').forEach((star, index) => {
            if (index < value) {
                star.textContent = '★';
                star.classList.add('active');
            } else {
                star.textContent = '☆';
                star.classList.remove('active');
            }
        });
    }

    async saveRecord() {
        // 防止重复提交
        if (this.isSubmitting) {
            return;
        }
        
        try {
            // 设置提交状态并禁用按钮
            this.isSubmitting = true;
            this.setSubmitButtonState(true);
            
            // Collect form data
            const title = document.getElementById('recordTitle').value;
            const duration = parseInt(document.getElementById('recordDuration').value) || 30;
            const notes = document.getElementById('recordNotes').value || '';
            
            if (!title || !this.recordData.type) {
                console.error('表单验证失败:', { title, type: this.recordData.type, recordData: this.recordData });
                this.showError('请填写完整的记录信息');
                return;
            }
            
            const recordPayload = {
                title: title,
                form_type: this.recordData.type,
                duration_min: duration,
                tags: this.recordData.tags || [],
                body_md: notes
            };
            
            
            // 发送到后端
            const savedRecord = await window.apiService.createRecord(recordPayload);
            
            // 🚀 清除相关缓存（新记录会改变汇总数据）
            await this.clearCacheAfterRecordCreation();
            
            // 重新加载最新数据而不是依赖本地转换
            await this.loadData();
            
            // Update UI based on current page
            this.updateDashboard();
            this.renderRecentRecords();
            this.updateConditionalSections();
            
            // Refresh current page if it's records page
            if (this.currentPage === 'records') {
                this.renderAllRecords();
            }
            
            // Close modal and reset
            this.closeQuickRecord();
            this.showSuccessMessage('学习记录保存成功！');
            
        } catch (error) {
            console.error('❌ 保存记录失败:', error);
            this.showError('保存失败: ' + window.apiService.formatError(error));
        } finally {
            // 重置提交状态并重新启用按钮
            this.isSubmitting = false;
            this.setSubmitButtonState(false);
        }
    }

    async saveQuickNote() {
        const quickText = document.querySelector('.quick-input').value;
        if (!quickText) return;
        
        try {
            // 创建快速记录
            const recordPayload = {
                title: quickText.substring(0, 50),
                form_type: 'other',
                duration_min: 5,
                difficulty: 3,
                focus: 3,
                tags: '随手记',
                notes: quickText
            };
            
            const savedRecord = await window.apiService.createRecord(recordPayload);
            const convertedRecord = this.convertBackendRecord(savedRecord);
            this.records.unshift(convertedRecord);
            
            this.updateDashboard();
            this.renderRecentRecords();
            this.updateConditionalSections();
            
            // Refresh current page if it's records page
            if (this.currentPage === 'records') {
                this.renderAllRecords();
            }
            
            this.closeQuickRecord();
            this.showSuccessMessage('快速记录保存成功！');
            
        } catch (error) {
            console.error('❌ 保存快速记录失败:', error);
            this.showError('保存失败: ' + window.apiService.formatError(error));
        }
    }

    resetForm() {
        document.getElementById('recordForm').reset();
        document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('selected'));
        this.recordData = {};
        this.currentStep = 1;
        // 重置提交状态
        this.isSubmitting = false;
        this.setSubmitButtonState(false);
        // 清空标签显示
        this.renderTags();
        // 重置标签建议的选中状态
        this.updateTagSuggestionsState();
    }

    showSuccessMessage(message = '记录保存成功！') {
        this.showToast(message, 'success');
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        
        const bgColor = type === 'error' ? '#e74c3c' : 'var(--secondary-color)';
        
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            background: ${bgColor};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 2000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), type === 'error' ? 5000 : 3000);
    }
    
    showLoading(show) {
        let loadingElement = document.getElementById('loadingIndicator');
        
        if (show) {
            // 🚀 新增：显示骨架屏而不是遮罩加载
            this.showSkeletonLoading();
        } else {
            // 隐藏骨架屏
            this.hideSkeletonLoading();
            
            // 清理旧的加载指示器（保持兼容）
            if (loadingElement) {
                loadingElement.remove();
            }
        }
    }
    
    // 显示骨架屏加载效果
    showSkeletonLoading() {
        // 为汇总卡片添加骨架效果
        const summaryCards = document.querySelectorAll('.summary-card .metric-value');
        summaryCards.forEach(card => {
            if (!card.classList.contains('skeleton')) {
                card.classList.add('skeleton');
                card.setAttribute('data-original-text', card.textContent);
                card.textContent = '';
            }
        });
        
        // 为最近记录添加骨架效果
        const recentRecordsList = document.getElementById('recentRecordsList');
        if (recentRecordsList && !recentRecordsList.querySelector('.skeleton-record')) {
            recentRecordsList.innerHTML = Array(5).fill(0).map(() => `
                <div class="record-item skeleton-record">
                    <div class="record-icon skeleton"></div>
                    <div class="record-content">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-subtitle"></div>
                    </div>
                </div>
            `).join('');
        }
        
        // 添加骨架样式到文档头部（如果还没有）
        if (!document.getElementById('skeleton-styles')) {
            const skeletonStyles = document.createElement('style');
            skeletonStyles.id = 'skeleton-styles';
            skeletonStyles.textContent = `
                .skeleton {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: skeletonLoading 1.5s infinite;
                    border-radius: 4px;
                }
                
                .skeleton-title {
                    height: 16px;
                    width: 70%;
                    margin-bottom: 8px;
                }
                
                .skeleton-subtitle {
                    height: 12px;
                    width: 50%;
                }
                
                .skeleton-record {
                    padding: 12px;
                    border-bottom: 1px solid #f5f5f5;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .skeleton-record .record-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                }
                
                .skeleton-record .record-content {
                    flex: 1;
                }
                
                @keyframes skeletonLoading {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `;
            document.head.appendChild(skeletonStyles);
        }
    }
    
    // 隐藏骨架屏
    hideSkeletonLoading() {
        // 恢复汇总卡片内容
        const skeletonCards = document.querySelectorAll('.summary-card .metric-value.skeleton');
        skeletonCards.forEach(card => {
            card.classList.remove('skeleton');
            const originalText = card.getAttribute('data-original-text');
            if (originalText) {
                card.textContent = originalText;
                card.removeAttribute('data-original-text');
            }
        });
        
        // 移除骨架记录（真实数据会在renderRecentRecords中填充）
        const skeletonRecords = document.querySelectorAll('.skeleton-record');
        skeletonRecords.forEach(record => record.remove());
    }
    
    // 原有的全屏加载方法（保持兼容性）
    showFullscreenLoading(show) {
        let loadingElement = document.getElementById('loadingIndicator');
        
        if (show) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'loadingIndicator';
                loadingElement.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255,255,255,0.8);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 3000;
                        font-size: 16px;
                        color: var(--text-primary);
                    ">
                        <div style="text-align: center;">
                            <div style="font-size: 24px; margin-bottom: 12px;">🔄</div>
                            <div>正在加载数据...</div>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingElement);
            }
        } else {
            if (loadingElement) {
                loadingElement.remove();
            }
        }
    }
    
    setSubmitButtonState(isSubmitting) {
        const submitBtn = document.querySelector('.record-form button[type="submit"]');
        if (submitBtn) {
            if (isSubmitting) {
                submitBtn.disabled = true;
                submitBtn.textContent = '提交中...';
                submitBtn.style.opacity = '0.6';
                submitBtn.style.cursor = 'not-allowed';
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = '完成记录';
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            }
        }
    }

    updateDashboard() {
        // 🚀 使用预计算的汇总数据，避免前端重复计算
        if (this.weekSummary && this.monthSummary) {
            
            // 更新今日数据 - 使用周数据中的今日统计
            const todayEl = document.getElementById('todayDuration');
            const todayRecordsEl = document.getElementById('todayRecords');
            if (todayEl) todayEl.textContent = this.weekSummary.today?.duration_minutes || 0;
            if (todayRecordsEl) todayRecordsEl.textContent = this.weekSummary.today?.count || 0;
            
            // 更新周数据（最近7天）
            const weekDurationEl = document.getElementById('weekDuration');
            const weekDaysEl = document.getElementById('weekDays');
            if (weekDurationEl) weekDurationEl.textContent = this.weekSummary.total_duration_hours || 0;
            if (weekDaysEl) weekDaysEl.textContent = this.weekSummary.learning_days || 0;
            
            // 更新月数据（最近30天） - 使用正确的月度数据
            const monthDurationEl = document.getElementById('monthDuration');
            const monthStreakEl = document.getElementById('monthStreak');
            if (monthDurationEl) monthDurationEl.textContent = this.monthSummary.total_duration_hours || 0;
            if (monthStreakEl) monthStreakEl.textContent = this.monthSummary.streak_days || 0;
            
            // 更新连续天数徽章 - 使用月度数据的连续天数
            const streakEl = document.getElementById('streakDays');
            if (streakEl) streakEl.textContent = this.monthSummary.streak_days || 0;
            
        } else if (this.dashboardSummary) {
            // 单一汇总数据的回退逻辑
            const summary = this.dashboardSummary;
            
            const todayEl = document.getElementById('todayDuration');
            const todayRecordsEl = document.getElementById('todayRecords');
            const weekDurationEl = document.getElementById('weekDuration');
            const weekDaysEl = document.getElementById('weekDays');
            const monthDurationEl = document.getElementById('monthDuration');
            const monthStreakEl = document.getElementById('monthStreak');
            const streakEl = document.getElementById('streakDays');
            
            if (todayEl) todayEl.textContent = summary.today?.duration_minutes || 0;
            if (todayRecordsEl) todayRecordsEl.textContent = summary.today?.count || 0;
            if (weekDurationEl) weekDurationEl.textContent = summary.total_duration_hours || 0;
            if (weekDaysEl) weekDaysEl.textContent = summary.learning_days || 0;
            if (monthDurationEl) monthDurationEl.textContent = summary.total_duration_hours || 0;
            if (monthStreakEl) monthStreakEl.textContent = summary.streak_days || 0;
            if (streakEl) streakEl.textContent = summary.streak_days || 0;
            
        } else {
            // 回退到原来的计算方式（如果汇总数据不可用）
            this.updateDashboardFallback();
        }
    }
    
    // 回退方案：客户端计算（保持兼容性）
    updateDashboardFallback() {
        const today = new Date();
        const todayString = today.toDateString();
        
        // Today's stats
        const todayRecords = this.records.filter(r => r.date.toDateString() === todayString);
        const todayDuration = todayRecords.reduce((sum, r) => sum + r.duration, 0);
        
        // Week's stats (last 7 days)
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6);
        const weekRecords = this.records.filter(r => r.date >= weekAgo);
        const weekDuration = weekRecords.reduce((sum, r) => sum + r.duration, 0);
        const weekDays = new Set(weekRecords.map(r => r.date.toDateString())).size;
        
        // Month's stats
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthRecords = this.records.filter(r => r.date >= monthStart);
        const monthDuration = monthRecords.reduce((sum, r) => sum + r.duration, 0);
        const monthStreak = this.calculateStreak();
        
        // Update UI
        const todayEl = document.getElementById('todayDuration');
        const todayRecordsEl = document.getElementById('todayRecords');
        const weekDurationEl = document.getElementById('weekDuration');
        const weekDaysEl = document.getElementById('weekDays');
        const monthDurationEl = document.getElementById('monthDuration');
        const monthStreakEl = document.getElementById('monthStreak');
        const streakEl = document.getElementById('streakDays');
        
        if (todayEl) todayEl.textContent = todayDuration;
        if (todayRecordsEl) todayRecordsEl.textContent = todayRecords.length;
        if (weekDurationEl) weekDurationEl.textContent = Math.round(weekDuration / 60 * 10) / 10;
        if (weekDaysEl) weekDaysEl.textContent = weekDays;
        if (monthDurationEl) monthDurationEl.textContent = Math.round(monthDuration / 60 * 10) / 10;
        if (monthStreakEl) monthStreakEl.textContent = monthStreak;
        if (streakEl) streakEl.textContent = monthStreak;
    }

    calculateStreak() {
        // Simple streak calculation for prototype
        const dates = [...new Set(this.records.map(r => r.date.toDateString()))];
        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            if (dates.includes(checkDate.toDateString())) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        
        return streak;
    }
    
    // 记录创建后清除相关缓存
    async clearCacheAfterRecordCreation() {
        try {
            
            // 清除 IndexedDB 缓存
            if (window.cacheService && window.cacheService.isInitialized) {
                await Promise.all([
                    window.cacheService.clearByType('dashboard'),
                    window.cacheService.clearByType('recent-records')
                ]);
            }
            
            // 清除内存缓存
            if (window.apiService) {
                window.apiService.clearCache('summaries');
            }
            
        } catch (error) {
            console.error('❌ 清除缓存失败:', error);
        }
    }

    // Update conditional display sections based on data availability
    updateConditionalSections() {
        const hasRecords = this.records && this.records.length > 0;
        
        // Hide AI summary section if no records
        const aiSummarySection = document.querySelector('.ai-summary');
        if (aiSummarySection) {
            if (hasRecords) {
                aiSummarySection.classList.remove('hidden');
            } else {
                aiSummarySection.classList.add('hidden');
            }
        }
        
        // Hide milestone achievements section if no records
        // Look for the stats-grid-three section containing milestones
        const statsGridThree = document.querySelector('.stats-grid-three');
        if (statsGridThree) {
            const milestoneCard = statsGridThree.children[2]; // Third card is milestones
            if (milestoneCard) {
                if (hasRecords) {
                    milestoneCard.style.display = 'block';
                } else {
                    milestoneCard.style.display = 'none';
                }
            }
        }
        
    }

    renderRecentRecords() {
        const container = document.getElementById('recentRecordsList');
        const recentRecords = this.records.slice(0, 5);
        
        if (recentRecords.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-title">还没有学习记录</div>
                    <div class="empty-state-message">开始你的第一次学习吧！</div>
                    <button class="empty-state-action" onclick="app.showQuickRecord()">
                        <span class="btn-icon">✨</span>
                        创建记录
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recentRecords.map(record => {
            const recordId = record.record_id || record.id;
            return `
                <div class="record-item" onclick="app.viewRecordDetail(${recordId})">
                    <div class="record-type">${record.icon || '📌'}</div>
                    <div class="record-content">
                        <div class="record-title">${record.title || '无标题'}</div>
                        <div class="record-meta">
                            ${record.categories && record.categories.length > 0 && record.categories.filter(Boolean).length > 0
                                ? `<span class="record-tags">${record.categories.filter(Boolean).join(', ')}</span>` 
                                : ''}
                            <span>${record.dateString || '无日期'}</span>
                            <span>${record.time || '无时间'}</span>
                            <span class="record-duration">${record.duration || 0}分钟</span>
                        </div>
                    </div>
                    <div class="record-actions" onclick="event.stopPropagation()">
                        <button class="btn-action btn-detail" onclick="app.viewRecordDetail(${recordId})" title="查看记录详情">
                            📄 详情
                        </button>
                        <button class="btn-action btn-delete" onclick="app.confirmDeleteRecord(${recordId})" title="删除记录">
                            🗑️删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderAllRecords() {
        const container = document.getElementById('recordsList');
        
        if (this.records.length === 0) {
            container.className = 'records-list empty';
            container.innerHTML = `
                <div class="records-empty-state">
                    <div class="records-empty-graphic">📊</div>
                    <div class="records-empty-title">暂无学习记录</div>
                    <div class="records-empty-subtitle">开始记录你的学习历程吧！</div>
                    <button class="empty-state-action" onclick="app.showQuickRecord()">
                        <span class="btn-icon">✨</span>
                        创建第一条记录
                    </button>
                </div>
            `;
            return;
        } else {
            container.className = 'records-list full';
        }
        
        container.innerHTML = this.records.map((record, index) => {
            const recordId = record.record_id || record.id;
            
            return `
                <div class="record-item" onclick="app.viewRecordDetail(${recordId})">
                    <div class="record-type">${record.icon}</div>
                    <div class="record-content">
                        <div class="record-title">${record.title}</div>
                        <div class="record-meta">
                            ${record.categories && record.categories.length > 0 && record.categories.filter(Boolean).length > 0
                                ? `<span class="record-tags">${record.categories.filter(Boolean).join(', ')}</span>` 
                                : ''}
                            <span>${record.dateString || record.date.toLocaleDateString('zh-CN')}</span>
                            <span>${record.time || record.date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span class="record-duration">${record.duration || 0}分钟</span>
                        </div>
                    </div>
                    <div class="record-actions" onclick="event.stopPropagation()">
                        <button class="btn-action btn-detail" onclick="app.viewRecordDetail(${recordId})" title="查看记录详情">
                            📄 详情
                        </button>
                        <button class="btn-action btn-delete" onclick="app.confirmDeleteRecord(${recordId})" title="删除记录">
                            🗑️删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterRecords() {
        const typeFilter = document.getElementById('typeFilter')?.value;
        const searchFilter = document.getElementById('searchInput')?.value.toLowerCase();
        
        let filtered = this.records;
        
        if (typeFilter) {
            filtered = filtered.filter(r => r.type === typeFilter);
        }
        
        if (searchFilter) {
            filtered = filtered.filter(r => 
                r.title.toLowerCase().includes(searchFilter) ||
                (r.categories && r.categories.some(c => c.toLowerCase().includes(searchFilter)))
            );
        }
        
        const container = document.getElementById('recordsList');
        container.innerHTML = filtered.map(record => {
            const recordId = record.record_id || record.id;
            return `
                <div class="record-item" onclick="app.viewRecordDetail(${recordId})">
                    <div class="record-type">${record.icon}</div>
                    <div class="record-content">
                        <div class="record-title">${record.title}</div>
                        <div class="record-meta">
                            ${record.categories && record.categories.length > 0 && record.categories.filter(Boolean).length > 0
                                ? `<span class="record-tags">${record.categories.filter(Boolean).join(', ')}</span>` 
                                : ''}
                            <span>${record.dateString || record.date.toLocaleDateString('zh-CN')}</span>
                            <span>${record.time || record.date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span class="record-duration">${record.duration || 0}分钟</span>
                        </div>
                    </div>
                    <div class="record-actions" onclick="event.stopPropagation()">
                        <button class="btn-action btn-detail" onclick="app.viewRecordDetail(${recordId})" title="查看记录详情">
                            📄 详情
                        </button>
                        <button class="btn-action btn-delete" onclick="app.confirmDeleteRecord(${recordId})" title="删除记录">
                            🗑️删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderAnalytics() {
        // Type statistics (all time)
        const typeStats = {};
        this.records.forEach(r => {
            if (!typeStats[r.type]) {
                typeStats[r.type] = { count: 0, duration: 0 };
            }
            typeStats[r.type].count++;
            typeStats[r.type].duration += r.duration;
        });
        
        const typeStatsContainer = document.getElementById('typeStats');
        typeStatsContainer.innerHTML = Object.entries(typeStats)
            .sort((a, b) => b[1].duration - a[1].duration)
            .slice(0, 5)
            .map(([type, stats]) => `
                <div class="stat-item">
                    <span class="stat-name">${this.getTypeName(type)}</span>
                    <span class="stat-value">${Math.round(stats.duration/60*10)/10}h (${stats.count}次)</span>
                </div>
            `).join('');
        
        // Category analysis (all time top topics)
        const categoryStats = {};
        this.records.forEach(r => {
            if (r.categories) {
                r.categories.forEach(cat => {
                    categoryStats[cat] = (categoryStats[cat] || 0) + r.duration;
                });
            }
        });
        
        const weeklyTopicsContainer = document.getElementById('weeklyTopics');
        weeklyTopicsContainer.innerHTML = Object.entries(categoryStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([topic, duration]) => `
                <div class="stat-item">
                    <span class="stat-name">${topic}</span>
                    <span class="stat-value">${Math.round(duration/60*10)/10}h</span>
                </div>
            `).join('');
        
        // Calculate efficiency metrics
        const totalRecords = this.records.length;
        const avgFocus = totalRecords > 0 
            ? (this.records.reduce((sum, r) => sum + (r.focus || 3), 0) / totalRecords).toFixed(1)
            : '0';
        const avgDifficulty = totalRecords > 0
            ? (this.records.reduce((sum, r) => sum + (r.difficulty || 3), 0) / totalRecords).toFixed(1) 
            : '0';
        
        // Efficiency metrics removed - no longer needed
        
        // Generate insights based on actual data
        const topCategory = Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0];
        const topType = Object.entries(typeStats).sort((a, b) => b[1].duration - a[1].duration)[0];
        const totalHours = Math.round(this.records.reduce((sum, r) => sum + r.duration, 0) / 60 * 10) / 10;
        
        // Calculate actual month over month growth based on historical data
        const currentMonth = new Date().getMonth();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const currentMonthRecords = this.records.filter(r => r.date.getMonth() === currentMonth);
        const lastMonthRecords = this.records.filter(r => r.date.getMonth() === lastMonth);
        const currentMonthHours = currentMonthRecords.reduce((sum, r) => sum + r.duration, 0) / 60;
        const lastMonthHours = lastMonthRecords.reduce((sum, r) => sum + r.duration, 0) / 60;
        const growthRate = lastMonthHours > 0 ? Math.round((currentMonthHours - lastMonthHours) / lastMonthHours * 100) : 0;
        
        document.getElementById('trendInsight').textContent = 
            `本月学习时长累计${totalHours}小时，相比上月增长${growthRate}%，保持良好上升趋势`;
        
        document.getElementById('focusInsight').textContent = 
            `${topCategory ? topCategory[0] : 'AI'}是你的主要学习方向，占总时长的${topCategory ? Math.round((topCategory[1] / this.records.reduce((sum, r) => sum + r.duration, 0)) * 100) : 35}%`;
            
        document.getElementById('strengthInsight').textContent = 
            `${this.getTypeName(topType ? topType[0] : 'video')}投入时间最多，累计${Math.round((topType ? topType[1].duration : 0)/60*10)/10}小时`;
        
        // Generate actionable suggestions
        const suggestions = [
            `建议继续加强${topCategory ? topCategory[0] : 'AI'}领域的实践项目，将理论转化为实际应用`,
            `可以尝试增加${this.getTypeName('project')}类型的学习，提高动手实践能力`,
            `保持当前的学习节奏，考虑在专注度较高的时段安排更有挑战性的内容`,
            `建议定期回顾学习笔记，巩固已掌握的知识点`
        ];
        
        document.getElementById('nextActionText').textContent = 
            suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    getTypeName(type) {
        // First try to find in user's form types
        const formType = this.formTypes.find(ft => ft.type_code === type);
        if (formType) {
            return formType.type_name;
        }
        
        // Fallback to default names for backward compatibility
        const typeNames = {
            video: '视频',
            podcast: '播客',
            book: '书籍',
            course: '课程',
            article: '文章',
            exercise: '题目',
            project: '项目',
            workout: '运动',
            paper: '论文',
            other: '其他'
        };
        return typeNames[type] || type;
    }

    renderMiniCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Update month header
        document.getElementById('miniCalendarMonth').textContent = 
            `${year}年${month + 1}月`;
        
        // Get first day and days in month
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Get records for this month
        const monthRecords = {};
        this.records.forEach(r => {
            if (r.date.getFullYear() === year && r.date.getMonth() === month) {
                const day = r.date.getDate();
                if (!monthRecords[day]) {
                    monthRecords[day] = { count: 0, duration: 0 };
                }
                monthRecords[day].count++;
                monthRecords[day].duration += r.duration;
            }
        });
        
        // Generate calendar grid
        const grid = document.getElementById('miniCalendarGrid');
        let html = '';
        
        // Week headers
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        weekDays.forEach(day => {
            html += `<div class="mini-calendar-day header">${day}</div>`;
        });
        
        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="mini-calendar-day"></div>';
        }
        
        // Days of month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getFullYear() === year && 
                           today.getMonth() === month && 
                           today.getDate() === day;
            const hasRecord = monthRecords[day];
            
            html += `
                <div class="mini-calendar-day ${hasRecord ? 'has-record' : ''} ${isToday ? 'today' : ''}">
                    ${day}
                </div>
            `;
        }
        
        grid.innerHTML = html;
    }

    changeMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        if (this.currentPage === 'analytics') {
            this.renderMiniCalendar();
        }
    }

    switchPeriod(period) {
        this.currentPeriod = period;
        
        // Update tab states
        document.querySelectorAll('.period-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.period === period) {
                tab.classList.add('active');
            }
        });
        
        this.renderChart();
    }

    renderChart() {
        const chartBars = document.getElementById('chartBars');
        const chartLabels = document.getElementById('chartLabels');
        
        let data = [];
        let labels = [];
        let maxValue = 0;
        
        if (this.currentPeriod === 'week') {
            // Last 7 days
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toDateString();
                
                const dayRecords = this.records.filter(r => r.date.toDateString() === dateStr);
                const dayDuration = dayRecords.reduce((sum, r) => sum + r.duration, 0);
                
                data.push(dayDuration);
                labels.push(['周日','周一','周二','周三','周四','周五','周六'][date.getDay()]);
                maxValue = Math.max(maxValue, dayDuration);
            }
        } else if (this.currentPeriod === 'month') {
            // Last 30 days grouped by weeks (show 6 periods)
            const today = new Date();
            const periods = [];
            
            // Create 6 periods of 5 days each for better granularity
            for (let i = 5; i >= 0; i--) {
                const periodEnd = new Date(today);
                periodEnd.setDate(today.getDate() - (i * 5));
                const periodStart = new Date(periodEnd);
                periodStart.setDate(periodEnd.getDate() - 4);
                
                const periodRecords = this.records.filter(r => 
                    r.date >= periodStart && r.date <= periodEnd
                );
                const periodDuration = periodRecords.reduce((sum, r) => sum + r.duration, 0);
                
                data.push(periodDuration);
                
                // Create label like "12/1-12/5"
                const startLabel = `${periodStart.getMonth() + 1}/${periodStart.getDate()}`;
                const endLabel = `${periodEnd.getMonth() + 1}/${periodEnd.getDate()}`;
                labels.push(`${startLabel}`);
                
                maxValue = Math.max(maxValue, periodDuration);
            }
        } else if (this.currentPeriod === 'year') {
            // Last 12 months
            const today = new Date();
            for (let i = 11; i >= 0; i--) {
                const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const nextMonthDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
                
                const monthRecords = this.records.filter(r => {
                    return r.date >= monthDate && r.date <= nextMonthDate;
                });
                const monthDuration = monthRecords.reduce((sum, r) => sum + r.duration, 0);
                
                data.push(monthDuration);
                
                // Show month and year for clarity
                const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
                const monthLabel = monthNames[monthDate.getMonth()];
                labels.push(monthLabel);
                
                maxValue = Math.max(maxValue, monthDuration);
            }
        }
        
        // Ensure minimum height for visualization
        if (maxValue === 0) {
            maxValue = 100; // Set a minimum scale
        }
        
        // Render bars with improved styling
        chartBars.innerHTML = data.map((value, index) => {
            const height = Math.max((value / maxValue * 100), value > 0 ? 8 : 2);
            let displayValue, unit;
            
            if (this.currentPeriod === 'week') {
                displayValue = value;
                unit = '分';
            } else {
                displayValue = Math.round(value / 60 * 10) / 10;
                unit = 'h';
            }
            
            // Different colors for different periods
            let barClass = 'chart-bar';
            if (this.currentPeriod === 'month') barClass += ' month-bar';
            if (this.currentPeriod === 'year') barClass += ' year-bar';
            
            return `
                <div class="${barClass}" style="height: ${height}%" data-value="${displayValue}${unit}">
                    <span class="bar-value">${displayValue}${unit}</span>
                </div>
            `;
        }).join('');
        
        // Render labels with improved spacing
        chartLabels.innerHTML = labels.map((label, index) => {
            const labelClass = this.currentPeriod === 'year' ? 'year-label' : 'default-label';
            return `<span class="${labelClass}">${label}</span>`;
        }).join('');
        
        // Add period info
        this.updateChartInfo(data);
    }
    
    updateChartInfo(data) {
        // 🚫 不再使用图表分组数据计算总时长，因为可能不完整
        // 改为基于完整的 this.records 数据计算正确的时长
        
        let totalDuration = 0;
        let periodLabel = '';
        
        if (this.currentPeriod === 'week') {
            // 最近7天的数据
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekRecords = this.records.filter(r => r.date >= weekAgo);
            totalDuration = weekRecords.reduce((sum, r) => sum + r.duration, 0);
            periodLabel = `本周总计: ${totalDuration}分钟 (${(totalDuration/60).toFixed(1)}小时)`;
        } else if (this.currentPeriod === 'month') {
            // 最近30天的数据  
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            const monthRecords = this.records.filter(r => r.date >= monthAgo);
            totalDuration = monthRecords.reduce((sum, r) => sum + r.duration, 0);
            periodLabel = `30天总计: ${(totalDuration/60).toFixed(1)}小时`;
        } else {
            // 年视图 - 使用所有记录
            totalDuration = this.records.reduce((sum, r) => sum + r.duration, 0);
            periodLabel = `全年总计: ${(totalDuration/60).toFixed(1)}小时`;
        }
        
        // Update the section title with summary info
        const titleElement = document.querySelector('.time-stats-container .section-title');
        if (titleElement) {
            titleElement.innerHTML = `学习时长趋势 <small style="font-size: 13px; color: var(--text-secondary); font-weight: 400;">${periodLabel}</small>`;
        }
    }
    
    async loadAnalyticsData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Load complete records data for analytics (last 90 days to have enough data)
            const analyticsResponse = await window.apiService.getRecords({ 
                limit: 100,  // Maximum allowed by API
                days: 90     // Last 90 days
            });
            
            // Extract records array from response
            const analyticsRecords = analyticsResponse?.records || [];
            
            // Convert to the expected format
            if (analyticsRecords && analyticsRecords.length > 0) {
                this.records = analyticsRecords.map(record => this.convertBackendRecord(record));
            } else {
                this.records = [];
            }
            
            // Now render analytics with complete data
            this.renderAnalytics();
            this.renderMiniCalendar();
            this.renderChart();
            
            
        } catch (error) {
            console.error('❌ Analytics data loading failed:', error);
            // Fallback to existing data if any
            this.renderAnalytics();
            this.renderMiniCalendar();  
            this.renderChart();
        } finally {
            this.showLoading(false);
        }
    }

    // 删除记录相关函数
    confirmDeleteRecord(recordId) {
        
        const record = this.records.find(r => (r.record_id || r.id) == recordId);
        if (!record) {
            this.showError('找不到要删除的记录');
            console.log('❌ 未找到记录，当前记录数组:', this.records);
            return;
        }

        
        // 保存要删除的记录ID到实例变量
        this.pendingDeleteRecordId = recordId;

        // 创建确认弹框
        const confirmModal = document.createElement('div');
        confirmModal.className = 'delete-confirm-modal';
        confirmModal.innerHTML = `
            <div class="delete-confirm-overlay">
                <div class="delete-confirm-content">
                    <div class="delete-confirm-header">
                        <h3>确认删除记录</h3>
                    </div>
                    <div class="delete-confirm-body">
                        <p>确定要删除以下学习记录吗？</p>
                        <div class="record-preview">
                            <div class="record-preview-icon">${record.icon}</div>
                            <div class="record-preview-info">
                                <div class="record-preview-title">${record.title}</div>
                                <div class="record-preview-meta">${record.date.toLocaleDateString('zh-CN')} • ${record.duration}分钟</div>
                            </div>
                        </div>
                        <p class="delete-warning">⚠️ 此操作不可撤销</p>
                    </div>
                    <div class="delete-confirm-actions">
                        <button class="btn btn-secondary" onclick="app.closeDeleteConfirm()">取消</button>
                        <button class="btn-delete-confirm modal-delete-btn" onclick="app.executeDeleteRecord()">确认删除</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        // 添加动画效果
        setTimeout(() => confirmModal.classList.add('active'), 10);
    }

    closeDeleteConfirm() {
        const modal = document.querySelector('.delete-confirm-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }

    // 执行删除记录（由确认弹框调用）
    async executeDeleteRecord() {
        const recordId = this.pendingDeleteRecordId;
        if (!recordId) {
            this.showError('删除操作异常：未找到待删除的记录ID');
            return;
        }

        
        try {
            // 显示加载状态 - 选择弹框中的确认删除按钮
            const deleteBtn = document.querySelector('.modal-delete-btn');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.textContent = '删除中...';
            }

            // 调用后端API删除记录
            try {
                await window.apiService.deleteRecord(recordId);
            } catch (apiError) {
                // 404错误表示记录已经不存在，对于删除操作这是成功的
                if (apiError.message && apiError.message.includes('Record not found')) {
                } else {
                    throw apiError; // 其他错误重新抛出
                }
            }

            // 刷新完整记录列表（确保显示最新数据）
            if (this.currentPage === 'records') {
                await this.loadAllRecords();
                this.renderAllRecords();
            } else {
                // 从本地数组中移除记录（仅用于首页）
                this.records = this.records.filter(r => (r.record_id || r.id) != recordId);
                this.renderRecentRecords();
            }

            // 更新仪表板
            this.updateDashboard();

            // 关闭弹框并显示成功消息
            this.closeDeleteConfirm();
            this.showSuccessMessage('记录删除成功！');

            // 如果当前在详情页，则跳转回记录列表页
            const recordDetailPage = document.getElementById('recordDetailPage');
            if (recordDetailPage && recordDetailPage.style.display === 'block') {
                this.navigateTo('records');
            }

            // 清空待删除记录ID
            this.pendingDeleteRecordId = null;

        } catch (error) {
            console.error('❌ 删除记录失败:', error);
            this.showError('删除失败: ' + window.apiService.formatError(error));
            
            // 恢复按钮状态 - 选择弹框中的确认删除按钮
            const deleteBtn = document.querySelector('.modal-delete-btn');
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = '确认删除';
            }
        }
    }

    // 保持向后兼容的deleteRecord函数
    async deleteRecord(recordId) {
        this.pendingDeleteRecordId = recordId;
        await this.executeDeleteRecord();
    }

    // 查看记录详情函数
    async viewRecordDetail(recordId) {
        try {
            // 显示加载状态
            this.showLoading(true);

            // 从后端获取完整的记录详情
            const recordDetail = await window.apiService.getRecord(recordId);
            
            // 显示记录详情页面
            this.showRecordDetailPage(recordDetail);

        } catch (error) {
            console.error('❌ 获取记录详情失败:', error);
            this.showError('获取记录详情失败: ' + window.apiService.formatError(error));
        } finally {
            this.showLoading(false);
        }
    }

    // 显示记录详情页面
    showRecordDetailPage(recordDetail) {
        // 保存当前记录ID和数据
        this.currentRecordId = recordDetail.record_id;
        this.currentRecordDetail = recordDetail;
        this.isEditMode = false;
        this.isCreatingNew = false; // 这是查看现有记录，不是创建新记录

        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
        
        // 显示记录详情页面
        document.getElementById('recordDetailPage').style.display = 'block';
        
        // 更新导航状态 - 不激活任何导航链接，因为这是详情页
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        
        // 渲染学习形式类型下拉菜单
        this.renderDetailRecordFormTypes();
        
        // 填充数据
        this.populateRecordDetail(recordDetail);
        
    }

    // 收集快速记录表单中的当前数据
    collectQuickRecordData() {
        // 收集标题
        const titleInput = document.getElementById('recordTitle');
        const title = titleInput ? titleInput.value.trim() : '';
        
        // 收集时长
        const durationInput = document.getElementById('recordDuration');
        const duration = durationInput ? parseInt(durationInput.value) || 0 : 0;
        
        // 收集学习笔记
        const notesInput = document.getElementById('recordNotes');
        const notes = notesInput ? notesInput.value.trim() : '';
        
        // 收集标签输入框的值
        const tagInput = document.getElementById('tagInput');
        const currentTagInput = tagInput ? tagInput.value.trim() : '';
        
        return {
            title,
            form_type: this.recordData.type || 'article',
            duration_min: duration,
            body_md: notes,
            tags: [...(this.recordData.tags || [])], // 复制已有标签
            currentTagInput // 当前正在输入但未添加的标签
        };
    }

    // 创建新的详细记录
    createNewDetailedRecord() {
        // 收集快速记录表单中已填写的数据
        const quickRecordData = this.collectQuickRecordData();
        
        // 关闭快速记录弹窗
        this.closeQuickRecord();
        
        // 创建记录数据结构，使用快速记录中的数据作为初始值
        const newRecordTemplate = {
            record_id: null,
            title: quickRecordData.title,
            form_type: quickRecordData.form_type,
            occurred_at: new Date().toISOString(),
            duration_min: quickRecordData.duration_min || '',
            difficulty: quickRecordData.difficulty,
            focus: quickRecordData.focus,
            energy: quickRecordData.energy,
            mood: quickRecordData.mood,
            body_md: '',
            tags: quickRecordData.tags.map(tagName => ({ tag_name: tagName })), // 转换为详细记录的标签格式
            resource: null,
            user_resource: null,
            assets: []
        };
        
        // 如果有未添加的标签输入，自动添加到标签列表
        if (quickRecordData.currentTagInput) {
            newRecordTemplate.tags.push({ tag_name: quickRecordData.currentTagInput });
        }
        
        // 调试日志
        console.log('从快速记录传递到详细记录的数据:', quickRecordData);
        console.log('详细记录模板数据:', newRecordTemplate);
        
        // 设置创建模式
        this.isCreatingNew = true;
        this.currentRecordId = null;
        this.currentRecordDetail = newRecordTemplate;
        this.isEditMode = true; // 新记录直接进入编辑模式

        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
        
        // 显示记录详情页面
        document.getElementById('recordDetailPage').style.display = 'block';
        
        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        
        // 渲染学习形式类型下拉菜单
        this.renderDetailRecordFormTypes();
        
        // 填充空数据并设置为编辑模式
        this.populateRecordDetail(newRecordTemplate);
        this.setEditMode(true);
        
        // 更新页面标题和按钮文本
        document.getElementById('recordDetailTitle').textContent = '创建新记录';
        
        // 更新面包屑导航
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <span class="breadcrumb-link" onclick="app.showPage('home')">首页</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-current">创建记录</span>
            `;
        }
        
        // 更新保存按钮文本
        const saveBtn = document.getElementById('saveDetailBtn');
        if (saveBtn) {
            saveBtn.textContent = '创建记录';
        }
        
        // 隐藏删除按钮（新记录不能删除）
        const deleteBtn = document.getElementById('deleteRecordBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
        
        // 聚焦到标题字段
        setTimeout(() => {
            const titleField = document.getElementById('recordDetailTitleField');
            if (titleField) {
                titleField.focus();
            }
        }, 100);
    }

    // 辅助方法：获取学习形式的显示文本
    getFormTypeDisplayText(formType) {
        const formTypeMap = {
            'video': '📹 视频',
            'podcast': '🎙️ 播客', 
            'book': '📚 书籍',
            'course': '🎓 课程',
            'article': '📄 文章',
            'exercise': '✏️ 题目',
            'project': '💻 项目',
            'workout': '🏃 运动',
            'other': '📌 其他'
        };
        return formTypeMap[formType] || formType;
    }
    
    // 辅助方法：获取资源类型的显示文本
    getResourceTypeDisplayText(resourceType) {
        const resourceTypeMap = {
            'video': '视频',
            'podcast': '播客',
            'book': '书籍', 
            'course': '课程',
            'article': '文章',
            'paper': '论文',
            'exercise': '练习',
            'project': '项目',
            'workout': '运动',
            'other': '其他'
        };
        return resourceTypeMap[resourceType] || resourceType;
    }
    
    // 辅助方法：格式化时间显示
    formatDateTimeDisplay(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `${year}年${month}月${day}日 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // 辅助方法：格式化时长显示
    formatDurationDisplay(minutes) {
        if (!minutes || minutes === 0) return '0分钟';
        if (minutes < 60) return `${minutes}分钟`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) return `${hours}小时`;
        return `${hours}小时${remainingMinutes}分钟`;
    }
    
    // 填充记录详情数据
    populateRecordDetail(data) {
        // 页面标题
        document.getElementById('recordDetailTitle').textContent = `记录详情 - ${data.title}`;
        
        // 基础信息 - 编辑字段
        document.getElementById('recordDetailTitleField').value = data.title || '';
        document.getElementById('recordDetailFormType').value = data.form_type || '';
        
        // 基础信息 - 预览显示
        document.querySelector('#recordDetailTitlePreview .preview-value').textContent = data.title || '未命名记录';
        document.querySelector('#recordDetailFormTypePreview .preview-value').textContent = this.getFormTypeDisplayText(data.form_type);
        
        // 时间信息 - 编辑字段
        if (data.occurred_at) {
            const date = new Date(data.occurred_at);
            // 获取本地时间的年月日时分，不进行时区转换
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
            document.getElementById('recordDetailOccurredAt').value = formattedDate;
        }
        
        // 时间信息 - 预览显示
        document.querySelector('#recordDetailOccurredAtPreview .preview-value').textContent = 
            this.formatDateTimeDisplay(data.occurred_at);
        
        // 时长信息 - 编辑字段
        document.getElementById('recordDetailDuration').value = data.duration_min || '';
        
        // 时长信息 - 预览显示
        document.querySelector('#recordDetailDurationPreview .preview-value').textContent = 
            this.formatDurationDisplay(data.duration_min);
        
        // 学习体验评分
        this.setRatingDisplay('recordDetailDifficulty', data.difficulty || 0);
        this.setRatingDisplay('recordDetailFocus', data.focus || 0);
        this.setRatingDisplay('recordDetailEnergy', data.energy || 0);
        
        // 心情和笔记
        document.getElementById('recordDetailMood').value = data.mood || '';
        document.getElementById('recordDetailBodyMd').value = data.body_md || '';
        
        // 更新 Markdown 预览
        this.updateMarkdownPreview(data.body_md || '');
        
        // 资源信息 - 在创建新记录或已有资源时显示
        if (data.resource || this.isCreatingNew) {
            document.getElementById('resourceSection').style.display = 'block';
            
            // 资源信息 - 编辑字段
            document.getElementById('resourceDetailTitle').value = data.resource?.title || '';
            document.getElementById('resourceDetailType').value = data.resource?.type || '';
            document.getElementById('resourceDetailAuthor').value = data.resource?.author || '';
            document.getElementById('resourceDetailUrl').value = data.resource?.url || '';
            document.getElementById('resourceDetailPlatform').value = data.resource?.platform || '';
            document.getElementById('resourceDetailIsbn').value = data.resource?.isbn || '';
            document.getElementById('resourceDetailDescription').value = data.resource?.description || '';
            
            // 资源信息 - 预览显示
            document.querySelector('#resourceDetailTitlePreview .preview-value').textContent = 
                data.resource?.title || '';
            document.querySelector('#resourceDetailTypePreview .preview-value').textContent = 
                this.getResourceTypeDisplayText(data.resource?.type);
            document.querySelector('#resourceDetailAuthorPreview .preview-value').textContent = 
                data.resource?.author || '';
            document.querySelector('#resourceDetailPlatformPreview .preview-value').textContent = 
                data.resource?.platform || '';
            document.querySelector('#resourceDetailIsbnPreview .preview-value').textContent = 
                data.resource?.isbn || '';
                
            // 资源链接特殊处理
            const resourceUrl = data.resource?.url || '';
            const urlPreview = document.querySelector('#resourceDetailUrlPreview .preview-link');
            if (resourceUrl) {
                urlPreview.href = resourceUrl;
                urlPreview.textContent = resourceUrl;
                urlPreview.style.display = 'inline';
            } else {
                urlPreview.style.display = 'none';
            }
        } else {
            document.getElementById('resourceSection').style.display = 'none';
        }
        
        // 用户资源关系 - 在创建新记录或已有用户资源时显示
        if (data.user_resource || this.isCreatingNew) {
            document.getElementById('userResourceSection').style.display = 'block';
            document.getElementById('userResourceStatus').value = data.user_resource?.status || '';
            this.setRatingDisplay('userResourceRating', data.user_resource?.rating || 0);
            document.getElementById('userResourceReview').value = data.user_resource?.review_short || '';
            document.getElementById('userResourceFavorite').checked = data.user_resource?.is_favorite || false;
            document.getElementById('userResourceTotalDuration').textContent = 
                `${data.user_resource?.total_duration_min || 0} 分钟`;
        } else {
            document.getElementById('userResourceSection').style.display = 'none';
        }
        
        // 标签信息
        this.displayTags(data.tags || []);
        
        // 附件资源
        if (data.assets && data.assets.length > 0) {
            document.getElementById('assetsSection').style.display = 'block';
            this.displayAssets(data.assets);
        } else {
            document.getElementById('assetsSection').style.display = 'none';
        }
        
        // 重置为查看模式
        // 注意：setEditMode会自动调用hideEmptyResourceFields，不需要重复调用
        this.setEditMode(false);
        
        // 确保删除按钮的初始状态是正确的
        const deleteBtn = document.getElementById('deleteRecordBtn');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = '删除记录';
        }
    }

    // 设置星级评分显示
    setRatingDisplay(elementId, rating) {
        const ratingElement = document.getElementById(elementId);
        const stars = ratingElement.querySelectorAll('.star');
        
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('filled');
                star.textContent = '★';
            } else {
                star.classList.remove('filled');
                star.textContent = '☆';
            }
        });
    }
    
    // 显示所有详情页面部分（用于编辑模式）
    showAllDetailSections() {
        const sections = [
            'experienceSection', // 学习体验部分
            'resourceSection',   // 关联资源部分
            'userResourceSection' // 用户资源关系部分
        ];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
            }
        });
    }
    
    // 更新详情页面各部分的显示状态（仅在预览模式下生效）
    updateDetailSectionsVisibility(data) {
        // 只在预览模式下执行隐藏逻辑
        if (this.isEditMode) {
            return;
        }
        
        // 检查学习体验部分是否为空
        const hasExperienceData = 
            (data.difficulty && data.difficulty > 0) ||
            (data.focus && data.focus > 0) ||
            (data.energy && data.energy > 0) ||
            (data.mood && data.mood.trim() !== '');
            
        const experienceSection = document.getElementById('experienceSection');
        if (experienceSection) {
            experienceSection.style.display = hasExperienceData ? 'block' : 'none';
        }
        
        // 检查关联资源是否为虚拟资源（标题与记录相同、类型相同，且其余字段都为空）
        const isVirtualResource = !!(data.resource &&
            data.resource.title === data.title &&
            data.resource.type === data.form_type &&
            (!data.resource.author || data.resource.author.trim() === '') &&
            (!data.resource.url || data.resource.url.trim() === '') &&
            (!data.resource.platform || data.resource.platform.trim() === '') &&
            (!data.resource.isbn || data.resource.isbn.trim() === '') &&
            (!data.resource.description || data.resource.description.trim() === ''));

        const resourceSection = document.getElementById('resourceSection');
        if (resourceSection) {
            // 无资源对象：预览整体隐藏
            if (!data.resource) {
                resourceSection.style.display = 'none';
            } else {
                // 预览模式：虚拟资源则整体隐藏；否则显示整段，由 hideEmptyResourceFields 逐项隐藏空值
                resourceSection.style.display = isVirtualResource ? 'none' : 'block';
            }
        }
        
        // 检查个人资源关系是否有实际内容
        // 从数据对象检查
        const hasUserResourceDataContent = data.user_resource && (
            (data.user_resource.status && data.user_resource.status !== 'wishlist') || // 状态不是"待学习"
            (data.user_resource.rating && data.user_resource.rating > 0) || // 评分大于0
            (data.user_resource.review_short && data.user_resource.review_short.trim() !== '') || // 有评价内容
            data.user_resource.is_favorite === true || // 已收藏
            (data.user_resource.total_duration_min && data.user_resource.total_duration_min > 0) // 学习时长大于0
        );
        
        // 从表单字段检查（适用于编辑状态）
        const userResourceStatusField = document.getElementById('userResourceStatus');
        const userResourceReviewField = document.getElementById('userResourceReview');
        const userResourceFavoriteField = document.getElementById('userResourceFavorite');
        
        const hasUserResourceFormContent = 
            (userResourceStatusField && userResourceStatusField.value && userResourceStatusField.value !== 'wishlist') ||
            (userResourceReviewField && userResourceReviewField.value.trim() !== '') ||
            (userResourceFavoriteField && userResourceFavoriteField.checked) ||
            (this.getRatingValue && this.getRatingValue('userResourceRating') > 0);
            
        const hasUserResourceContent = hasUserResourceDataContent || hasUserResourceFormContent;
        
        // 个人资源关系部分：只要有实际的个人资源内容就显示，不考虑是否为虚拟资源
        const userResourceSection = document.getElementById('userResourceSection');
        if (userResourceSection) {
            userResourceSection.style.display = hasUserResourceContent ? 'block' : 'none';
        }
    }


    // 显示标签
    displayTags(tags) {
        const tagsContainer = document.getElementById('recordDetailTags');
        if (tags.length === 0) {
            tagsContainer.innerHTML = '<span class="no-tags">暂无标签</span>';
            return;
        }
        
        tagsContainer.innerHTML = tags.map(tag => `
            <div class="tag-item">
                <span>${tag.tag_name}</span>
                <span class="tag-remove" onclick="app.removeTag('${tag.tag_id}')" style="display: ${this.isEditMode ? 'inline' : 'none'};">×</span>
            </div>
        `).join('');
    }

    // 显示附件资源
    displayAssets(assets) {
        const assetsContainer = document.getElementById('recordDetailAssets');
        
        if (!Array.isArray(assets)) {
            try {
                assets = JSON.parse(assets);
            } catch (e) {
                // Assets not in JSON format, treating as empty array
                assets = [];
            }
        }
        
        if (assets.length === 0) {
            assetsContainer.innerHTML = '<span class="no-assets">暂无附件</span>';
            return;
        }
        
        assetsContainer.innerHTML = assets.map(asset => {
            const icon = asset.type === 'image' ? '🖼️' : 
                        asset.type === 'audio' ? '🎵' : '📄';
            return `
                <div class="asset-item">
                    <div class="asset-icon">${icon}</div>
                    <div class="asset-info">
                        <div class="asset-name">${asset.url.split('/').pop() || 'Unnamed file'}</div>
                        <div class="asset-type">${asset.type}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 切换编辑模式
    toggleEditMode() {
        this.setEditMode(!this.isEditMode);
    }

    // 设置编辑模式
    setEditMode(isEdit) {
        this.isEditMode = isEdit;
        
        // 如果当前记录数据包含扁平格式的资源字段，转换为嵌套格式
        if (this.currentRecordDetail && (this.currentRecordDetail.resource_title || this.currentRecordDetail.resource_author)) {
            // 从扁平格式迁移到嵌套格式
            if (!this.currentRecordDetail.resource) {
                this.currentRecordDetail.resource = {
                    title: this.currentRecordDetail.resource_title || '',
                    type: this.currentRecordDetail.resource_type || '',
                    author: this.currentRecordDetail.resource_author || '',
                    url: this.currentRecordDetail.resource_url || '',
                    platform: this.currentRecordDetail.resource_platform || '',
                    isbn: this.currentRecordDetail.resource_isbn || '',
                    description: this.currentRecordDetail.resource_description || ''
                };
            }
            // 清理扁平格式字段
            delete this.currentRecordDetail.resource_title;
            delete this.currentRecordDetail.resource_type;
            delete this.currentRecordDetail.resource_author;
            delete this.currentRecordDetail.resource_url;
            delete this.currentRecordDetail.resource_platform;
            delete this.currentRecordDetail.resource_isbn;
            delete this.currentRecordDetail.resource_description;
        }
        
        // 显示/隐藏编辑按钮（编辑模式时隐藏编辑按钮）
        const editBtn = document.getElementById('editModeBtn');
        editBtn.style.display = isEdit ? 'none' : 'inline-block';
        
        // 更新表单字段的可编辑状态
        const readonlyFields = [
            'recordDetailTitleField', 'recordDetailOccurredAt', 'recordDetailDuration',
            'recordDetailMood', 'recordDetailBodyMd',
            'resourceDetailTitle', 'resourceDetailAuthor', 'resourceDetailUrl',
            'resourceDetailPlatform', 'resourceDetailIsbn', 'resourceDetailDescription',
            'userResourceReview'
        ];
        
        const disabledFields = [
            'recordDetailFormType', 'resourceDetailType', 'userResourceStatus'
        ];
        
        readonlyFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.readOnly = !isEdit;
        });
        
        disabledFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.disabled = !isEdit;
        });
        
        // 更新复选框
        const favoriteField = document.getElementById('userResourceFavorite');
        if (favoriteField) favoriteField.disabled = !isEdit;
        
        // 更新评分显示
        const ratingDisplays = ['recordDetailDifficulty', 'recordDetailFocus', 
                               'recordDetailEnergy', 'userResourceRating'];
        ratingDisplays.forEach(ratingId => {
            const ratingElement = document.getElementById(ratingId);
            if (ratingElement) {
                if (isEdit) {
                    ratingElement.classList.add('interactive');
                    this.setupRatingInteraction(ratingId);
                } else {
                    ratingElement.classList.remove('interactive');
                }
            }
        });
        
        // 显示/隐藏标签编辑器
        const tagEditor = document.getElementById('tagEditor');
        if (tagEditor) {
            tagEditor.style.display = isEdit ? 'block' : 'none';
            
            // 如果进入编辑模式，加载推荐标签并设置输入框监听
            if (isEdit) {
                this.loadDetailTagSuggestions();
                this.setupSmartTagButton();
            }
        }
        
        // 切换 Markdown 预览和编辑模式
        this.toggleMarkdownEditMode(isEdit);
        
        // 显示/隐藏标签删除按钮
        document.querySelectorAll('.tag-remove').forEach(btn => {
            btn.style.display = isEdit ? 'inline' : 'none';
        });
        
        // 显示/隐藏编辑相关按钮
        document.getElementById('cancelEditBtn').style.display = isEdit ? 'inline-block' : 'none';
        document.getElementById('saveDetailBtn').style.display = isEdit ? 'inline-block' : 'none';
        
        // 切换预览/编辑元素的显示
        this.togglePreviewEditElements(isEdit);
        
        // 如果进入编辑模式，显示所有部分
        if (isEdit) {
            this.showAllDetailSections();
            // 恢复所有资源字段的显示
            this.showAllResourceFields();
        } else {
            // 如果退出编辑模式，重新应用条件显示逻辑
            this.updateDetailSectionsVisibility(this.currentRecordDetail);
            // 使用setTimeout确保DOM更新完成后再隐藏空字段
            setTimeout(() => {
                this.hideEmptyResourceFields();
            }, 0);
        }
    }

    // 切换预览/编辑元素的显示
    togglePreviewEditElements(isEdit) {
        // 基础信息字段的预览/编辑切换
        const basicFields = [
            'recordDetailTitleField',
            'recordDetailFormType', 
            'recordDetailOccurredAt',
            'recordDetailDuration'
        ];
        
        const basicPreviews = [
            'recordDetailTitlePreview',
            'recordDetailFormTypePreview',
            'recordDetailOccurredAtPreview', 
            'recordDetailDurationPreview'
        ];
        
        // 资源信息字段的预览/编辑切换
        const resourceFields = [
            'resourceDetailTitle',
            'resourceDetailType',
            'resourceDetailAuthor',
            'resourceDetailUrl',
            'resourceDetailPlatform',
            'resourceDetailIsbn'
        ];
        
        const resourcePreviews = [
            'resourceDetailTitlePreview',
            'resourceDetailTypePreview',
            'resourceDetailAuthorPreview',
            'resourceDetailUrlPreview',
            'resourceDetailPlatformPreview',
            'resourceDetailIsbnPreview'
        ];
        
        // 切换基础信息的显示
        basicFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.style.display = isEdit ? 'block' : 'none';
            }
        });
        
        basicPreviews.forEach(previewId => {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.style.display = isEdit ? 'none' : 'block';
            }
        });
        
        // 切换资源信息的显示
        resourceFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.style.display = isEdit ? 'block' : 'none';
            }
        });
        
        resourcePreviews.forEach(previewId => {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.style.display = isEdit ? 'none' : 'block';
            }
        });
    }

    // 隐藏空的关联资源字段（仅在预览模式下）
    hideEmptyResourceFields() {
        // 只在预览模式下执行
        if (this.isEditMode) return;
        
        const resourceFieldMappings = [
            { preview: 'resourceDetailTitlePreview', field: null }, // 资源标题总是显示
            { preview: 'resourceDetailTypePreview', field: null },  // 资源类型总是显示
            { preview: 'resourceDetailAuthorPreview', field: 'resourceDetailAuthor' },
            { preview: 'resourceDetailUrlPreview', field: 'resourceDetailUrl' },
            { preview: 'resourceDetailPlatformPreview', field: 'resourceDetailPlatform' },
            { preview: 'resourceDetailIsbnPreview', field: 'resourceDetailIsbn' }
        ];
        
        resourceFieldMappings.forEach(mapping => {
            if (!mapping.field) return; // 跳过总是显示的字段
            
            const previewElement = document.getElementById(mapping.preview);
            const fieldContainer = previewElement?.closest('.detail-field');
            
            if (fieldContainer) {
                // 检查预览内容是否为空
                let isEmpty = false;
                
                if (mapping.preview === 'resourceDetailUrlPreview') {
                    // URL 字段特殊处理
                    const linkElement = previewElement.querySelector('.preview-link');
                    isEmpty = !linkElement || !linkElement.href || linkElement.href === '' || linkElement.style.display === 'none';
                } else {
                    // 普通文本字段 - 检查实际内容
                    const valueElement = previewElement.querySelector('.preview-value');
                    if (valueElement) {
                        const content = valueElement.textContent.trim();
                        // 只有当内容真正为空时才隐藏
                        isEmpty = !content || content === '' || content === '未填写';
                    } else {
                        isEmpty = true;
                    }
                }
                
                // 隐藏或显示字段容器
                fieldContainer.style.display = isEmpty ? 'none' : 'block';
            }
        });
    }

    // 显示所有资源字段（在编辑模式下恢复所有字段显示）
    showAllResourceFields() {
        const resourceFieldMappings = [
            'resourceDetailAuthorPreview',
            'resourceDetailUrlPreview',
            'resourceDetailPlatformPreview',
            'resourceDetailIsbnPreview'
        ];
        
        resourceFieldMappings.forEach(previewId => {
            const previewElement = document.getElementById(previewId);
            const fieldContainer = previewElement?.closest('.detail-field');
            
            if (fieldContainer) {
                fieldContainer.style.display = 'block';
            }
        });
    }

    // 设置评分交互
    setupRatingInteraction(ratingId) {
        const ratingElement = document.getElementById(ratingId);
        const stars = ratingElement.querySelectorAll('.star');
        
        stars.forEach((star, index) => {
            star.onclick = () => {
                const rating = index + 1;
                this.setRatingDisplay(ratingId, rating);
            };
        });
    }

    // 取消编辑
    cancelEdit() {
        // 重新填充原始数据
        this.populateRecordDetail(this.currentRecordDetail);
    }

    // 保存记录详情
    async saveRecordDetail() {
        try {
            // 显示保存状态
            const saveBtn = document.getElementById('saveDetailBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = this.isCreatingNew ? '创建中...' : '保存中...';

            // 收集表单数据
            const formData = this.collectRecordDetailData();
            console.log('发送到后端的数据:', formData);
            
            let result;
            
            if (this.isCreatingNew) {
                // 创建新记录
                result = await window.apiService.createRecord(formData);
                
                // 更新本地状态
                this.currentRecordId = result.record_id;
                this.currentRecordDetail = result;
                this.isCreatingNew = false;
                
                // 添加到本地记录列表的开头
                const convertedRecord = this.convertBackendRecord(result);
                this.records.unshift(convertedRecord);
                
                // 显示成功消息
                this.showSuccessMessage('记录创建成功！正在跳转到学习记录列表...');
                
                // 清除缓存（新记录会影响统计数据）
                await this.clearCacheAfterRecordCreation();
                
                // 延迟跳转到学习记录列表
                setTimeout(() => {
                    this.showPage('records');
                }, 1500); // 1.5秒后跳转，让用户看到成功消息
                
                // 用最新数据重新填充并切回预览（确保预览区内容立即更新）
                this.populateRecordDetail(result);
                // 确保按钮文案复原
                saveBtn.textContent = '保存修改';
                
                // 显示删除按钮
                const deleteBtn = document.getElementById('deleteRecordBtn');
                if (deleteBtn) {
                    deleteBtn.style.display = 'inline-block';
                }
                
                // 更新面包屑导航
                const breadcrumb = document.querySelector('.breadcrumb');
                if (breadcrumb) {
                    breadcrumb.innerHTML = `
                        <span class="breadcrumb-link" onclick="app.showPage('records')">学习记录</span>
                        <span class="breadcrumb-separator">›</span>
                        <span class="breadcrumb-current">记录详情</span>
                    `;
                }
                
            } else {
                // 更新现有记录
                result = await window.apiService.updateRecord(this.currentRecordId, formData);
                
                // 保存当前的标签数据（防止丢失）
                const currentTags = this.currentRecordDetail.tags;
                console.log('🏷️ 保存前的本地标签:', currentTags);
                console.log('🏷️ 后端返回的数据:', result);
                console.log('🏷️ 后端返回的标签:', result.tags);
                
                // 更新本地数据 - result 应该是嵌套格式的完整记录详情
                this.currentRecordDetail = result;
                
                // 如果后端返回的标签为空，但本地有标签数据，则保留本地标签
                if ((!result.tags || result.tags.length === 0) && currentTags && currentTags.length > 0) {
                    console.log('🏷️ 后端标签为空，保留本地标签');
                    this.currentRecordDetail.tags = currentTags;
                } else {
                    console.log('🏷️ 使用后端返回的标签数据');
                }
                
                // 同时更新记录列表中的对应记录
                const recordIndex = this.records.findIndex(r => (r.record_id || r.id) == this.currentRecordId);
                if (recordIndex !== -1) {
                    // 重新转换更新后的记录数据以确保格式一致
                    const updatedRecordWithTags = { ...result };
                    if ((!result.tags || result.tags.length === 0) && 
                        this.currentRecordDetail.tags && this.currentRecordDetail.tags.length > 0) {
                        updatedRecordWithTags.tags = this.currentRecordDetail.tags.map(tag => tag.tag_name || tag);
                    }
                    
                    // 合并当前记录的基础数据和更新的数据
                    const fullUpdatedRecord = {
                        ...this.records[recordIndex], // 保持现有的转换后数据
                        ...updatedRecordWithTags,
                        record_id: this.currentRecordId
                    };
                    const updatedRecordForList = this.convertBackendRecord(fullUpdatedRecord);
                    this.records[recordIndex] = updatedRecordForList;
                    
                    // 标记记录数据已更新
                    this.lastRecordUpdate = Date.now();
                    
                    // 如果在记录页面，立即重新渲染列表
                    if (this.currentPage === 'records') {
                        this.renderAllRecords();
                    }
                }
                
                // 显示成功消息
                this.showSuccessMessage('记录更新成功！');
                
                // 用最新数据刷新预览（避免必须强制刷新）
                this.populateRecordDetail(this.currentRecordDetail);
            }
            
            // 刷新汇总数据（更新统计信息）
            Promise.allSettled([
                window.apiService.getDashboardSummary(7),
                window.apiService.getDashboardSummary(30)
            ]).then(([weekResult, monthResult]) => {
                this.weekSummary = weekResult.status === 'fulfilled' ? weekResult.value : null;
                this.monthSummary = monthResult.status === 'fulfilled' ? monthResult.value : null;
                this.dashboardSummary = this.weekSummary || this.monthSummary;
                this.updateDashboard();
            });

        } catch (error) {
            console.error('❌ 保存记录详情失败:', error);
            this.showError('保存失败: ' + window.apiService.formatError(error));
        } finally {
            // 恢复按钮状态
            const saveBtn = document.getElementById('saveDetailBtn');
            saveBtn.disabled = false;
            saveBtn.textContent = this.isCreatingNew ? '创建记录' : '保存修改';
        }
    }

    // 收集记录详情数据
    collectRecordDetailData() {
        // 处理时间格式 - 将datetime-local格式转换为ISO格式
        const occurredAtValue = document.getElementById('recordDetailOccurredAt').value;
        let occurredAtISO = null;
        if (occurredAtValue) {
            // datetime-local返回的格式是 "YYYY-MM-DDTHH:MM"
            // 我们需要将它转换为完整的ISO格式
            const localDate = new Date(occurredAtValue);
            occurredAtISO = localDate.toISOString();
        }
        
        // 获取评分值并确保它们是有效的整数或null
        const difficulty = this.getRatingValue('recordDetailDifficulty');
        const focus = this.getRatingValue('recordDetailFocus');
        const energy = this.getRatingValue('recordDetailEnergy');
        
        const data = {
            // 记录基本信息
            title: document.getElementById('recordDetailTitleField').value.trim() || '未命名记录',
            form_type: document.getElementById('recordDetailFormType').value,
            occurred_at: occurredAtISO,
            duration_min: parseInt(document.getElementById('recordDetailDuration').value) || 0,
            difficulty: difficulty > 0 ? difficulty : null,
            focus: focus > 0 ? focus : null,
            energy: energy > 0 ? energy : null,
            mood: document.getElementById('recordDetailMood').value.trim() || null,
            body_md: document.getElementById('recordDetailBodyMd').value.trim() || null
        };
        
        // 资源信息（如果存在资源部分）
        const resourceSection = document.getElementById('resourceSection');
        if (resourceSection && resourceSection.style.display !== 'none') {
            const resourceTitle = document.getElementById('resourceDetailTitle').value.trim();
            const resourceType = document.getElementById('resourceDetailType').value;
            
            // 对于新创建的记录，只有当标题或类型不为空时才发送资源数据
            // 对于编辑现有记录，总是发送资源数据以支持清空操作
            if (resourceTitle || resourceType || !this.isCreatingNew) {
                data.resource_title = resourceTitle || null;
                data.resource_type = resourceType || null;
                data.resource_author = document.getElementById('resourceDetailAuthor').value.trim() || null;
                data.resource_url = document.getElementById('resourceDetailUrl').value.trim() || null;
                data.resource_platform = document.getElementById('resourceDetailPlatform').value.trim() || null;
                // 特别处理ISBN - 空字符串转换为null以避免唯一约束冲突
                data.resource_isbn = document.getElementById('resourceDetailIsbn').value.trim() || null;
                data.resource_description = document.getElementById('resourceDetailDescription').value.trim() || null;
            }
        }
        
        // 个人资源关系信息（如果存在用户资源关系部分）
        const userResourceSection = document.getElementById('userResourceSection');
        if (userResourceSection && userResourceSection.style.display !== 'none') {
            const userResourceStatus = document.getElementById('userResourceStatus').value.trim();
            const userResourceRating = this.getRatingValue('userResourceRating');
            const userResourceReview = document.getElementById('userResourceReview').value.trim();
            const userResourceFavorite = document.getElementById('userResourceFavorite').checked;
            
            // 只有当有任何非默认值时才发送用户资源数据
            if (userResourceStatus || userResourceRating || userResourceReview || userResourceFavorite) {
                data.user_resource_status = userResourceStatus || 'wishlist';
                data.user_resource_rating = userResourceRating;
                data.user_resource_review_short = userResourceReview || null;
                data.user_resource_is_favorite = userResourceFavorite;
            }
        }

        // 标签信息（确保转换为后端期望的对象数组格式）
        if (this.currentRecordDetail && this.currentRecordDetail.tags && this.currentRecordDetail.tags.length > 0) {
            data.tags = this.currentRecordDetail.tags.map(tag => {
                let tagName;
                if (typeof tag === 'string') {
                    tagName = tag;
                } else if (tag && tag.tag_name) {
                    tagName = tag.tag_name;
                } else if (tag && tag.name) {
                    tagName = tag.name;
                } else {
                    tagName = String(tag);
                }
                
                // 返回后端期望的对象格式
                return {
                    tag_name: tagName,
                    tag_type: 'category'
                };
            }).filter(tag => tag.tag_name); // 过滤掉空值
            
            console.log('🏷️ 处理后的标签对象数组:', data.tags);
        } else {
            console.log('🏷️ 没有标签数据或标签数组为空');
            data.tags = [];
        }
        
        console.log('收集的数据:', data);
        console.log('🏷️ 标签详情:', data.tags);
        console.log('🏷️ 当前记录详情的标签:', this.currentRecordDetail?.tags);
        
        // 添加临时的debug函数到window对象
        window.debugRecordData = () => {
            console.log('=== 调试记录数据 ===');
            console.log('收集的数据:', JSON.stringify(data, null, 2));
            return data;
        };
        
        return data;
    }

    // 获取评分值
    getRatingValue(elementId) {
        const ratingElement = document.getElementById(elementId);
        const filledStars = ratingElement.querySelectorAll('.star.filled');
        const rating = filledStars.length;
        // 返回null而不是0，因为数据库约束要求评分值在1-5之间或为null
        return rating > 0 ? rating : null;
    }

    // 标签管理功能 - 智能添加/提交按钮
    addTagToRecord() {
        const tagInput = document.getElementById('newTagInput');
        const tagName = tagInput.value.trim();
        
        // 如果输入框为空，则作为保存记录按钮
        if (!tagName) {
            console.log('🏷️ 输入框为空，执行保存记录操作');
            this.saveRecordDetail();
            return;
        }
        
        // 检查是否已存在相同标签
        const existingTags = this.currentRecordDetail.tags || [];
        if (existingTags.some(tag => tag.tag_name === tagName)) {
            this.showError('标签已存在');
            return;
        }
        
        // 创建新标签对象（临时ID）
        const newTag = {
            tag_id: `temp_${Date.now()}`,
            tag_name: tagName,
            tag_type: 'category',
            created_by: null, // 将在保存时处理
            is_new: true
        };
        
        // 添加到当前数据
        this.currentRecordDetail.tags = this.currentRecordDetail.tags || [];
        this.currentRecordDetail.tags.push(newTag);
        
        // 更新显示
        this.displayTags(this.currentRecordDetail.tags);
        
        // 更新推荐标签的选中状态
        if (this.isEditMode) {
            this.updateDetailTagSuggestionsState();
        }
        
        // 清空输入框
        tagInput.value = '';
        
    }

    removeTag(tagId) {
        if (!this.currentRecordDetail.tags) return;
        
        // 从数据中移除标签
        this.currentRecordDetail.tags = this.currentRecordDetail.tags.filter(tag => tag.tag_id != tagId);
        
        // 更新显示
        this.displayTags(this.currentRecordDetail.tags);
        
        // 如果在编辑模式，更新推荐标签的选中状态
        if (this.isEditMode) {
            this.updateDetailTagSuggestionsState();
        }
        
    }
    
    // 设置智能标签按钮
    setupSmartTagButton() {
        const tagInput = document.getElementById('newTagInput');
        const addTagBtn = document.getElementById('addTagBtn');
        
        if (!tagInput || !addTagBtn) return;
        
        // 输入框变化时更新按钮文本和样式
        const updateButtonText = () => {
            const hasText = tagInput.value.trim().length > 0;
            if (hasText) {
                addTagBtn.textContent = '添加标签';
                addTagBtn.title = '添加此标签到记录';
                addTagBtn.className = 'btn-small btn-primary';
            } else {
                addTagBtn.textContent = '保存记录';
                addTagBtn.title = '保存整个记录';
                addTagBtn.className = 'btn-small btn-success';
            }
        };
        
        // 监听输入变化
        tagInput.addEventListener('input', updateButtonText);
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTagToRecord();
            }
        });
        
        // 初始化按钮文本
        updateButtonText();
    }
    
    // 为详情页加载推荐标签
    async loadDetailTagSuggestions() {
        try {
            const suggestionsContainer = document.getElementById('tagSuggestionsDetail');
            if (!suggestionsContainer) return;
            
            // 使用与快速记录相同的智能标签组合逻辑
            const defaultTags = ['英语', 'AI', '数学', '编程', '历史'];
            const recentTags = await window.apiService.getRecentTags() || [];
            
            // 智能组合标签逻辑（与快速记录保持一致）
            let finalTags = [];
            if (recentTags.length < 5) {
                finalTags = [...recentTags, ...defaultTags.filter(t => !recentTags.includes(t))];
            } else if (recentTags.length >= 5 && recentTags.length < 10) {
                const remaining = 10 - recentTags.length;
                const unusedDefaults = defaultTags.filter(t => !recentTags.includes(t));
                finalTags = [...recentTags, ...unusedDefaults.slice(0, remaining)];
            } else {
                finalTags = recentTags.slice(0, 10);
            }
            
            if (finalTags && finalTags.length > 0) {
                suggestionsContainer.innerHTML = `
                    <div class="section-label">推荐标签（点击添加）</div>
                    <div class="tag-suggestions">
                        ${finalTags.map(tag => 
                            `<span class="tag-suggestion" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`
                        ).join('')}
                    </div>
                `;
                
                // 绑定点击事件
                this.bindDetailTagSuggestionEvents();
                
                // 更新选中状态
                this.updateDetailTagSuggestionsState();
                
            } else {
                suggestionsContainer.innerHTML = `
                    <div class="section-label">暂无推荐标签</div>
                `;
            }
            
        } catch (error) {
            console.error('❌ 加载详情页推荐标签失败:', error);
            // 失败时显示默认标签
            const suggestionsContainer = document.getElementById('tagSuggestionsDetail');
            if (suggestionsContainer) {
                suggestionsContainer.innerHTML = `
                    <div class="section-label">推荐标签（点击添加）</div>
                    <div class="tag-suggestions">
                        ${['英语', 'AI', '数学', '编程', '历史'].map(tag => 
                            `<span class="tag-suggestion" data-tag="${tag}">${tag}</span>`
                        ).join('')}
                    </div>
                `;
                this.bindDetailTagSuggestionEvents();
                this.updateDetailTagSuggestionsState();
            }
        }
    }
    
    // 绑定详情页标签建议的点击事件
    bindDetailTagSuggestionEvents() {
        const suggestionElements = document.querySelectorAll('#tagSuggestionsDetail .tag-suggestion');
        suggestionElements.forEach(element => {
            element.addEventListener('click', (event) => {
                // 阻止事件冒泡，避免触发其他点击事件
                event.preventDefault();
                event.stopPropagation();
                
                const tagName = element.dataset.tag;
                console.log('🏷️ 点击推荐标签:', tagName);
                
                if (!tagName) {
                    console.error('❌ 标签名称为空:', element);
                    this.showError('标签数据错误');
                    return;
                }
                
                const currentTags = this.currentRecordDetail.tags || [];
                
                // 检查是否已存在相同标签
                if (currentTags.some(tag => tag.tag_name === tagName || tag === tagName)) {
                    this.showError('标签已存在');
                    return;
                }
                
                // 创建新标签对象并添加
                const newTag = {
                    tag_id: `temp_${Date.now()}`,
                    tag_name: tagName,
                    tag_type: 'category',
                    created_by: null,
                    is_new: true
                };
                
                this.currentRecordDetail.tags = this.currentRecordDetail.tags || [];
                this.currentRecordDetail.tags.push(newTag);
                
                console.log('🏷️ 添加标签成功:', newTag);
                console.log('🏷️ 当前所有标签:', this.currentRecordDetail.tags);
                
                // 更新显示
                this.displayTags(this.currentRecordDetail.tags);
                
                // 更新推荐标签的选中状态
                this.updateDetailTagSuggestionsState();
            });
        });
    }
    
    // 更新详情页推荐标签的选中状态
    updateDetailTagSuggestionsState() {
        const currentTags = this.currentRecordDetail.tags || [];
        const suggestionElements = document.querySelectorAll('#tagSuggestionsDetail .tag-suggestion');
        
        suggestionElements.forEach(element => {
            const tagName = element.dataset.tag;
            const isSelected = currentTags.some(tag => 
                (tag.tag_name && tag.tag_name === tagName) || 
                (typeof tag === 'string' && tag === tagName)
            );
            
            if (isSelected) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
    }

    // Markdown 预览功能
    updateMarkdownPreview(content) {
        const previewElement = document.getElementById('recordDetailBodyMdPreview');
        if (!previewElement) return;
        
        if (!content || content.trim() === '') {
            previewElement.innerHTML = '<div class="markdown-preview-empty">暂无笔记内容</div>';
        } else {
            try {
                // 使用 marked 库渲染 Markdown
                previewElement.innerHTML = marked.parse(content);
            } catch (error) {
                console.error('Markdown 渲染失败:', error);
                previewElement.innerHTML = `<div class="markdown-preview-empty">Markdown 渲染失败</div>`;
            }
        }
    }

    // 切换 Markdown 编辑/预览模式
    toggleMarkdownEditMode(isEdit) {
        const textarea = document.getElementById('recordDetailBodyMd');
        const preview = document.getElementById('recordDetailBodyMdPreview');
        
        if (!textarea || !preview) return;
        
        if (isEdit) {
            // 编辑模式：显示 textarea，隐藏预览
            textarea.style.display = 'block';
            preview.style.display = 'none';
        } else {
            // 预览模式：隐藏 textarea，显示预览
            textarea.style.display = 'none';
            preview.style.display = 'block';
            
            // 更新预览内容
            this.updateMarkdownPreview(textarea.value);
        }
    }

    // 🚀 缓存工具方法
    getFromCache(key) {
        try {
            const cached = localStorage.getItem(`app_cache_${key}`);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            const now = Date.now();
            
            if (now > data.expiry) {
                localStorage.removeItem(`app_cache_${key}`);
                return null;
            }
            
            return data.value;
        } catch (e) {
            console.warn('缓存读取失败:', e);
            return null;
        }
    }
    
    setToCache(key, value, ttlMs = 5 * 60 * 1000) {
        try {
            const data = {
                value: value,
                expiry: Date.now() + ttlMs
            };
            localStorage.setItem(`app_cache_${key}`, JSON.stringify(data));
        } catch (e) {
            console.warn('缓存写入失败:', e);
        }
    }
    
    clearCache(keyPattern = null) {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('app_cache_')) {
                    if (!keyPattern || key.includes(keyPattern)) {
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (e) {
            console.warn('缓存清理失败:', e);
        }
    }

    // 🚀 数据处理方法
    processInitData(initData) {
        // 提取仪表盘数据
        this.weekSummary = initData.dashboard?.week || null;
        this.monthSummary = initData.dashboard?.month || null;
        this.dashboardSummary = this.weekSummary || this.monthSummary;
        
        // 提取最近记录并转换格式（保持兼容性）
        const recentRecordsData = initData.recent_records || {};
        this.records = recentRecordsData.records ? 
            recentRecordsData.records.map(record => this.convertBackendRecord(record)) : [];
        
        // 设置表单类型数据（避免单独API调用）
        if (initData.form_types) {
            this.formTypes = initData.form_types;
        }
        
        // 🚀 设置用户信息，避免额外的 /profiles/current 调用
        if (initData.user_profile) {
            this.userProfile = initData.user_profile;
            // 更新用户显示信息，传入profile数据避免重复API调用
            if (window.updateUserDisplay && typeof window.updateUserDisplay === 'function') {
                window.updateUserDisplay(window.authService?.getCurrentUser(), initData.user_profile);
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LearningBuddyApp();
});