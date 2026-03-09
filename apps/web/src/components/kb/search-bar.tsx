"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock, TrendingUp, HelpCircle, Tag as TagIcon } from "lucide-react";
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
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
          className="pl-10 pr-20 bg-amber-50/50 border-amber-200 focus:border-amber-400"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showSyntaxHelp && (
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-amber-500 hover:text-amber-700 transition-colors"
              title="搜索语法帮助"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
          {value && (
            <button
              onClick={() => {
                onChange("");
                setShowSuggestions(false);
                setSelectedIndex(-1);
              }}
              className="text-amber-600 hover:text-amber-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 语法帮助提示 */}
      {showHelp && (
        <div className="absolute z-50 w-full mt-2 p-4 bg-white border border-amber-200 rounded-lg shadow-lg text-sm">
          <div className="font-semibold text-amber-900 mb-2">搜索语法</div>
          <div className="space-y-1 text-amber-700">
            <div>
              <code className="bg-amber-50 px-1 rounded">"精确短语"</code> -
              精确匹配
            </div>
            <div>
              <code className="bg-amber-50 px-1 rounded">词1 AND 词2</code> -
              同时包含
            </div>
            <div>
              <code className="bg-amber-50 px-1 rounded">词1 OR 词2</code> -
              包含任一
            </div>
            <div>
              <code className="bg-amber-50 px-1 rounded">NOT 词</code> 或{" "}
              <code className="bg-amber-50 px-1 rounded">-词</code> - 排除
            </div>
            <div>
              <code className="bg-amber-50 px-1 rounded">tag:标签名</code> -
              标签过滤
            </div>
          </div>
        </div>
      )}

      {/* 建议下拉框 */}
      {showSuggestions && allSuggestions.length > 0 && !showHelp && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-amber-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {!value && showHistory && allSuggestions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-amber-100 bg-amber-50/30">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="w-4 h-4" />
                <span>搜索历史</span>
              </div>
              <button
                onClick={clearHistory}
                className="text-xs text-amber-500 hover:text-amber-700 transition-colors"
              >
                清除
              </button>
            </div>
          )}

          {value && allSuggestions.length > 0 && (
            <div className="px-4 py-2 border-b border-amber-100 bg-amber-50/30">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <TrendingUp className="w-4 h-4" />
                <span>搜索建议</span>
              </div>
            </div>
          )}

          <div className="py-1">
            {allSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${index}`}
                onClick={() => {
                  onChange(suggestion.text);
                  handleSearch(suggestion.text);
                }}
                className={`w-full px-4 py-2 text-left transition-colors flex items-center gap-2 ${
                  index === selectedIndex
                    ? "bg-amber-100"
                    : "hover:bg-amber-50"
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
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

