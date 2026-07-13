import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const bvid = request.nextUrl.searchParams.get('bvid')

  if (!bvid) {
    return new NextResponse('Missing bvid', { status: 400 })
  }

  try {
    // 1) 获取 CID
    const infoRes = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com/' },
        signal: AbortSignal.timeout(8000),
      },
    )
    const info: any = await infoRes.json()
    if (info.code !== 0) {
      return new NextResponse('Not found', { status: 404 })
    }
    const cid = info.data.cid

    // 2) 获取 DASH 音频 URL
    const playRes = await fetch(
      `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=0&fnval=16&otype=json`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com/' },
        signal: AbortSignal.timeout(8000),
      },
    )
    const playData: any = await playRes.json()
    const audioUrl = playData.data?.dash?.audio?.[0]?.baseUrl
      || playData.data?.dash?.audio?.[0]?.backupUrl?.[0]

    if (!audioUrl) {
      return new NextResponse('No audio URL', { status: 404 })
    }

    // 3) Stream 音频到客户端
    const audioRes = await fetch(audioUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com/' },
    })

    if (!audioRes.ok) {
      return new NextResponse('Audio source error', { status: 502 })
    }

    // 使用 Web Streams API 转发
    return new NextResponse(audioRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    console.error('[bilibili/play]', error)
    return new NextResponse(error.message || 'Proxy error', { status: 500 })
  }
}
