import { GoogleGenAI, Type } from "@google/genai";
import { marked } from "marked";

// --- Config Constants ---
const AI_CONFIG_KEY = 'ai-knowledge-aicfg-v2';
const KNOWLEDGE_BASE_KEY = 'ai-knowledge-base-v2';
const THEME_KEY = 'ai-knowledge-theme';
const DEFAULT_GEMINI_MODELS = {
    organize: 'gemini-2.5-flash',
    qa: 'gemini-2.5-flash'
};
const DEFAULT_SILICONFLOW_MODELS = {
    organize: 'alibaba/Qwen2-0.5B-Instruct',
    qa: 'deepseek-ai/DeepSeek-V2-Chat'
};


// --- App State ---
let knowledgeBase = [];
let isLoading = false;
let selectedItemId = null;
let aiConfig = null;
let aiClient = null;

// --- DOM Elements ---
const searchInput = document.getElementById('search-input');
const directoryList = document.getElementById('directory-list');
const contentDisplayArea = document.getElementById('content-display-area');
const aiQaSection = document.getElementById('ai-qa-section');
const aiQuestionInput = document.getElementById('ai-question-input');
const askAiButton = document.getElementById('ask-ai-button');
const aiAnswerContainer = document.getElementById('ai-answer-container');
const themeToggleButton = document.getElementById('theme-toggle-button');
const addButton = document.getElementById('add-button');
const settingsButton = document.getElementById('settings-button');

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
const closeSettingsButton = document.getElementById('close-settings-button');
const settingsForm = document.getElementById('settings-form');
const saveSettingsButton = document.getElementById('save-settings-button');
const aiProviderSelect = document.getElementById('ai-provider');
const aiApiKeyInput = document.getElementById('ai-api-key');
const aiBaseUrlInput = document.getElementById('ai-base-url');
const aiOrganizeModelInput = document.getElementById('ai-organize-model');
const aiQaModelInput = document.getElementById('ai-qa-model');
const siliconflowOptionsContainer = document.getElementById('siliconflow-options');


// Knowledge Modal
const knowledgeModal = document.getElementById('knowledge-modal');
const closeKnowledgeButton = document.getElementById('close-knowledge-button');
const knowledgeForm = document.getElementById('knowledge-form');
const knowledgeModalTitle = document.getElementById('knowledge-modal-title');
const knowledgeIdInput = document.getElementById('knowledge-id');
const knowledgeTitleInput = document.getElementById('knowledge-title');
const knowledgeCategoryInput = document.getElementById('knowledge-category');
const knowledgeKeywordsInput = document.getElementById('knowledge-keywords');
const knowledgeRawTextInput = document.getElementById('knowledge-raw-text');
const saveKnowledgeButton = document.getElementById('save-knowledge-button');
const aiOrganizeButton = document.getElementById('ai-organize-button');
const knowledgeDetailsSection = document.getElementById('knowledge-details-section');
const deleteKnowledgeButton = document.getElementById('delete-knowledge-button');


// --- UI Update Functions ---
function setLoading(button, loadingState) {
    isLoading = loadingState;
    const spinner = button.querySelector('.spinner');
    const buttonText = button.querySelector('.button-text');
    if (!spinner || !buttonText) return;

    if (loadingState) {
        button.disabled = true;
        spinner.style.display = 'block';
        buttonText.style.display = 'none';
    } else {
        button.disabled = false;
        spinner.style.display = 'none';
        buttonText.style.display = 'block';
    }
}

function renderDirectory() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredItems = knowledgeBase.filter(item =>
    item.title.toLowerCase().includes(searchTerm) ||
    item.summary.toLowerCase().includes(searchTerm) ||
    item.category.toLowerCase().includes(searchTerm) ||
    (item.keywords && item.keywords.some(k => k.toLowerCase().includes(searchTerm)))
  );

  const itemsByCategory = filteredItems.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  directoryList.innerHTML = '';
  if (knowledgeBase.length === 0 && !isLoading) {
    directoryList.innerHTML = `<p class="empty-state">知识库为空。点击 "+" 添加第一条知识。</p>`;
    return;
  }
   if (Object.keys(itemsByCategory).length === 0) {
      directoryList.innerHTML = `<p class="empty-state">无匹配项。</p>`;
      return;
  }
  
  Object.keys(itemsByCategory).sort().forEach(category => {
    const categoryElement = document.createElement('div');
    categoryElement.className = 'directory-category';
    const itemsHtml = itemsByCategory[category].map(item => `
        <li class="directory-item">
            <a href="#" data-id="${item.id}" class="${item.id === selectedItemId ? 'active' : ''}">${item.title}</a>
        </li>
    `).join('');
    categoryElement.innerHTML = `
        <details open>
            <summary>${category}</summary>
            <ul class="directory-item-list">${itemsHtml}</ul>
        </details>`;
    directoryList.appendChild(categoryElement);
  });
}

