"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, Send, User, Clock, Loader2, AlertCircle, LogIn, LogOut } from 'lucide-react';

interface Comment {
  id: number;
  openid: string;
  nickname: string;
  content: string;
  created_at: string;
  avatar: string;
}

interface QQUser {
  openid: string;
  nickname: string;
  avatar: string;
}

export default function Comments() {
  const pathname = usePathname();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [qqUser, setQqUser] = useState<QQUser | null>(null);
  const [qqLoading, setQqLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);

  // 从 localStorage 恢复登录状态
  useEffect(() => {
    const saved = localStorage.getItem('zerasos_qq_user');
    if (saved) {
      try { setQqUser(JSON.parse(saved)); } catch {}
    }
  }, []);

  // 监听 QQ 登录弹窗回传
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'qq-login') {
        setQqLoading(false);
        if (e.data.openid) {
          const user: QQUser = { openid: e.data.openid, nickname: e.data.nickname, avatar: e.data.avatar };
          setQqUser(user);
          localStorage.setItem('zerasos_qq_user', JSON.stringify(user));
        } else {
          setError('QQ 登录失败，请重试');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => { fetchComments(); }, [pathname]);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?path=${encodeURIComponent(pathname)}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (e) {
      setError('加载评论失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleQQLogin() {
    setQqLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/qq?action=login');
      const data = await res.json();
      if (data.url) {
        const w = window.open(data.url, 'qq-login', 'width=600,height=500');
        if (w) popupRef.current = w;
      } else {
        setError('QQ 登录暂时不可用');
        setQqLoading(false);
      }
    } catch {
      setError('QQ 登录失败');
      setQqLoading(false);
    }
  }

  function handleQQLogout() {
    setQqUser(null);
    localStorage.removeItem('zerasos_qq_user');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    setError('');
    setSuccessMsg('');
    try {
      const body: any = { path: pathname, content: content.trim() };
      if (qqUser) {
        body.openid = qqUser.openid;
        body.nickname = qqUser.nickname;
        body.avatar = qqUser.avatar;
      }

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, data.comment]);
        setContent('');
        setSuccessMsg('评论发布成功 ✨');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.error || '发布失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setPosting(false);
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return '\u521a\u521a';
    if (diff < 3600) return `${Math.floor(diff / 60)}\u5206\u949f\u524d`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}\u5c0f\u65f6\u524d`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}\u5929\u524d`;
    return new Date(dateStr).toLocaleDateString('zh-CN');
  }

  return (
    <div className="w-full mt-16 relative">
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
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md overflow-hidden">
                      {comment.avatar ? (
                        <img src={comment.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          {comment.nickname}
                          {comment.openid && <span className="ml-1 text-[10px] text-blue-400 font-normal">QQ</span>}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock size={10} />
                          {timeAgo(comment.created_at)}
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
        <div className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-white/30 dark:border-white/5 shadow-sm">
          {/* QQ 登录状态 */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">发表评论</h4>
            {qqUser ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-indigo-100">
                  {qqUser.avatar ? <img src={qqUser.avatar} alt="" className="w-full h-full object-cover" /> : <User size={14} className="p-1" />}
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{qqUser.nickname}</span>
                <button onClick={handleQQLogout} className="text-[10px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1">
                  <LogOut size={12} /> 退出
                </button>
              </div>
            ) : (
              <button onClick={handleQQLogin} disabled={qqLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95">
                {qqLoading ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
                QQ登录
              </button>
            )}
          </div>

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
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={qqUser ? `${qqUser.nickname}，写下你的想法...` : '写下你的想法...'}
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
                {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                发布评论
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
