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

    // --- DOM 元素获取 ---
    const activationWrapper = document.getElementById('activation-wrapper');
    const activateBtn = document.getElementById('activate-btn');
    const activationStatus = document.getElementById('activation-status');
    const appContainer = document.getElementById('app-container');
    const detailsModal = document.getElementById('details-modal');
    // ... 其他所有 getElementById 的代码
    
    const PRESET_FIELDS = [/* ... */]; // 省略以保持简洁

    // --- 激活码逻辑 ---
    async function checkActivation() {
        console.log("A. 页面加载，开始检查激活状态...");
        const deviceId = getDeviceId();
        const query = new AV.Query('ActivatedDevices').equalTo('deviceId', deviceId);
        try {
            const device = await query.first();
            if (device) {
                console.log("B. 设备已激活，准备显示主应用。");
                showApp();
            } else {
                console.log("C. 设备未激活，显示激活界面。");
                activationWrapper.classList.remove('hidden');
            }
        } catch (error) {
            console.error("D. 检查激活状态时出错:", error);
            activationStatus.textContent = '无法连接验证服务器，请刷新重试。';
        }
    }

    async function activateDevice() {
        console.log("1. '激活'按钮被点击，activateDevice 函数开始执行。");

        const codeInput = document.getElementById('activation-code-input').value.trim();
        console.log("2. 获取到输入框内容:", `"${codeInput}"`);

        if (!codeInput) {
            console.log("3. 输入框为空，函数提前退出。");
            alert("请输入激活码！");
            return;
        }
        
        console.log("4. 输入框内容不为空，准备调用云函数。");
        activationStatus.textContent = '验证中...';

        try {
            console.log("5. 准备发送请求到云函数 activateCode，参数为:", { code: codeInput, deviceId: getDeviceId() });
            const result = await AV.Cloud.run('activateCode', { code: codeInput, deviceId: getDeviceId() });
            
            console.log("6. 云函数成功返回结果:", result);
            if (result.success) {
                console.log("7. 激活成功！");
                activationStatus.textContent = '激活成功！';
                setTimeout(showApp, 1000);
            } else {
                console.log("8. 激活失败，服务器返回信息:", result.message);
                activationStatus.textContent = result.message;
            }
        } catch (error) {
            console.error("9. 调用云函数时发生网络错误或服务器内部错误:", error);
            activationStatus.textContent = '激活失败，请检查网络或联系管理员。';
        }
    }
    
    function getDeviceId() { /* ... 和原来一样 ... */ }

    function showApp() {
        console.log("E. showApp 函数被调用，显示主应用界面。");
        activationWrapper.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        if (!network) { // 防止重复初始化
            const container = document.getElementById('relation-graph');
            const data = { nodes: nodes, edges: edges };
            const options = { /* ... 选项 ... */ };
            network = new vis.Network(container, data, options);
            console.log("F. vis.js network 实例已创建。");
        }
        
        loadData();
    }
    
    // --- 其他所有函数 (loadData, openDetailsModal 等) 和之前一样 ---
    // ...

    // --- 初始化 ---
    console.log("0. DOMContentLoaded 事件触发，脚本开始执行。");
    // 确保激活按钮的事件监听器被绑定
    activateBtn.addEventListener('click', activateDevice);
    console.log("Z. 为 #activate-btn 按钮绑定了点击事件。");
    
    checkActivation();
});

// 为了简洁，我省略了所有其他函数的代码体。
// 请确保你的文件里有完整的函数定义。
