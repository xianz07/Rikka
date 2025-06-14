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

    // --- Utility Functions ---
    const getDeviceId = () => localStorage.getItem('deviceId') || (() => { const id = `d_${Date.now()}${Math.random()}`; localStorage.setItem('deviceId', id); return id; })();
    const toggleModal = (modal, show) => modal.classList.toggle('hidden', !show);
    const generateAvatar = (name) => {
        const canvas = document.createElement('canvas');
        canvas.width = 120; canvas.height = 120;
        const context = canvas.getContext('2d');
        const colors = ["#E27D60", "#85DCB", "#E8A87C", "#C38D9E", "#41B3A3"];
        context.fillStyle = colors[name.charCodeAt(0) % colors.length];
        context.fillRect(0, 0, 120, 120);
        context.fillStyle = "white";
        context.font = "bold 48px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(name.charAt(0).toUpperCase(), 60, 60);
        return canvas.toDataURL();
    };
    const compressImage = (file, quality = 0.7) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width; canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = error => reject(error);
        };
    });

    // --- Core Logic ---
    const checkActivation = async () => { /* ... (as before) ... */ };
    const activateDevice = async () => { /* ... (as before) ... */ };
    const showActivation = () => { /* ... (as before) ... */ };
    const showApp = () => {
        toggleModal(dom.activationWrapper, true);
        dom.appContainer.classList.remove('hidden');
        if (!network) {
            const container = dom['relation-graph'];
            const data = { nodes, edges };
            const options = { /* ... vis.js options ... */ };
            network = new vis.Network(container, data, options);
            initializeAppEventListeners();
        }
        loadData();
    };

    const initializeAppEventListeners = () => { /* ... (as before) ... */ };
    const loadData = async () => {
        try {
            const [remoteNodes, remoteEdges] = await Promise.all([
                new AV.Query('Nodes').limit(1000).find(),
                new AV.Query('Edges').limit(1000).find()
            ]);
            const networkNodes = remoteNodes.map(n => ({
                id: n.id,
                label: n.get('label'),
                image: n.get('image') || generateAvatar(n.get('label')),
                bio: n.get('bio')
            }));
            nodes.update(networkNodes);
            const networkEdges = remoteEdges.map(e => ({ id: e.id, from: e.get('from'), to: e.get('to'), label: e.get('label') }));
            edges.update(networkEdges);
        } catch (error) { console.error("数据加载失败:", error); }
    };
    
    const saveNode = async () => {
        const label = dom['node-name'].value.trim();
        const bio = dom['node-bio'].value.trim();
        if (!label) return alert('姓名不能为空！');
        
        let imageUrl = editingNodeId ? (nodes.get(editingNodeId).image || '') : '';
        const file = dom.nodeImage.files[0];
        if (file) {
            try {
                const compressedDataUrl = await compressImage(file);
                const avFile = AV.File.fromDataURL(`${Date.now()}.jpg`, compressedDataUrl);
                imageUrl = (await avFile.save()).url();
            } catch (e) { return alert('图片处理失败'); }
        }

        const node = editingNodeId ? AV.Object.createWithoutData('Nodes', editingNodeId) : new (AV.Object.extend('Nodes'))();
        node.set({ label, bio, image: imageUrl });
        try {
            await node.save();
            toggleModal(dom.formWrapper, false);
            loadData();
        } catch (e) { alert('保存失败'); }
    };

    // ... (All other functions like deleteNode, openDetailsModal, saveDetails, showHistory, etc.)
    
    checkActivation();
});
