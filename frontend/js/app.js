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
                window.apiService.getRecentRecords(20)     // 最近20条记录
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
                recentRecordsData.records.map(record => this.convertRecentRecord(record)) : [];
            
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
    
    // 转换最近记录格式（轻量版）
    convertRecentRecord(backendRecord) {
        const typeIcons = {
            video: '📹', podcast: '🎙️', book: '📚', course: '🎓',
            article: '📄', exercise: '✏️', project: '💻', other: '📌'
        };
        
        const recordDate = new Date(backendRecord.occurred_at);
        
        return {
            id: backendRecord.id,
            type: backendRecord.type,
            icon: typeIcons[backendRecord.type] || '📌',
            title: backendRecord.title,
            duration: backendRecord.duration_min || 0,
            date: recordDate,
            time: recordDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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
            other: '📌'
        };
        
        const recordDate = new Date(backendRecord.occurred_at);
        
        return {
            id: backendRecord.record_id,
            type: backendRecord.form_type,
            icon: typeIcons[backendRecord.form_type] || '📌',
            title: backendRecord.title,
            categories: backendRecord.tags ? backendRecord.tags.split(',') : [],
            duration: backendRecord.duration_min,
            difficulty: backendRecord.difficulty,
            focus: backendRecord.focus,
            date: recordDate,
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
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#/${page}`) {
                link.classList.add('active');
            }
        });

        // Update active page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageId = page === 'home' ? 'homePage' : `${page}Page`;
        document.getElementById(pageId)?.classList.add('active');

        this.currentPage = page;

        // Page-specific initialization
        if (page === 'records') {
            this.renderAllRecords();
        } else if (page === 'analytics') {
            this.loadAnalyticsData();
        }
    }

    showQuickRecord() {
        document.getElementById('quickRecordModal').classList.add('active');
        this.currentStep = 1;
        this.showStep(1);
    }

    closeQuickRecord() {
        document.getElementById('quickRecordModal').classList.remove('active');
        this.resetForm();
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
        container.innerHTML = this.recordData.tags.map(tag => `
            <span class="tag">
                ${tag}
                <span class="tag-remove" onclick="app.removeTag('${tag}')">×</span>
            </span>
        `).join('');
    }

    removeTag(tagName) {
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
        
        container.innerHTML = recentRecords.map(record => `
            <div class="record-item">
                <div class="record-type">${record.icon}</div>
                <div class="record-content">
                    <div class="record-title">${record.title}</div>
                    <div class="record-meta">
                        ${record.categories && record.categories.length > 0 && record.categories[0] !== '' 
                            ? `<span class="record-tags">${record.categories.join(', ')}</span>` 
                            : ''}
                        <span>${record.time || record.date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="record-duration">${record.duration}分钟</span>
                    </div>
                </div>
            </div>
        `).join('');
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
        
        container.innerHTML = this.records.map(record => `
            <div class="record-item">
                <div class="record-type">${record.icon}</div>
                <div class="record-content">
                    <div class="record-title">${record.title}</div>
                    <div class="record-meta">
                        ${record.categories && record.categories.length > 0 && record.categories[0] !== '' 
                            ? `<span class="record-tags">${record.categories.join(', ')}</span>` 
                            : ''}
                        <span>${record.date.toLocaleDateString('zh-CN')}</span>
                        <span>${record.time || record.date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="record-duration">${record.duration}分钟</span>
                    </div>
                </div>
            </div>
        `).join('');
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
        container.innerHTML = filtered.map(record => `
            <div class="record-item">
                <div class="record-type">${record.icon}</div>
                <div class="record-content">
                    <div class="record-title">${record.title}</div>
                    <div class="record-meta">
                        ${record.categories && record.categories.length > 0 && record.categories[0] !== '' 
                            ? `<span class="record-tags">${record.categories.join(', ')}</span>` 
                            : ''}
                        <span>${record.date.toLocaleDateString('zh-CN')}</span>
                        <span class="record-duration">${record.duration}分钟</span>
                    </div>
                </div>
            </div>
        `).join('');
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
                this.records = analyticsRecords.map(record => ({
                    id: record.record_id,
                    title: record.title,
                    type: record.form_type,
                    duration: record.duration_min || 0,
                    date: new Date(record.occurred_at),
                    difficulty: record.difficulty || null,
                    focus: record.focus || null,
                    mood: record.mood || '',
                    tags: record.tag_names || []
                }));
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LearningBuddyApp();
});