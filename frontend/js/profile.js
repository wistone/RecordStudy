// Profile Management Service
class ProfileManager {
    constructor() {
        this.apiService = window.apiService;
        this.authService = window.authService;
        this.currentProfile = null;
    }

    async init() {
        console.log('🔄 初始化个人资料管理器...');
        await this.loadProfile();
    }

    // 加载用户资料
    async loadProfile() {
        try {
            this.showLoading();
            
            const response = await this.apiService.request('/profiles/current', 'GET');
            if (response && !response.error) {
                this.currentProfile = response;
                this.displayProfile(response);
                console.log('✅ 用户资料加载成功:', response);
            } else {
                this.showError('基础信息', response?.error || '加载用户资料失败');
            }
        } catch (error) {
            console.error('❌ 加载用户资料失败:', error);
            this.showError('基础信息', '加载用户资料失败');
        } finally {
            this.hideLoading();
        }
    }

    // 显示用户资料
    displayProfile(profile) {
        // 显示头像
        const avatarDisplay = document.getElementById('avatarDisplay');
        if (profile.avatar_url) {
            avatarDisplay.innerHTML = `<img src="${profile.avatar_url}" alt="头像" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatarDisplay.innerHTML = '👤';
        }

        // 填充基础信息
        document.getElementById('currentDisplayName').textContent = profile.display_name || '未设置';
        document.getElementById('currentEmail').textContent = profile.email;
        document.getElementById('userId').textContent = this.formatUserId(profile.user_id);
        document.getElementById('createdAt').textContent = this.formatDate(profile.created_at);
    }


    // 上传头像
    async uploadAvatar(file) {
        try {
            // 验证文件
            if (!file) {
                this.showError('basicInfo', '请选择头像文件');
                return;
            }

            if (!file.type.startsWith('image/')) {
                this.showError('basicInfo', '请上传图片文件');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                this.showError('basicInfo', '头像大小不能超过5MB');
                return;
            }

            this.showLoading('basicInfo');
            this.clearAlert('basicInfo');

            // 创建FormData
            const formData = new FormData();
            formData.append('file', file);

            // 上传头像
            const response = await this.apiService.uploadFile('/profiles/upload-avatar', formData);

            if (response && response.avatar_url && !response.error) {
                this.showSuccess('basicInfo', '头像上传成功');
                
                // 更新头像显示
                const avatarDisplay = document.getElementById('avatarDisplay');
                avatarDisplay.innerHTML = `<img src="${response.avatar_url}" alt="头像" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                
                // 更新当前资料
                if (this.currentProfile) {
                    this.currentProfile.avatar_url = response.avatar_url;
                }
                
                console.log('✅ 头像上传成功:', response.avatar_url);
            } else {
                this.showError('basicInfo', response?.error || '头像上传失败');
            }
        } catch (error) {
            console.error('❌ 上传头像失败:', error);
            this.showError('basicInfo', '上传头像失败');
        } finally {
            this.hideLoading('basicInfo');
            // 清空文件输入
            document.getElementById('avatarInput').value = '';
        }
    }


    // 修改密码
    async changePassword() {
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // 验证输入
            if (!currentPassword) {
                this.showError('password', '请输入当前密码');
                return;
            }

            if (!newPassword) {
                this.showError('password', '请输入新密码');
                return;
            }

            if (newPassword.length < 6) {
                this.showError('password', '新密码长度至少6位');
                return;
            }

            if (!confirmPassword) {
                this.showError('password', '请确认新密码');
                return;
            }

            if (newPassword !== confirmPassword) {
                this.showError('password', '两次输入的密码不一致');
                return;
            }

            if (currentPassword === newPassword) {
                this.showError('password', '新密码不能与当前密码相同');
                return;
            }

            this.showLoading('password');
            this.clearAlert('password');

            const response = await this.apiService.request('/profiles/change-password', {
                method: 'PUT',
                body: {
                    current_password: currentPassword,
                    new_password: newPassword
                }
            });

            if (response && !response.error) {
                this.showSuccess('password', '密码修改成功');
                
                // 清空表单
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
                
                console.log('✅ 密码修改成功');
            } else {
                this.showError('password', response?.error || '密码修改失败');
            }
        } catch (error) {
            console.error('❌ 修改密码失败:', error);
            this.showError('password', '修改密码失败');
        } finally {
            this.hideLoading('password');
        }
    }

    // 工具函数：显示成功消息
    showSuccess(section, message) {
        const alertId = `${section}Alert`;
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.innerHTML = `<div class="alert alert-success">${message}</div>`;
        }
    }

    // 工具函数：显示错误消息
    showError(section, message) {
        const alertId = `${section}Alert`;
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.innerHTML = `<div class="alert alert-danger">${message}</div>`;
        }
    }

    // 工具函数：清除提示消息
    clearAlert(section) {
        const alertId = `${section}Alert`;
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.innerHTML = '';
        }
    }

    // 工具函数：显示加载状态
    showLoading(section = null) {
        if (section) {
            const sectionElement = document.querySelector(`#${section}Alert`).closest('.profile-section');
            if (sectionElement) {
                sectionElement.classList.add('loading');
            }
        } else {
            document.querySelector('.profile-container').classList.add('loading');
        }
    }

    // 工具函数：隐藏加载状态
    hideLoading(section = null) {
        if (section) {
            const sectionElement = document.querySelector(`#${section}Alert`).closest('.profile-section');
            if (sectionElement) {
                sectionElement.classList.remove('loading');
            }
        } else {
            document.querySelector('.profile-container').classList.remove('loading');
        }
    }

    // 工具函数：验证邮箱格式
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 工具函数：格式化用户ID
    formatUserId(userId) {
        if (!userId) return '';
        return userId.substring(0, 8) + '...' + userId.substring(userId.length - 8);
    }

    // 工具函数：格式化日期
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    // 编辑显示名称
    editDisplayName() {
        document.getElementById('nameDisplay').classList.add('hidden');
        document.getElementById('nameEdit').classList.remove('hidden');
        
        // 填充当前值
        const currentName = this.currentProfile?.display_name || '';
        document.getElementById('newDisplayName').value = currentName;
        
        // 聚焦到输入框
        document.getElementById('newDisplayName').focus();
    }

    // 取消编辑显示名称
    cancelEditDisplayName() {
        document.getElementById('nameDisplay').classList.remove('hidden');
        document.getElementById('nameEdit').classList.add('hidden');
        
        this.clearAlert('basicInfo');
    }

    // 保存显示名称
    async saveDisplayName() {
        try {
            const newDisplayName = document.getElementById('newDisplayName').value.trim();
            
            if (!newDisplayName) {
                this.showError('basicInfo', '请输入显示名称');
                return;
            }

            if (newDisplayName === this.currentProfile?.display_name) {
                this.showError('basicInfo', '显示名称没有变化');
                return;
            }

            this.showLoading('basicInfo');
            this.clearAlert('basicInfo');

            // 更新显示名称（不需要密码验证）
            const response = await this.apiService.request('/profiles/current', {
                method: 'PUT',
                body: {
                    display_name: newDisplayName
                }
            });

            if (response && !response.error) {
                this.showSuccess('basicInfo', '显示名称更新成功');
                this.currentProfile.display_name = newDisplayName;
                document.getElementById('currentDisplayName').textContent = newDisplayName;
                this.cancelEditDisplayName();
                console.log('✅ 显示名称更新成功');
            } else {
                this.showError('basicInfo', response?.error || '更新失败');
            }
        } catch (error) {
            console.error('❌ 更新显示名称失败:', error);
            this.showError('basicInfo', '更新显示名称失败');
        } finally {
            this.hideLoading('basicInfo');
        }
    }

    // 编辑邮箱
    editEmail() {
        document.getElementById('emailDisplay').classList.add('hidden');
        document.getElementById('emailEdit').classList.remove('hidden');
        
        // 清空输入框
        document.getElementById('newEmail').value = '';
        document.getElementById('passwordForEmail').value = '';
        
        // 聚焦到输入框
        document.getElementById('newEmail').focus();
    }

    // 取消编辑邮箱
    cancelEditEmail() {
        document.getElementById('emailDisplay').classList.remove('hidden');
        document.getElementById('emailEdit').classList.add('hidden');
        
        // 清空密码
        document.getElementById('passwordForEmail').value = '';
        this.clearAlert('basicInfo');
    }

    // 保存邮箱
    async saveEmail() {
        try {
            const newEmail = document.getElementById('newEmail').value.trim();
            const password = document.getElementById('passwordForEmail').value;

            // 验证输入
            if (!newEmail) {
                this.showError('basicInfo', '请输入新邮箱地址');
                return;
            }

            if (!this.validateEmail(newEmail)) {
                this.showError('basicInfo', '请输入有效的邮箱地址');
                return;
            }

            if (!password) {
                this.showError('basicInfo', '请输入当前密码');
                return;
            }

            if (newEmail === this.currentProfile?.email) {
                this.showError('basicInfo', '新邮箱不能与当前邮箱相同');
                return;
            }

            this.showLoading('basicInfo');
            this.clearAlert('basicInfo');

            const response = await this.apiService.request('/profiles/change-email', {
                method: 'PUT',
                body: {
                    new_email: newEmail,
                    current_password: password
                }
            });

            if (response && !response.error) {
                this.showSuccess('basicInfo', '邮箱修改成功，请重新登录');
                
                // 清空表单
                this.cancelEditEmail();
                
                // 延迟后重定向到登录页
                setTimeout(() => {
                    this.authService.signOut();
                }, 2000);
                
                console.log('✅ 邮箱修改成功');
            } else {
                this.showError('basicInfo', response?.error || '邮箱修改失败');
            }
        } catch (error) {
            console.error('❌ 修改邮箱失败:', error);
            this.showError('basicInfo', '修改邮箱失败');
        } finally {
            this.hideLoading('basicInfo');
        }
    }
}

// 创建全局实例
window.profileManager = new ProfileManager();