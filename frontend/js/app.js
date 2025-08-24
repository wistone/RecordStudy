// Learning Buddy App - Main JavaScript
class LearningBuddyApp {
    constructor() {
        this.currentPage = 'home';
        this.currentStep = 1;
        this.recordData = {};
        this.records = [];
        this.currentMonth = new Date();
        this.currentPeriod = 'week'; // week, month, year
        this.init();
    }

    init() {
        this.loadMockData();
        this.setupEventListeners();
        this.updateDashboard();
        this.renderRecentRecords();
        this.renderCalendar();
    }

    // Generate Rich Mock Data for Prototype (30% of month coverage)
    loadMockData() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Generate learning days (30% coverage)
        const learningDays = [];
        const targetDays = Math.floor(daysInMonth * 0.3);
        
        // Ensure today and recent days are included
        for (let i = 0; i < Math.min(3, targetDays); i++) {
            learningDays.push(today.getDate() - i);
        }
        
        // Add random days throughout the month
        while (learningDays.length < targetDays) {
            const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
            if (!learningDays.includes(randomDay) && randomDay > 0) {
                learningDays.push(randomDay);
            }
        }
        
        const types = [
            { type: 'video', icon: '📹', weight: 0.35 },
            { type: 'book', icon: '📚', weight: 0.20 },
            { type: 'course', icon: '🎓', weight: 0.15 },
            { type: 'podcast', icon: '🎙️', weight: 0.10 },
            { type: 'article', icon: '📄', weight: 0.08 },
            { type: 'exercise', icon: '✏️', weight: 0.07 },
            { type: 'project', icon: '💻', weight: 0.05 }
        ];
        
        const categories = [
            { name: 'AI', weight: 0.25 },
            { name: '编程', weight: 0.20 },
            { name: '数学', weight: 0.15 },
            { name: '英语', weight: 0.12 },
            { name: '机器学习', weight: 0.10 },
            { name: '算法', weight: 0.08 },
            { name: '数据科学', weight: 0.05 },
            { name: '产品设计', weight: 0.03 },
            { name: '历史', weight: 0.02 }
        ];
        
        const titles = {
            video: [
                'MIT 6.001 Structure and Interpretation',
                'CS50 Introduction to Computer Science',
                '3Blue1Brown - 线性代数的本质',
                'Andrew Ng - Deep Learning Course',
                'Python 数据结构与算法',
                'React 18 完整教程',
                'TED Talk - The Future of AI'
            ],
            book: [
                '深度学习入门：基于Python的理论与实现',
                '算法导论（第三版）',
                '统计学习方法',
                'Clean Code',
                '人工智能：一种现代的方法',
                '数学之美',
                'The Pragmatic Programmer'
            ],
            course: [
                'Coursera - Machine Learning by Andrew Ng',
                'edX - Introduction to Computer Science',
                '慕课网 - Python数据分析',
                'Udacity - AI Programming with Python',
                'Khan Academy - Statistics and Probability',
                '极客时间 - 算法训练营'
            ],
            podcast: [
                'Lex Fridman Podcast - Yann LeCun',
                'Talk Python to Me - FastAPI',
                '得到 - 薛兆丰的经济学课',
                'The AI Podcast by NVIDIA',
                'Software Engineering Daily - ML',
                'Syntax - Web Development'
            ],
            article: [
                'Attention Is All You Need 论文解读',
                'React Hooks 最佳实践',
                'Python 性能优化指南',
                'Transformer 模型详解',
                '机器学习中的正则化',
                '设计模式在实际项目中的应用'
            ],
            exercise: [
                'LeetCode 两数之和',
                'HackerRank SQL 挑战',
                'Codeforces Round 850',
                'Kaggle Titanic Competition',
                'LeetCode 动态规划专题',
                'AtCoder Beginner Contest'
            ],
            project: [
                '个人博客系统开发',
                '股票价格预测模型',
                '聊天机器人实现',
                'React Native 移动应用',
                '图像分类深度学习项目',
                'Web爬虫数据收集系统'
            ]
        };
        
        this.records = [];
        let recordId = 1;
        
        learningDays.sort((a, b) => b - a).forEach((day, dayIndex) => {
            const recordsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 records per day
            
            for (let i = 0; i < recordsPerDay; i++) {
                // Weighted random selection for type
                const typeRandom = Math.random();
                let cumulativeWeight = 0;
                let selectedType = types[0];
                
                for (const typeObj of types) {
                    cumulativeWeight += typeObj.weight;
                    if (typeRandom <= cumulativeWeight) {
                        selectedType = typeObj;
                        break;
                    }
                }
                
                // Weighted random selection for categories (1-3 categories)
                const numCategories = Math.floor(Math.random() * 3) + 1;
                const selectedCategories = [];
                for (let j = 0; j < numCategories; j++) {
                    const catRandom = Math.random();
                    let catCumulativeWeight = 0;
                    for (const catObj of categories) {
                        catCumulativeWeight += catObj.weight;
                        if (catRandom <= catCumulativeWeight && !selectedCategories.includes(catObj.name)) {
                            selectedCategories.push(catObj.name);
                            break;
                        }
                    }
                }
                
                // Duration based on type
                let duration;
                switch (selectedType.type) {
                    case 'video':
                        duration = Math.floor(Math.random() * 60) + 15; // 15-75min
                        break;
                    case 'book':
                        duration = Math.floor(Math.random() * 90) + 30; // 30-120min
                        break;
                    case 'course':
                        duration = Math.floor(Math.random() * 120) + 45; // 45-165min
                        break;
                    case 'podcast':
                        duration = Math.floor(Math.random() * 90) + 20; // 20-110min
                        break;
                    case 'project':
                        duration = Math.floor(Math.random() * 180) + 60; // 60-240min
                        break;
                    default:
                        duration = Math.floor(Math.random() * 45) + 15; // 15-60min
                }
                
                const recordDate = new Date(currentYear, currentMonth, day);
                recordDate.setHours(
                    Math.floor(Math.random() * 14) + 8, // 8AM - 10PM
                    Math.floor(Math.random() * 60)
                );
                
                const record = {
                    id: recordId++,
                    type: selectedType.type,
                    icon: selectedType.icon,
                    title: titles[selectedType.type][Math.floor(Math.random() * titles[selectedType.type].length)],
                    categories: selectedCategories.length > 0 ? selectedCategories : ['其他'],
                    duration,
                    difficulty: Math.floor(Math.random() * 5) + 1,
                    focus: Math.floor(Math.random() * 5) + 1,
                    date: recordDate,
                    time: recordDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                };
                
                this.records.push(record);
            }
        });
        
