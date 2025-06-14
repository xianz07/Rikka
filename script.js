// --- 最终绕过版 script.js ---
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
            const deviceId = getDeviceId(); // 现在能获取到正确的 deviceId 了
            console.log(`准备调用云函数，参数: code=${codeInput}, deviceId=${deviceId}`);
            
            // ✅✅✅ 唯一修改的地方在这里 ✅✅✅
            const result = await AV.Cloud.run('verifyAndUseCode', { code: codeInput, deviceId: deviceId });
            
            if (result.success) {
                activationStatus.textContent = '激活成功！';
                setTimeout(showApp, 1000);
            } else {
                activationStatus.textContent = result.message;
            }
        } catch (error) {
            console.error("调用云函数出错:", error);
            activationStatus.textContent = '激活失败，请检查网络或联系管理员。';
        }
    }
    
    // ✅ 修复点：已为 getDeviceId 添加 return 语句
    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId; // <--- 关键的 return
    }

    function showApp() {
        activationWrapper.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        if (!network) {
            const container = document.getElementById('relation-graph');
            const data = { nodes: nodes, edges: edges };
            const options = {
    nodes: { 
        borderWidth: 4, 
        size: 40, 
        color: { border: '#FFFFFF', highlight: { border: '#007bff' } }, 
        font: { color: '#333', size: 14, face: 'arial' }, 
        shape: 'circularImage' 
    },
    edges: { 
        color: '#999', 
        width: 2, 
        font: { align: 'top', size: 12, color: '#888', strokeWidth: 0 }, 
        arrows: { to: { enabled: false } }, 
        smooth: { type: 'cubicBezier' } 
    },
    physics: { 
        enabled: true, 
        solver: 'forceAtlas2Based', 
        forceAtlas2Based: { gravitationalConstant: -80, centralGravity: 0.01, springLength: 150, damping: 0.4, avoidOverlap: 1 } 
    },
    interaction: { 
        hover: true, 
        tooltipDelay: 200 
    },
};
            network = new vis.Network(container, data, options);
            initializeEventListeners(); // 在 network 创建后再绑定事件
        }
        
        loadData();
    }
    
    function initializeEventListeners() {
        // ... (这里放所有除了激活按钮之外的事件监听器)
        // 例如：network.on('click', ...), showFormBtn.addEventListener(...) 等
    }
    
    async function loadData() { /* 为了简洁，这里省略函数体，请确保你的文件里有这个函数的完整内容 */ }
    // ... 其他所有功能函数

    // --- 初始化 ---
    // 页面加载时只绑定激活按钮的事件
    activateBtn.addEventListener('click', activateDevice);
    checkActivation();
});
