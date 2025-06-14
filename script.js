document.addEventListener('DOMContentLoaded', function() {
    // --- 初始化和全局变量 ---
    const APP_ID = 'KaL72m8OYrLQxlJVg6wTYBzv-gzGzoHsz';
    const APP_KEY = 'R60VntUpKs5bsYHGJzWoac5G';
    const SERVER_URL = 'https://kal72m8o.lc-cn-n1-shared.com';
    
    AV.init({ appId: APP_ID, appKey: APP_KEY, serverURL: SERVER_URL });

    // ... (vis.js 初始化代码和之前一样) ...
    
    // --- DOM 元素获取 ---
    const activationWrapper = document.getElementById('activation-wrapper');
    const activateBtn = document.getElementById('activate-btn');
    const activationStatus = document.getElementById('activation-status');
    const appContainer = document.getElementById('app-container');
    const detailsModal = document.getElementById('details-modal');
    // ... (其他 DOM 元素获取) ...

    const PRESET_FIELDS = [ // 预设的档案字段
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
        const device = await query.first();

        if (device) {
            showApp();
        } else {
            activationWrapper.style.display = 'flex';
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
        loadData(); // 激活成功后才加载数据
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
        
        // 保存按钮绑定当前节点ID
        document.getElementById('save-details-btn').onclick = () => saveDetails(nodeId);

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
            document.getElementById('details-modal').classList.add('hidden');
        } catch (error) {
            alert('保存失败！');
            console.error(error);
        }
    }


    // --- 事件绑定 ---
    activateBtn.addEventListener('click', activateDevice);
    
    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            // ... (旧的 bio-card 逻辑) ...
            // 新增一个按钮的点击事件
            document.getElementById('details-btn').onclick = () => {
                closeBioCard();
                openDetailsModal(params.nodes[0]);
            };
        }
    });
    
    document.getElementById('details-modal-close-btn').addEventListener('click', () => {
        detailsModal.classList.add('hidden');
    });

    // --- 初始化 ---
    checkActivation();
});
