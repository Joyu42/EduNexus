"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getEnhancedSearchEngine,
  type SearchHistory,
} from "@/lib/client/enhanced-search";

type EnhancedSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  vaultId: string | null;
  placeholder?: string;
};

export function EnhancedSearchBar({
  value,
  onChange,
  onSearch,
  vaultId,
  placeholder = "搜索文档...",
}: EnhancedSearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchEngine = getEnhancedSearchEngine();

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (value && vaultId) {
      loadSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [value, vaultId]);

  const loadHistory = () => {
    setHistory(searchEngine.getSearchHistory().slice(0, 5));
  };

  const loadSuggestions = async () => {
    if (!vaultId) return;
    const results = await searchEngine.getSearchSuggestions(vaultId, value);
    setSuggestions(results);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
    setShowHistory(false);
  };

  const handleInputFocus = () => {
    if (!value) {
      setShowHistory(true);
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
      setShowHistory(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setShowHistory(false);
    onSearch();
  };

  const handleSelectHistory = (query: string) => {
    onChange(query);
    setShowHistory(false);
    onSearch();
  };

  const handleClearHistory = () => {
    searchEngine.clearSearchHistory();
    loadHistory();
  };

  const handleRemoveHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    searchEngine.removeSearchHistory(id);
    loadHistory();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
      setShowSuggestions(false);
      setShowHistory(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setShowHistory(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {value && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => {
              onChange("");
              setShowSuggestions(false);
              setShowHistory(false);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 搜索建议 */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-2 max-h-80 overflow-y-auto shadow-lg">
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500">
              <TrendingUp className="w-3 h-3" />
              搜索建议
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="text-sm">{suggestion}</div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 搜索历史 */}
      {showHistory && history.length > 0 && (
        <Card className="absolute z-50 w-full mt-2 max-h-80 overflow-y-auto shadow-lg">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                搜索历史
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={handleClearHistory}
              >
                清除
              </Button>
            </div>
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-md transition-colors group cursor-pointer"
                onClick={() => handleSelectHistory(item.query)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{item.query}</div>
                  <div className="text-xs text-gray-500">
                    {item.resultCount} 个结果
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemoveHistory(item.id, e)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
