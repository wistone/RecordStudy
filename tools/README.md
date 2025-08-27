# 🛠️ 调试工具

## debug_summary.py
用于调试后端汇总计算逻辑的Python脚本。

**使用方法:**
```bash
venv/bin/python tools/debug_summary.py
```

**功能:**
- 验证API汇总数据的正确性
- 调试连击天数计算逻辑
- 对比期望值与实际值

## 浏览器控制台调试

**测试API连接:**
```javascript
// 检查当前用户数据
window.app.weekSummary;
window.app.monthSummary;
window.app.records.length;

// 手动调用API
window.apiService.getDashboardSummary(7).then(console.log);
```

**检查数据计算:**
```javascript
// 查看analytics页面计算
window.app.records.reduce((sum, r) => sum + r.duration, 0);
```