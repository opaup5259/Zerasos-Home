"use client";

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, Send, User, Clock, Loader2, AlertCircle } from 'lucide-react';

interface Comment {
  id: number;
  name: string;
  content: string;
  date: string;
  avatarUrl: string;
}

export default function Comments() {
  const pathname = usePathname();
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();
  }, [pathname]);

  async function fetchComments() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/comments?path=${encodeURIComponent(pathname)}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (e) {
      setError('加载评论失败');
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
    setSuccessMsg('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname, name: name.trim() || '匿名', content: content.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, data.comment]);
        setContent('');
        setSuccessMsg('评论发布成功 ✨');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.error || '发布失败，请稍后再试');
      }
    } catch (e) {
      setError('网络错误，请稍后再试');
    } finally {
      setPosting(false);
    }
  }

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
    return date.toLocaleDateString('zh-CN');
  }

  return (
    <div className="w-full mt-16 relative">
      {/* 氛围光晕 */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl rounded-full pointer-events-none z-0"></div>

      <div className="relative z-10 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          <MessageSquare size={20} className="text-indigo-500" />
          评论 ({comments.length})
        </h3>

        {/* 评论列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            加载评论中...
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 italic font-medium">
                还没有评论，来做第一个留言的人吧 ✨
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} 
                  className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/30 dark:border-white/5 shadow-sm transition-all hover:bg-white/40 dark:hover:bg-slate-800/40">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
                      {comment.avatarUrl ? (
                        <img src={comment.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          {comment.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock size={10} />
                          {timeAgo(comment.date)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 发布表单 */}
        <div ref={formRef} className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-white/30 dark:border-white/5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">发表评论</h4>
          
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-500 dark:text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="mb-4 flex items-center gap-2 text-emerald-500 text-sm bg-emerald-500/10 rounded-xl px-4 py-3 border border-emerald-500/20">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="你的名字（选填）"
                maxLength={50}
                className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
            <div className="mb-3">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="写下你的想法..."
                rows={3}
                required
                maxLength={1000}
                className="w-full bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm border border-white/30 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{content.length}/1000</span>
              <button
                type="submit"
                disabled={posting || !content.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95"
              >
                {posting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                发布评论
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
