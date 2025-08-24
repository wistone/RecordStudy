// API Client for Learning Tracker Backend
class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('access_token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('access_token', token);
        } else {
            localStorage.removeItem('access_token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, redirect to login
                    this.setToken(null);
                    window.location.href = '/login';
                    return;
                }
                throw new Error(data.detail || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication
    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        this.setToken(response.access_token);
        return response;
    }

    async register(email, password, displayName) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: { email, password, display_name: displayName }
        });
        this.setToken(response.access_token);
        return response;
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async updateProfile(data) {
        return await this.request('/auth/me', {
            method: 'PUT',
            body: data
        });
    }

    logout() {
        this.setToken(null);
        window.location.href = '/login';
    }

    // Records
    async getRecords(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/records?${queryString}`);
    }

    async getRecord(id) {
        return await this.request(`/records/${id}`);
    }

    async createRecord(data) {
        return await this.request('/records', {
            method: 'POST',
            body: data
        });
    }

    async createQuickNote(content) {
        return await this.request('/records/quick-note', {
            method: 'POST',
            body: { content }
        });
    }

    async updateRecord(id, data) {
        return await this.request(`/records/${id}`, {
            method: 'PUT',
            body: data
        });
    }

    async deleteRecord(id) {
        return await this.request(`/records/${id}`, {
            method: 'DELETE'
        });
    }

    // Analytics
    async getDashboardAnalytics() {
        return await this.request('/analytics/dashboard');
    }

    async getChartData(period) {
        return await this.request('/analytics/chart-data', {
            method: 'POST',
            body: { period }
        });
    }

    async getAISummary() {
        return await this.request('/analytics/summary');
    }

    // Tags
    async getTags(search = '') {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        return await this.request(`/tags${params}`);
    }

    async getTagSuggestions(query) {
        return await this.request(`/tags/suggestions?query=${encodeURIComponent(query)}`);
    }

    async getPopularTags() {
        return await this.request('/tags/popular');
    }

    async createTag(tagName) {
        return await this.request('/tags', {
            method: 'POST',
            body: { tag_name: tagName }
        });
    }

    // Resources
    async getResources(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/resources?${queryString}`);
    }

    async createResource(data) {
        return await this.request('/resources', {
            method: 'POST',
            body: data
        });
    }

    async deleteResource(id) {
        return await this.request(`/resources/${id}`, {
            method: 'DELETE'
        });
    }
}

// Create global API client instance
window.apiClient = new APIClient();