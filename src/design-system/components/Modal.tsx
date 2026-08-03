"use client";

import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";
import { IconButton } from "./IconButton";

export type ModalAction = {
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
};

export type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  onClose?: () => void;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
};

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  primaryAction,
  secondaryAction,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#1C1C1CB3",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          borderRadius: 16,
          overflow: "hidden",
          background: "var(--color-background-default)",
          boxShadow: "0 12px 32px #00000033",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px",
          }}
        >
          <span className="text-heading-sm" style={{ color: "var(--color-text-default)" }}>
            {title}
          </span>
          <IconButton
            icon="close"
            aria-label="닫기"
            variant="ghost"
            size={32}
            iconSize={16}
            onClick={onClose}
          />
        </div>

        <div style={{ padding: "0 20px" }}>
          {children ?? (
            <p className="text-body-md" style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              {description}
            </p>
          )}
        </div>

        {(primaryAction || secondaryAction) && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              padding: "16px 20px 20px",
            }}
          >
            {secondaryAction && (
              <Button variant={secondaryAction.variant ?? "secondary"} onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button
                variant={primaryAction.variant ?? "primary"}
                loading={primaryAction.loading}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
