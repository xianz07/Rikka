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
    const options = {
        nodes: { borderWidth: 4, size: 40, color: { border: '#FFFFFF', highlight: { border: '#007bff' } }, font: { color: '#333', size: 14, face: 'arial' }, shape: 'circularImage' },
        edges: { color: '#999', width: 2, font: { align: 'top', size: 12, color: '#888', strokeWidth: 0 }, arrows: { to: { enabled: false } }, smooth: { type: 'cubicBezier' } },
        physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -80, centralGravity: 0.01, springLength: 150, damping: 0.4, avoidOverlap: 1 } },
        interaction: { hover: true, tooltipDelay: 200 },
    };
    const network = new vis.Network(container, data, options);

    let editingNodeId = null;

    // --- DOM 元素获取 ---
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
    const edgeSection = document.getElementById('edge-section');

    // --- 数据操作函数 ---
    async function loadData() {
        try {
            const nodeQuery = new AV.Query('Nodes');
            nodeQuery.limit(1000);
            const remoteNodes = await nodeQuery.find();
            const networkNodes = remoteNodes.map(node => ({ id: node.id, label: node.get('label'), image: node.get('image') || 'https://i.pravatar.cc/150', bio: node.get('bio') }));
            nodes.clear();
            nodes.add(networkNodes);
            updateSelects(networkNodes);

            const edgeQuery = new AV.Query('Edges');
            edgeQuery.limit(1000);
            const remoteEdges = await edgeQuery.find();
            const networkEdges = remoteEdges.map(edge => ({ id: edge.id, from: edge.get('from'), to: edge.get('to'), label: edge.get('label') }));
            edges.clear();
            edges.add(networkEdges);
        } catch (error) { console.error("数据加载失败:", error); }
    }

    async function saveNode() {
        const label = document.getElementById('node-name').value.trim();
        const bio = document.getElementById('node-bio').value.trim();
        if (!label || !bio) { return alert('人物姓名和简介不能为空！'); }

        saveNodeBtn.disabled = true;
        saveNodeBtn.textContent = '保存中...';
        let imageUrl = editingNodeId ? nodes.get(editingNodeId).image : '';
        if(imagePreview.src.startsWith('data:')) imageUrl = imagePreview.src;


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

    // --- UI 控制函数 ---
    function openForm(mode = 'add', nodeData = {}) {
        editingNodeId = (mode === 'edit') ? nodeData.id : null;
        formTitle.textContent = (mode === 'edit') ? '编辑人物' : '添加新人物';
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
    function closeBioCard() { bioCard.classList.add('hidden'); }
    
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
    
    // --- 事件监听器 ---
    showFormBtn.addEventListener('click', () => openForm('add'));
    formCloseBtn.addEventListener('click', closeForm);
    addForm.addEventListener('submit', saveNode);
    addEdgeBtn.addEventListener('click', addEdge);
    closeBioBtn.addEventListener('click', closeBioCard);
    
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
    
    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeData = nodes.get(nodeId);
            bioAvatar.src = nodeData.image;
            bioName.textContent = nodeData.label;
            bioText.textContent = nodeData.bio;
            editBtn.onclick = () => { closeBioCard(); openForm('edit', nodeData); };
            deleteBtn.onclick = () => deleteNode(nodeId);
            bioCard.classList.remove('hidden');
        }
    });

    // --- 初始加载 ---
    loadData();
});
