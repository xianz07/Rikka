// --- script.js (最终精简且完整版) ---
document.addEventListener('DOMContentLoaded', function() {
    const APP_ID = 'KaL72m8OYrLQxlJVg6wTYBzv-gzGzoHsz';
    const APP_KEY = 'R60VntUpKs5bsYHGJzWoac5G';
    const SERVER_URL = 'https://kal72m8o.lc-cn-n1-shared.com';
    AV.init({ appId: APP_ID, appKey: APP_KEY, serverURL: SERVER_URL });

    let network, editingNodeId;
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);
    const dom = {};
    const elementIds = [
        'activation-wrapper', 'activate-btn', 'activation-status', 'app-container', 'form-wrapper',
        'show-form-btn', 'form-close-btn', 'form-title', 'add-form', 'save-node-btn', 'add-edge-btn',
        'node-name', 'node-bio', 'node-image', 'image-preview', 'edge-section', 'from-node', 'to-node', 'edge-label',
        'bio-card', 'bio-avatar', 'bio-name', 'bio-text', 'close-btn', 'details-btn', 'edit-btn', 'delete-btn',
        'details-modal', 'details-modal-close-btn', 'details-modal-title', 'details-content',
        'add-field-btn', 'save-details-btn', 'history-modal', 'history-title', 'history-close-btn', 'history-list'
    ];
    elementIds.forEach(id => dom[id] = document.getElementById(id));
    
    const PRESET_FIELDS = [
        { key: 'gender', label: '性别' }, { key: 'birthDate', label: '出生日期' }, { key: 'idNumber', label: '身份证号码' }, 
        { key: 'hukouLocation', label: '户籍所在地' }, { key: 'currentAddress', label: '常住地址' }, { key: 'phone', label: '手机号' },
        { key: 'wechat', label: '微信号' }, { key: 'email', label: '邮箱' }, { key: 'maritalStatus', label: '婚姻状况' }, 
        { key: 'politicalStatus', label: '政治面貌' }, { key: 'education', label: '学历层次' }, { key: 'major', label: '专业方向' },
        { key: 'company', label: '当前工作单位' }, { key: 'jobTitle', label: '职务/岗位' }, { key: 'hobbies', label: '兴趣爱好', type: 'textarea' },
        { key: 'remarks', label: '备注', type: 'textarea' }
    ];

    const getDeviceId = () => {
        let id = localStorage.getItem('deviceId');
        if (!id) {
            id = `device_${Date.now()}${Math.random().toString(36).substring(2, 11)}`;
            localStorage.setItem('deviceId', id);
        }
        return id;
    };
    const toggleModal = (modal, show) => modal.classList.toggle('hidden', !show);

    const checkActivation = async () => {
        try {
            const device = await new AV.Query('ActivatedDevices').equalTo('deviceId', getDeviceId()).first();
            device ? showApp() : showActivation();
        } catch (error) { dom.activationStatus.textContent = '无法连接验证服务器，请刷新。'; }
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
        toggleModal(dom.activationWrapper, false);
        dom.appContainer.classList.remove('hidden');
        if (!network) {
            const container = document.getElementById('relation-graph');
            const data = { nodes, edges };
            const options = { /* ... vis.js options ... */ };
            network = new vis.Network(container, data, options);
            initializeAppEventListeners();
        }
        loadData();
    };

    const initializeAppEventListeners = () => {
        dom.showFormBtn.addEventListener('click', () => openForm('add'));
        [dom.formCloseBtn, dom.closeBioBtn, dom.historyCloseBtn, dom.detailsModalCloseBtn].forEach(btn => btn.addEventListener('click', () => {
            toggleModal(btn.closest('.modal-wrapper'), false);
        }));
        dom.addForm.addEventListener('submit', saveNode);
        dom.addEdgeBtn.addEventListener('click', addEdge);
        dom.saveDetailsBtn.addEventListener('click', () => editingNodeId && saveDetails(editingNodeId));
        dom.addFieldBtn.addEventListener('click', async () => {
            const label = prompt("请输入要添加的信息名称 (例如: QQ号)");
            if (label) {
                const key = pinyin_pro.pinyin(label, { toneType: 'none', type: 'camel' }).replace(/\s/g, '');
                if (key) dom.detailsContent.insertAdjacentHTML('beforeend', createFieldHTML(key, label, ''));
                else alert("无法为该名称生成字段ID。");
            }
        });
        dom.imageInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = event => {
                    dom.imagePreview.src = event.target.result;
                    dom.imagePreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
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
            const [remoteNodes, remoteEdges] = await Promise.all([
                new AV.Query('Nodes').limit(1000).find(),
                new AV.Query('Edges').limit(1000).find()
            ]);
            const networkNodes = remoteNodes.map(n => ({ id: n.id, label: n.get('label'), image: (n.get('image') || `https://i.pravatar.cc/150?u=${n.id}`).replace(/^http:\/\//i, 'https://'), bio: n.get('bio') }));
            nodes.clear();
            nodes.add(networkNodes);
            updateSelects(networkNodes);
            const networkEdges = remoteEdges.map(e => ({ id: e.id, from: e.get('from'), to: e.get('to'), label: e.get('label') }));
            edges.clear();
            edges.add(networkEdges);
        } catch (error) { console.error("数据加载失败:", error); }
    };
    
    const openForm = (mode, nodeData = {}) => {
        editingNodeId = (mode === 'edit') ? nodeData.id : null;
        dom.formTitle.textContent = mode === 'edit' ? '编辑基本信息' : '添加新人物';
        dom.saveNodeBtn.textContent = mode === 'edit' ? '保存修改' : '创建人物';
        dom['node-name'].value = nodeData.label || '';
        dom['node-bio'].value = nodeData.bio || '';
        dom.imageInput.value = null; 
        dom.imagePreview.src = nodeData.image || '';
        dom.imagePreview.classList.toggle('hidden', !nodeData.image);
        dom.edgeSection.classList.toggle('hidden', mode === 'edit');
        toggleModal(dom.formWrapper, true);
    };

    const saveNode = async () => {
        const label = dom['node-name'].value.trim();
        const bio = dom['node-bio'].value.trim();
        if (!label || !bio) return alert('人物姓名和简介不能为空！');
        dom.saveNodeBtn.disabled = true;
        dom.saveNodeBtn.textContent = '保存中...';
        let imageUrl = editingNodeId ? (nodes.get(editingNodeId).image || '') : '';
        const file = dom.imageInput.files[0];
        try {
            if (file) {
                const avFile = new AV.File(file.name, file);
                imageUrl = (await avFile.save()).url();
            }
            const node = editingNodeId ? AV.Object.createWithoutData('Nodes', editingNodeId) : new (AV.Object.extend('Nodes'))();
            node.set('label', label);
            node.set('bio', bio);
            if (imageUrl) node.set('image', imageUrl);
            await node.save();
            alert('操作成功！');
            dom.addForm.reset();
            toggleModal(dom.formWrapper, false);
            loadData();
        } catch (error) {
            alert('保存失败！');
        } finally {
            dom.saveNodeBtn.disabled = false;
        }
    };

    const deleteNode = async (nodeId) => {
        if (!confirm('确定要删除这个人物吗？所有与他/她相关的关系线也将被一并删除！')) return;
        try {
            const edgeQuery = AV.Query.or(new AV.Query('Edges').equalTo('from', nodeId), new AV.Query('Edges').equalTo('to', nodeId));
            const edgesToDelete = await edgeQuery.find();
            if (edgesToDelete.length > 0) await AV.Object.destroyAll(edgesToDelete);
            await AV.Object.createWithoutData('Nodes', nodeId).destroy();
            alert('删除成功！');
            toggleModal(dom.bioCard, false);
            loadData();
        } catch (error) { alert('删除失败！'); }
    };

    const addEdge = async () => {
        const from = dom['from-node'].value;
        const to = dom['to-node'].value;
        const label = dom['edge-label'].value.trim();
        if (from && to && from !== to && label) {
            try {
                await new (AV.Object.extend('Edges'))().set({ from, to, label }).save();
                alert('关系添加成功！');
                dom['edge-label'].value = '';
                loadData();
            } catch (error) { alert('添加失败！'); }
        } else {
            alert('请确保选择了两个不同的人物并填写了关系！');
        }
    };

    const updateSelects = (options) => {
        [dom['from-node'], dom['to-node']].forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">--选择人物--</option>';
            options.forEach(opt => select.add(new Option(opt.label, opt.id)));
            select.value = currentValue;
        });
    };
    
    const openDetailsModal = async (nodeId) => {
        const node = await AV.Object.createWithoutData('Nodes', nodeId).fetch();
        dom.detailsModalTitle.textContent = `${node.get('label')} 的详细档案`;
        const nodeJSON = node.toJSON();
        const allKeys = new Set([...PRESET_FIELDS.map(f => f.key), ...Object.keys(nodeJSON)]);
        const systemKeys = new Set(['objectId', 'createdAt', 'updatedAt', 'ACL', 'label', 'bio', 'image']);
        let contentHTML = '';
        allKeys.forEach(key => {
            if (systemKeys.has(key)) return;
            const preset = PRESET_FIELDS.find(f => f.key === key);
            contentHTML += createFieldHTML(key, preset?.label || key, nodeJSON[key] || '', preset?.type);
        });
        dom.detailsContent.innerHTML = contentHTML;
        toggleModal(dom.detailsModal, true);
    };

    const createFieldHTML = (key, label, value, type = 'input') => {
        const inputHTML = type === 'textarea' ? `<textarea data-key="${key}">${value}</textarea>` : `<input type="text" data-key="${key}" value="${value}">`;
        return `<div class="detail-entry" onclick="showHistory('${editingNodeId}', '${key}', '${label}')"><div class="detail-entry-label">${label}</div><div class="detail-entry-value">${inputHTML}</div></div>`;
    };

    const saveDetails = async (nodeId) => {
        const node = await AV.Object.createWithoutData('Nodes', nodeId).fetch();
        const oldData = node.toJSON();
        const historyRecords = [];
        const entries = dom.detailsContent.querySelectorAll('[data-key]');
        
        entries.forEach(entry => {
            const key = entry.dataset.key;
            const newValue = entry.value;
            if (oldData[key] !== newValue) {
                const history = new (AV.Object.extend('FieldHistories'))();
                history.set({ targetNode: node, fieldKey: key, oldValue: oldData[key] || '', newValue, editorInfo: `设备: ${getDeviceId()}` });
                historyRecords.push(history);
                node.set(key, newValue);
            }
        });
        try {
            if (historyRecords.length > 0) {
                await AV.Object.saveAll(historyRecords);
                await node.save();
            }
            alert('详细档案保存成功！');
            toggleModal(dom.detailsModal, false);
        } catch (error) { alert('保存失败！'); }
    };

    window.showHistory = async (nodeId, fieldKey, fieldLabel) => {
        dom.historyTitle.textContent = `"${fieldLabel}" 的修改历史`;
        dom.historyList.innerHTML = '<p>加载中...</p>';
        toggleModal(dom.historyModal, true);
        try {
            const query = new AV.Query('FieldHistories').equalTo('targetNode', AV.Object.createWithoutData('Nodes', nodeId)).equalTo('fieldKey', fieldKey).descending('createdAt');
            const histories = await query.find();
            dom.historyList.innerHTML = histories.length === 0 ? '<p>暂无修改记录。</p>' : histories.map(h => `
                <div class="history-item">
                    <div class="history-item-meta"><span>${new Date(h.createdAt).toLocaleString()}</span> by <span>${h.get('editorInfo')}</span></div>
                    <div class="history-item-value"><span class="old">${h.get('oldValue')}</span> → <span class="new">${h.get('newValue')}</span></div>
                </div>`).join('');
        } catch (error) { dom.historyList.innerHTML = '<p>加载历史失败。</p>'; }
    };
    
    checkActivation();
});
