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

function readMarkdownDir(dirPath: string): any[] {
  const items: any[] = [];
  try {
    if (!fs.existsSync(dirPath)) return items;
    const fileNames = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    fileNames.forEach(fileName => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(dirPath, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      items.push({
        slug,
        title: data.title || '无标题',
        date: data.date || '1970-01-01',
        description: data.description || '',
        tags: data.tags && Array.isArray(data.tags) ? data.tags : [],
        cover: data.cover || siteConfig.defaultPostCover || '',
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
