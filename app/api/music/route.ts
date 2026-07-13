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
  url?: string
  lrc?: string
  error?: string
}

function getProxyUrl(): string | null {
  return process.env.NETEASE_PROXY || null
}

// 官方 API 获取歌曲详情
async function fetchOfficialDetail(songId: string): Promise<any | null> {
  try {
    const res = await fetch(
      `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`,
      { headers: NET_EASE_HEADERS, signal: AbortSignal.timeout(6000) },
    )
    return (await res.json()).songs?.[0] || null
  } catch {
    return null
  }
}

// 代理 API 获取歌曲详情
async function fetchProxyDetail(songId: string, proxyBase: string): Promise<any | null> {
  try {
    const res = await fetch(
      `${proxyBase}/song/detail?ids=${songId}`,
      { signal: AbortSignal.timeout(8000) },
    )
    const data = await res.json()
    if (data.code !== 200) return null
    return (data.songs || data.result || [null])[0]
  } catch {
    return null
  }
}

// 通过代理获取歌曲播放 URL
async function fetchPlayUrl(songId: string, proxyBase: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${proxyBase}/song/url?id=${songId}`,
      { signal: AbortSignal.timeout(8000) },
    )
    const data = await res.json()
    if (data.code === 200 && data.data?.[0]?.url) {
      return data.data[0].url
    }
    return null
  } catch {
    return null
  }
}

function buildSong(songId: string, song: any, playUrl?: string): SongResult {
  const artistName = song.artists?.[0]?.name || song.ar?.[0]?.name || ''
  const cover = song.album?.picUrl || song.al?.picUrl || ''
  return {
    id: songId,
    name: song.name || '未知歌曲',
    artist: artistName,
    author: artistName,
    cover,
    url: playUrl || `https://music.163.com/song/media/outer/url?id=${songId}.mp3`,
    lrc: '',
  }
}

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids')
  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 })
  }

  const songIds = ids.split(',').map((id) => id.trim()).filter(Boolean)
  const proxyBase = getProxyUrl()

  const results: SongResult[] = await Promise.all(
    songIds.map(async (songId): Promise<SongResult> => {
      // 1) 官方详情
      let song = await fetchOfficialDetail(songId)

      // 2) 官方拿不到 -> 代理详情
      if (!song && proxyBase) {
        song = await fetchProxyDetail(songId, proxyBase)
      }

      if (!song) {
        return { id: songId, error: 'not_found' }
      }

      // 3) 播放地址：有代理则走代理 /song/url，否则用官方 URL
      let playUrl: string | undefined
      if (proxyBase) {
        playUrl = (await fetchPlayUrl(songId, proxyBase)) || undefined
      }

      // 4) 歌词（可选）
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
      } catch { /* ignore */ }

      const result = buildSong(songId, song, playUrl)
      result.lrc = lrcText
      return result
    }),
  )

  return NextResponse.json(results)
}
