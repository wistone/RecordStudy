// IndexedDB 缓存服务
class CacheService {
    constructor() {
        this.dbName = 'LearningBuddyCache';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
    }

    // 初始化数据库
    async init() {
        if (this.isInitialized) return;

        try {
            this.db = await this.openDB();
            this.isInitialized = true;
            console.log('✅ IndexedDB 缓存服务初始化成功');
        } catch (error) {
            console.error('❌ IndexedDB 初始化失败:', error);
            // 降级到内存缓存
            this.memoryCache = new Map();
        }
    }

    // 打开数据库
    openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('浏览器不支持 IndexedDB'));
                return;
            }

            const request = window.indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建缓存存储
                if (!db.objectStoreNames.contains('cache')) {
                    const store = db.createObjectStore('cache', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // 生成缓存键
    generateKey(prefix, params = {}) {
        const paramStr = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        return `${prefix}:${paramStr}`;
    }

    // 存储数据到缓存
    async set(key, data, ttlMinutes = 5) {
        const cacheItem = {
            key: key,
            data: data,
            timestamp: Date.now(),
            expires: Date.now() + (ttlMinutes * 60 * 1000),
            type: key.split(':')[0] || 'unknown'
        };

        try {
            if (this.db) {
                const transaction = this.db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                await this.promisifyRequest(store.put(cacheItem));
                console.log(`📦 数据已缓存: ${key} (TTL: ${ttlMinutes}分钟)`);
            } else if (this.memoryCache) {
                // 内存缓存降级
                this.memoryCache.set(key, cacheItem);
            }
        } catch (error) {
            console.error('❌ 缓存存储失败:', error);
        }
    }

    // 从缓存获取数据
    async get(key) {
        try {
            let cacheItem = null;

            if (this.db) {
                const transaction = this.db.transaction(['cache'], 'readonly');
                const store = transaction.objectStore('cache');
                cacheItem = await this.promisifyRequest(store.get(key));
            } else if (this.memoryCache) {
                // 内存缓存降级
                cacheItem = this.memoryCache.get(key);
            }

            if (!cacheItem) {
                console.log(`📦 缓存未命中: ${key}`);
                return null;
            }

            // 检查是否过期
            if (Date.now() > cacheItem.expires) {
                console.log(`⏰ 缓存过期: ${key}`);
                await this.remove(key);
                return null;
            }

            console.log(`✅ 缓存命中: ${key}`);
            return cacheItem.data;

        } catch (error) {
            console.error('❌ 缓存读取失败:', error);
            return null;
        }
    }

    // 删除缓存项
    async remove(key) {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                await this.promisifyRequest(store.delete(key));
            } else if (this.memoryCache) {
                this.memoryCache.delete(key);
            }
            console.log(`🗑️ 缓存已删除: ${key}`);
        } catch (error) {
            console.error('❌ 缓存删除失败:', error);
        }
    }

    // 清除特定类型的缓存
    async clearByType(type) {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                const index = store.index('type');
                const request = index.openCursor(IDBKeyRange.only(type));

                let deletedCount = 0;
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        store.delete(cursor.primaryKey);
                        deletedCount++;
                        cursor.continue();
                    } else {
                        console.log(`🗑️ 已清除 ${deletedCount} 个 ${type} 类型的缓存`);
                    }
                };
            } else if (this.memoryCache) {
                // 内存缓存降级
                const keysToDelete = [];
                for (const [key, item] of this.memoryCache.entries()) {
                    if (item.type === type) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => this.memoryCache.delete(key));
                console.log(`🗑️ 已清除 ${keysToDelete.length} 个 ${type} 类型的缓存`);
            }
        } catch (error) {
            console.error('❌ 清除类型缓存失败:', error);
        }
    }

    // 清理过期缓存
    async cleanupExpired() {
        try {
            if (!this.db) return;

            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const index = store.index('timestamp');
            const request = index.openCursor();

            let cleanedCount = 0;
            const now = Date.now();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const item = cursor.value;
                    if (now > item.expires) {
                        store.delete(cursor.primaryKey);
                        cleanedCount++;
                    }
                    cursor.continue();
                } else {
                    if (cleanedCount > 0) {
                        console.log(`🧹 已清理 ${cleanedCount} 个过期缓存项`);
                    }
                }
            };
        } catch (error) {
            console.error('❌ 清理过期缓存失败:', error);
        }
    }

    // 获取缓存统计信息
    async getStats() {
        try {
            if (!this.db) {
                const memorySize = this.memoryCache ? this.memoryCache.size : 0;
                return { total: memorySize, expired: 0, types: {}, storage: 'memory' };
            }

            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.openCursor();

            const stats = { total: 0, expired: 0, types: {}, storage: 'indexedDB' };
            const now = Date.now();

            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const item = cursor.value;
                        stats.total++;

                        if (now > item.expires) {
                            stats.expired++;
                        }

                        stats.types[item.type] = (stats.types[item.type] || 0) + 1;
                        cursor.continue();
                    } else {
                        resolve(stats);
                    }
                };
            });
        } catch (error) {
            console.error('❌ 获取缓存统计失败:', error);
            return { total: 0, expired: 0, types: {}, storage: 'error' };
        }
    }

    // 将 IDBRequest 转换为 Promise
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 预设的快捷方法
    async cacheDashboard(data, ttlMinutes = 5) {
        const key = this.generateKey('dashboard', { userId: window.authService?.getCurrentUser()?.id || 'anonymous' });
        await this.set(key, data, ttlMinutes);
    }

    async getCachedDashboard() {
        const key = this.generateKey('dashboard', { userId: window.authService?.getCurrentUser()?.id || 'anonymous' });
        return await this.get(key);
    }

    async cacheRecentRecords(data, ttlMinutes = 3) {
        const key = this.generateKey('recent-records', { userId: window.authService?.getCurrentUser()?.id || 'anonymous' });
        await this.set(key, data, ttlMinutes);
    }

    async getCachedRecentRecords() {
        const key = this.generateKey('recent-records', { userId: window.authService?.getCurrentUser()?.id || 'anonymous' });
        return await this.get(key);
    }

    // 用户资料缓存（较长TTL）
    async cacheUserProfile(data, ttlMinutes = 60 * 24) { // 24小时
        const key = this.generateKey('profile', { userId: window.authService?.getCurrentUser()?.id || 'anonymous' });
        await this.set(key, data, ttlMinutes);
    }

    async getCachedUserProfile() {
        const key = this.generateKey('profile', { userId: window.authService?.getCurrentUser()?.id || 'anonymous' });
        return await this.get(key);
    }
}

// 创建全局缓存服务实例
window.cacheService = new CacheService();