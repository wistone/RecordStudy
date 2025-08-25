// Python后端API服务层
class APIService {
    constructor() {
        this.baseURL = 'http://localhost:8000/api/v1';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
    }

    // 获取认证token
    async getAuthToken() {
        if (!window.authService || !window.authService.supabase) {
            throw new Error('认证服务未初始化');
        }

        const { data: { session }, error } = await window.authService.supabase.auth.getSession();
        if (error || !session) {
            throw new Error('用户未登录');
        }

        return session.access_token;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            // 获取认证token
            const token = await this.getAuthToken();
            
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                },
                ...options
            };

            // 处理请求体
            if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }

            console.log(`📡 API请求: ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ API响应: ${url}`, data);
            
            return data;
        } catch (error) {
            console.error(`❌ API请求失败: ${url}`, error);
            throw error;
        }
    }

    // 缓存相关方法
    getCacheKey(endpoint, params = {}) {
        return `${endpoint}_${JSON.stringify(params)}`;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`📦 使用缓存: ${key}`);
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // === 学习记录相关API ===

    async getRecords(params = {}) {
        const { skip = 0, limit = 50, days = null } = params;
        
        const cacheKey = this.getCacheKey('/records', params);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        // 构建查询参数
        const queryParams = new URLSearchParams();
        queryParams.set('skip', skip);
        queryParams.set('limit', limit);
        if (days) queryParams.set('days', days);
        
        const url = `/records?${queryParams.toString()}`;
        const data = await this.request(url);
        this.setCache(cacheKey, data);
        return data;
    }

    async createRecord(recordData) {
        const data = await this.request('/records', {
            method: 'POST',
            body: recordData
        });
        
        // 清除相关缓存
        this.clearCache('records');
        this.clearCache('stats');
        
        return data;
    }

    async getRecord(recordId) {
        return await this.request(`/records/${recordId}`);
    }

    async updateRecord(recordId, updateData) {
        const data = await this.request(`/records/${recordId}`, {
            method: 'PUT',
            body: updateData
        });
        
        // 清除相关缓存
        this.clearCache('records');
        this.clearCache('stats');
        
        return data;
    }

    async deleteRecord(recordId) {
        await this.request(`/records/${recordId}`, {
            method: 'DELETE'
        });
        
        // 清除相关缓存
        this.clearCache('records');
        this.clearCache('stats');
    }

    // === 资源相关API ===

    async getResources(params = {}) {
        const { skip = 0, limit = 50, resource_type = null, search = null } = params;
        const queryParams = new URLSearchParams({ skip, limit });
        if (resource_type) queryParams.append('resource_type', resource_type);
        if (search) queryParams.append('search', search);

        const cacheKey = this.getCacheKey('/resources', params);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.request(`/resources?${queryParams}`);
        this.setCache(cacheKey, data);
        return data;
    }

    async getMyResources(params = {}) {
        const { skip = 0, limit = 50, status = null, favorites_only = false } = params;
        const queryParams = new URLSearchParams({ skip, limit, favorites_only });
        if (status) queryParams.append('status', status);

        const cacheKey = this.getCacheKey('/resources/my', params);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.request(`/resources/my?${queryParams}`);
        this.setCache(cacheKey, data);
        return data;
    }

    async getResource(resourceId) {
        const cacheKey = this.getCacheKey(`/resources/${resourceId}`);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.request(`/resources/${resourceId}`);
        this.setCache(cacheKey, data);
        return data;
    }

    // === 统计相关API ===

    async getStatsOverview(days = 30) {
        const cacheKey = this.getCacheKey('/stats/overview', { days });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.request(`/stats/overview?days=${days}`);
        this.setCache(cacheKey, data);
        return data;
    }

    async getDailyStats(days = 30) {
        const cacheKey = this.getCacheKey('/stats/daily', { days });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.request(`/stats/daily?days=${days}`);
        this.setCache(cacheKey, data);
        return data;
    }

    async getResourceStats() {
        const cacheKey = this.getCacheKey('/stats/resources');
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.request('/stats/resources');
        this.setCache(cacheKey, data);
        return data;
    }

    // === 工具方法 ===

    // 检查后端连通性
    async healthCheck() {
        try {
            const response = await fetch('http://localhost:8000/health');
            return response.ok;
        } catch (error) {
            console.error('后端健康检查失败:', error);
            return false;
        }
    }

    // 格式化错误信息
    formatError(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error.message) {
            return error.message;
        }
        
        return '请求失败，请稍后重试';
    }

    // 批量请求（用于减少网络请求）
    async batchRequest(requests) {
        const promises = requests.map(req => 
            this.request(req.endpoint, req.options).catch(error => ({ error, ...req }))
        );
        
        const results = await Promise.all(promises);
        return results;
    }
}

// 创建全局API服务实例
window.apiService = new APIService();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}