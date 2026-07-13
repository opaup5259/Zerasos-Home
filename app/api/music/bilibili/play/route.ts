import { NextRequest, NextResponse } from 'next/server'

// GET /api/music/bilibili/play?bvid=xxx  — 代理播放（加 Referer 头绕过防盗链）
export async function GET(request: NextRequest) {
  const bvid = request.nextUrl.searchParams.get('bvid')
  const urlParam = request.nextUrl.searchParams.get('url')

  // 方式 1：传 bvid，临时拉取音频流（每次请求都刷新 URL）
  if (bvid) {
    try {
      // 先获取 CID
      const infoRes = await fetch(
        `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.bilibili.com/',
          },
          signal: AbortSignal.timeout(8000),
        },
      )
      const info: any = await infoRes.json()
      if (info.code !== 0) {
        return new NextResponse('Not found', { status: 404 })
      }
      const cid = info.data.cid

      // 获取 DASH 音频
      const playRes = await fetch(
        `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=0&fnval=16&otype=json`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.bilibili.com/',
          },
          signal: AbortSignal.timeout(8000),
        },
      )
      const playData: any = await playRes.json()
      const dashAudio = playData.data?.dash?.audio?.[0]
      const audioUrl = dashAudio?.baseUrl || dashAudio?.backupUrl?.[0]

      if (!audioUrl) {
        return new NextResponse('No audio URL', { status: 404 })
      }

      // 代理请求 B站 CDN（带 Referer）
      const proxyRes = await fetch(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.bilibili.com/',
        },
      })

      if (!proxyRes.ok) {
        return new NextResponse('Proxy failed', { status: 502 })
      }

      // 转发音频流
      return new NextResponse(proxyRes.body, {
        headers: {
          'Content-Type': proxyRes.headers.get('Content-Type') || 'audio/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch (error) {
      console.error('[bilibili/play]', error)
      return new NextResponse('Proxy error', { status: 500 })
    }
  }

  // 方式 2：传 url，直接代理
  if (urlParam) {
    try {
      const proxyRes = await fetch(urlParam, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://www.bilibili.com/',
        },
      })
      if (!proxyRes.ok) return new NextResponse('Proxy failed', { status: 502 })
      return new NextResponse(proxyRes.body, {
        headers: {
          'Content-Type': proxyRes.headers.get('Content-Type') || 'audio/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch {
      return new NextResponse('Proxy error', { status: 500 })
    }
  }

  return new NextResponse('Missing bvid or url', { status: 400 })
}
