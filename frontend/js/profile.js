// Profile Management Service
class ProfileManager {
    constructor() {
        this.apiService = window.apiService;
        this.authService = window.authService;
        this.currentProfile = null;
        this.avatarEditor = {
            file: null,
            scale: 1,
            x: 0,
            y: 0,
            isDragging: false,
            dragStart: { x: 0, y: 0 }
        };
    }

    async init() {
        console.log('🔄 初始化个人资料管理器...');
        
        // 确保头像编辑器初始状态为隐藏
        const modal = document.getElementById('avatarEditorModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
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


    // 开始头像编辑
    async startAvatarEdit(file) {
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

            // 保存文件引用
            this.avatarEditor.file = file;
            
            // 重置编辑器状态
            this.avatarEditor.scale = 1;
            this.avatarEditor.x = 0;
            this.avatarEditor.y = 0;
            
            // 读取文件并显示编辑器
            const reader = new FileReader();
            reader.onload = (e) => {
                this.showAvatarEditor(e.target.result);
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('❌ 启动头像编辑失败:', error);
            this.showError('basicInfo', '启动头像编辑失败');
        }
    }

    // 显示头像编辑器
    showAvatarEditor(imageDataUrl) {
        const modal = document.getElementById('avatarEditorModal');
        const cropImage = document.getElementById('cropImage');
        const scaleSlider = document.getElementById('scaleSlider');
        const xSlider = document.getElementById('xSlider');
        const ySlider = document.getElementById('ySlider');
        
        // 确保模态框初始状态是隐藏的
        modal.classList.add('hidden');
        
        // 设置图片
        cropImage.src = imageDataUrl;
        cropImage.onload = () => {
            this.initAvatarEditor();
            // 只有在图片加载完成后才显示模态框
            modal.classList.remove('hidden');
        };
        
        // 重置滑块
        scaleSlider.value = 1;
        xSlider.value = 0;
        ySlider.value = 0;
        
        // 绑定事件（在显示前绑定）
        this.bindAvatarEditorEvents();
    }

    // 初始化头像编辑器
    initAvatarEditor() {
        const cropImage = document.getElementById('cropImage');
        const container = document.getElementById('cropContainer');
        const xSlider = document.getElementById('xSlider');
        const ySlider = document.getElementById('ySlider');
        
        // 获取容器尺寸
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        // 确保图片已经加载
        if (cropImage.complete && cropImage.naturalWidth > 0) {
            this.setupImageSize();
        } else {
            cropImage.onload = () => {
                this.setupImageSize();
            };
        }
    }

    // 设置图片尺寸和位置
    setupImageSize() {
        const cropImage = document.getElementById('cropImage');
        const container = document.getElementById('cropContainer');
        const xSlider = document.getElementById('xSlider');
        const ySlider = document.getElementById('ySlider');
        
        // 获取容器尺寸
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        // 获取图片原始尺寸
        const imgWidth = cropImage.naturalWidth;
        const imgHeight = cropImage.naturalHeight;
        const aspectRatio = imgWidth / imgHeight;
        
        // 计算适合的显示尺寸
        let displayWidth, displayHeight;
        const cropCircleSize = 200; // 裁剪圆的直径
        
        // 确保图片至少能覆盖裁剪区域
        if (aspectRatio > 1) {
            // 横图：以能覆盖裁剪圆为准
            displayWidth = Math.max(cropCircleSize * 1.5, containerWidth * 0.8);
            displayHeight = displayWidth / aspectRatio;
        } else {
            // 竖图：以能覆盖裁剪圆为准
            displayHeight = Math.max(cropCircleSize * 1.5, containerHeight * 0.8);
            displayWidth = displayHeight * aspectRatio;
        }
        
        // 设置图片显示尺寸
        cropImage.style.width = displayWidth + 'px';
        cropImage.style.height = displayHeight + 'px';
        
        // 初始位置：居中显示
        this.avatarEditor.x = (containerWidth - displayWidth) / 2;
        this.avatarEditor.y = (containerHeight - displayHeight) / 2;
        
        // 设置滑块范围（允许足够的移动空间）
        const maxMoveX = Math.max(100, displayWidth / 3);
        const maxMoveY = Math.max(100, displayHeight / 3);
        xSlider.min = -maxMoveX;
        xSlider.max = maxMoveX;
        ySlider.min = -maxMoveY;
        ySlider.max = maxMoveY;
        
        // 设置滑块初始值
        xSlider.value = this.avatarEditor.x;
        ySlider.value = this.avatarEditor.y;
        
        // 更新显示
        this.updateImageTransform();
        this.updatePreview();
        
        console.log('图片初始化完成:', {
            original: { width: imgWidth, height: imgHeight },
            display: { width: displayWidth, height: displayHeight },
            position: { x: this.avatarEditor.x, y: this.avatarEditor.y }
        });
    }

    // 绑定头像编辑器事件
    bindAvatarEditorEvents() {
        const cropImage = document.getElementById('cropImage');
        const scaleSlider = document.getElementById('scaleSlider');
        const xSlider = document.getElementById('xSlider');
        const ySlider = document.getElementById('ySlider');
        
        // 滑块事件
        scaleSlider.oninput = () => {
            this.avatarEditor.scale = parseFloat(scaleSlider.value);
            this.updateImageTransform();
            this.updatePreview();
        };
        
        xSlider.oninput = () => {
            this.avatarEditor.x = parseFloat(xSlider.value);
            this.updateImageTransform();
            this.updatePreview();
        };
        
        ySlider.oninput = () => {
            this.avatarEditor.y = parseFloat(ySlider.value);
            this.updateImageTransform();
            this.updatePreview();
        };
        
        // 鼠标拖拽事件
        const startDrag = (clientX, clientY) => {
            this.avatarEditor.isDragging = true;
            this.avatarEditor.dragStart = {
                x: clientX - this.avatarEditor.x,
                y: clientY - this.avatarEditor.y
            };
        };
        
        const moveDrag = (clientX, clientY) => {
            if (this.avatarEditor.isDragging) {
                this.avatarEditor.x = clientX - this.avatarEditor.dragStart.x;
                this.avatarEditor.y = clientY - this.avatarEditor.dragStart.y;
                
                // 更新滑块位置
                xSlider.value = this.avatarEditor.x;
                ySlider.value = this.avatarEditor.y;
                
                this.updateImageTransform();
                this.updatePreview();
            }
        };
        
        const endDrag = () => {
            this.avatarEditor.isDragging = false;
        };
        
        // 鼠标事件
        cropImage.onmousedown = (e) => {
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
        };
        
        document.onmousemove = (e) => {
            moveDrag(e.clientX, e.clientY);
        };
        
        document.onmouseup = endDrag;
        
        // 触摸事件（移动设备支持）
        cropImage.ontouchstart = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        };
        
        document.ontouchmove = (e) => {
            if (this.avatarEditor.isDragging) {
                e.preventDefault();
                const touch = e.touches[0];
                moveDrag(touch.clientX, touch.clientY);
            }
        };
        
        document.ontouchend = endDrag;
    }

    // 更新图片变换
    updateImageTransform() {
        const cropImage = document.getElementById('cropImage');
        const transform = `translate(${this.avatarEditor.x}px, ${this.avatarEditor.y}px) scale(${this.avatarEditor.scale})`;
        cropImage.style.transform = transform;
    }

    // 更新预览
    updatePreview() {
        const preview = document.getElementById('avatarPreview');
        const cropImage = document.getElementById('cropImage');
        const container = document.getElementById('cropContainer');
        
        if (!cropImage || !cropImage.offsetWidth || !cropImage.src) return;
        
        // 容器和裁剪圆信息
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const cropRadius = 100; // 裁剪圆的半径（200px直径）
        const cropCenterX = containerWidth / 2;
        const cropCenterY = containerHeight / 2;
        
        // 图片当前显示信息（包含缩放和位移）
        const imgDisplayWidth = cropImage.offsetWidth * this.avatarEditor.scale;
        const imgDisplayHeight = cropImage.offsetHeight * this.avatarEditor.scale;
        const imgLeft = this.avatarEditor.x;
        const imgTop = this.avatarEditor.y;
        
        // 预览圆信息（80px直径）
        const previewSize = 80;
        
        // 计算缩放比例：预览圆（80px）相对于裁剪圆（200px）= 80/200 = 0.4
        const scaleRatio = previewSize / (cropRadius * 2);
        
        // 在预览中，图片的尺寸
        const previewImgWidth = imgDisplayWidth * scaleRatio;
        const previewImgHeight = imgDisplayHeight * scaleRatio;
        
        // 计算图片在预览中的位置
        // 裁剪圆中心相对于图片左上角的位置
        const cropCenterToImgX = cropCenterX - imgLeft;
        const cropCenterToImgY = cropCenterY - imgTop;
        
        // 在预览中，图片应该放在什么位置，使得裁剪圆的中心对应预览圆的中心
        const previewImgLeft = (previewSize / 2) - (cropCenterToImgX * scaleRatio);
        const previewImgTop = (previewSize / 2) - (cropCenterToImgY * scaleRatio);
        
        // 设置预览背景
        preview.style.backgroundImage = `url(${cropImage.src})`;
        preview.style.backgroundSize = `${previewImgWidth}px ${previewImgHeight}px`;
        preview.style.backgroundPosition = `${previewImgLeft}px ${previewImgTop}px`;
        preview.style.backgroundRepeat = 'no-repeat';
        
        console.log('预览计算:', {
            container: { width: containerWidth, height: containerHeight },
            cropCircle: { centerX: cropCenterX, centerY: cropCenterY, radius: cropRadius },
            image: { 
                left: imgLeft, 
                top: imgTop, 
                displayWidth: imgDisplayWidth, 
                displayHeight: imgDisplayHeight,
                scale: this.avatarEditor.scale
            },
            cropCenterToImg: { x: cropCenterToImgX, y: cropCenterToImgY },
            preview: {
                size: previewSize,
                scaleRatio: scaleRatio,
                imgWidth: previewImgWidth,
                imgHeight: previewImgHeight,
                imgLeft: previewImgLeft,
                imgTop: previewImgTop
            }
        });
    }

    // 上传头像（从编辑器裁剪后的图片）
    async uploadAvatar(file) {
        try {
            this.showLoading('basicInfo');
            this.clearAlert('basicInfo');

            // 创建FormData
            const formData = new FormData();
            formData.append('file', file);

            // 上传头像
            const response = await this.apiService.uploadFile('/profiles/upload-avatar', formData);

            if (response && response.avatar_url && !response.error) {
                this.showSuccess('basicInfo', '头像上传成功');
                
                // 更新个人资料页面头像显示
                const avatarDisplay = document.getElementById('avatarDisplay');
                if (avatarDisplay) {
                    avatarDisplay.innerHTML = `<img src="${response.avatar_url}" alt="头像" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                }
                
                // 更新当前资料数据
                if (this.currentProfile) {
                    this.currentProfile.avatar_url = response.avatar_url;
                }
                
                // 通知主页面更新头像（如果存在）
                this.notifyMainPageAvatarUpdate(response.avatar_url);
                
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

    // 从Canvas裁剪图片
    cropImageToBlob() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const cropImage = document.getElementById('cropImage');
            const container = document.getElementById('cropContainer');
            
            // 设置画布尺寸为裁剪圆的尺寸
            const outputSize = 200;
            canvas.width = outputSize;
            canvas.height = outputSize;
            
            // 创建一个临时图片对象来获取原始图片数据
            const tempImg = new Image();
            tempImg.onload = () => {
                try {
                    // 容器和裁剪圆信息 - 与预览算法保持一致
                    const containerWidth = container.offsetWidth;
                    const containerHeight = container.offsetHeight;
                    const cropRadius = 100; // 裁剪圆的半径（200px直径的一半）
                    const cropCenterX = containerWidth / 2;
                    const cropCenterY = containerHeight / 2;
                    
                    // 图片显示信息（包含缩放和位移） - 与预览算法保持一致
                    const imgDisplayWidth = cropImage.offsetWidth * this.avatarEditor.scale;
                    const imgDisplayHeight = cropImage.offsetHeight * this.avatarEditor.scale;
                    const imgLeft = this.avatarEditor.x;
                    const imgTop = this.avatarEditor.y;
                    
                    // 计算裁剪圆左上角相对于图片的位置 - 与预览算法保持一致
                    const cropLeft = cropCenterX - cropRadius - imgLeft;
                    const cropTop = cropCenterY - cropRadius - imgTop;
                    const cropSize = cropRadius * 2; // 200px
                    
                    // 计算原始图片到显示图片的比例
                    const scaleToOriginal = tempImg.width / imgDisplayWidth;
                    
                    // 在原始图片中的裁剪区域
                    const sourceX = cropLeft * scaleToOriginal;
                    const sourceY = cropTop * scaleToOriginal;
                    const sourceSize = cropSize * scaleToOriginal;
                    
                    console.log('裁剪参数:', {
                        container: { width: containerWidth, height: containerHeight },
                        circle: { centerX: cropCenterX, centerY: cropCenterY, radius: cropRadius },
                        image: { left: imgLeft, top: imgTop, displayWidth: imgDisplayWidth, displayHeight: imgDisplayHeight },
                        crop: { left: cropLeft, top: cropTop, size: cropSize },
                        source: { x: sourceX, y: sourceY, size: sourceSize },
                        original: { width: tempImg.width, height: tempImg.height }
                    });
                    
                    // 在画布上绘制裁剪后的图片
                    ctx.drawImage(
                        tempImg,
                        sourceX, sourceY, sourceSize, sourceSize, // 源图裁剪区域
                        0, 0, outputSize, outputSize // 目标区域（整个画布）
                    );
                    
                    // 将画布内容转换为Blob
                    canvas.toBlob((blob) => {
                        console.log('裁剪完成，图片大小:', blob.size, 'bytes');
                        resolve(blob);
                    }, 'image/png', 0.9);
                    
                } catch (error) {
                    console.error('裁剪过程出错:', error);
                    // 如果裁剪失败，返回一个空的Blob
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/png', 0.9);
                }
            };
            
            tempImg.onerror = () => {
                console.error('图片加载失败');
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png', 0.9);
            };
            
            tempImg.src = cropImage.src;
        });
    }

    // 确认头像编辑
    async confirmAvatarEdit() {
        try {
            // 获取裁剪后的图片
            const croppedBlob = await this.cropImageToBlob();
            
            // 创建File对象
            const croppedFile = new File([croppedBlob], 'avatar.png', { type: 'image/png' });
            
            // 隐藏编辑器
            this.hideAvatarEditor();
            
            // 上传裁剪后的图片
            await this.uploadAvatar(croppedFile);
            
        } catch (error) {
            console.error('❌ 确认头像编辑失败:', error);
            this.showError('basicInfo', '处理头像失败');
        }
    }

    // 取消头像编辑
    cancelAvatarEdit() {
        this.hideAvatarEditor();
        // 清空文件输入
        document.getElementById('avatarInput').value = '';
    }

    // 隐藏头像编辑器
    hideAvatarEditor() {
        const modal = document.getElementById('avatarEditorModal');
        modal.classList.add('hidden');
        
        // 清理事件监听器
        document.onmousemove = null;
        document.onmouseup = null;
        document.ontouchmove = null;
        document.ontouchend = null;
        
        // 重置编辑器状态
        this.avatarEditor = {
            file: null,
            scale: 1,
            x: 0,
            y: 0,
            isDragging: false,
            dragStart: { x: 0, y: 0 }
        };
    }

    // 通知主页面更新头像
    notifyMainPageAvatarUpdate(avatarUrl) {
        try {
            // 使用localStorage存储头像更新事件
            localStorage.setItem('avatarUpdated', JSON.stringify({
                url: avatarUrl,
                timestamp: Date.now()
            }));
            
            // 如果是在同一个域名下，尝试直接更新父页面
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'AVATAR_UPDATED',
                    avatarUrl: avatarUrl
                }, '*');
            }
            
            console.log('头像更新通知已发送');
        } catch (error) {
            console.log('通知主页面失败，这是正常的:', error.message);
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