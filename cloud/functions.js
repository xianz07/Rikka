// 在 LeanCloud 云引擎的 package.json 中请确保添加了以下依赖：
// "dependencies": {
//   "leanengine": "^3.0.0",
//   "@octokit/rest": "^20.0.0" 
// }
const AV = require('leanengine');
const { Octokit } = require("@octokit/rest");

// 从环境变量中安全地获取配置
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_PAT = process.env.GITHUB_PAT;
const KNOWLEDGE_FILE_PATH = 'knowledge.json';

// 启动时检查关键环境变量
if (!GITHUB_USERNAME || !GITHUB_REPO || !GITHUB_PAT) {
    throw new Error("Missing required environment variables (GITHUB_USERNAME, GITHUB_REPO, GITHUB_PAT). Please configure them in the LeanCloud dashboard.");
}

const octokit = new Octokit({ auth: GITHUB_PAT });

/**
 * 从 GitHub 仓库获取 knowledge.json 的内容
 */
AV.Cloud.define('getKnowledgeBase', async () => {
    try {
        const { data } = await octokit.repos.getContent({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            path: KNOWLEDGE_FILE_PATH,
        });

        if (data.type !== 'file') {
            throw new AV.Cloud.Error(`'${KNOWLEDGE_FILE_PATH}' is not a file.`, { status: 400 });
        }

        // 内容是 Base64 编码的，需要解码
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(content);

    } catch (error) {
        // 如果文件不存在 (404)，则返回一个空数组，这是正常情况
        if (error.status === 404) {
            console.log(`'${KNOWLEDGE_FILE_PATH}' not found. Returning empty array.`);
            return [];
        }
        console.error('GitHub API Error (getKnowledgeBase):', error);
        throw new AV.Cloud.Error('Failed to fetch knowledge base from GitHub.', { status: 500, message: error.message });
    }
});


/**
 * 更新 GitHub 仓库中的 knowledge.json 文件
 */
AV.Cloud.define('updateKnowledgeBase', async (request) => {
    const { knowledgeData } = request.params;

     if (!knowledgeData) {
        throw new AV.Cloud.Error("knowledgeData is required.", { status: 400 });
    }

    // 将新的知识库数据转换为 Base64 编码的字符串
    const contentEncoded = Buffer.from(JSON.stringify(knowledgeData, null, 2)).toString('base64');
    
    let currentSha;
    try {
        // 在更新前，先获取文件的最新 SHA，以避免覆盖他人的更改
        const { data } = await octokit.repos.getContent({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            path: KNOWLEDGE_FILE_PATH,
        });
        currentSha = data.sha;
    } catch (error) {
        // 如果文件不存在，SHA 为 undefined，API 会自动创建新文件
        if (error.status !== 404) {
            console.error('GitHub API Error (updateKnowledgeBase - getContent):', error);
            throw new AV.Cloud.Error('Failed to get current file information from GitHub.', { status: 500 });
        }
        console.log(`'${KNOWLEDGE_FILE_PATH}' not found. A new file will be created.`);
    }

    try {
        const { data } = await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_USERNAME,
            repo: GITHUB_REPO,
            path: KNOWLEDGE_FILE_PATH,
            message: `[skip ci] Update knowledge base via web app - ${new Date().toISOString()}`,
            content: contentEncoded,
            sha: currentSha, // 提供 SHA 以更新现有文件
            committer: {
                name: 'AI Knowledge Base App',
                email: 'app@example.com',
            },
        });
        return { success: true, sha: data.commit.sha };
    } catch (error) {
        console.error('GitHub API Error (updateKnowledgeBase - createOrUpdate):', error);
        throw new AV.Cloud.Error('Failed to update knowledge base file on GitHub.', { status: 500 });
    }
});
