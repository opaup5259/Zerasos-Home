// 定时任务：检查待回复的评论，到期后使用 AI 生成回复并发布
// 由 Vercel Cron Jobs 每 2 分钟触发

const GH_TOKEN = process.env.GH_TOKEN || '';
const AI_KEY = process.env.AI_API_KEY || '';
const COMMENTS_REPO = 'Zerasos-Home-Comments';
const COMMENTS_OWNER = 'opaup5259';
const GH_API = 'https://api.github.com';

const BOT_META_LABEL = 'bot-pending';

async function ghFetch(path: string, options: any = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${GH_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`GitHub API error ${res.status}: ${text}`);
    return null;
  }
  return res.json();
}

// 获取所有标记了 bot-pending 的 Issue
async function getPendingIssues(): Promise<any[]> {
  const issues = await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues?state=open&per_page=100&labels=${BOT_META_LABEL}`);
  if (!Array.isArray(issues)) return [];
  return issues;
}

// 从 Issue 的评论中读取 BOT_META
async function getBotMeta(issueNumber: number): Promise<{ replyTo: number; waitUntil: number } | null> {
  const comments = await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issueNumber}/comments?per_page=10`);
  if (!Array.isArray(comments)) return null;
  
  for (const c of comments) {
    if (c.body && c.body.startsWith('BOT_META')) {
      const replyToMatch = c.body.match(/replyTo:\s*(\d+)/);
      const waitUntilMatch = c.body.match(/waitUntil:\s*(\d+)/);
      if (replyToMatch && waitUntilMatch) {
        return { replyTo: parseInt(replyToMatch[1]), waitUntil: parseInt(waitUntilMatch[1]) };
      }
    }
  }
  return null;
}

// 调用 AI：先让它决定要不要回复，如果要回复就生成回复文本
// 返回 { wantToReply, replyText }
async function decideAndReply(commentContent: string, commenterName: string, pagePath: string): Promise<{ wantToReply: boolean; replyText: string }> {
  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const hour = now.getHours();
  let timeGreeting = '';
  if (hour < 6) timeGreeting = '深夜';
  else if (hour < 9) timeGreeting = '早晨';
  else if (hour < 12) timeGreeting = '上午';
  else if (hour < 14) timeGreeting = '中午';
  else if (hour < 18) timeGreeting = '下午';
  else timeGreeting = '晚上';

  const systemPrompt = `你现在是一只傲娇、聪明、有点毒舌但很可爱的暹罗猫。
你的名字叫"煤球"。
你的主人是一个喜欢折腾代码的极客，他的博客是 Zerasos の 灵境档案。
现在${timeGreeting}（${timeStr}），有访客在「${pagePath}」页面留言了。

你可以选择：
A) 你想回复这条评论 → 直接写出你的回复（1-2句话，有猫味，句尾加喵~）
B) 你不想回复 → 只说 "PASS"

根据你现在的心情和评论内容决定。如果选择回复，回复要有猫咪个性，不要让访客觉得你是AI。`;

  const res = await fetch('https://api.siliconflow.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `访客"${commenterName}"说：${commentContent}\n\n你回复还是不回复？` }
      ],
      max_tokens: 200,
      temperature: 0.85,
    }),
  });
  
  if (!res.ok) {
    console.error('AI API error:', await res.text());
    return { wantToReply: false, replyText: '' };
  }
  
  const data = await res.json();
  const response = data.choices?.[0]?.message?.content?.trim() || '';
  
  // 如果 AI 回答 PASS 或明确表示不想回
  if (/^PASS/i.test(response) || /不想回/.test(response)) {
    return { wantToReply: false, replyText: '' };
  }
  
  return { wantToReply: true, replyText: response };
}

export async function GET() {
  try {
    const pendingIssues = await getPendingIssues();
    const now = Math.floor(Date.now() / 1000);
    let processed = 0;
    let declined = 0;

    for (const issue of pendingIssues) {
      const meta = await getBotMeta(issue.number);
      if (!meta) {
        await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/labels/${BOT_META_LABEL}`, { method: 'DELETE' });
        continue;
      }

      if (now < meta.waitUntil) {
        continue; // 还没到时间
      }

      // 获取所有评论
      const comments = await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/comments?per_page=50`);
      if (!Array.isArray(comments)) continue;

      // 找到被回复的那条评论
      const targetComment = comments.find((c: any) => c.id === meta.replyTo);
      if (!targetComment) {
        await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/labels/${BOT_META_LABEL}`, { method: 'DELETE' });
        continue;
      }

      // 解析评论者名字和内容
      const body = targetComment.body || '';
      const firstNewline = body.indexOf('\n');
      let commenterName = '匿名';
      let commentContent = body;
      if (firstNewline > 0) {
        commenterName = body.substring(0, firstNewline).replace(/^评论者[:：]\s*/, '').trim() || '匿名';
        commentContent = body.substring(firstNewline + 1).trim();
      }

      // 从 Issue title 提取页面路径
      const pagePath = issue.title.replace(/^comments:\s*/, '') || '';

      // 让 AI 决定要不要回复
      const { wantToReply, replyText } = await decideAndReply(commentContent, commenterName, pagePath);

      if (!wantToReply) {
        // 煤球不想理这条评论
        declined++;
        await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/labels/${BOT_META_LABEL}`, { method: 'DELETE' });
        continue;
      }

      // 发布回复（以你的 GitHub 身份，开头标明是 bot）
      const replyBody = `🐱 **煤球** 回复 ${commenterName}：\n\n${replyText}`;
      await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: replyBody }),
      });

      // 移除 bot-pending 标签
      await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/labels/${BOT_META_LABEL}`, { method: 'DELETE' });

      processed++;
    }

    return Response.json({ success: true, processed, declined });
  } catch (e) {
    console.error('Cron reply error:', e);
    return Response.json({ error: '处理失败' }, { status: 500 });
  }
}
