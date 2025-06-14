// --- script.js (已修复 network is not defined 的问题) ---
document.addEventListener('DOMContentLoaded', function() {
    // --- 初始化和全局变量 ---
    const APP_ID = 'KaL72m8OYrLQxlJVg6wTYBzv-gzGzoHsz';
    const APP_KEY = 'R60VntUpKs5bsYHGJzWoac5G';
    const SERVER_URL = 'https://kal72m8o.lc-cn-n1-shared.com';
    
    AV.init({ appId: APP_ID, appKey: APP_KEY, serverURL: SERVER_URL });

    let network = null; // 将 network 声明在全局
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);

    // --- DOM 元素获取 (省略部分) ---
    const activationWrapper = document.getElementById('activation-wrapper');
    const activateBtn = document.getElementById('activate-btn');
    const activationStatus = document.getElementById('activation-status');
    const appContainer = document.getElementById('app-container');
    const detailsModal = document.getElementById('details-modal');
    // ... 其他所有 getElementById 的代码都放在这里

    const PRESET_FIELDS = [ // 预设的档案字段
        // ... (这部分和原来一样)
    ];

    // --- 激活码逻辑 ---
    async function checkActivation() {
        const deviceId = getDeviceId();
        const query = new AV.Query('ActivatedDevices').equalTo('deviceId', deviceId);
        const device = await query.first();
        if (device) {
            showApp();
        } else {
            activationWrapper.classList.remove('hidden');
        }
    }

    async function activateDevice() {
        const codeInput = document.getElementById('activation-code-input').value.trim();
        if (!codeInput) return;
        activationStatus.textContent = '验证中...';
        try {
            const result = await AV.Cloud.run('activateCode', { code: codeInput, deviceId: getDeviceId() });
            if (result.success) {
                activationStatus.textContent = '激活成功！';
                setTimeout(showApp, 1000);
            } else {
                activationStatus.textContent = result.message;
            }
        } catch (error) {
            activationStatus.textContent = '激活失败，请检查网络或联系管理员。';
            console.error(error); // 打印详细错误
        }
    }
    
    function getDeviceId() {
        // ... (和原来一样)
    }

    function showApp() {
        activationWrapper.classList.add('hidden');
        appContainer.classList.remove('hidden');

        // *** 修复点 1: 在这里初始化 network 实例 ***
        const container = document.getElementById('relation-graph');
        const data = { nodes: nodes, edges: edges };
        const options = { /* ... 选项和之前一样 ... */ };
        network = new vis.Network(container, data, options); // 赋值给全局的 network 变量

        initializeEventListeners(); // 初始化所有事件监听
        loadData(); // 加载数据
    }

    // *** 修复点 2: 将所有事件监听都封装到一个函数里 ***
    function initializeEventListeners() {
        activateBtn.addEventListener('click', activateDevice);
        
        // 点击网络节点
        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const nodeData = nodes.get(nodeId);
                // ... (显示 bio-card 的逻辑) ...
                document.getElementById('details-btn').onclick = () => {
                    // closeBioCard();
                    openDetailsModal(nodeId);
                };
            }
        });
        
        document.getElementById('details-modal-close-btn').addEventListener('click', () => {
            detailsModal.classList.add('hidden');
        });

        // ... (其他所有 addEventListener 代码都移到这里) ...
    }

    // --- 详细档案逻辑 ---
    async function openDetailsModal(nodeId) { /* ... 和原来一样 ... */ }
    function createFieldHTML(key, label, value, type = 'input') { /* ... 和原来一样 ... */ }
    async function saveDetails(nodeId) { /* ... 和原来一样 ... */ }
    async function loadData() { /* ... 和原来一样 ... */ }

    // --- 初始化 ---
    checkActivation();
});
