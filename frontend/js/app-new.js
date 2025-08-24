// Learning Buddy App - Backend Integrated Version
class LearningBuddyApp {
    constructor() {
        this.currentPage = 'home';
        this.currentStep = 1;
        this.recordData = {};
        this.records = [];
        this.analytics = null;
        this.currentUser = null;
        this.currentMonth = new Date();
        this.currentPeriod = 'week';
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        await this.loadData();
        this.renderCalendar();
    }
    
    async checkAuth() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login';
            return;
        }
        
        try {
            this.currentUser = await apiClient.getCurrentUser();
            this.updateUserInfo();
            this.setupLogoutHandler();
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }
    
    setupLogoutHandler() {
        // Add logout functionality to user profile area
        const userProfile = document.querySelector('.user-profile');
        if (userProfile && !userProfile.querySelector('.logout-btn')) {
            userProfile.style.cursor = 'pointer';
            userProfile.title = '点击登出';
            
            // Create logout dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown';
            dropdown.innerHTML = `
                <div class="dropdown-content">
                    <div class="dropdown-item" onclick="app.logout()">🚪 登出</div>
                </div>
            `;
            userProfile.appendChild(dropdown);
            
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdown.classList.remove('active');
            });
        }
    }
    
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
    
    updateUserInfo() {
        if (this.currentUser) {
            const userNameEl = document.querySelector('.user-name');
            if (userNameEl) {
                userNameEl.textContent = this.currentUser.display_name || 'User';
            }
        }
    }
    
    async loadData() {
        try {
            await Promise.all([
                this.loadDashboardData(),
                this.loadRecentRecords()
            ]);
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError('加载数据失败，请刷新页面重试');
        }
    }
    
    async loadDashboardData() {
        try {
            this.analytics = await apiClient.getDashboardAnalytics();
            this.updateDashboard();
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }
    
    async loadRecentRecords() {
        try {
            this.records = await apiClient.getRecords({ limit: 10 });
            this.renderRecentRecords();
        } catch (error) {
            console.error('Failed to load records:', error);
        }
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
            this.saveRecord();
        });

        // Filters
        document.getElementById('typeFilter')?.addEventListener('change', () => {
            this.filterRecords();
        });

        document.getElementById('searchInput')?.addEventListener('input', () => {
            this.filterRecords();
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
            this.loadAllRecords();
        } else if (page === 'analytics') {
            this.loadAnalytics();
            this.renderMiniCalendar();
            this.renderChart();
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
        try {
            const title = document.getElementById('recordTitle').value;
            const duration = parseInt(document.getElementById('recordDuration').value) || 30;
            const feedback = document.querySelector('.form-textarea').value;
            
            if (!title || !this.recordData.type) {
                throw new Error('请填写必要信息');
            }
            
            const recordData = {
                title: title,
                record_type: this.recordData.type,
                tags: this.recordData.tags || [],
                duration_minutes: duration,
                content: feedback || null,
                difficulty_rating: this.recordData.difficulty || null,
                focus_rating: this.recordData.focus || null,
                energy_rating: this.recordData.energy || null
            };
            
            await apiClient.createRecord(recordData);
            
            // Refresh data
            await this.loadData();
            
            this.closeQuickRecord();
            this.showSuccessMessage('记录保存成功！');
            
        } catch (error) {
            console.error('Failed to save record:', error);
            this.showError(error.message || '保存失败，请重试');
        }
    }

    async saveQuickNote() {
        try {
            const quickText = document.querySelector('.quick-input').value;
            if (!quickText.trim()) {
                throw new Error('请输入内容');
            }
            
            await apiClient.createQuickNote(quickText.trim());
            
            await this.loadData();
            
            this.closeQuickRecord();
            this.showSuccessMessage('智能识别完成，记录已保存！');
            
        } catch (error) {
            console.error('Failed to save quick note:', error);
            this.showError(error.message || '保存失败，请重试');
        }
    }

    resetForm() {
        document.getElementById('recordForm').reset();
        document.querySelector('.quick-input').value = '';
        document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById('selectedTags').innerHTML = '';
        this.recordData = {};
        this.currentStep = 1;
    }

    showSuccessMessage(message = '操作成功！') {
        const toast = document.createElement('div');
        toast.className = 'toast-message success';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            background: #10B981;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    showError(message = '操作失败！') {
        const toast = document.createElement('div');
        toast.className = 'toast-message error';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            background: #EF4444;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    updateDashboard() {
        if (!this.analytics) return;
        
        // Update UI with analytics data
        document.getElementById('todayDuration').textContent = this.analytics.today.total_duration || 0;
        document.getElementById('todayRecords').textContent = this.analytics.today.total_records || 0;
        document.getElementById('weekDuration').textContent = this.analytics.week.total_duration || 0;
        document.getElementById('weekDays').textContent = this.analytics.week.active_days || 0;
        document.getElementById('monthDuration').textContent = this.analytics.month.total_duration || 0;
        document.getElementById('monthStreak').textContent = this.analytics.month.streak_days || 0;
        document.getElementById('streakDays').textContent = this.analytics.month.streak_days || 0;
    }

    renderRecentRecords() {
        const container = document.getElementById('recentRecordsList');
        if (!this.records || this.records.length === 0) {
            container.innerHTML = '<div class="no-records">暂无学习记录，<a href="#" onclick="app.showQuickRecord()">开始记录</a></div>';
            return;
        }
        
        const recentRecords = this.records.slice(0, 5);
        
        container.innerHTML = recentRecords.map(record => {
            const typeIcons = {
                video: '📹', podcast: '🎙️', book: '📚', course: '🎓',
                article: '📄', exercise: '✏️', project: '💻', workout: '🏃', other: '📌'
            };
            
            const icon = typeIcons[record.record_type] || '📌';
            const date = new Date(record.occurred_at);
            const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="record-item">
                    <div class="record-type">${icon}</div>
                    <div class="record-content">
                        <div class="record-title">${record.title}</div>
                        <div class="record-meta">
                            <span>${record.tags ? record.tags.join(', ') : ''}</span>
                            <span>${time}</span>
                            <span class="record-duration">${record.duration_minutes || 0}分钟</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadAllRecords() {
        try {
            this.records = await apiClient.getRecords({ limit: 50 });
            this.renderAllRecords();
        } catch (error) {
            console.error('Failed to load all records:', error);
            this.showError('加载记录失败');
        }
    }

    renderAllRecords() {
        const container = document.getElementById('recordsList');
        if (!this.records || this.records.length === 0) {
            container.innerHTML = '<div class="no-records">暂无学习记录</div>';
            return;
        }

        const typeIcons = {
            video: '📹', podcast: '🎙️', book: '📚', course: '🎓',
            article: '📄', exercise: '✏️', project: '💻', workout: '🏃', other: '📌'
        };

        container.innerHTML = this.records.map(record => {
            const icon = typeIcons[record.record_type] || '📌';
            const date = new Date(record.occurred_at);
            const dateStr = date.toLocaleDateString('zh-CN');
            const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="record-item">
                    <div class="record-type">${icon}</div>
                    <div class="record-content">
                        <div class="record-title">${record.title}</div>
                        <div class="record-meta">
                            <span>${record.tags ? record.tags.join(', ') : ''}</span>
                            <span>${dateStr}</span>
                            <span>${time}</span>
                            <span class="record-duration">${record.duration_minutes || 0}分钟</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async filterRecords() {
        const typeFilter = document.getElementById('typeFilter')?.value;
        const searchFilter = document.getElementById('searchInput')?.value.toLowerCase();
        
        try {
            const params = { limit: 50 };
            if (typeFilter) params.record_type = typeFilter;
            if (searchFilter) params.search = searchFilter;
            
            this.records = await apiClient.getRecords(params);
            this.renderAllRecords();
        } catch (error) {
            console.error('Failed to filter records:', error);
            this.showError('筛选失败');
        }
    }

    async loadAnalytics() {
        try {
            this.analytics = await apiClient.getDashboardAnalytics();
            this.renderAnalyticsData();
            await this.loadAISummary();
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    renderAnalyticsData() {
        if (!this.analytics) return;

        // Type statistics
        const typeStatsContainer = document.getElementById('typeStats');
        if (typeStatsContainer && this.analytics.type_distribution) {
            const typeNames = {
                video: '视频', podcast: '播客', book: '书籍', course: '课程',
                article: '文章', exercise: '题目', project: '项目', workout: '运动', other: '其他'
            };

            typeStatsContainer.innerHTML = this.analytics.type_distribution
                .slice(0, 5)
                .map(stat => `
                    <div class="stat-item">
                        <span class="stat-name">${typeNames[stat.record_type] || stat.record_type}</span>
                        <span class="stat-value">${Math.round(stat.duration/60*10)/10}h (${stat.count}次)</span>
                    </div>
                `).join('');
        }

        // Popular tags
        const weeklyTopicsContainer = document.getElementById('weeklyTopics');
        if (weeklyTopicsContainer && this.analytics.popular_tags) {
            weeklyTopicsContainer.innerHTML = this.analytics.popular_tags
                .slice(0, 5)
                .map(tag => `
                    <div class="stat-item">
                        <span class="stat-name">${tag.name}</span>
                        <span class="stat-value">${tag.count}次</span>
                    </div>
                `).join('');
        }
    }

    async loadAISummary() {
        try {
            const summary = await apiClient.getAISummary();
            document.getElementById('trendInsight').textContent = summary.trend_insight;
            document.getElementById('focusInsight').textContent = summary.focus_insight;
            document.getElementById('strengthInsight').textContent = summary.strength_insight;
            document.getElementById('nextActionText').textContent = summary.next_action;
        } catch (error) {
            console.error('Failed to load AI summary:', error);
        }
    }

    async switchPeriod(period) {
        this.currentPeriod = period;
        
        // Update active tab
        document.querySelectorAll('.period-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.period-tab[data-period="${period}"]`).classList.add('active');
        
        await this.renderChart();
    }

    async renderChart() {
        try {
            const chartData = await apiClient.getChartData(this.currentPeriod);
            this.renderChartBars(chartData.chart_data);
        } catch (error) {
            console.error('Failed to load chart data:', error);
        }
    }

    renderChartBars(data) {
        const barsContainer = document.getElementById('chartBars');
        const labelsContainer = document.getElementById('chartLabels');
        
        if (!barsContainer || !labelsContainer || !data) return;

        const maxValue = Math.max(...data.map(d => d.value), 1);

        barsContainer.innerHTML = data.map(item => {
            const height = (item.value / maxValue) * 100;
            return `<div class="chart-bar" style="height: ${height}%" title="${item.value}分钟"></div>`;
        }).join('');

        labelsContainer.innerHTML = data.map(item => 
            `<div class="chart-label">${item.label}</div>`
        ).join('');
    }

    renderCalendar() {
        // Simple calendar rendering - could be enhanced
        this.renderMiniCalendar();
    }

    renderMiniCalendar() {
        const container = document.getElementById('miniCalendarGrid');
        if (!container) return;

        const today = new Date();
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Update month display
        const monthDisplay = document.getElementById('miniCalendarMonth');
        if (monthDisplay) {
            monthDisplay.textContent = `${year}年${month + 1}月`;
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        
        let calendarHTML = '';
        
        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getFullYear() === year && 
                          today.getMonth() === month && 
                          today.getDate() === day;
            
            // Check if there are records for this day (simplified)
            const hasRecords = this.records && this.records.some(record => {
                const recordDate = new Date(record.occurred_at);
                return recordDate.getFullYear() === year &&
                       recordDate.getMonth() === month &&
                       recordDate.getDate() === day;
            });
            
            const classes = ['calendar-day'];
            if (isToday) classes.push('today');
            if (hasRecords) classes.push('has-record');
            
            calendarHTML += `<div class="${classes.join(' ')}">${day}</div>`;
        }
        
        container.innerHTML = calendarHTML;
    }

    changeMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.renderMiniCalendar();
    }

    logout() {
        apiClient.logout();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LearningBuddyApp();
});

// CSS animations for toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .no-records {
        text-align: center;
        color: #666;
        padding: 40px 20px;
    }
    
    .no-records a {
        color: #667eea;
        text-decoration: none;
    }
    
    .no-records a:hover {
        text-decoration: underline;
    }
`;
document.head.appendChild(style);