function renderMainContent() {
    if (selectedItemId === null) {
        contentDisplayArea.innerHTML = `
            <div class="welcome-message">
                <h2>欢迎使用 AI 知识库</h2>
                <p>${aiConfig && aiConfig.apiKey ? '从左侧目录中选择一个条目进行查看，或添加新知识。' : '请先点击右上角的 ⚙️ 配置您的 AI 服务。'}</p>
            </div>`;
        return;
    }
    const item = knowledgeBase.find(i => i.id === selectedItemId);
    if (!item) {
        selectedItemId = null;
        renderMainContent();
        return;
    }

    const keywordsHtml = item.keywords.map(k => `<span class="keyword">${k}</span>`).join('');
    const contentHtml = marked.parse(item.rawText);

    contentDisplayArea.innerHTML = `
        <article class="knowledge-display">
            <div class="knowledge-header">
                <h1>${item.title}</h1>
            </div>
            <div class="keywords">${keywordsHtml}</div>
            <div class="content-body">${contentHtml}</div>
        </article>
    `;
}

// --- Data Persistence (LocalStorage) ---
async function loadKnowledge() {
    isLoading = true;
    directoryList.innerHTML = `<p class="empty-state">正在加载知识库...</p>`;
    
    const localData = localStorage.getItem(KNOWLEDGE_BASE_KEY);
    if (localData) {
        knowledgeBase = JSON.parse(localData);
    } else {
        try {
            const response = await fetch('./knowledge.json');
            if (!response.ok) throw new Error('Failed to fetch initial knowledge.json');
            knowledgeBase = await response.json();
            saveKnowledge(); // Save initial data to localStorage
        } catch (e) {
            console.error("无法加载初始知识库:", e);
            knowledgeBase = [];
        }
    }
    
    isLoading = false;
    renderDirectory();
    renderMainContent();
}

function saveKnowledge() {
    localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(knowledgeBase));
}

// --- Settings Management ---
function handleProviderChange() {
    const provider = aiProviderSelect.value;
    if (provider === 'gemini') {
        siliconflowOptionsContainer.classList.add('hidden');
        aiOrganizeModelInput.placeholder = `默认: ${DEFAULT_GEMINI_MODELS.organize}`;
        aiQaModelInput.placeholder = `默认: ${DEFAULT_GEMINI_MODELS.qa}`;
    } else { // siliconflow
        siliconflowOptionsContainer.classList.remove('hidden');
        aiOrganizeModelInput.placeholder = `默认: ${DEFAULT_SILICONFLOW_MODELS.organize}`;
        aiQaModelInput.placeholder = `默认: ${DEFAULT_SILICONFLOW_MODELS.qa}`;
    }
}

function showSettingsModal() {
    if (aiConfig) {
        aiProviderSelect.value = aiConfig.provider;
        aiApiKeyInput.value = aiConfig.apiKey;
        aiBaseUrlInput.value = aiConfig.baseUrl || '';
        aiOrganizeModelInput.value = aiConfig.models.organize;
        aiQaModelInput.value = aiConfig.models.qa;
    }
    handleProviderChange(); // Set initial state of the modal
    settingsModal.classList.remove('hidden');
}

function hideSettingsModal() {
    settingsModal.classList.add('hidden');
}

function handleSaveSettings(e) {
    e.preventDefault();
    setLoading(saveSettingsButton, true);
    
    const provider = aiProviderSelect.value;
    const defaultModels = provider === 'gemini' ? DEFAULT_GEMINI_MODELS : DEFAULT_SILICONFLOW_MODELS;

    aiConfig = {
        provider,
        apiKey: aiApiKeyInput.value.trim(),
        baseUrl: aiBaseUrlInput.value.trim(),
        models: {
            organize: aiOrganizeModelInput.value.trim() || defaultModels.organize,
            qa: aiQaModelInput.value.trim() || defaultModels.qa,
        }
    };
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
    
    setLoading(saveSettingsButton, false);
    hideSettingsModal();
    location.reload(); // Reload to apply settings and re-init AI client
}

