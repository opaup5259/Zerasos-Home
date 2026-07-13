import { query, execute, queryOne } from '../../../lib/db';

const GH_TOKEN = process.env.GH_TOKEN || '';
const COMMENTS_REPO = 'Zerasos-Home-Comments';
const COMMENTS_OWNER = 'opaup5259';
const GH_API = 'https://api.github.com';

function pathToIssueTitle(path: string): string {
  return `comments: ${path.replace(/\/$/,'') || '/'}`.substring(0, 200);
}

// ========== GitHub Issues 兼容（已有数据） ==========
let _issueCache = new Map<string, number>();

async function ensureIssue(path: string): Promise<number> {
  const cached = _issueCache.get(path);
  if (cached) return cached;

  const title = pathToIssueTitle(path);
  let page = 1;
  while (page <= 3) {
    const url = `${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues?state=all&per_page=100&page=${page}&sort=updated&direction=desc`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (!res.ok) break;
    const issues = await res.json();
    if (!Array.isArray(issues) || issues.length === 0) break;
    for (const issue of issues) {
      if (issue.title === title) {
        _issueCache.set(path, issue.number);
        return issue.number;
      }
    }
    page++;
  }

  const createRes = await fetch(`${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues`, {
    method: 'POST',
    headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body: `Comments for: ${path}`, labels: [] }),
  });
  const createData = await createRes.json();
  _issueCache.set(path, createData.number);
  return createData.number;
}

// ========== GET: 获取评论 ==========
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pagePath = url.searchParams.get('path') || '/';

    // 优先从 MySQL 读
    let comments = await query(
      'SELECT c.id, c.openid, c.nickname, c.content, c.created_at, u.avatar FROM comments c LEFT JOIN users u ON c.openid = u.openid WHERE c.page_path = ? ORDER BY c.created_at ASC',
      [pagePath]
    );

    // MySQL 没数据时 fallback 到 GitHub Issues（兼容旧评论）
    if (comments.length === 0 && GH_TOKEN) {
      const issueNumber = await ensureIssue(pagePath);
      if (issueNumber) {
        const res = await fetch(`${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issueNumber}/comments?per_page=100`, {
          headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (res.ok) {
          const ghComments = await res.json();
          comments = ghComments.map((c: any) => {
            const body = c.body || '';
            const nl = body.indexOf('\n');
            const name = nl > 0 ? body.slice(0, nl).replace(/^评论者[:：]\s*/, '').trim() || 'Anonymous' : 'Anonymous';
            const content = nl > 0 ? body.slice(nl + 1).trim() : body;
            const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(name)}&scale=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
            return { id: c.id, openid: '', nickname: name, content, created_at: c.created_at, avatar: avatarUrl };
          }).filter((c: any) => !c.content.startsWith('BOT_META') && !c.content.startsWith('🐱'));
        }
      }
    }

    return Response.json({ comments });
  } catch (e) {
    console.error('GET comments error:', e);
    return Response.json({ comments: [] });
  }
}

// ========== POST: 发布评论 ==========
export async function POST(req: Request) {
  try {
    const { path, content, openid, nickname, avatar } = await req.json();
    if (!path || !content || !content.trim()) {
      return Response.json({ error: '内容和路径不能为空' }, { status: 400 });
    }

    const safeName = (nickname || '匿名').trim().substring(0, 50);

    // 1. 保存到 MySQL
    const result = await execute(
      'INSERT INTO comments (openid, nickname, content, page_path) VALUES (?, ?, ?, ?)',
      [openid || '', safeName, content.trim(), path]
    );

    // 2. 如果有关联的 openid，更新用户最后活跃时间
    if (openid) {
      await execute(
        'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nickname = VALUES(nickname), avatar = VALUES(avatar), last_active = CURRENT_TIMESTAMP',
        [openid, safeName, avatar || '']
      );
    }

    // 3. 同步到 GitHub Issues（已有评论兼容）
    if (GH_TOKEN) {
      try {
        const issueNumber = await ensureIssue(path);
        const ghBody = `评论者：${safeName}\n\n${content.trim()}`;
        await fetch(`${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: ghBody }),
        });

        // 调度 Bot 自动回复
        const randomDelay = Math.floor(Math.random() * 291) + 10;
        const waitUntil = Math.floor(Date.now() / 1000) + randomDelay;
        await fetch(`${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issueNumber}/labels`, {
          method: 'POST',
          headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ labels: ['bot-pending'] }),
        }).catch(() => {});
        await fetch(`${GH_API}/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: `BOT_META\nreplyTo: ${Date.now()}\nwaitUntil: ${waitUntil}` }),
        }).catch(() => {});
      } catch (e) {
        // GitHub 同步失败不影响主流程
      }
    }

    // 4. 返回新评论
    const avatarUrl = avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(safeName)}&scale=80&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    return Response.json({
      success: true,
      comment: {
        id: result.insertId,
        openid: openid || '',
        nickname: safeName,
        content: content.trim(),
        created_at: new Date().toISOString(),
        avatar: avatarUrl,
      }
    });

  } catch (e) {
    console.error('POST comments error:', e);
    return Response.json({ error: '评论发布失败' }, { status: 500 });
  }
}
