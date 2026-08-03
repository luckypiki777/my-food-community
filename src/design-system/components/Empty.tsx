"use client";

import { Icon } from "../Icon";
import type { IconName } from "../tokens";
import { Button } from "./Button";

export type EmptyAction = { label: string; onClick?: () => void };

export type EmptyProps = {
  icon?: IconName;
  title: string;
  description?: string;
  primaryAction?: EmptyAction;
  secondaryAction?: EmptyAction;
  bordered?: boolean;
  width?: number | string;
};

export function Empty({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  bordered = true,
  width = 380,
}: EmptyProps) {
  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 32,
        borderRadius: 12,
        boxSizing: "border-box",
        background: "var(--color-background-default)",
        border: bordered ? "1px solid var(--color-border-default)" : "none",
        textAlign: "center",
      }}
    >
      {icon && (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-border-default)",
          }}
        >
          <Icon name={icon} size={24} color="var(--color-text-subtle)" />
        </div>
      )}
      <span className="text-heading-sm" style={{ color: "var(--color-text-default)" }}>
        {title}
      </span>
      {description && (
        <span className="text-body-md" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </span>
      )}
      {(primaryAction || secondaryAction) && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", paddingTop: 8 }}>
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button variant="primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
