document.addEventListener('DOMContentLoaded', function() {
    // 1. LeanCloud 初始化 (已填好你的信息)
    const APP_ID = 'KaL72m8OYrLQxlJVg6wTYBzv-gzGzoHsz';
    const APP_KEY = 'R60VntUpKs5bsYHGJzWoac5G';
    const SERVER_URL = 'https://kal72m8o.lc-cn-n1-shared.com';
    
    AV.init({
      appId: APP_ID,
      appKey: APP_KEY,
      serverURL: SERVER_URL
    });

    // --- 数据和图形设置 ---
    const nodes = new vis.DataSet([]);
    const edges = new vis.DataSet([]);

    const container = document.getElementById('relation-graph');
    const data = { nodes: nodes, edges: edges };
    const options = {
        nodes: {
            borderWidth: 3, size: 40,
            color: { border: '#222222', background: '#666666' },
            font: { color: '#333', size: 14 },
            shape: 'circularImage',
        },
        edges: {
            color: '#6e6e6e', font: { align: 'top', size: 12, color: '#888', strokeWidth: 0 },
            arrows: { to: { enabled: false } }, smooth: { type: 'cubicBezier' }
        },
        physics: {
            enabled: true, solver: 'forceAtlas2Based',
            forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springConstant: 0.08, springLength: 150, damping: 0.4, avoidOverlap: 1 }
        },
        interaction: { hover: true, tooltipDelay: 200 },
    };
    const network = new vis.Network(container, data, options);
    
    // --- 数据加载函数 ---
    async function loadData() {
        try {
            // 加载人物 (Nodes)
            const nodeQuery = new AV.Query('Nodes');
            nodeQuery.limit(1000);
            const remoteNodes = await nodeQuery.find();
            
            const networkNodes = remoteNodes.map(node => ({
                id: node.get('objectId'),
                label: node.get('label'),
                image: node.get('image') || 'https://i.pravatar.cc/150', // 默认头像
                bio: node.get('bio')
            }));
            nodes.clear();
            nodes.add(networkNodes);
            updateSelects(networkNodes);

            // 加载关系 (Edges)
            const edgeQuery = new AV.Query('Edges');
            edgeQuery.limit(1000);
            const remoteEdges = await edgeQuery.find();
            
            const networkEdges = remoteEdges.map(edge => ({
                id: edge.get('objectId'),
                from: edge.get('from'),
                to: edge.get('to'),
                label: edge.get('label')
            }));
            edges.clear();
            edges.add(networkEdges);
        } catch (error) {
            console.error("数据加载失败:", error);
            alert("无法从云端加载数据，请检查：\n1. 网络连接是否正常。\n2. LeanCloud后台是否创建了'Nodes'和'Edges'两个Class。\n3. Class的权限是否已设为'所有用户'可读可写。");
        }
    }

    // --- 表单提交和事件处理 ---
    const addNodeBtn = document.getElementById('add-node-btn');
    const addEdgeBtn = document.getElementById('add-edge-btn');

    // 添加人物的逻辑
    addNodeBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('node-name');
        const bioInput = document.getElementById('node-bio');
        if (!nameInput.value || !bioInput.value) {
            alert('人物姓名和简介不能为空！');
            return;
        }
        
        const Node = AV.Object.extend('Nodes');
        const node = new Node();
        node.set('label', nameInput.value);
        node.set('bio', bioInput.value);
        node.set('image', document.getElementById('node-image').value);

        try {
            await node.save();
            alert('人物添加成功！');
            document.getElementById('add-form').reset();
            loadData();
        } catch (error) {
            console.error('添加人物失败: ', error);
            alert('添加失败，请查看浏览器控制台获取错误信息。');
        }
    });

    // 添加关系的逻辑
    addEdgeBtn.addEventListener('click', async () => {
        const fromNode = document.getElementById('from-node').value;
        const toNode = document.getElementById('to-node').value;
        const edgeLabel = document.getElementById('edge-label').value;

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
            } catch (error) {
                console.error('添加关系失败: ', error);
                alert('添加失败，请查看浏览器控制台获取错误信息。');
            }
        } else {
            alert('请确保选择了两个不同的人物并填写了关系！');
        }
    });

    // 更新关系选择下拉框的函数
    function updateSelects(options) {
        const fromSelect = document.getElementById('from-node');
        const toSelect = document.getElementById('to-node');
        fromSelect.innerHTML = '<option value="">--选择人物1--</option>';
        toSelect.innerHTML = '<option value="">--选择人物2--</option>';
        
        options.forEach(opt => {
            const option1 = new Option(opt.label, opt.id);
            const option2 = new Option(opt.label, opt.id);
            fromSelect.add(option1);
            toSelect.add(option2);
        });
    }
    
    // 点击头像显示简介的逻辑
    const bioCard = document.getElementById('bio-card');
    const closeBtn = document.getElementById('close-btn');
    const bioAvatar = document.getElementById('bio-avatar');
    const bioName = document.getElementById('bio-name');
    const bioText = document.getElementById('bio-text');

    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeData = nodes.get(nodeId); 
            bioAvatar.src = nodeData.image;
            bioName.textContent = nodeData.label;
            bioText.textContent = nodeData.bio;
            bioCard.classList.remove('hidden');
        }
    });

    closeBtn.addEventListener('click', () => bioCard.classList.add('hidden'));
    bioCard.addEventListener('click', (e) => {
        if (e.target === bioCard) bioCard.classList.add('hidden');
    });

    // --- 初始加载 ---
    loadData();
});