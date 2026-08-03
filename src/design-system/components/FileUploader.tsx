"use client";

import { useRef, useState, type DragEvent } from "react";
import { Icon } from "../Icon";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Spinner } from "./Spinner";

export type FileItemStatus = "uploading" | "complete" | "error";
export type FileItemData = { id: string; name: string; status: FileItemStatus };

export type FileUploaderProps = {
  /** guide text shown inside the dropzone */
  helperText?: string;
  /** label for the choose-file button */
  selectLabel?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  error?: boolean;
  items?: FileItemData[];
  onSelect?: (files: FileList) => void;
  onRemove?: (id: string) => void;
};

const STATUS_TEXT: Record<FileItemStatus, string> = {
  uploading: "업로드 중…",
  complete: "업로드 완료",
  error: "업로드 실패",
};

function StatusIcon({ status }: { status: FileItemStatus }) {
  if (status === "uploading") return <Spinner size={20} color="var(--color-background-brand)" />;
  if (status === "complete")
    return <Icon name="check" size={20} color="var(--color-text-success)" />;
  return <Icon name="error" size={20} color="var(--color-text-error)" />;
}

function statusColor(status: FileItemStatus) {
  if (status === "complete") return "var(--color-text-success)";
  if (status === "error") return "var(--color-text-error)";
  return "var(--color-text-subtle)";
}

export function FileUploader({
  helperText = "여기로 파일을 끌어다 놓거나",
  selectLabel = "파일 선택",
  accept = "image/*",
  multiple = true,
  disabled = false,
  error = false,
  items = [],
  onSelect,
  onRemove,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const borderColor = error
    ? "var(--color-border-error)"
    : dragOver
      ? "var(--color-border-brand)"
      : "var(--color-border-strong)";
  const iconColor = error ? "var(--color-text-error)" : "var(--color-text-muted)";
  const guideColor = error ? "var(--color-text-error)" : "var(--color-text-default)";

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) onSelect?.(e.dataTransfer.files);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: disabled ? 0.5 : 1 }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 28,
          borderRadius: 12,
          border: `1.5px dashed ${borderColor}`,
          background: dragOver
            ? "var(--color-background-brand-subtle)"
            : "var(--color-background-default)",
          transition: "border-color 0.15s ease, background 0.15s ease",
        }}
      >
        <Icon name="arrow-up" size={24} color={iconColor} />
        <span className="text-body-md" style={{ color: guideColor, textAlign: "center" }}>
          {helperText}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {selectLabel}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          hidden
          onChange={(e) => {
            if (e.target.files?.length) onSelect?.(e.target.files);
          }}
        />
      </div>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--color-border-default)",
                background: "var(--color-background-default)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--color-border-default)",
                  background: "var(--color-background-default)",
                }}
              >
                <Icon name="image" size={20} color="var(--color-text-muted)" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                <span
                  className="text-body-md"
                  style={{
                    color: "var(--color-text-default)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.name}
                </span>
                <span className="text-label-md" style={{ color: statusColor(f.status) }}>
                  {STATUS_TEXT[f.status]}
                </span>
              </div>
              <StatusIcon status={f.status} />
              <IconButton
                icon="close"
                aria-label="삭제"
                variant="ghost"
                size={40}
                iconSize={20}
                onClick={() => onRemove?.(f.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