        // Sort by date (newest first)
        this.records.sort((a, b) => b.date - a.date);
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
            this.renderAllRecords();
        } else if (page === 'analytics') {
            this.renderAnalytics();
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

    saveRecord() {
        // Collect form data
        this.recordData.title = document.getElementById('recordTitle').value;
        this.recordData.duration = parseInt(document.getElementById('recordDuration').value) || 30;
        this.recordData.date = new Date();
        this.recordData.id = this.records.length + 1;
        
        // Get icon for type
        const typeIcons = {
            video: '📹',
            podcast: '🎙️',
            book: '📚',
            course: '🎓',
            article: '📄',
            exercise: '✏️',
            project: '💻',
            workout: '🏃',
            other: '📌'
        };
        this.recordData.icon = typeIcons[this.recordData.type] || '📌';
        
        // Add to records
        this.records.unshift(this.recordData);
        
        // Update UI
        this.updateDashboard();
        this.renderRecentRecords();
        
        // Close modal and reset
        this.closeQuickRecord();
        this.showSuccessMessage();
    }

    saveQuickNote() {
        const quickText = document.querySelector('.quick-input').value;
        if (!quickText) return;
        
        // Auto-detect and create record
        const record = {
            id: this.records.length + 1,
            type: 'other',
            icon: '📝',
            title: quickText.substring(0, 50),
            categories: ['随手记'],
            duration: 5,
            date: new Date(),
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
        
        this.records.unshift(record);
        this.updateDashboard();
        this.renderRecentRecords();
        this.closeQuickRecord();
        this.showSuccessMessage('智能识别完成，记录已保存！');
    }

    resetForm() {
        document.getElementById('recordForm').reset();
        document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('selected'));
        this.recordData = {};
        this.currentStep = 1;
    }

    showSuccessMessage(message = '记录保存成功！') {
        // Simple alert for prototype - would be replaced with toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            background: var(--secondary-color);
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

    updateDashboard() {
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
        document.getElementById('todayDuration').textContent = todayDuration;
        document.getElementById('todayRecords').textContent = todayRecords.length;
        
        document.getElementById('weekDuration').textContent = Math.round(weekDuration / 60 * 10) / 10; // Convert to hours with 1 decimal
        document.getElementById('weekDays').textContent = weekDays;
        
        document.getElementById('monthDuration').textContent = Math.round(monthDuration / 60 * 10) / 10; // Convert to hours
        document.getElementById('monthStreak').textContent = monthStreak;
        
        // Update streak badge
        document.getElementById('streakDays').textContent = monthStreak;
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

    renderRecentRecords() {
        const container = document.getElementById('recentRecordsList');
        const recentRecords = this.records.slice(0, 5);
        
        container.innerHTML = recentRecords.map(record => `
            <div class="record-item">
                <div class="record-type">${record.icon}</div>
                <div class="record-content">
                    <div class="record-title">${record.title}</div>
                    <div class="record-meta">
                        <span>${record.categories ? record.categories.join(', ') : ''}</span>
                        <span>${record.time || record.date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="record-duration">${record.duration}分钟</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderAllRecords() {
        const container = document.getElementById('recordsList');
        container.innerHTML = this.records.map(record => `
            <div class="record-item">
                <div class="record-type">${record.icon}</div>
                <div class="record-content">
                    <div class="record-title">${record.title}</div>
                    <div class="record-meta">
                        <span>${record.categories ? record.categories.join(', ') : ''}</span>
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
                        <span>${record.categories ? record.categories.join(', ') : ''}</span>
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
        
        // Month over month growth (mock)
        const growthRate = Math.floor(Math.random() * 30 + 10); // 10-40% growth
        
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
        const totalDuration = data.reduce((sum, val) => sum + val, 0);
        const avgDuration = data.length > 0 ? Math.round(totalDuration / data.length) : 0;
        const maxDuration = Math.max(...data);
        
        // You can add this info to the chart header if needed
        let periodInfo = '';
        if (this.currentPeriod === 'week') {
            periodInfo = `本周总计: ${totalDuration}分钟`;
        } else if (this.currentPeriod === 'month') {
            periodInfo = `30天总计: ${Math.round(totalDuration/60*10)/10}小时`;
        } else {
            periodInfo = `12月总计: ${Math.round(totalDuration/60*10)/10}小时`;
        }
        
        // Update the section title with summary info
        const titleElement = document.querySelector('.time-stats-container .section-title');
        if (titleElement) {
            titleElement.innerHTML = `学习时长趋势 <small style="font-size: 13px; color: var(--text-secondary); font-weight: 400;">${periodInfo}</small>`;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LearningBuddyApp();
});