function loadAiConfig() {
    const savedConfig = localStorage.getItem(AI_CONFIG_KEY);
    if (savedConfig) {
        aiConfig = JSON.parse(savedConfig);
    }
}


// --- Knowledge Modal Management ---
function showKnowledgeModal(item = null) {
    knowledgeForm.reset();
    knowledgeDetailsSection.classList.add('hidden');
    saveKnowledgeButton.disabled = true;
    aiOrganizeButton.disabled = false;
    aiOrganizeButton.classList.remove('hidden');
    deleteKnowledgeButton.classList.add('hidden');
    contentDisplayArea.style.display = 'block';


    if (item) {
        knowledgeModalTitle.textContent = '编辑知识';
        knowledgeIdInput.value = item.id;
        knowledgeRawTextInput.value = item.rawText;
        knowledgeTitleInput.value = item.title;
        knowledgeCategoryInput.value = item.category;
        knowledgeKeywordsInput.value = item.keywords.join(', ');
        
        knowledgeDetailsSection.classList.remove('hidden');
        saveKnowledgeButton.disabled = false;
        aiOrganizeButton.classList.add('hidden');
        deleteKnowledgeButton.classList.remove('hidden');
    } else {
        knowledgeModalTitle.textContent = '添加新知识';
        knowledgeIdInput.value = '';
    }
    knowledgeModal.classList.remove('hidden');
}

function hideKnowledgeModal() {
    knowledgeModal.classList.add('hidden');
    selectedItemId = null; // Clear selection when closing
    renderDirectory();
    renderMainContent();
}

function handleSaveKnowledge(e) {
    e.preventDefault();
    setLoading(saveKnowledgeButton, true);
    
    const id = knowledgeIdInput.value || `kn_${new Date().getTime()}`;
    const keywords = knowledgeKeywordsInput.value.split(',').map(k => k.trim()).filter(Boolean);
    const title = knowledgeTitleInput.value.trim();
    const rawText = knowledgeRawTextInput.value;
    const summary = rawText.substring(0, 150) + (rawText.length > 150 ? '...' : '');

    const newItem = {
        id,
        title,
        category: knowledgeCategoryInput.value.trim(),
        keywords,
        rawText,
        summary
    };

    const existingIndex = knowledgeBase.findIndex(item => item.id === id);
    if (existingIndex > -1) {
        knowledgeBase[existingIndex] = newItem;
    } else {
        knowledgeBase.unshift(newItem);
    }

    saveKnowledge();
    selectedItemId = id;
    hideKnowledgeModal();
    renderDirectory();
    renderMainContent();
    setLoading(saveKnowledgeButton, false);
}

function handleDeleteItem() {
    const id = knowledgeIdInput.value;
    if (!id || !confirm('确定要删除这个知识条目吗？此操作无法撤销。')) return;

    knowledgeBase = knowledgeBase.filter(item => item.id !== id);
    saveKnowledge();

    if (selectedItemId === id) {
        selectedItemId = null;
    }
    
    hideKnowledgeModal();
}

