'use strict';
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
    ['activation-layer', 'activate-btn', 'activation-status', 'activation-code-input', 'app-layer', 'modal-layer', 'add-node-fab'].forEach(id => dom[id] = document.getElementById(id));
    
    // --- Utility Functions ---
    const getDeviceId = () => localStorage.getItem('deviceId') || (() => { const id = `d_${Date.now()}${Math.random()}`; localStorage.setItem('deviceId', id); return id; })();
    const toggleModal = (contentHTML, show) => {
        dom.modalLayer.innerHTML = show ? contentHTML : '';
        dom.modalLayer.classList.toggle('hidden', !show);
    };
    const generateAvatar = (name) => {
        // ... (as before)
    };
    const compressImage = (file, quality = 0.7, maxWidth = 800) => new Promise((resolve, reject) => {
        // ... (as before)
    });

    // --- Core Logic ---
    const checkActivation = async () => {
        try {
            const device = await new AV.Query('ActivatedDevices').equalTo('deviceId', getDeviceId()).first();
            device ? showApp() : showActivation();
        } catch { dom.activationStatus.textContent = '无法连接验证服务器。'; }
    };
    const activateDevice = async () => { /* ... (as before) ... */ };
    const showActivation = () => {
        dom.activateBtn.addEventListener('click', activateDevice);
        dom.activationLayer.classList.remove('hidden');
    };
    const showApp = () => {
        dom.activationLayer.classList.add('hidden');
        dom.appLayer.classList.remove('hidden');
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
        dom.addNodeFab.addEventListener('click', () => openFormModal('add'));
        network.on('click', ({ nodes: nodeIds }) => {
            if (nodeIds.length > 0) openBioModal(nodeIds[0]);
        });
    };

    const loadData = async () => {
        try {
            const [remoteNodes, remoteEdges] = await Promise.all([
                new AV.Query('Nodes').limit(1000).find(),
                new AV.Query('Edges').limit(1000).find()
            ]);
            nodes.update(remoteNodes.map(n => ({ id: n.id, label: n.get('label'), image: n.get('image') || generateAvatar(n.get('label')), bio: n.get('bio') })));
            edges.update(remoteEdges.map(e => ({ id: e.id, from: e.get('from'), to: e.get('to'), label: e.get('label') })));
        } catch (error) { console.error("数据加载失败:", error); }
    };

    // --- Modal Controllers ---
    const openFormModal = (mode, nodeData = {}) => {
        editingNodeId = (mode === 'edit') ? nodeData.id : null;
        const formHTML = `...`; // Form HTML content
        toggleModal(formHTML, true);
        // Add event listeners for form elements inside the modal
    };
    const openBioModal = (nodeId) => {
        editingNodeId = nodeId;
        const nodeData = nodes.get(nodeId);
        const bioHTML = `...`; // Bio card HTML content
        toggleModal(bioHTML, true);
        // Add event listeners for bio card buttons
    };
    const openDetailsModal = async (nodeId) => { /* ... */ };
    const openHistoryModal = async (nodeId, fieldKey, fieldLabel) => { /* ... */ };

    // --- Data Handlers ---
    const saveNode = async (e) => { /* ... */ };
    const deleteNode = async (nodeId) => { /* ... */ };
    const saveDetails = async (nodeId) => { /* ... */ };

    window.showHistory = openHistoryModal; // Expose to global scope for onclick
    checkActivation();
});
// (Note: The script is heavily restructured. I will provide the full, final version below)
