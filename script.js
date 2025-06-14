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

    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

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
    const edgeSection = document.getElementById('edge-section');
    
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
                showActivation();
            }
        } catch (error) {
            activationStatus.textContent = '无法连接验证服务器，请刷新重试。';
            console.error("检查激活状态时出错:", error);
        }
    }

    async function activateDevice() {
        const codeInput = document.getElementById('activation-code-input').value.trim();
        if (!codeInput) { return alert("请输入激活码！"); }
        
        activateBtn.disabled = true;
        activationStatus.textContent = '验证中...';
        try {
            const deviceId = getDeviceId();
            const result = await AV.Cloud.run('verifyAndUseCode', { code: codeInput, deviceId: deviceId });
            
            console.log("云函数返回结果:", result);

            if (result && result.success) {
                console.log("✅ 激活成功！进入 if (result.success) 代码块。");
                activationStatus.textContent = '激活成功！';
                
                console.log("准备在1秒后调用 showApp() 函数...");
                setTimeout(showApp, 1000);

            } else {
                console.log("激活失败，服务器返回信息:", result ? result.message : "无有效返回");
                activationStatus.textContent = result ? result.message : "激活失败，未知错误。";
                activateBtn.disabled = false;
            }
        } catch (error) {
            console.error("调用云函数出错:", error);
            activateBtn.disabled = false;
            activationStatus.textContent = '激活失败，请检查网络或联系管理员。';
        }
    }

    // --- 流程控制函数 ---
    function showActivation() {
        activateBtn.addEventListener('click', activateDevice);
        activationWrapper.classList.remove('hidden');
    }

    function showApp() {
        console.log("🚀 1. showApp 函数被成功调用！");

        activationWrapper.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        console.log("🚀 2. 容器的 hidden 类已切换。");

        if (!network) {
            console.log("🚀 3. Network 实例不存在，准备创建...");
            const container = document.getElementById('relation-graph');
            const data = { nodes: nodes, edges: edges };
            const options = {
                nodes: { borderWidth: 4, size: 40, color: { border: '#FFFFFF', highlight: { border: '#007bff' } }, font: { color: '#333', size: 14, face: 'arial' }, shape: 'circularImage' },
                edges: { color: '#999', width: 2, font: { align: 'top', size: 12, color: '#888', strokeWidth: 0 }, arrows: { to: { enabled: false } }, smooth: { type: 'cubicBezier' } },
                physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -80, centralGravity: 0.01, springLength: 150, damping: 0.4, avoidOverlap: 1 } },
                interaction: { hover: true, tooltipDelay: 200 },
            };
            network = new vis.Network(container, data, options);
            console.log("🚀 4. Network 实例已创建。");
            initializeAppEventListeners();
        }
        
        console.log("🚀 5. 准备调用 loadData()。");
        loadData();
    }
    
    // --- 事件监听器初始化 ---
    function initializeAppEventListeners() {
        showFormBtn.addEventListener('click', () => openForm('add'));
        formCloseBtn.addEventListener('click', closeForm);
        addForm.addEventListener('submit', saveNode);
        addEdgeBtn.addEventListener('click', addEdge);
        closeBioBtn.addEventListener('click', closeBioCard);
        detailsModalCloseBtn.addEventListener('click', () => detailsModal.classList.add('hidden'));
        saveDetailsBtn.addEventListener('click', () => { if(editingNodeId) saveDetails(editingNodeId); });
        addFieldBtn.addEventListener('click', () => {
             const key = prompt("请输入新字段的英文名 (如 'qqNumber'):");
             const label = prompt("请输入新字段的中文名 (如 'QQ号'):");
             if (key && label) {
                 document.getElementById('details-content').insertAdjacentHTML('beforeend', createFieldHTML(key, label, ''));
             }
        });
        imageInput.addEventListener('change', previewImage);

        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                editingNodeId = nodeId;
                const nodeData = nodes.get(nodeId);
                
                bioAvatar.src = nodeData.image;
                bioName.textContent = nodeData.label;
                bioText.textContent = nodeData.bio;
                
                detailsBtn.onclick = () => { closeBioCard(); openDetailsModal(nodeId); };
                editBtn.onclick = () => { closeBioCard(); openForm('edit', nodeData); };
                deleteBtn.onclick = () => deleteNode(nodeId);

                bioCard.classList.remove('hidden');
            }
        });
        console.log("🚀 6. 主应用事件监听器已初始化。");
    }

    // --- 完整的功能函数定义 ---
    function closeBioCard() { bioCard.classList.add('hidden'); }

    async function loadData() {
        console.log("🚀 7. loadData 函数开始执行。");
        try {
            const nodeQuery = new AV.Query('Nodes');
            nodeQuery.limit(1000);
            const remoteNodes = await nodeQuery.find();
            console.log("🚀 8. 成功从云端获取到", remoteNodes.length, "个人物。");

            const networkNodes = remoteNodes.map(node => ({
                id: node.id,
                label: node.get('label'),
                image: (node.get('image') || 'https://i.pravatar.cc/150').replace(/^http:\/\//i, 'https://'),
                bio: node.get('bio')
            }));
            nodes.clear();
            nodes.add(networkNodes);
            console.log("🚀 9. 人物数据已加载到关系图中。");
            updateSelects(networkNodes);

            const edgeQuery = new AV.Query('Edges');
            edgeQuery.limit(1000);
            const remoteEdges = await edgeQuery.find();
            console.log("🚀 10. 成功从云端获取到", remoteEdges.length, "个关系。");
            
            const networkEdges = remoteEdges.map(edge => ({ id: edge.id, from: edge.get('from'), to: edge.get('to'), label: edge.get('label') }));
            edges.clear();
            edges.add(networkEdges);
            console.log("🚀 11. 关系数据已加载到关系图中。loadData 执行完毕！");
        } catch (error) { 
            console.error("❌ 在 loadData 函数中发生严重错误:", error); 
        }
    }

    function openForm(mode = 'add', nodeData = {}) {
        editingNodeId = (mode === 'edit') ? nodeData.id : null;
        formTitle.textContent = (mode === 'edit') ? '编辑基本信息' : '添加新人物';
        saveNodeBtn.textContent = (mode === 'edit') ? '保存修改' : '创建人物';
        document.getElementById('node-name').value = nodeData.label || '';
        document.getElementById('node-bio').value = nodeData.bio || '';
        imageInput.value = null; 
        imagePreview.src = nodeData.image || '';
        imagePreview.classList.toggle('hidden', !nodeData.image);
        edgeSection.classList.toggle('hidden', mode === 'edit');
        formWrapper.classList.remove('hidden');
    }

    function closeForm() { formWrapper.classList.add('hidden'); }

    async function saveNode() {
        const label = document.getElementById('node-name').value.trim();
        const bio = document.getElementById('node-bio').value.trim();
        if (!label || !bio) { return alert('人物姓名和简介不能为空！'); }
        
        saveNodeBtn.disabled = true;
        saveNodeBtn.textContent = '保存中...';
        let imageUrl = editingNodeId ? (nodes.get(editingNodeId).image || '') : '';
        const file = imageInput.files[0];
        try {
            if (file) {
                const avFile = new AV.File(file.name, file);
                const savedFile = await avFile.save();
                imageUrl = savedFile.url();
            }
            let node;
            if (editingNodeId) {
                node = AV.Object.createWithoutData('Nodes', editingNodeId);
            } else {
                node = new (AV.Object.extend('Nodes'))();
            }
            node.set('label', label);
            node.set('bio', bio);
            if (imageUrl) node.set('image', imageUrl);
            await node.save();
            alert(editingNodeId ? '人物更新成功！' : '人物添加成功！');
            addForm.reset();
            closeForm();
            loadData();
        } catch (error) {
            console.error('保存人物失败:', error);
            alert('保存失败！');
        } finally {
            saveNodeBtn.disabled = false;
            saveNodeBtn.textContent = editingNodeId ? '保存修改' : '创建人物';
        }
    }

    async function deleteNode(nodeId) {
        if (!confirm('确定要删除这个人物吗？所有与他/她相关的关系线也将被一并删除！')) return;
        try {
            const fromQuery = new AV.Query('Edges').equalTo('from', nodeId);
            const toQuery = new AV.Query('Edges').equalTo('to', nodeId);
            const edgeQuery = AV.Query.or(fromQuery, toQuery);
            const edgesToDelete = await edgeQuery.find();
            if (edgesToDelete.length > 0) { await AV.Object.destroyAll(edgesToDelete); }
            const nodeToDelete = AV.Object.createWithoutData('Nodes', nodeId);
            await nodeToDelete.destroy();
            alert('删除成功！');
            closeBioCard();
            loadData();
        } catch (error) { console.error('删除失败:', error); alert('删除失败！'); }
    }

    async function addEdge() {
        const fromNode = document.getElementById('from-node').value;
        const toNode = document.getElementById('to-node').value;
        const edgeLabel = document.getElementById('edge-label').value.trim();
        if (fromNode && toNode && fromNode !== toNode && edgeLabel) {
            const Edge = AV.Object.extend('Edges');
            const edge = new Edge();
            edge.set('from', fromNode);
            edge.set('to', toNode);
            edge.set('label', edgeLabel);
            try {
                await edge.save();
                alert('关系添加成功！');
                document.getElementById('edge-label').value = '';
                loadData();
            } catch (error) { console.error('添加关系失败: ', error); alert('添加失败！'); }
        } else {
            alert('请确保选择了两个不同的人物并填写了关系！');
        }
    }

    function previewImage(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    function updateSelects(options) {
        const fromSelect = document.getElementById('from-node');
        const toSelect = document.getElementById('to-node');
        const currentFrom = fromSelect.value;
        const currentTo = toSelect.value;
        fromSelect.innerHTML = '<option value="">--选择人物1--</option>';
        toSelect.innerHTML = '<option value="">--选择人物2--</option>';
        options.forEach(opt => {
            fromSelect.add(new Option(opt.label, opt.id));
            toSelect.add(new Option(opt.label, opt.id));
        });
        fromSelect.value = currentFrom;
        toSelect.value = currentTo;
    }

    async function openDetailsModal(nodeId) {
        const node = await AV.Object.createWithoutData('Nodes', nodeId).fetch();
        document.getElementById('details-modal-title').textContent = `${node.get('label')} 的详细档案`;
        const detailsContent = document.getElementById('details-content');
        detailsContent.innerHTML = '';
        const nodeJSON = node.toJSON();
        const allKeys = new Set([...PRESET_FIELDS.map(f => f.key), ...Object.keys(nodeJSON)]);
        const systemKeys = new Set(['objectId', 'createdAt', 'updatedAt', 'ACL', 'label', 'bio', 'image']);
        allKeys.forEach(key => {
            if (systemKeys.has(key)) return;
            const preset = PRESET_FIELDS.find(f => f.key === key);
            const label = preset ? preset.label : key;
            const type = preset ? preset.type : 'input';
            const value = nodeJSON[key] || '';
            detailsContent.insertAdjacentHTML('beforeend', createFieldHTML(key, label, value, type));
        });
        detailsModal.classList.remove('hidden');
    }

    function createFieldHTML(key, label, value, type = 'input') {
        const inputElement = type === 'textarea'
            ? `<textarea data-key="${key}">${value}</textarea>`
            : `<input type="text" data-key="${key}" value="${value}">`;
        return `<div class="detail-entry"><div class="detail-entry-label">${label}</div><div class="detail-entry-value">${inputElement}</div></div>`;
    }

    async function saveDetails(nodeId) {
        const node = AV.Object.createWithoutData('Nodes', nodeId);
        const entries = document.querySelectorAll('#details-content [data-key]');
        entries.forEach(entry => node.set(entry.dataset.key, entry.value));
        try {
            await node.save();
            alert('详细档案保存成功！');
            detailsModal.classList.add('hidden');
        } catch (error) {
            alert('保存失败！');
            console.error(error);
        }
    }
    
    // --- 初始化 ---
    checkActivation();
});
