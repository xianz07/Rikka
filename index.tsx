import { GoogleGenAI } from "@google/genai";
import { marked } from "marked";

// --- App State ---
let knowledgeBase = [];
let isLoadingAsk = false;
let selectedItemId = null;
const API_KEY_CONFIGURED = !!process.env.API_KEY;


// --- DOM Elements ---
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const directoryList = document.getElementById('directory-list') as HTMLElement;
const contentDisplayArea = document.getElementById('content-display-area') as HTMLElement;

const aiQaSection = document.getElementById('ai-qa-section') as HTMLElement;
const aiQuestionInput = document.getElementById('ai-question-input') as HTMLInputElement;
const askAiButton = document.getElementById('ask-ai-button') as HTMLButtonElement;
const aiAnswerContainer = document.getElementById('ai-answer-container') as HTMLElement;

// Theme Toggle
const themeToggleButton = document.getElementById('theme-toggle-button') as HTMLButtonElement;


// --- Gemini AI Initialization ---
const ai = API_KEY_CONFIGURED ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;


// --- UI Update Functions ---

function setLoading(button, isLoading) {
    const spinner = button.querySelector('.spinner');
    const buttonText = button.querySelector('.button-text');
    if (!spinner || !buttonText) return;

    if (isLoading) {
        button.disabled = true;
        spinner.removeAttribute('style');
        buttonText.style.display = 'none';
    } else {
        button.disabled = false;
        spinner.style.display = 'none';
        buttonText.removeAttribute('style');
    }
}

function renderDirectory() {
  const searchTerm = searchInput.value.toLowerCase();

  const filteredItems = knowledgeBase.filter(item =>
    item.title.toLowerCase().includes(searchTerm) ||
    item.summary.toLowerCase().includes(searchTerm) ||
    item.category.toLowerCase().includes(searchTerm) ||
    item.keywords.some(k => k.toLowerCase().includes(searchTerm))
  );

  const itemsByCategory = filteredItems.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  directoryList.innerHTML = '';
  if (Object.keys(itemsByCategory).length === 0) {
      directoryList.innerHTML = `<p class="empty-state">${knowledgeBase.length === 0 ? '知识库为空。' : '无匹配项。'}</p>`;
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
        </details>
    `;
    directoryList.appendChild(categoryElement);
  });
}

function renderMainContent() {
    if (selectedItemId === null) {
        contentDisplayArea.innerHTML = `
            <div class="welcome-message">
                <h2>欢迎使用 AI 知识库</h2>
                <p>从左侧目录中选择一个条目进行查看。</p>
            </div>
        `;
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
            <h1>${item.title}</h1>
            <div class="keywords">${keywordsHtml}</div>
            <div class="content-body">${contentHtml}</div>
        </article>
    `;
}

// --- Data Persistence ---
async function loadFromRepo() {
  try {
    const response = await fetch('./knowledge.json');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
        knowledgeBase = data;
    }
  } catch(e) {
      console.error("无法加载知识库 'knowledge.json':", e);
      contentDisplayArea.innerHTML = `
        <div class="api-key-error" style="margin: 2rem; color: white;">
            错误：无法加载知识库。<br>
            请确保 'knowledge.json' 文件存在于仓库根目录并且格式正确。
        </div>
      `;
  }
}

// --- Theme Management ---
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ai-knowledge-theme', theme);
    if (themeToggleButton) {
        themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('ai-knowledge-theme') || 'light';
    applyTheme(savedTheme);
}


// --- Core Logic ---

async function handleAskAI() {
    if (!ai) {
      alert("AI 服务未配置，无法提问。");
      return;
    }
    const question = aiQuestionInput.value.trim();
    if (!question) {
        alert('请输入一个问题。');
        return;
    }

    if (knowledgeBase.length === 0) {
        alert('您的知识库是空的。请在提问前添加一些知识。');
        return;
    }
    
    isLoadingAsk = true;
    setLoading(askAiButton, isLoadingAsk);
    aiAnswerContainer.innerHTML = '';

    const knowledgeContext = knowledgeBase.map(item => `类别: ${item.category}\n标题: ${item.title}\n内容: ${item.rawText}`).join('\n\n---\n\n');
    const prompt = `根据以下知识库，回答用户的问题。如果答案不在知识库中，请说明找不到相关答案。请使用Markdown格式化您的回答。\n\n--- 知识库开始 ---\n\n${knowledgeContext}\n\n--- 知识库结束 ---\n\n问题: ${question}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const formattedHtml = await marked.parse(response.text);
        aiAnswerContainer.innerHTML = formattedHtml;

    } catch (error) {
        console.error("Error asking AI:", error);
        aiAnswerContainer.textContent = '获取答案时发生错误。请重试。';
    } finally {
        isLoadingAsk = false;
        setLoading(askAiButton, isLoadingAsk);
    }
}

function handleSelectItem(id) {
    selectedItemId = id;
    renderDirectory();
    renderMainContent();
}

// --- Event Listeners ---

async function initialize() {
  loadTheme();
  
  if (!API_KEY_CONFIGURED) {
    askAiButton.disabled = true;
    (askAiButton.querySelector('.button-text')).textContent = 'AI 功能已禁用';
    askAiButton.title = 'AI 服务未配置';
    aiQuestionInput.disabled = true;
    aiQuestionInput.placeholder = 'AI 服务未配置，无法提问。';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'api-key-error';
    errorDiv.textContent = '无法连接到AI服务：API密钥未配置。请确保运行环境已正确设置。';
    aiQaSection.prepend(errorDiv);
  }

  // Action listeners
  askAiButton.addEventListener('click', handleAskAI);
  searchInput.addEventListener('input', renderDirectory);
  themeToggleButton.addEventListener('click', toggleTheme);
  
  directoryList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor && anchor.dataset.id) {
      e.preventDefault();
      handleSelectItem(anchor.dataset.id);
    }
  });

  await loadFromRepo();
  renderDirectory();
  renderMainContent();
}

// --- App Start ---
initialize();