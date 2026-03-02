import { useCallback, useEffect, useMemo, useState } from "react";

type StatusTone = "info" | "success" | "warning" | "error";
type StatusCopyState = "idle" | "done" | "failed";

function resolveStatusTone(message: string): StatusTone {
  if (!message) {
    return "info";
  }
  if (/失败|错误|无法|未执行|不存在|请检查|解析失败|格式错误/.test(message)) {
    return "error";
  }
  if (/请先|注意|尚未|截断|上限|未识别/.test(message)) {
    return "warning";
  }
  if (/已|完成|成功/.test(message)) {
    return "success";
  }
  return "info";
}

export function useStatusMessage() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusCopyState, setStatusCopyState] = useState<StatusCopyState>("idle");

  const statusTone = useMemo<StatusTone>(
    () => resolveStatusTone(statusMessage),
    [statusMessage]
  );

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timeoutMs =
      statusTone === "error" ? 12000 : statusTone === "warning" ? 10000 : 6500;
    const timer = window.setTimeout(() => {
      setStatusMessage("");
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [statusMessage, statusTone]);

  useEffect(() => {
    setStatusCopyState("idle");
  }, [statusMessage]);

  const clearStatusMessage = useCallback(() => {
    setStatusMessage("");
  }, []);

  const copyStatusMessage = useCallback(async () => {
    if (!statusMessage) {
      return;
    }
    const payload = `[${new Date().toLocaleString("zh-CN", {
      hour12: false
    })}] ${statusMessage}`;
    try {
      await navigator.clipboard.writeText(payload);
      setStatusCopyState("done");
    } catch {
      setStatusCopyState("failed");
    }
  }, [statusMessage]);

  return {
    statusMessage,
    setStatusMessage,
    statusTone,
    statusCopyState,
    clearStatusMessage,
    copyStatusMessage
  };
}
