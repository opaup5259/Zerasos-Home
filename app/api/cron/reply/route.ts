import { siteConfig } from '../../../../siteConfig';

const GH_TOKEN = process.env.GH_TOKEN || '';
const AI_KEY = process.env.AI_API_KEY || '';
const COMMENTS_REPO = 'Zerasos-Home-Comments';
const COMMENTS_OWNER = 'opaup5259';
const GH_API = 'https://api.github.com';
const BOT_META_LABEL = 'bot-pending';

async function ghFetch(path: string, opts: any = {}) {
  const url = `${GH_API}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function getPendingIssues() {
  const issues = await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues?state=open&per_page=100&labels=${BOT_META_LABEL}`);
  return Array.isArray(issues) ? issues : [];
}

async function getBotMeta(issueNumber: number) {
  const comments = await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issueNumber}/comments?per_page=10`);
  if (!Array.isArray(comments)) return null;
  for (const c of comments) {
    if (c.body?.startsWith('BOT_META')) {
      const r = c.body.match(/replyTo:\s*(\d+)/);
      const w = c.body.match(/waitUntil:\s*(\d+)/);
      if (r && w) return { replyTo: +r[1], waitUntil: +w[1] };
    }
  }
  return null;
}

async function askBot(text: string, name: string, page: string) {
  const now = new Date();
  const t = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const h = now.getHours();
  const g = h < 6 ? 'deep night' : h < 9 ? 'morning' : h < 12 ? 'late morning' : h < 14 ? 'noon' : h < 18 ? 'afternoon' : 'evening';

  const cfg = siteConfig.aiConfig;
  const res = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.modelId,
      messages: [
        { role: 'system', content: `You are Meiqiu the cat. It's ${g} (${t}) at "${page}". Reply with 1-2 catty sentences ending in "nya~", or say "PASS" to skip.` },
        { role: 'user', content: `Visitor "${name}" says: ${text}\n\nReply or PASS?` },
      ],
      max_tokens: cfg.maxOutputTokens || 200,
      temperature: cfg.temperature || 0.85,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function GET() {
  try {
    const issues = await getPendingIssues();
    const now = Math.floor(Date.now() / 1000);
    let processed = 0, declined = 0;

    for (const issue of issues) {
      const meta = await getBotMeta(issue.number);
      if (!meta) { await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/labels/${BOT_META_LABEL}`, { method: 'DELETE' }); continue; }
      if (now < meta.waitUntil) continue;

      const comments = await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/comments?per_page=50`);
      if (!Array.isArray(comments)) continue;
      const tc = comments.find((c: any) => c.id === meta.replyTo);
      if (!tc) { await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/labels/${BOT_META_LABEL}`, { method: 'DELETE' }); continue; }

      const body = tc.body || '';
      const nl = body.indexOf('\n');
      const name = nl > 0 ? body.slice(0, nl).replace(/^评论者[:：]\s*/, '').trim() || 'Anonymous' : 'Anonymous';
      const content = nl > 0 ? body.slice(nl + 1).trim() : body;
      const page = issue.title.replace(/^comments:\s*/, '') || '';

      const reply = await askBot(content, name, page);
      if (!reply || /^PASS/i.test(reply)) { declined++; await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/labels/${BOT_META_LABEL}`, { method: 'DELETE' }); continue; }

      await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/comments`, {
        method: 'POST', body: JSON.stringify({ body: `🐱 **Meiqiu** replies:\n\n${reply}` }),
      });
      await ghFetch(`/repos/${COMMENTS_OWNER}/${COMMENTS_REPO}/issues/${issue.number}/labels/${BOT_META_LABEL}`, { method: 'DELETE' });
      processed++;
    }

    return Response.json({ success: true, processed, declined });
  } catch (e) {
    console.error('Cron reply error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