// --- AI Abstraction Layer ---
function initializeAiClient() {
    if (!aiConfig || !aiConfig.apiKey) {
        aiClient = null;
        return;
    }

    if (aiConfig.provider === 'gemini') {
        const gemini = new GoogleGenAI({ apiKey: aiConfig.apiKey });
        aiClient = {
            generateContent: (params) => gemini.models.generateContent(params),
        };
    } else if (aiConfig.provider === 'siliconflow') {
        aiClient = {
            generateContent: async ({ model, contents, config }) => {
                const url = aiConfig.baseUrl || 'https://api.siliconflow.cn/v1';
                const response = await fetch(`${url}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${aiConfig.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: contents }],
                        stream: false,
                        response_format: config?.responseMimeType === 'application/json' ? { type: "json_object" } : { type: "text"}
                    })
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`SiliconFlow API Error: ${error.error?.message || response.statusText}`);
                }
                const data = await response.json();
                const textResponse = data.choices[0].message.content;
                // Mimic Gemini response object structure for consistency
                return { text: textResponse };
            }
        };
    }
}


// --- Theme Management ---
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// --- Core AI Logic ---

async function handleAiOrganize() {
    if (!aiClient) {
        alert("AI 服务未配置，无法使用此功能。");
        return;
    }
    const rawText = knowledgeRawTextInput.value.trim();
    if (!rawText) {
        alert("请输入内容后再进行整理。");
        return;
    }

    setLoading(aiOrganizeButton, true);
    
    try {
        const prompt = `请你扮演一个专业的知识库管理员。分析以下文本，并根据其内容，以JSON格式返回一个包含标题(title)、类别(category)和关键词(keywords)的对象。文本如下：\n\n---\n${rawText}\n---`;

        const response = await aiClient.generateContent({
            model: aiConfig.models.organize,
            contents: prompt,
            config: { responseMimeType: "application/json" },
        });
        
        const result = JSON.parse(response.text);

        knowledgeTitleInput.value = result.title || '';
        knowledgeCategoryInput.value = result.category || '';
        knowledgeKeywordsInput.value = result.keywords ? result.keywords.join(', ') : '';
        
        knowledgeDetailsSection.classList.remove('hidden');
        saveKnowledgeButton.disabled = false;
        aiOrganizeButton.disabled = true;

    } catch(error) {
        console.error("AI 组织失败:", error);
        alert(`AI 整理时发生错误: ${error.message}`);
        knowledgeDetailsSection.classList.remove('hidden');
        saveKnowledgeButton.disabled = false;
    } finally {
        setLoading(aiOrganizeButton, false);
    }
}

async function handleAskAI() {
    if (!aiClient) {
      alert("AI 服务未配置，无法提问。");
      return;
    }
    const question = aiQuestionInput.value.trim();
    if (!question) return;

    if (knowledgeBase.length === 0) {
        alert('您的知识库是空的。');
        return;
    }
    
    setLoading(askAiButton, true);
    aiAnswerContainer.innerHTML = '';

    const knowledgeContext = knowledgeBase.map(item => `类别: ${item.category}\n标题: ${item.title}\n内容: ${item.rawText}`).join('\n\n---\n\n');
    const prompt = `根据以下知识库，回答用户的问题。如果答案不在知识库中，请说明找不到相关答案。请使用Markdown格式化您的回答。\n\n--- 知识库开始 ---\n\n${knowledgeContext}\n\n--- 知识库结束 ---\n\n问题: ${question}`;

    try {
        const response = await aiClient.generateContent({ model: aiConfig.models.qa, contents: prompt });
        aiAnswerContainer.innerHTML = await marked.parse(response.text);
    } catch (error) {
        console.error("Error asking AI:", error);
        aiAnswerContainer.textContent = `获取答案时发生错误: ${error.message}`;
    } finally {
        setLoading(askAiButton, false);
    }
}

// --- Initialization & Event Listeners ---
function handleSelectItem(id) {
    const item = knowledgeBase.find(i => i.id === id);
    if (!item) return;
    
    selectedItemId = id;
    renderDirectory(); // To update active state
    renderMainContent();
}


async function initialize() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);
  
  loadAiConfig();
  initializeAiClient();

  if (!aiClient) {
    askAiButton.disabled = true;
    (askAiButton.querySelector('.button-text')).textContent = 'AI 未配置';
    aiQuestionInput.disabled = true;
    aiQuestionInput.placeholder = '请先在设置中配置AI服务';
    aiOrganizeButton.disabled = true;
    showSettingsModal();
  }

  // Event Listeners
  themeToggleButton.addEventListener('click', toggleTheme);
  searchInput.addEventListener('input', renderDirectory);
  
  // Settings
  settingsButton.addEventListener('click', showSettingsModal);
  closeSettingsButton.addEventListener('click', hideSettingsModal);
  settingsForm.addEventListener('submit', handleSaveSettings);
  aiProviderSelect.addEventListener('change', handleProviderChange);

  // Knowledge
  addButton.addEventListener('click', () => showKnowledgeModal());
  directoryList.addEventListener('click', (e) => {
    const target = e.target;
    if (target.nodeName === 'A' && target.dataset.id) {
      e.preventDefault();
      handleSelectItem(target.dataset.id);
    } else if (target.nodeName === 'SUMMARY') {
        // Allow details/summary to toggle
    } else {
        const itemLink = target.closest('.directory-item a');
        if(itemLink){
            e.preventDefault();
            handleSelectItem(itemLink.dataset.id);
        }
    }
  });
  
  closeKnowledgeButton.addEventListener('click', hideKnowledgeModal);
  knowledgeForm.addEventListener('submit', handleSaveKnowledge);
  deleteKnowledgeButton.addEventListener('click', handleDeleteItem);
  
  aiOrganizeButton.addEventListener('click', handleAiOrganize);
  askAiButton.addEventListener('click', handleAskAI);
  
  await loadKnowledge();
}

initialize();