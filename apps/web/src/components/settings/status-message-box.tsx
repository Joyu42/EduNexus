type StatusTone = "info" | "success" | "warning" | "error";
type StatusCopyState = "idle" | "done" | "failed";

type StatusMessageBoxProps = {
  message: string;
  tone: StatusTone;
  copyState: StatusCopyState;
  onCopy: () => void;
  onClose: () => void;
};

export function StatusMessageBox({
  message,
  tone,
  copyState,
  onCopy,
  onClose
}: StatusMessageBoxProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={`result-box ${tone}`}>
      <strong>
        {tone === "error"
          ? "错误"
          : tone === "warning"
            ? "注意"
            : tone === "success"
              ? "完成"
              : "提示"}
      </strong>
      <p>{message}</p>
      <div className="result-box-actions">
        <button type="button" onClick={onCopy}>
          复制提示
        </button>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </div>
      {copyState === "done" ? (
        <small className="result-box-copy-hint">已复制到剪贴板。</small>
      ) : null}
      {copyState === "failed" ? (
        <small className="result-box-copy-hint error">
          复制失败，请手动选择文本复制。
        </small>
      ) : null}
    </div>
  );
}
