// --- 最终修复版 script.js (已加入新的调试日志) ---
document.addEventListener('DOMContentLoaded', function() {
    // --- 初始化和全局变量 ---
    const APP_ID = 'KaL72m8OYrLQxlJVg6wTYBzv-gzGzoHsz';
    const APP_KEY = 'R60VntUpKs5bsYHGJzWoac5G';
    const SERVER_URL = 'https://kal72m8o.lc-cn-n1-shared.com';
    
    AV.init({ appId: APP_ID, appKey: APP_KEY, serverURL: SERVER_URL });

    let network = null;
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);
    let editingNodeId = null; 

    // --- DOM 元素获取 (省略) ---
    const activationWrapper = document.getElementById('activation-wrapper');
    const activateBtn = document.getElementById('activate-btn');
    const activationStatus = document.getElementById('activation-status');
    const appContainer = document.getElementById('app-container');
    // ... 其他元素

    // --- 激活码逻辑 ---
    async function checkActivation() {
        const deviceId = getDeviceId();
        const query = new AV.Query('ActivatedDevices').equalTo('deviceId', deviceId);
        try {
            const device = await query.first();
            if (device) {
                showApp();
            } else {
                activationWrapper.classList.remove('hidden');
            }
        } catch (error) {
            activationStatus.textContent = '无法连接验证服务器，请刷新重试。';
            console.error("检查激活状态时出错:", error);
        }
    }

    async function activateDevice() {
        const codeInput = document.getElementById('activation-code-input').value.trim();
        if (!codeInput) { return alert("请输入激活码！"); }
        
        activationStatus.textContent = '验证中...';
        try {
            const deviceId = getDeviceId();
            const result = await AV.Cloud.run('activateCode', { code: codeInput, deviceId: deviceId });
            
            console.log("云函数返回结果:", result); // 打印云函数返回的原始结果

            if (result && result.success) {
                console.log("✅ 激活成功！进入 if (result.success) 代码块。"); // 调试点1
                activationStatus.textContent = '激活成功！';
                
                console.log("准备在1秒后调用 showApp() 函数..."); // 调试点2
                setTimeout(showApp, 1000);

            } else {
                console.log("激活失败，服务器返回信息:", result ? result.message : "无有效返回");
                activationStatus.textContent = result ? result.message : "激活失败，未知错误。";
            }
        } catch (error) {
            console.error("调用云函数出错:", error);
            activationStatus.textContent = '激活失败，请检查网络或联系管理员。';
        }
    }
    
    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    function showApp() {
        console.log("🚀 showApp 函数被调用！"); // 调试点3

        activationWrapper.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        console.log("成功切换了容器的 hidden 类。"); // 调试点4

        if (!network) {
            const container = document.getElementById('relation-graph');
            const data = { nodes: nodes, edges: edges };
            const options = { /* ... 选项 ... */ };
            network = new vis.Network(container, data, options);
            initializeEventListeners();
        }
        
        loadData();
    }
    
    function initializeEventListeners() {
        // 这里应该包含所有除了激活按钮之外的事件监听器
        // 比如 network.on('click', ...), showFormBtn.addEventListener(...) 等
        console.log("所有主应用的事件监听器已初始化。");
    }
    
    async function loadData() {
        console.log("正在加载关系图数据...");
        // ... loadData 的具体实现
    }
    // ... 其他所有功能函数

    // --- 初始化 ---
    // 页面加载时只绑定激活按钮的事件
    activateBtn.addEventListener('click', activateDevice);
    checkActivation();
});
