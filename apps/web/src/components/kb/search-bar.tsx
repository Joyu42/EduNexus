"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, TrendingUp, HelpCircle, Tag as TagIcon, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getSearchHistory } from "@/lib/client/search-history";

type SearchSuggestion = {
  text: string;
  type: "history" | "suggestion" | "tag";
  count?: number;
};

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  tags?: string[];
  showHistory?: boolean;
  showSyntaxHelp?: boolean;
};

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "搜索文档...",
  suggestions = [],
  tags = [],
  showHistory = true,
  showSyntaxHelp = true,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchHistory = getSearchHistory();

  // 保存搜索历史
  const saveToHistory = useCallback(
    (query: string, resultCount?: number) => {
      if (!query.trim() || !showHistory) return;
      searchHistory.addSearch(query, resultCount);
    },
    [showHistory, searchHistory]
  );

  // 清除搜索历史
  const clearHistory = useCallback(() => {
    searchHistory.clearHistory();
    setShowSuggestions(false);
  }, [searchHistory]);

  // 处理搜索
  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        saveToHistory(query);
        onSearch(query);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    },
    [onSearch, saveToHistory]
  );

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  // 处理键盘事件（支持上下箭头导航）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) {
      if (e.key === "Enter") {
        handleSearch(value);
      }
      return;
    }

    const allSuggestions = getAllSuggestions();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
          const selected = allSuggestions[selectedIndex];
          onChange(selected.text);
          handleSearch(selected.text);
        } else {
          handleSearch(value);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 合并建议和历史
  const getAllSuggestions = useCallback((): SearchSuggestion[] => {
    const allSuggestions: SearchSuggestion[] = [];

    if (value.trim()) {
      // 添加匹配的标题建议
      suggestions
        .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5)
        .forEach((text) => {
          allSuggestions.push({ text, type: "suggestion" });
        });

      // 添加匹配的标签建议
      tags
        .filter((t) => t.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 3)
        .forEach((text) => {
          allSuggestions.push({ text: `tag:${text}`, type: "tag" });
        });

      // 添加匹配的历史记录
      const historyItems = searchHistory.searchHistory(value);
      historyItems.slice(0, 3).forEach((item) => {
        allSuggestions.push({
          text: item.query,
          type: "history",
          count: item.resultCount,
        });
      });
    } else if (showHistory) {
      // 显示最近的历史记录
      const recentHistory = searchHistory.getRecentHistory(10);
      recentHistory.forEach((item) => {
        allSuggestions.push({
          text: item.query,
          type: "history",
          count: item.resultCount,
        });
      });
    }

    return allSuggestions;
  }, [value, suggestions, tags, showHistory, searchHistory]);

  const allSuggestions = getAllSuggestions();

  return (
    <div ref={containerRef} className="relative w-full">
      <motion.div
        className="relative"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="absolute left-3 top-1/2 -translate-y-1/2"
          animate={{
            scale: isFocused ? 1.1 : 1,
            rotate: isFocused ? 360 : 0
          }}
          transition={{ duration: 0.3 }}
        >
          <Search className="w-4 h-4 text-amber-600" />
        </motion.div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          className="pl-10 pr-20 bg-amber-50/50 border-amber-200 focus:border-amber-400 transition-all duration-200 focus:shadow-lg focus:shadow-amber-100"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showSyntaxHelp && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHelp(!showHelp)}
              className="text-amber-500 hover:text-amber-700 transition-colors"
              title="搜索语法帮助"
            >
              <HelpCircle className="w-4 h-4" />
            </motion.button>
          )}
          <AnimatePresence>
            {value && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onChange("");
                  setShowSuggestions(false);
                  setSelectedIndex(-1);
                }}
                className="text-amber-600 hover:text-amber-800"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 语法帮助提示 */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 p-4 bg-white border border-amber-200 rounded-lg shadow-lg text-sm"
          >
            <div className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              搜索语法
            </div>
            <motion.div
              className="space-y-1 text-amber-700"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              {[
                { code: '"精确短语"', desc: '精确匹配' },
                { code: '词1 AND 词2', desc: '同时包含' },
                { code: '词1 OR 词2', desc: '包含任一' },
                { code: 'NOT 词', desc: '排除' },
                { code: 'tag:标签名', desc: '标签过滤' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <code className="bg-amber-50 px-1 rounded">{item.code}</code> - {item.desc}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 建议下拉框 */}
      <AnimatePresence>
        {showSuggestions && allSuggestions.length > 0 && !showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white border border-amber-200 rounded-lg shadow-lg max-h-80 overflow-y-auto scrollbar-thin"
          >
            {!value && showHistory && allSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between px-4 py-2 border-b border-amber-100 bg-amber-50/30"
              >
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Clock className="w-4 h-4" />
                  <span>搜索历史</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearHistory}
                  className="text-xs text-amber-500 hover:text-amber-700 transition-colors"
                >
                  清除
                </motion.button>
              </motion.div>
            )}

            {value && allSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-2 border-b border-amber-100 bg-amber-50/30"
              >
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>搜索建议</span>
                </div>
              </motion.div>
            )}

            <motion.div
              className="py-1"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.03 }
                }
              }}
            >
              {allSuggestions.map((suggestion, index) => (
                <motion.button
                  key={`${suggestion.type}-${index}`}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  whileHover={{ backgroundColor: "rgba(251, 191, 36, 0.1)", x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onChange(suggestion.text);
                    handleSearch(suggestion.text);
                  }}
                  className={`w-full px-4 py-2 text-left transition-colors flex items-center gap-2 ${
                    index === selectedIndex
                      ? "bg-amber-100"
                      : ""
                  }`}
                >
                  {suggestion.type === "history" ? (
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  ) : suggestion.type === "tag" ? (
                    <TagIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : (
                    <Search className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-amber-900 truncate flex-1">
                    {suggestion.text}
                  </span>
                  {suggestion.count !== undefined && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-amber-50 text-amber-600 border-amber-200"
                    >
                      {suggestion.count}
                    </Badge>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

