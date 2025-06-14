document.addEventListener('DOMContentLoaded', () => {
    // --- App Initialization ---
    const APP_ID = 'KaL72m8OYrLQxlJVg6wTYBzv-gzGzoHsz';
    const APP_KEY = 'R60VntUpKs5bsYHGJzWoac5G';
    const SERVER_URL = 'https://kal72m8o.lc-cn-n1-shared.com';
    AV.init({ appId: APP_ID, appKey: APP_KEY, serverURL: SERVER_URL });

    let network, editingNodeId;
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);
    const dom = {};
    const elementIds = ['activation-wrapper', 'activate-btn', 'activation-status', 'activation-code-input', 'app-container', 'form-wrapper', 'show-form-btn', 'form-close-btn', 'form-title', 'add-form', 'save-node-btn', 'node-name', 'node-bio', 'node-image', 'image-preview', 'bio-card', 'bio-avatar', 'bio-name', 'bio-text', 'close-btn', 'details-btn', 'edit-btn', 'delete-btn', 'details-modal', 'details-modal-close-btn', 'details-modal-title', 'details-content', 'add-field-btn', 'save-details-btn', 'history-modal', 'history-title', 'history-close-btn', 'history-list'];
    elementIds.forEach(id => dom[id] = document.getElementById(id));
    
    const PRESET_FIELDS = [
        { key: 'gender', label: '性别' }, { key: 'birthDate', label: '出生日期' }, { key: 'idNumber', label: '身份证号码' }, { key: 'hukouLocation', label: '户籍所在地' }, { key: 'currentAddress', label: '常住地址' }, { key: 'phone', label: '手机号' }, { key: 'wechat', label: '微信号' }, { key: 'email', label: '邮箱' }, { key: 'maritalStatus', label: '婚姻状况' }, { key: 'politicalStatus', label: '政治面貌' }, { key: 'education', label: '学历层次' }, { key: 'major', label: '专业方向' }, { key: 'company', label: '当前工作单位' }, { key: 'jobTitle', label: '职务/岗位' }, { key: 'hobbies', label: '兴趣爱好', type: 'textarea' }, { key: 'remarks', label: '备注', type: 'textarea' }
    ];

    // --- Utility Functions ---
    const getDeviceId = () => localStorage.getItem('deviceId') || (() => { const id = `d_${Date.now()}${Math.random()}`; localStorage.setItem('deviceId', id); return id; })();
    const toggleModal = (modal, show) => modal.classList.toggle('hidden', !show);
    const generateAvatar = (name) => {
        const canvas = document.createElement('canvas');
        canvas.width = 120; canvas.height = 120;
        const context = canvas.getContext('2d');
        const colors = ["#E27D60", "#85DCB0", "#E8A87C", "#C38D9E", "#41B3A3"];
        context.fillStyle = colors[name.charCodeAt(0) % colors.length];
        context.fillRect(0, 0, 120, 120);
        context.fillStyle = "white";
        context.font = "bold 56px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(name.charAt(0).toUpperCase(), 60, 65);
        return canvas.toDataURL();
    };
    const compressImage = (file, quality = 0.7, maxWidth = 800) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });

    // --- Core Logic ---
    const checkActivation = async () => {
        try {
            const device = await new AV.Query('ActivatedDevices').equalTo('deviceId', getDeviceId()).first();
            device ? showApp() : showActivation();
        } catch (error) {
            if (dom.activationStatus) dom.activationStatus.textContent = '无法连接验证服务器，请刷新。';
        }
    };
    const activateDevice = async () => {
        const code = dom['activation-code-input'].value.trim();
        if (!code) return alert("请输入激活码！");
        dom.activateBtn.disabled = true;
        dom.activationStatus.textContent = '验证中...';
        try {
            const result = await AV.Cloud.run('verifyAndUseCode', { code, deviceId: getDeviceId() });
            dom.activationStatus.textContent = result.message || '激活失败';
            if (result.success) setTimeout(showApp, 500);
            else dom.activateBtn.disabled = false;
        } catch (error) {
            dom.activationStatus.textContent = '激活失败，请检查网络。';
            dom.activateBtn.disabled = false;
        }
    };

    const showActivation = () => {
        dom.activateBtn.addEventListener('click', activateDevice);
        toggleModal(dom.activationWrapper, true);
    };
    const showApp = () => {
        toggleModal(dom.activationWrapper, true); // 先隐藏激活窗口
        dom.appContainer.classList.remove('hidden'); // 再显示主应用
        if (!network) {
            const container = dom['relation-graph'];
            const data = { nodes, edges };
            const options = {
                physics: { stabilization: false, barnesHut: { gravitationalConstant: -8000, springConstant: 0.04, springLength: 95 } },
                interaction: { hover: true, tooltipDelay: 200 },
                nodes: { shape: 'circularImage', borderWidth: 3, color: { border: '#ffffff', highlight: { border: '#4A90E2' } }, size: 30 },
                edges: { width: 1.5, color: { color: '#cccccc', highlight: '#4A90E2' }, font: { align: 'top' } }
            };
            network = new vis.Network(container, data, options);
            initializeAppEventListeners();
        }
        loadData();
    };

    const initializeAppEventListeners = () => {
        dom.showFormBtn.addEventListener('click', () => openForm('add'));
        [dom.formCloseBtn, dom.closeBtn, dom.historyCloseBtn, dom.detailsModalCloseBtn].forEach(btn => {
            if (btn) btn.addEventListener('click', () => toggleModal(btn.closest('.modal-wrapper'), false));
        });
        dom.addForm.addEventListener('submit', saveNode);
        dom.saveDetailsBtn.addEventListener('click', () => editingNodeId && saveDetails(editingNodeId));
        dom.addFieldBtn.addEventListener('click', () => {
            const label = prompt("请输入要添加的信息名称 (例如: QQ号)");
            if (label) {
                const key = pinyin_pro.pinyin(label, { toneType: 'none', type: 'camel' }).replace(/\s/g, '');
                if (key) dom.detailsContent.insertAdjacentHTML('beforeend', createFieldHTML(key, label, ''));
                else alert("无法为该名称生成字段ID。");
            }
        });
        dom.nodeImage.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const compressedDataUrl = await compressImage(file);
                    dom.imagePreview.src = compressedDataUrl;
                    dom.imagePreview.classList.remove('hidden');
                } catch (err) { alert('图片预览失败'); }
            }
        });
        network.on('click', ({ nodes: nodeIds }) => {
            if (nodeIds.length > 0) {
                editingNodeId = nodeIds[0];
                const nodeData = nodes.get(editingNodeId);
                dom.bioAvatar.src = nodeData.image;
                dom.bioName.textContent = nodeData.label;
                dom.bioText.textContent = nodeData.bio;
                dom.detailsBtn.onclick = () => { toggleModal(dom.bioCard, false); openDetailsModal(editingNodeId); };
                dom.editBtn.onclick = () => { toggleModal(dom.bioCard, false); openForm('edit', nodeData); };
                dom.deleteBtn.onclick = () => deleteNode(editingNodeId);
                toggleModal(dom.bioCard, true);
            }
        });
    };

    const loadData = async () => {
        try {
            const remoteNodes = await new AV.Query('Nodes').limit(1000).find();
            const networkNodes = remoteNodes.map(n => ({ id: n.id, label: n.get('label'), image: n.get('image') || generateAvatar(n.get('label')), bio: n.get('bio') }));
            nodes.update(networkNodes);
        } catch (error) { console.error("数据加载失败:", error); }
    };
    
    const openForm = (mode, nodeData = {}) => {
        editingNodeId = (mode === 'edit') ? nodeData.id : null;
        dom.formTitle.textContent = mode === 'edit' ? '编辑信息' : '新人物';
        dom.saveNodeBtn.textContent = '保存';
        dom['node-name'].value = nodeData.label || '';
        dom['node-bio'].value = nodeData.bio || '';
        dom.nodeImage.value = null; 
        dom.imagePreview.src = nodeData.image || '';
        dom.imagePreview.classList.toggle('hidden', !nodeData.image);
        toggleModal(dom.formWrapper, true);
    };

    const saveNode = async (e) => {
        e.preventDefault();
        const label = dom['node-name'].value.trim();
        if (!label) return alert('姓名不能为空！');
        dom.saveNodeBtn.disabled = true;
        dom.saveNodeBtn.textContent = '保存中...';
        let imageUrl = editingNodeId ? (nodes.get(editingNodeId).image || '') : '';
        if (dom.imagePreview.src && dom.imagePreview.src.startsWith('data:')) {
            try {
                const avFile = AV.File.fromDataURL(`${Date.now()}.jpg`, dom.imagePreview.src);
                imageUrl = (await avFile.save()).url();
            } catch (err) { alert('图片上传失败'); dom.saveNodeBtn.disabled = false; return; }
        }
        const node = editingNodeId ? AV.Object.createWithoutData('Nodes', editingNodeId) : new (AV.Object.extend('Nodes'))();
        node.set('label', label);
        node.set('bio', dom['node-bio'].value.trim());
        if (imageUrl) node.set('image', imageUrl);
        try {
            await node.save();
            toggleModal(dom.formWrapper, false);
            loadData();
        } catch (error) { alert('保存失败！'); } finally {
            dom.saveNodeBtn.disabled = false;
        }
    };

    const deleteNode = async (nodeId) => { /* ... (as before, but using dom object) ... */ };
    
    const openDetailsModal = async (nodeId) => { /* ... (as before, but using dom object) ... */ };
    const createFieldHTML = (key, label, value) => {
        const inputHTML = `<input type="text" data-key="${key}" value="${value || ''}" placeholder="未填写">`;
        return `<div class="detail-entry" onclick="window.showHistory('${editingNodeId}', '${key}', '${label}')"><div class="detail-entry-label">${label}</div><div class="detail-entry-value">${inputHTML}</div></div>`;
    };
    const saveDetails = async (nodeId) => { /* ... (as before, but using dom object) ... */ };

    window.showHistory = async (nodeId, fieldKey, fieldLabel) => { /* ... (as before, but using dom object) ... */ };
    
    checkActivation();
});
