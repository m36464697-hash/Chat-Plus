import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { EMOJI_CATEGORIES, EmojiItem } from '../utils/emojiData';

interface EmojiPickerModalProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chatplus_recent_emojis');
      return saved ? JSON.parse(saved) : ['👍', '❤️', '😂', '🔥', '✨', '👏', '😍', '🎉'];
    } catch {
      return ['👍', '❤️', '😂', '🔥', '✨', '👏'];
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePickEmoji = (emoji: string) => {
    onSelectEmoji(emoji);
    const updated = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 16);
    setRecentEmojis(updated);
    try {
      localStorage.setItem('chatplus_recent_emojis', JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const results: EmojiItem[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.name.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        ) {
          results.push(item);
        }
      }
    }
    return results;
  }, [searchQuery]);

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed sm:absolute bottom-20 sm:bottom-16 inset-x-2 sm:inset-x-auto sm:right-6 z-50 sm:w-[380px] bg-white/95 dark:bg-[#0E121B]/95 border border-slate-200/80 dark:border-white/[0.08] rounded-[24px] shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden select-none"
        dir="rtl"
      >
        {/* Header & Search */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-white/[0.07] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              مكتبة الرموز التعبيرية
            </span>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="إغلاق الرموز"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن إيموجي (مثال: قلب، ضحك، نار)..."
              className="w-full min-h-[38px] bg-[#F2F4F8] dark:bg-[#07090E] border border-slate-200/80 dark:border-white/[0.07] rounded-2xl pr-9 pl-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-1 px-2.5 py-2 border-b border-slate-200/80 dark:border-white/[0.07] overflow-x-auto bg-[#F5F6FA] dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setActiveCategory('recent')}
              className={`min-h-[34px] min-w-[34px] p-2 rounded-xl text-xs transition-colors shrink-0 cursor-pointer flex items-center justify-center ${
                activeCategory === 'recent'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]'
              }`}
              title="المستخدمة مؤخراً"
              aria-label="المستخدمة مؤخراً"
            >
              <Clock className="w-4 h-4" />
            </button>
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`min-h-[34px] min-w-[34px] p-1.5 rounded-xl text-base transition-colors shrink-0 cursor-pointer flex items-center justify-center ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]'
                }`}
                title={cat.name}
                aria-label={cat.name}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="p-3 max-h-[240px] sm:max-h-[260px] overflow-y-auto">
          {searchResults ? (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                نتائج البحث ({searchResults.length}):
              </div>
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  لم يتم العثور على رموز تطابق بحثك
                </div>
              ) : (
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                  {searchResults.map((item, idx) => (
                    <button
                      key={`${item.emoji}_${idx}`}
                      type="button"
                      onClick={() => handlePickEmoji(item.emoji)}
                      className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      title={item.name}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : activeCategory === 'recent' ? (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                الرموز المستخدمة مؤخراً:
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {recentEmojis.map((emoji, idx) => (
                  <button
                    key={`rec_${idx}`}
                    type="button"
                    onClick={() => handlePickEmoji(emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : currentCategory ? (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                {currentCategory.name} ({currentCategory.emojis.length}):
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {currentCategory.emojis.map((item, idx) => (
                  <button
                    key={`emoji_${idx}`}
                    type="button"
                    onClick={() => handlePickEmoji(item.emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
