document.addEventListener('DOMContentLoaded', function() {
    // --- 初始化和全局变量 ---
    const APP_ID = 'KaL72m8OYrLQxlJVg6wTYBzv-gzGzoHsz';
    const APP_KEY = 'R60VntUpKs5bsYHGJzWoac5G';
    const SERVER_URL = 'https://kal72m8o.lc-cn-n1-shared.com';
    
    AV.init({ appId: APP_ID, appKey: APP_KEY, serverURL: SERVER_URL });

    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);
    const container = document.getElementById('relation-graph');
    const data = { nodes: nodes, edges: edges };
    const options = { /* ... 选项和之前一样 ... */ };
    const network = new vis.Network(container, data, options);

    let editingNodeId = null; // null表示新增模式, 有值表示编辑模式

    // --- 获取所有 DOM 元素 ---
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
    const editBtn = document.getElementById('edit-btn');
    const deleteBtn = document.getElementById('delete-btn');

    // --- 数据操作函数 ---
    
    // 加载所有数据
    async function loadData() {
        try {
            const nodeQuery = new AV.Query('Nodes');
            nodeQuery.limit(1000);
            const remoteNodes = await nodeQuery.find();
            const networkNodes = remoteNodes.map(node => ({
                id: node.id, label: node.get('label'),
                image: node.get('image') || 'https://i.pravatar.cc/150',
                bio: node.get('bio')
            }));
            nodes.clear();
            nodes.add(networkNodes);
            updateSelects(networkNodes);

            const edgeQuery = new AV.Query('Edges');
            edgeQuery.limit(1000);
            const remoteEdges = await edgeQuery.find();
            const networkEdges = remoteEdges.map(edge => ({
                id: edge.id, from: edge.get('from'),
                to: edge.get('to'), label: edge.get('label')
            }));
            edges.clear();
            edges.add(networkEdges);
        } catch (error) { console.error("数据加载失败:", error); }
    }

    // 保存或更新节点
    async function saveNode() {
        const label = document.getElementById('node-name').value;
        const bio = document.getElementById('node-bio').value;
        if (!label || !bio) {
            alert('人物姓名和简介不能为空！');
            return;
        }

        let imageUrl = document.getElementById('image-preview').src;
        const file = imageInput.files[0];

        try {
            // 如果有新文件上传
            if (file) {
                const avFile = new AV.File(file.name, file);
                const savedFile = await avFile.save();
                imageUrl = savedFile.url();
            }

            let node;
            if (editingNodeId) { // 编辑模式
                node = AV.Object.createWithoutData('Nodes', editingNodeId);
            } else { // 新增模式
                node = new (AV.Object.extend('Nodes'))();
            }

            node.set('label', label);
            node.set('bio', bio);
            if (imageUrl) node.set('image', imageUrl);

            await node.save();
            alert(editingNodeId ? '人物更新成功！' : '人物添加成功！');
            closeForm();
            loadData();
        } catch (error) { console.error('保存人物失败:', error); alert('保存失败！'); }
    }

    // 删除节点及其关联的边
    async function deleteNode(nodeId) {
        if (!confirm('确定要删除这个人物吗？所有与他/她相关的关系线也将被一并删除！')) return;

        try {
            // 1. 删除所有相关的边
            const fromQuery = new AV.Query('Edges').equalTo('from', nodeId);
            const toQuery = new AV.Query('Edges').equalTo('to', nodeId);
            const edgeQuery = AV.Query.or(fromQuery, toQuery);
            const edgesToDelete = await edgeQuery.find();
            if (edgesToDelete.length > 0) {
                await AV.Object.destroyAll(edgesToDelete);
            }

            // 2. 删除节点本身
            const nodeToDelete = AV.Object.createWithoutData('Nodes', nodeId);
            await nodeToDelete.destroy();
            
            alert('删除成功！');
            closeBioCard();
            loadData();
        } catch (error) { console.error('删除失败:', error); alert('删除失败！'); }
    }

    // --- UI 控制函数 ---
    
    // 打开表单
    function openForm(mode = 'add', nodeData = {}) {
        editingNodeId = (mode === 'edit') ? nodeData.id : null;
        formTitle.textContent = (mode === 'edit') ? '编辑人物' : '添加新人物';
        saveNodeBtn.textContent = (mode === 'edit') ? '保存修改' : '创建人物';

        document.getElementById('node-name').value = nodeData.label || '';
        document.getElementById('node-bio').value = nodeData.bio || '';
        imagePreview.src = nodeData.image || '';
        imagePreview.classList.toggle('hidden', !nodeData.image);
        addForm.reset(); // 重置文件输入框

        formWrapper.classList.add('visible');
    }

    // 关闭表单
    function closeForm() {
        formWrapper.classList.remove('visible');
    }
    
    // 关闭简介卡片
    function closeBioCard() {
        bioCard.classList.add('hidden');
    }
    
    // 更新关系下拉框
    function updateSelects(options) { /* ... 和之前一样 ... */ }
    
    // 图片预览
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 事件监听器 ---

    showFormBtn.addEventListener('click', () => openForm('add'));
    formCloseBtn.addEventListener('click', closeForm);
    saveNodeBtn.addEventListener('click', saveNode);
    closeBioBtn.addEventListener('click', closeBioCard);
    
    // 点击网络节点
    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeData = nodes.get(nodeId);
            
            bioAvatar.src = nodeData.image;
            bioName.textContent = nodeData.label;
            bioText.textContent = nodeData.bio;
            
            // 为编辑和删除按钮绑定当前节点的ID
            editBtn.onclick = () => {
                closeBioCard();
                openForm('edit', nodeData);
            };
            deleteBtn.onclick = () => deleteNode(nodeId);

            bioCard.classList.remove('hidden');
        }
    });

    // ... 其他事件监听器，如添加关系等 ...

    // --- 初始加载 ---
    loadData();
});
