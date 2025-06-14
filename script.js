document.addEventListener('DOMContentLoaded', function() {
    // --- 初始化和全局变量 ---
    const APP_ID = 'KaL72m8OYrLQxlJVg6wTYBzv-gzGzoHsz';
    const APP_KEY = 'R60VntUpKs5bsYHGJzWoac5G';
    const SERVER_URL = 'https://kal72m8o.lc-cn-n1-shared.com';
    
    AV.init({ appId: APP_ID, appKey: APP_KEY, serverURL: SERVER_URL });

    let network = null; // 将 network 声明在全局，初始为 null
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);
    let editingNodeId = null; 

    // --- DOM 元素获取 ---
    const activationWrapper = document.getElementById('activation-wrapper');
    const activateBtn = document.getElementById('activate-btn');
    const activationStatus = document.getElementById('activation-status');
    const appContainer = document.getElementById('app-container');
    const formWrapper = document.getElementById('form-wrapper');
    const showFormBtn = document.getElementById('show-form-btn');
    const formCloseBtn = document.getElementById('form-close-btn');
    const formTitle = document.getElementById('form-title');
    const addForm = document.getElementById('add-form');
    const saveNodeBtn = document.getElementById('save-node-btn');
    const addEdgeBtn = document.getElementById('add-edge-btn');
    const imageInput = document.getElementById('node-image');
    const imagePreview = document.getElementById('image-preview');
    const bioCard = document.getElementById('bio-card');
    const bioAvatar = document.getElementById('bio-avatar');
    const bioName = document.getElementById('bio-name');
    const bioText = document.getElementById('bio-text');
    const closeBioBtn = document.getElementById('close-btn');
    const detailsBtn = document.getElementById('details-btn');
    const editBtn = document.getElementById('edit-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const detailsModal = document.getElementById('details-modal');
    const detailsModalCloseBtn = document.getElementById('details-modal-close-btn');
    const saveDetailsBtn = document.getElementById('save-details-btn');
    const addFieldBtn = document.getElementById('add-field-btn');

    const PRESET_FIELDS = [
        { key: 'gender', label: '性别' }, { key: 'birthDate', label: '出生日期' },
        { key: 'idNumber', label: '身份证号码' }, { key: 'hukouLocation', label: '户籍所在地' },
        { key: 'currentAddress', label: '常住地址' }, { key: 'phone', label: '手机号' },
        { key: 'wechat', label: '微信号' }, { key: 'email', label: '邮箱' },
        { key: 'maritalStatus', label: '婚姻状况' }, { key: 'politicalStatus', label: '政治面貌' },
        { key: 'education', label: '学历层次' }, { key: 'major', label: '专业方向' },
        { key: 'company', label: '当前工作单位' }, { key: 'jobTitle', label: '职务/岗位' },
        { key: 'hobbies', label: '兴趣爱好', type: 'textarea' },
        { key: 'remarks', label: '备注', type: 'textarea' }
    ];

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
            console.error(error);
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
        
        const container = document.getElementById('relation-graph');
        const data = { nodes: nodes, edges: edges };
        const options = { /* 你可以把之前的 options 配置复制到这里 */ };
        network = new vis.Network(container, data, options);

        initializeEventListeners();
        loadData();
    }

    function initializeEventListeners() {
        activateBtn.addEventListener('click', activateDevice);
        detailsModalCloseBtn.addEventListener('click', () => detailsModal.classList.add('hidden'));

        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const nodeData = nodes.get(nodeId);
                
                bioAvatar.src = nodeData.image;
                bioName.textContent = nodeData.label;
                bioText.textContent = nodeData.bio;
                
                detailsBtn.onclick = () => { closeBioCard(); openDetailsModal(nodeId); };
                editBtn.onclick = () => { /* ... */ };
                deleteBtn.onclick = () => { /* ... */ };

                bioCard.classList.remove('hidden');
            }
        });
    }

    function closeBioCard() {
        bioCard.classList.add('hidden');
    }

    // --- 详细档案逻辑 ---
    async function openDetailsModal(nodeId) {
        const node = await AV.Object.createWithoutData('Nodes', nodeId).fetch();
        document.getElementById('details-modal-title').textContent = `${node.get('label')} 的详细档案`;
        
        const detailsContent = document.getElementById('details-content');
        detailsContent.innerHTML = '';
        
        PRESET_FIELDS.forEach(field => {
            const value = node.get(field.key) || '';
            detailsContent.insertAdjacentHTML('beforeend', createFieldHTML(field.key, field.label, value, field.type));
        });
        
        saveDetailsBtn.onclick = () => saveDetails(nodeId);
        detailsModal.classList.remove('hidden');
    }

    function createFieldHTML(key, label, value, type = 'input') {
        const inputElement = type === 'textarea'
            ? `<textarea data-key="${key}">${value}</textarea>`
            : `<input type="text" data-key="${key}" value="${value}">`;
        
        return `
            <div class="detail-entry">
                <div class="detail-entry-label">${label}</div>
                <div class="detail-entry-value">${inputElement}</div>
            </div>
        `;
    }

    async function saveDetails(nodeId) {
        const node = AV.Object.createWithoutData('Nodes', nodeId);
        const entries = document.querySelectorAll('#details-content [data-key]');
        
        entries.forEach(entry => {
            node.set(entry.dataset.key, entry.value);
        });

        try {
            await node.save();
            alert('详细档案保存成功！');
            detailsModal.classList.add('hidden');
        } catch (error) {
            alert('保存失败！');
            console.error(error);
        }
    }

    async function loadData() {
        // ... (loadData 函数和之前一样)
    }

    // --- 初始化 ---
    checkActivation();
});
