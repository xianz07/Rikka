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

    // --- DOM 元素获取 (省略，和之前一样) ---
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
            console.log(`准备调用云函数 'activateCode'，参数: code=${codeInput}, deviceId=${deviceId}`);
            
            // ✅ 修复点：确保这里调用的是 'activateCode'
            const result = await AV.Cloud.run('activateCode', { code: codeInput, deviceId: deviceId });
            
            if (result && result.success) {
                activationStatus.textContent = '激活成功！';
                setTimeout(showApp, 1000);
            } else {
                activationStatus.textContent = result ? result.message : "激活失败，未知错误。";
            }
        } catch (error) {
            console.error("调用云函数出错:", error);
            // 检查错误信息，如果是 404，给出更具体的提示
            if (error.message && error.message.includes('404')) {
                 activationStatus.textContent = '激活失败：云函数未找到。请联系管理员。';
            } else {
                 activationStatus.textContent = '激活失败，请检查网络或联系管理员。';
            }
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
        activationWrapper.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        if (!network) {
            const container = document.getElementById('relation-graph');
            const data = { nodes: nodes, edges: edges };
            const options = { /* ... 选项 ... */ };
            network = new vis.Network(container, data, options);
            initializeEventListeners();
        }
        
        loadData();
    }
    
    // ... (其他所有函数，如 initializeEventListeners, loadData 等，都和之前一样)

    // --- 初始化 ---
    activateBtn.addEventListener('click', activateDevice);
    checkActivation();
});
