import { NextRequest, NextResponse } from 'next/server'

const NET_EASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
}

type SongResult = {
  id: string
  name?: string
  artist?: string
  author?: string
  cover?: string
  pic?: string
  url?: string
  lrc?: string
  error?: string
}

// 从环境变量读取代理 URL，若未设置则尝试公共代理
function getProxyUrl(): string | null {
  const envProxy = process.env.NETEASE_PROXY
  if (envProxy) return envProxy
  // 可选默认公共代理（不可靠，建议自建）
  return process.env.VERCEL_ENV === 'production'
    ? null
    : null
}

// 通过官方 API 获取单首歌曲
async function fetchViaOfficial(songId: string): Promise<SongResult | null> {
  try {
    const res = await fetch(
      `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`,
      { headers: NET_EASE_HEADERS, signal: AbortSignal.timeout(6000) },
    )
    const detail = await res.json()
    const song = detail.songs?.[0]
    if (!song || !song.name) return null
    return song
  } catch {
    return null
  }
}

// 通过代理 API 获取单首歌曲
async function fetchViaProxy(songId: string, proxyBase: string): Promise<any | null> {
  try {
    const res = await fetch(
      `${proxyBase}/song/detail?ids=${songId}`,
      { signal: AbortSignal.timeout(8000) },
    )
    const data = await res.json()
    if (data.code !== 200) return null
    return data.songs?.[0] || null
  } catch {
    return null
  }
}

// 通过网易云官方格式组装结果
function buildResult(songId: string, song: any): SongResult {
  const artistName = song.artists?.[0]?.name || song.ar?.[0]?.name || '未知歌手'
  return {
    id: songId,
    name: song.name,
    artist: artistName,
    author: artistName,
    cover: song.album?.picUrl || song.al?.picUrl || '',
    pic: song.album?.picUrl || song.al?.picUrl || '',
    url: `https://music.163.com/song/media/outer/url?id=${songId}.mp3`,
    lrc: '',
  }
}

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids')
  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 })
  }

  const songIds = ids.split(',').map((id) => id.trim()).filter(Boolean)

  const results: SongResult[] = await Promise.all(
    songIds.map(async (songId): Promise<SongResult> => {
      // 1) 先走官方 API
      let song = await fetchViaOfficial(songId)

      // 2) 官方拿不到 -> 尝试代理
      if (!song) {
        const proxyBase = getProxyUrl()
        if (proxyBase) {
          song = await fetchViaProxy(songId, proxyBase)
        }
      }

      if (!song) {
        return { id: songId, error: 'not_found' }
      }

      // 3) 获取歌词（可选）
      let lrcText = ''
      try {
        const lrcRes = await fetch(
          `https://music.163.com/api/song/lyric?id=${songId}&lv=-1&kv=-1&tv=-1`,
          { headers: NET_EASE_HEADERS, signal: AbortSignal.timeout(6000) },
        )
        if (lrcRes.ok) {
          const lrcData = await lrcRes.json()
          lrcText = lrcData.lrc?.lyric || ''
        }
      } catch { /* 歌词可选，失败不影响主流程 */ }

      const result = buildResult(songId, song)
      result.lrc = lrcText
      return result
    }),
  )

  return NextResponse.json(results)
}
