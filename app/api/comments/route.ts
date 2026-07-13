// 自定义评论系统 API - 使用 GitHub Issues 存储评论（无需 OAuth App）
// 服务端使用 GH_TOKEN 直接操作 GitHub Issues，不暴露给前端

const GH_TOKEN = process.env.GH_TOKEN;
const COMMENTS_REPO = 'Zerasos-Home-Comments';
const COMMENTS_OWNER = 'opaup5259';
const GH_API = 'https://api.github.com';

// 将页面路径转为 Issue 标题（截断以免 GitHub 限制）
function pathToIssueTitle(path: string): string {
  return `comments: ${path.replace(/\/$/,'') || '/'}`.substring(0, 200);
}

// 查找或创建对应页面路径的 Issue（避免使用 Search API，防止索引延迟）
async function ensureIssue(path: string): Promise<number> {
  const title = pathToIssueTitle(path);
  
  // 列出所有 Issue（最多100个），本地匹配标题
  let page = 1;
  const perPage = 100;
  while (page <= 3) {  // 最多翻3页
    const listUrl = `${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues?state=all&per_page=${perPage}&page=${page}&sort=updated&direction=desc`;
    const listRes = await fetch(listUrl, {
      headers: { 'Authorization': `token ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!listRes.ok) break;
    const issues = await listRes.json();
    if (!Array.isArray(issues) || issues.length === 0) break;
    for (const issue of issues) {
      if (issue.title === title) {
        return issue.number;
      }
    }
    page++;
  }
  
  // 没找到，创建新 Issue
  const createRes = await fetch(`${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues`, {
    method: 'POST',
    headers: { 'Authorization': `token ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body: `Comments for: ${path}` })
  });
  const createData = await createRes.json();
  return createData.number;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/';
    
    const issueNumber = await ensureIssue(path);
    
    // 获取该 Issue 的所有评论
    const commentsRes = await fetch(`${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issueNumber}/comments?per_page=100`, {
      headers: { 'Authorization': `token ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    
    if (!commentsRes.ok) {
      return Response.json({ comments: [] });
    }
    
    const comments = await commentsRes.json();
    
    // 解析我们自定义的评论格式：第一行是用户名
    const parsedComments = comments.map((c: any) => {
      const body = c.body || '';
      const firstNewline = body.indexOf('\n');
      let name = '匿名';
      let content = body;
      if (firstNewline > 0) {
        name = body.substring(0, firstNewline).replace(/^评论者[:：]\s*/, '').trim() || '匿名';
        content = body.substring(firstNewline + 1).trim();
      }
      // 根据用户名生成一致的头像（DiceBear 免费 API）
      const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(name)}&scale=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      return {
        id: c.id,
        name,
        content,
        date: c.created_at,
        avatarUrl,
      };
    });
    
    return Response.json({ comments: parsedComments, issueNumber });
    
  } catch (e) {
    console.error('获取评论失败:', e);
    return Response.json({ comments: [], error: '获取评论失败' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { path, name, content } = await req.json();
    
    if (!path || !content || !content.trim()) {
      return Response.json({ error: '内容和路径不能为空' }, { status: 400 });
    }
    
    const safeName = (name || '匿名').trim().substring(0, 50);
    const issueNumber = await ensureIssue(path);
    
    // 评论格式：第一行是用户名，后面是内容
    const body = `评论者：${safeName}\n\n${content.trim()}`;
    
    const createRes = await fetch(`${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: { 'Authorization': `token ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
    
    if (!createRes.ok) {
      const err = await createRes.text();
      return Response.json({ error: '评论发布失败' }, { status: 500 });
    }
    
    const comment = await createRes.json();
    
    return Response.json({
      success: true,
      comment: {
        id: comment.id,
        name: safeName,
        content: content.trim(),
        date: comment.created_at,
        avatarUrl: comment.user?.avatar_url || '',
      }
    });
    
  } catch (e) {
    console.error('发布评论失败:', e);
    return Response.json({ error: '发布评论失败' }, { status: 500 });
  }
}
