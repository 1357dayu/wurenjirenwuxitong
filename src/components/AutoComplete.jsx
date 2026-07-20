import { useEffect, useRef, useState, useMemo } from 'react';

/**
 * 通用自动补全输入框
 * - 输入时实时显示匹配建议
 * - 键盘：↑↓ 选择、Enter 确认、Esc 关闭、Blur 自动关闭（延迟以允许点击）
 * - 选中后通过 onSelect 回调返回完整 item 对象
 *
 * props:
 *   value        受控输入值
 *   onChange     输入值变化回调（参数为字符串）
 *   onSearch     根据输入返回匹配项数组的函数：(query) => items[]
 *   onSelect     选中某项回调：(item) => void
 *   renderItem   自定义下拉项渲染：(item, isActive) => ReactNode
 *   getKey       获取 item 唯一 key：(item) => string|number
 *   placeholder  占位符
 *   inputClassName  额外 input class
 *   minQuery     触发搜索的最小字符数，默认 1
 *   emptyText    无匹配时提示文字
 */
export default function AutoComplete({
  value,
  onChange,
  onSearch,
  onSelect,
  renderItem,
  getKey,
  placeholder,
  inputClassName = '',
  minQuery = 1,
  emptyText = '无匹配项'
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef(null);
  const blurTimer = useRef(null);

  // 根据当前输入值匹配建议
  const suggestions = useMemo(() => {
    if (!open) return [];
    const q = String(value || '').trim();
    if (q.length < minQuery) return [];
    if (typeof onSearch !== 'function') return [];
    const result = onSearch(q);
    return Array.isArray(result) ? result : [];
  }, [value, open, minQuery, onSearch]);

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 清理 blur 定时器
  useEffect(() => () => blurTimer.current && clearTimeout(blurTimer.current), []);

  const handleFocus = () => {
    setOpen(true);
    setActiveIdx(-1);
  };

  const handleBlur = () => {
    // 延迟关闭以允许点击下拉项
    blurTimer.current = setTimeout(() => setOpen(false), 180);
  };

  const handleKeyDown = e => {
    if (!open) {
      if (e.key === 'ArrowDown' && value && value.length >= minQuery) {
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        e.preventDefault();
        selectItem(suggestions[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const selectItem = item => {
    if (typeof onSelect === 'function') onSelect(item);
    setOpen(false);
    setActiveIdx(-1);
  };

  const showDropdown = open && String(value || '').trim().length >= minQuery;

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={value || ''}
        onChange={e => {
          onChange && onChange(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={`input-dark w-full ${inputClassName}`}
      />
      {showDropdown && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line/80 bg-[#0c1322]/95 backdrop-blur-md shadow-2xl"
          style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}
        >
          {suggestions.length === 0 ? (
            <div className="px-3 py-3 text-sm text-white/40 text-center">{emptyText}</div>
          ) : (
            suggestions.map((item, idx) => {
              const key = getKey ? getKey(item) : idx;
              const isActive = idx === activeIdx;
              return (
                <button
                  key={key}
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={e => {
                    // 阻止 input blur
                    e.preventDefault();
                    selectItem(item);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition border-b border-line/30 last:border-b-0 ${
                    isActive ? 'bg-brand/20 text-white' : 'text-white/75 hover:bg-white/5'
                  }`}
                >
                  {renderItem ? renderItem(item, isActive) : String(item)}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
