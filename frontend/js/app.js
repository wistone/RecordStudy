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
        this.init();
    }

    async init() {
        // 🚫 暂时禁用缓存服务初始化
        // if (window.cacheService) {
        //     await window.cacheService.init();
        // }
        
        await this.loadData();
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

    // Load data from backend API - 优化版本
    async loadData() {
        try {
            this.showLoading(true);
            
            // 🚀 使用新的汇总API，大幅减少数据传输和处理时间
            console.log('📡 正在加载首页汇总数据...');
            
            // 并行加载不同时间段的汇总数据，使用独立错误处理避免一个失败导致全部失败
            const [weekResult, monthResult, recentResult] = await Promise.allSettled([
                window.apiService.getDashboardSummary(7),  // 最近7天汇总(本周)
                window.apiService.getDashboardSummary(30), // 最近30天汇总(本月)
                window.apiService.getRecords({ limit: 20, skip: 0 })  // 最近20条记录（使用完整API获取标签）
            ]);
            
            // 安全地提取数据，处理部分失败的情况
            this.weekSummary = weekResult.status === 'fulfilled' ? weekResult.value : null;
            this.monthSummary = monthResult.status === 'fulfilled' ? monthResult.value : null;
            this.dashboardSummary = this.weekSummary || this.monthSummary; // 保持兼容性
            
            console.log('📊 汇总数据加载结果:', {
                week: weekResult.status,
                month: monthResult.status,
                recent: recentResult.status
            });
            
            // 转换最近记录格式（保持兼容性）
            const recentRecordsData = recentResult.status === 'fulfilled' ? recentResult.value : null;
            this.records = recentRecordsData?.records ? 
                recentRecordsData.records.map(record => this.convertBackendRecord(record)) : [];
            
            console.log('✅ 已加载汇总数据和', this.records.length, '条最近记录');
            
        } catch (error) {
            console.error('❌ 加载数据失败:', error);
            this.showError('加载数据失败，请检查网络连接和后端服务');
            this.records = [];
            this.dashboardSummary = null;
        } finally {
            this.showLoading(false);
        }
    }
    
    // Load all records for the records page (not just 20 recent)
    async loadAllRecords() {
        try {
            this.showLoading(true);
            
            console.log('📡 正在加载完整记录列表...');
            
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
            
            console.log('✅ 已加载完整记录列表:', this.records.length, '条记录');
            
        } catch (error) {
            console.error('❌ 加载记录列表失败:', error);
            this.showError('加载记录列表失败，请检查网络连接和后端服务');
            this.records = [];
        } finally {
            this.showLoading(false);
        }
    }
    
    // 转换最近记录格式（轻量版）
    convertRecentRecord(backendRecord) {
        const typeIcons = {
            video: '📹', podcast: '🎙️', book: '📚', course: '🎓',
            article: '📄', exercise: '✏️', project: '💻', workout: '🏃', 
            paper: '📑', other: '📌'
        };
        
        const recordDate = new Date(backendRecord.occurred_at);
        
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
            type: backendRecord.form_type || backendRecord.type, // 使用form_type作为主要类型字段
            icon: typeIcons[backendRecord.form_type || backendRecord.type] || '📌',
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
        const typeIcons = {
            video: '📹',
            podcast: '🎙️',
            book: '📚',
            course: '🎓',
            article: '📄',
            exercise: '✏️',
            project: '💻',
            workout: '🏃',
            paper: '📑',
            other: '📌'
        };
        
        const recordDate = new Date(backendRecord.occurred_at);
        
        // 处理标签数据 - 统一处理各种可能的标签字段
        let categories = [];
        console.log('🔍 convertBackendRecord 处理标签:', {
            tags: backendRecord.tags,
            tag_names: backendRecord.tag_names,
            categories: backendRecord.categories
        });
        
        if (backendRecord.tags && Array.isArray(backendRecord.tags)) {
            categories = backendRecord.tags.map(tag => tag.tag_name || tag.name || tag).filter(Boolean);
        } else if (backendRecord.tag_names && Array.isArray(backendRecord.tag_names)) {
            categories = backendRecord.tag_names.filter(Boolean);
        } else if (typeof backendRecord.tags === 'string' && backendRecord.tags.trim()) {
            categories = backendRecord.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        } else if (backendRecord.categories && Array.isArray(backendRecord.categories)) {
            categories = backendRecord.categories.filter(Boolean);
        }
        
        console.log('🏷️ 转换后的标签:', categories);

        return {
            id: backendRecord.record_id,
            record_id: backendRecord.record_id,  // 保留原始ID用于API调用
            type: backendRecord.form_type,
            icon: typeIcons[backendRecord.form_type] || '📌',
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
            // 为records页面加载完整的记录列表（不是仅最近20条）
            // 如果数据最近刚更新过，直接渲染不重新加载
            if (this.lastRecordUpdate && (Date.now() - this.lastRecordUpdate < 5000)) {
                console.log('🔄 使用最近更新的记录数据，无需重新加载');
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

    showQuickRecord() {
        document.getElementById('quickRecordModal').classList.add('active');
        this.currentStep = 1;
        this.showStep(1);
        
        // 重新绑定标签建议事件（确保模态框显示后绑定）
        setTimeout(() => {
            this.bindTagSuggestionEvents();
        }, 100);
    }

    closeQuickRecord() {
        document.getElementById('quickRecordModal').classList.remove('active');
        this.resetForm();
    }
    
    bindTagSuggestionEvents() {
        // 重新绑定标签建议点击事件
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            // 移除之前的事件监听器（如果有）
            tag.replaceWith(tag.cloneNode(true));
        });
        
        // 重新绑定事件
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', (e) => {
                console.log('点击标签建议:', e.target.textContent);
                this.addTag(e.target.textContent);
            });
        });
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
        if (!this.recordData.tags) {
            this.recordData.tags = [];
        }
        if (!this.recordData.tags.includes(tagName)) {
            this.recordData.tags.push(tagName);
            this.renderTags();
        }
    }

    renderTags() {
        const container = document.getElementById('selectedTags');
        if (!container) return;
        
        const tags = this.recordData.tags || [];
        container.innerHTML = tags.map(tag => `
            <span class="tag">
                ${tag}
                <span class="tag-remove" onclick="app.removeTag('${tag}')">×</span>
            </span>
        `).join('');
    }

    removeTag(tagName) {
        if (!this.recordData.tags) {
            this.recordData.tags = [];
        }
        this.recordData.tags = this.recordData.tags.filter(t => t !== tagName);
        this.renderTags();
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
            const mood = document.getElementById('recordMood').value || '';
            
            if (!title || !this.recordData.type) {
                this.showError('请填写完整的记录信息');
                return;
            }
            
            const recordPayload = {
                title: title,
                form_type: this.recordData.type,
                duration_min: duration,
                difficulty: this.recordData.difficulty || 3,
                focus: this.recordData.focus || 3,
                tags: this.recordData.tags || [],
                mood: mood
            };
            
            console.log('💾 保存记录:', recordPayload);
            
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
            console.log('📊 使用预计算汇总数据更新仪表盘');
            
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
            
            console.log('✅ 仪表盘数据更新完成', {
                week: this.weekSummary, 
                month: this.monthSummary
            });
            
        } else if (this.dashboardSummary) {
            // 单一汇总数据的回退逻辑
            console.log('📊 使用单一汇总数据更新仪表盘');
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
            console.log('⚠️ 汇总数据不可用，回退到客户端计算');
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
            console.log('🗑️ 清除缓存（新记录已创建）');
            
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
            
            console.log('✅ 缓存清除完成');
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
        
        console.log(`📊 Conditional sections updated. Has records: ${hasRecords}`);
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
        const typeNames = {
            video: '视频',
            podcast: '播客',
            book: '书籍',
            course: '课程',
            article: '文章',
            exercise: '题目',
            project: '项目',
            workout: '运动',
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
        
        console.log(`📊 ${this.currentPeriod} 视图计算:`, {
            recordCount: this.records.length,
            totalDuration: `${totalDuration}分钟`,
            hours: `${(totalDuration/60).toFixed(1)}小时`
        });
        
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
            
            console.log(`📊 Analytics loaded with ${this.records.length} records`);
            
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
        console.log('🗑️ 确认删除记录 ID:', recordId);
        
        const record = this.records.find(r => (r.record_id || r.id) == recordId);
        if (!record) {
            this.showError('找不到要删除的记录');
            console.log('❌ 未找到记录，当前记录数组:', this.records);
            return;
        }

        console.log('✅ 找到要删除的记录:', record);
        
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

        console.log('🗑️ 执行删除记录 ID:', recordId);
        
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
                console.log('✅ 删除API调用成功');
            } catch (apiError) {
                // 404错误表示记录已经不存在，对于删除操作这是成功的
                if (apiError.message && apiError.message.includes('Record not found')) {
                    console.log('✅ 记录已不存在，删除操作视为成功');
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
                console.log('📄 当前在详情页，删除成功后自动返回记录列表');
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

        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
        
        // 显示记录详情页面
        document.getElementById('recordDetailPage').style.display = 'block';
        
        // 更新导航状态 - 不激活任何导航链接，因为这是详情页
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        
        // 填充数据
        this.populateRecordDetail(recordDetail);
        
        console.log('📄 显示记录详情:', recordDetail);
    }

    // 填充记录详情数据
    populateRecordDetail(data) {
        // 页面标题
        document.getElementById('recordDetailTitle').textContent = `记录详情 - ${data.title}`;
        
        // 基础信息
        document.getElementById('recordDetailTitleField').value = data.title || '';
        document.getElementById('recordDetailFormType').value = data.form_type || '';
        
        // 格式化时间为datetime-local格式
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
        
        // 时长信息
        document.getElementById('recordDetailDuration').value = data.duration_min || '';
        
        // 学习体验评分
        this.setRatingDisplay('recordDetailDifficulty', data.difficulty || 0);
        this.setRatingDisplay('recordDetailFocus', data.focus || 0);
        this.setRatingDisplay('recordDetailEnergy', data.energy || 0);
        
        // 心情和笔记
        document.getElementById('recordDetailMood').value = data.mood || '';
        document.getElementById('recordDetailBodyMd').value = data.body_md || '';
        
        // 资源信息
        if (data.resource) {
            document.getElementById('resourceSection').style.display = 'block';
            document.getElementById('resourceDetailTitle').value = data.resource.title || '';
            document.getElementById('resourceDetailType').value = data.resource.type || '';
            document.getElementById('resourceDetailAuthor').value = data.resource.author || '';
            document.getElementById('resourceDetailUrl').value = data.resource.url || '';
            document.getElementById('resourceDetailPlatform').value = data.resource.platform || '';
            document.getElementById('resourceDetailIsbn').value = data.resource.isbn || '';
            document.getElementById('resourceDetailDescription').value = data.resource.description || '';
            
        } else {
            document.getElementById('resourceSection').style.display = 'none';
        }
        
        // 用户资源关系
        if (data.user_resource) {
            document.getElementById('userResourceSection').style.display = 'block';
            document.getElementById('userResourceStatus').value = data.user_resource.status || '';
            this.setRatingDisplay('userResourceRating', data.user_resource.rating || 0);
            document.getElementById('userResourceReview').value = data.user_resource.review_short || '';
            document.getElementById('userResourceFavorite').checked = data.user_resource.is_favorite || false;
            document.getElementById('userResourceTotalDuration').textContent = 
                `${data.user_resource.total_duration_min || 0} 分钟`;
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
                console.log('Assets not in JSON format, treating as empty array');
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
        if (tagEditor) tagEditor.style.display = isEdit ? 'flex' : 'none';
        
        // 显示/隐藏标签删除按钮
        document.querySelectorAll('.tag-remove').forEach(btn => {
            btn.style.display = isEdit ? 'inline' : 'none';
        });
        
        // 显示/隐藏编辑相关按钮
        document.getElementById('cancelEditBtn').style.display = isEdit ? 'inline-block' : 'none';
        document.getElementById('saveDetailBtn').style.display = isEdit ? 'inline-block' : 'none';
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
            saveBtn.textContent = '保存中...';

            // 收集表单数据
            const updateData = this.collectRecordDetailData();
            
            // 调用API更新记录
            const updatedRecord = await window.apiService.updateRecord(this.currentRecordId, updateData);
            console.log('🔍 API返回的完整更新数据:', updatedRecord);
            
            // 更新本地数据
            this.currentRecordDetail = { ...this.currentRecordDetail, ...updatedRecord };
            
            // 同时更新记录列表中的对应记录
            const recordIndex = this.records.findIndex(r => (r.record_id || r.id) == this.currentRecordId);
            if (recordIndex !== -1) {
                // 重新转换更新后的记录数据以确保格式一致
                // 如果后端返回的标签为空，但我们知道刚添加了标签，使用当前详情数据中的标签
                const updatedRecordWithTags = { ...updatedRecord };
                if ((!updatedRecord.tags || updatedRecord.tags.length === 0) && 
                    this.currentRecordDetail.tags && this.currentRecordDetail.tags.length > 0) {
                    console.log('🔧 后端返回空标签，使用本地标签数据');
                    updatedRecordWithTags.tags = this.currentRecordDetail.tags.map(tag => tag.tag_name || tag);
                }
                
                // 合并当前记录的基础数据和更新的数据
                const fullUpdatedRecord = {
                    ...this.records[recordIndex], // 保持现有的转换后数据
                    ...updatedRecordWithTags,
                    record_id: this.currentRecordId
                };
                console.log('🔄 更新记录数据:', { fullUpdatedRecord, original: this.records[recordIndex] });
                const updatedRecordForList = this.convertBackendRecord(fullUpdatedRecord);
                console.log('✅ 转换后的记录数据:', updatedRecordForList);
                this.records[recordIndex] = updatedRecordForList;
                
                // 标记记录数据已更新
                this.lastRecordUpdate = Date.now();
                
                // 如果在记录页面，立即重新渲染列表
                if (this.currentPage === 'records') {
                    this.renderAllRecords();
                }
            }
            
            // 仅刷新汇总数据，不重新加载记录列表（避免覆盖已更新的本地数据）
            Promise.allSettled([
                window.apiService.getDashboardSummary(7),
                window.apiService.getDashboardSummary(30)
            ]).then(([weekResult, monthResult]) => {
                this.weekSummary = weekResult.status === 'fulfilled' ? weekResult.value : null;
                this.monthSummary = monthResult.status === 'fulfilled' ? monthResult.value : null;
                this.dashboardSummary = this.weekSummary || this.monthSummary;
                this.updateDashboard();
            });
            
            // 退出编辑模式
            this.setEditMode(false);
            
            this.showSuccessMessage('记录更新成功！');

        } catch (error) {
            console.error('❌ 保存记录详情失败:', error);
            this.showError('保存失败: ' + window.apiService.formatError(error));
        } finally {
            // 恢复按钮状态
            const saveBtn = document.getElementById('saveDetailBtn');
            saveBtn.disabled = false;
            saveBtn.textContent = '保存修改';
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
        
        const data = {
            // 记录基本信息
            title: document.getElementById('recordDetailTitleField').value,
            form_type: document.getElementById('recordDetailFormType').value,
            occurred_at: occurredAtISO,
            duration_min: parseInt(document.getElementById('recordDetailDuration').value) || null,
            difficulty: this.getRatingValue('recordDetailDifficulty'),
            focus: this.getRatingValue('recordDetailFocus'),
            energy: this.getRatingValue('recordDetailEnergy'),
            mood: document.getElementById('recordDetailMood').value,
            body_md: document.getElementById('recordDetailBodyMd').value
        };
        
        // 资源信息（如果存在资源部分）
        const resourceSection = document.getElementById('resourceSection');
        if (resourceSection && resourceSection.style.display !== 'none') {
            data.resource_title = document.getElementById('resourceDetailTitle').value || null;
            data.resource_type = document.getElementById('resourceDetailType').value || null;
            data.resource_author = document.getElementById('resourceDetailAuthor').value || null;
            data.resource_url = document.getElementById('resourceDetailUrl').value || null;
            data.resource_platform = document.getElementById('resourceDetailPlatform').value || null;
            // 特别处理ISBN - 空字符串转换为null以避免唯一约束冲突
            data.resource_isbn = document.getElementById('resourceDetailIsbn').value.trim() || null;
            data.resource_description = document.getElementById('resourceDetailDescription').value || null;
        }
        
        // 标签信息
        if (this.currentRecordDetail && this.currentRecordDetail.tags) {
            data.tags = this.currentRecordDetail.tags;
        }
        
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

    // 标签管理功能
    addTagToRecord() {
        const tagInput = document.getElementById('newTagInput');
        const tagName = tagInput.value.trim();
        
        if (!tagName) {
            this.showError('请输入标签名称');
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
        
        // 清空输入框
        tagInput.value = '';
        
        console.log('📝 添加标签:', newTag);
    }

    removeTag(tagId) {
        if (!this.currentRecordDetail.tags) return;
        
        // 从数据中移除标签
        this.currentRecordDetail.tags = this.currentRecordDetail.tags.filter(tag => tag.tag_id != tagId);
        
        // 更新显示
        this.displayTags(this.currentRecordDetail.tags);
        
        console.log('🗑️ 删除标签:', tagId);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LearningBuddyApp();
});