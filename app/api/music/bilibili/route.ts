import { NextRequest, NextResponse } from 'next/server'

const BILI_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Referer': 'https://www.bilibili.com/',
}

type BiliResult = {
  id: string
  bvid: string
  name?: string
  artist?: string
  cover?: string
  url?: string
  error?: string
}

export async function GET(request: NextRequest) {
  const bvid = request.nextUrl.searchParams.get('bvid')
  if (!bvid) {
    return NextResponse.json({ error: 'Missing bvid parameter' }, { status: 400 })
  }

  try {
    // 1) 获取视频信息 + CID
    const infoRes = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
      { headers: BILI_HEADERS, signal: AbortSignal.timeout(8000) },
    )
    const info = await infoRes.json()
    if (info.code !== 0) {
      return NextResponse.json({ id: bvid, bvid, error: info.message || 'not_found' })
    }

    const { data } = info
    const cid = data.cid

    // 2) 获取 DASH 音频流
    const playRes = await fetch(
      `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=0&fnval=16&otype=json`,
      { headers: BILI_HEADERS, signal: AbortSignal.timeout(8000) },
    )
    const playData = await playRes.json()
    const dashAudio = playData.data?.dash?.audio?.[0]
    const audioUrl = dashAudio?.baseUrl || dashAudio?.backupUrl?.[0] || ''

    return NextResponse.json({
      id: bvid,
      bvid,
      name: data.title || '未知视频',
      artist: data.owner?.name || '',
      cover: data.pic || '',
      url: audioUrl,
    })
  } catch (error: any) {
    console.error(`[api/music/bilibili] 获取 ${bvid} 失败:`, error)
    return NextResponse.json({ id: bvid, bvid, error: String(error) })
  }
}
// force redeploy
