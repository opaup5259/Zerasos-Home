"use client";

import { useEffect, useState } from 'react';
import { Send, User, Clock, Loader2 } from 'lucide-react';

interface Comment {
  id: number;
  name: string;
  content: string;
  date: string;
  avatarUrl: string;
}

interface MomentCommentsProps {
  id: string; // 页面路径
}

export default function MomentComments({ id }: MomentCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchComments();
  }, [id]);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?path=${encodeURIComponent(id)}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: id, name: name.trim() || '匿名', content: content.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, data.comment]);
        setContent('');
      } else {
        setError(data.error || '发布失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setPosting(false);
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
  }

  return (
    <div className="w-full">
      {/* 评论列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-slate-400 text-xs">
          <Loader2 size={14} className="animate-spin mr-1" />
          加载中
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-2 py-2 border-t border-slate-200/30 dark:border-slate-700/30 first:border-0">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5">
                {comment.avatarUrl ? (
                  <img src={comment.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={10} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#576b95] dark:text-[#7f99cc]">{comment.name}</span>
                  <span className="text-[9px] text-slate-400"><Clock size={8} className="inline" /> {timeAgo(comment.date)}</span>
                </div>
                <p className="text-[12px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed break-words">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 评论输入 */}
      <form onSubmit={handleSubmit} className="flex items-start gap-2 mt-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-1">
          <User size={10} />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="昵称"
            maxLength={20}
            className="w-full bg-transparent border-b border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-indigo-400 pb-0.5 transition-colors"
          />
          <div className="flex gap-1.5">
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="写评论..."
              required
              maxLength={500}
              className="flex-1 bg-slate-100/50 dark:bg-slate-700/30 rounded-lg px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 transition-all"
            />
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="px-2.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 rounded-lg text-white transition-all active:scale-95"
            >
              {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
          {error && <p className="text-[9px] text-red-400">{error}</p>}
        </div>
      </form>
    </div>
  );
}
