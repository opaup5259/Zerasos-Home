import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import { siteConfig } from '../../siteConfig';
import TimelineClient from '../../components/TimelineClient';
import { ToastProvider } from '../../components/ToastProvider';

export const metadata = {
  title: "归档与探索 | " + siteConfig.title,
};

// 说说杂谈用封面图池
const FALLBACK_COVERS = [
  "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_01.jpg",
  "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_02.jpg",
  "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_03.jpg",
  "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_04.jpg",
  "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_05.jpg",
];

function getRandomCover(): string {
  return FALLBACK_COVERS[Math.floor(Math.random() * FALLBACK_COVERS.length)];
}

function extractFirstImage(content: string): string | null {
  const match = content.match(/!\[.*?\]\((.*?)\)/);
  return match ? match[1] : null;
}

function readMarkdownDir(dirPath: string): any[] {
  const items: any[] = [];
  try {
    if (!fs.existsSync(dirPath)) return items;
    const fileNames = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    fileNames.forEach(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(dirPath, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      // 取封面：优先 frontmatter 的 cover，其次正文第一张图，最后随机
      let cover = data.cover || '';
      if (!cover) {
        const firstImg = extractFirstImage(content);
        cover = firstImg || getRandomCover();
      }

      items.push({
        slug,
        title: data.title || '无标题',
        date: data.date || '1970-01-01',
        description: data.description || '',
        tags: data.tags && Array.isArray(data.tags) ? data.tags : [],
        cover,
      });
    });
  } catch(e) {
    console.error('Error reading ' + dirPath, e);
  }
  return items;
}

export default function Timeline() {
  const postsDir = path.join(process.cwd(), 'posts');
  const chattersDir = path.join(process.cwd(), 'chatters');
  const momentsDir = path.join(process.cwd(), 'moments');

  let allItems: any[] = [];
  let tagCounts: Record<string, number> = {};

  const posts = readMarkdownDir(postsDir);
  posts.forEach(item => allItems.push({ ...item, source: 'post' }));

  const chatters = readMarkdownDir(chattersDir);
  chatters.forEach(item => allItems.push({ ...item, source: 'chatter', tags: item.tags.length ? item.tags : ['说说'] }));

  const moments = readMarkdownDir(momentsDir);
  moments.forEach(item => allItems.push({ ...item, source: 'moment', tags: item.tags.length ? item.tags : ['杂谈'] }));

  allItems.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  allItems.forEach(item => {
    (item.tags || ['未分类']).forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const tagsArray = Object.keys(tagCounts)
    .map(name => ({ name, count: tagCounts[name] }))
    .sort((a, b) => b.count - a.count);

  return (
    <ToastProvider>
      <div className="min-h-screen relative pb-32">
        <Navbar />
        <PageTransition>
          <TimelineClient posts={allItems} tags={tagsArray} />
        </PageTransition>
      </div>
    </ToastProvider>
  );
}
