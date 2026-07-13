// QQ OAuth 登录 API
// 需要先在 connect.qq.com 创建应用，设置回调地址为 https://zerasos-home.vercel.app/api/auth/qq

const QQ_APP_ID = process.env.QQ_APP_ID || '';
const QQ_APP_KEY = process.env.QQ_APP_KEY || '';
const REDIRECT_URI = 'https://zerasos-home.vercel.app/api/auth/qq';

function getQQAuthUrl() {
  const state = Math.random().toString(36).substring(2, 15);
  return `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${QQ_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=get_user_info`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // 生成 QQ 登录链接
  if (action === 'login') {
    return Response.json({ url: getQQAuthUrl() });
  }

  // QQ 回调处理
  const code = url.searchParams.get('code');
  if (!code) {
    return Response.json({ error: '缺少 code 参数' }, { status: 400 });
  }

  try {
    // 1. 用 code 换 access_token
    const tokenRes = await fetch(
      `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${QQ_APP_ID}&client_secret=${QQ_APP_KEY}&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&fmt=json`
    );
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new Response(`<script>window.opener.postMessage({type:'qq-login',error:'token_failed'},'*');window.close();</script>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // 2. 用 access_token 换 openid
    const openidRes = await fetch(`https://graph.qq.com/oauth2.0/me?access_token=${accessToken}&fmt=json`);
    const openidData = await openidRes.json();
    const openid = openidData.openid;
    if (!openid) {
      return new Response(`<script>window.opener.postMessage({type:'qq-login',error:'openid_failed'},'*');window.close();</script>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // 3. 获取用户信息
    const userRes = await fetch(`https://graph.qq.com/user/get_user_info?access_token=${accessToken}&oauth_consumer_key=${QQ_APP_ID}&openid=${openid}&fmt=json`);
    const userData = await userRes.json();

    const nickname = userData.nickname || 'QQ用户';
    const avatar = userData.figureurl_qq_2 || userData.figureurl_qq_1 || '';

    return new Response(
      `<script>
        window.opener.postMessage({
          type:'qq-login',
          openid:'${openid}',
          nickname:'${nickname.replace(/'/g, "\\'")}',
          avatar:'${avatar}'
        },'*');
        window.close();
      </script>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (e) {
    console.error('QQ login error:', e);
    return new Response(`<script>window.opener.postMessage({type:'qq-login',error:'server_error'},'*');window.close();</script>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
