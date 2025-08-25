// Supabase Authentication Service
class AuthService {
    constructor() {
        this.supabase = null;
        this.user = null;
        
        // 初始化Supabase
        this.initializeSupabase();
        
        this.listeners = [];
        
        // 初始化用户状态
        this.initialize();
    }

    // 初始化 Supabase 客户端
    initializeSupabase() {
        try {
            // 检查环境变量
            if (!window.ENV || !window.ENV.SUPABASE_URL || !window.ENV.SUPABASE_ANON_KEY) {
                console.error('❌ 环境变量未配置');
                throw new Error('Supabase environment variables not configured');
            }
            
            // 检查 Supabase 是否已加载
            if (typeof window.supabase === 'undefined') {
                console.error('❌ Supabase SDK 未加载');
                throw new Error('Supabase SDK not loaded');
            }

            // 创建 Supabase 客户端
            this.supabase = window.supabase.createClient(
                window.ENV.SUPABASE_URL, 
                window.ENV.SUPABASE_ANON_KEY
            );

            console.log('✅ Supabase 客户端初始化成功');
            
            // 监听认证状态变化
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('🔐 认证状态变化:', event, session?.user?.email || 'No user');
                this.user = session?.user || null;
                this.notifyListeners();
                
                // 处理认证事件
                switch (event) {
                    case 'SIGNED_IN':
                        this.handleSignIn();
                        break;
                    case 'SIGNED_OUT':
                        this.handleSignOut();
                        break;
                    case 'TOKEN_REFRESHED':
                        console.log('Token refreshed');
                        break;
                }
            });

        } catch (error) {
            console.error('❌ Supabase 初始化失败:', error);
            throw error;
        }
    }

    // 初始化用户状态
    async initialize() {
        console.log('🔄 初始化认证服务...');
        

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            this.user = user;
            
            if (user) {
                console.log('✅ 初始化：发现已登录用户', user.email);
            } else {
                console.log('❌ 初始化：未找到登录用户');
            }
            
            // 延迟通知，避免与页面初始化逻辑冲突
            setTimeout(() => {
                this.notifyListeners();
            }, 50);
        } catch (error) {
            console.error('❌ 初始化认证状态失败:', error);
        }
    }

    // 注册新用户
    async signUp(email, password, displayName) {

        try {
            console.log('📝 开始注册用户:', email);
            
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: displayName
                    }
                }
            });

            if (error) {
                console.error('❌ 注册失败:', error);
                return { data: null, error };
            }

            // 如果注册成功，创建用户资料
            if (data.user) {
                console.log('✅ 用户注册成功:', data.user.email);
                
                // 在profiles表中创建用户资料
                const profileResult = await this.createUserProfile(data.user, displayName);
                if (profileResult && profileResult.error) {
                    console.warn('⚠️ 用户资料创建失败:', profileResult.error);
                } else {
                    console.log('✅ 用户资料创建成功');
                }
                
                this.user = data.user;
            }

            return { data, error };
        } catch (error) {
            console.error('❌ 注册过程中发生错误:', error);
            return { data: null, error };
        }
    }

    // 用户登录
    async signIn(email, password) {

        try {
            console.log('🔐 开始用户登录:', email);
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('❌ 登录失败:', error);
                return { data: null, error };
            }

            if (data.user) {
                console.log('✅ 用户登录成功:', data.user.email);
                this.user = data.user;
            }

            return { data, error };
        } catch (error) {
            console.error('❌ 登录过程中发生错误:', error);
            return { data: null, error };
        }
    }

    // 用户登出
    async signOut() {

        try {
            console.log('👋 用户登出');
            
            const { error } = await this.supabase.auth.signOut();
            this.user = null;
            
            if (error) {
                console.error('❌ 登出失败:', error);
            } else {
                console.log('✅ 用户登出成功');
            }
            
            return { error };
        } catch (error) {
            console.error('❌ 登出过程中发生错误:', error);
            return { error };
        }
    }

    // 获取当前用户
    getCurrentUser() {
        return this.user;
    }

    // 检查是否已登录
    isAuthenticated() {
        return this.user !== null;
    }

    // 创建用户档案
    async createUserProfile(user, displayName) {

        try {
            console.log('📝 准备创建用户档案:', {
                user_id: user.id,
                display_name: displayName || user.email?.split('@')[0],
                email: user.email
            });

            const { data, error } = await this.supabase
                .from('profiles')
                .insert([
                    {
                        user_id: user.id,
                        display_name: displayName || user.email?.split('@')[0]
                    }
                ])
                .select(); // 返回插入的数据

            if (error) {
                console.error('❌ 数据库插入错误:', error);
                return { error };
            }

            console.log('✅ 用户档案创建成功:', data);
            return { error: null, data };
        } catch (error) {
            console.error('❌ 创建用户档案异常:', error);
            return { error };
        }
    }

    // 重置密码
    async resetPassword(email) {

        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email);
            return { error };
        } catch (error) {
            console.error('❌ 重置密码失败:', error);
            return { error };
        }
    }

    // 处理登录成功
    handleSignIn() {
        console.log('✅ 用户已登录');
        // 延迟重定向，确保认证状态完全更新
        setTimeout(() => {
            if (window.location.pathname.includes('login')) {
                console.log('🔄 从登录页重定向到首页');
                window.location.href = 'index.html';
            }
        }, 500);
    }

    // 处理登出
    handleSignOut() {
        console.log('🚪 用户已登出');
        // 重定向到登录页
        if (!window.location.pathname.includes('login')) {
            window.location.href = 'login.html';
        }
    }

    // 添加认证状态监听器
    onAuthStateChange(callback) {
        this.listeners.push(callback);
        
        // 立即调用一次，传递当前状态
        callback(this.user);
        
        // 返回取消监听的函数
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    // 通知所有监听器
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.user);
            } catch (error) {
                console.error('认证状态监听器错误:', error);
            }
        });
    }

    // 获取用户显示名称
    getDisplayName() {
        if (!this.user) return null;
        
        return this.user.user_metadata?.display_name || 
               this.user.email?.split('@')[0] || 
               '用户';
    }

    // 获取用户显示名称（兼容旧方法名）
    getUserDisplayName() {
        return this.getDisplayName();
    }

    // 获取用户头像 URL
    getAvatarUrl() {
        if (!this.user) return null;
        
        return this.user.user_metadata?.avatar_url || null;
    }

    // 验证邮箱格式
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 验证密码强度
    validatePassword(password) {
        const errors = [];
        
        if (password.length < 6) {
            errors.push('密码长度至少6位');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// 创建全局认证服务实例
window.authService = new AuthService();