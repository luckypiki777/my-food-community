"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Avatar } from "@/design-system/components/Avatar";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { TextField } from "@/design-system/components/TextField";
import type { Profile, ProfileSaveInput, ProfileSaveResult } from "./useProfile";

/**
 * BFF·DB·버킷에 걸린 제한과 같은 값이다.
 * 최종 관문은 서버고, 여기서는 왕복 한 번을 아끼려고 미리 걸러줄 뿐이다.
 */
const NICKNAME_MAX = 20;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type ProfileEditModalProps = {
  profile: Profile;
  /** 프로필 사진이 없을 때 대신 보여줄 구글 아바타. */
  fallbackImageUrl: string | null;
  onClose: () => void;
  onSave: (input: ProfileSaveInput) => Promise<ProfileSaveResult>;
};

/**
 * 닉네임·프로필 사진 수정 모달.
 *
 * 열려 있을 때만 마운트되는 걸 전제로 한다(부모가 조건부 렌더링).
 * 그래서 "열 때 값 되돌리기" 같은 게 필요 없다 — 닫으면 통째로 사라진다.
 */
export function ProfileEditModal({
  profile,
  fallbackImageUrl,
  onClose,
  onSave,
}: ProfileEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState(profile.nickname);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 미리보기 blob URL 은 명시적으로 해제해야 회수된다.
  // state 와 별도로 ref 에도 들고 있어야 언마운트 시점에 마지막 것을 정리할 수 있다.
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // 정리만 하는 effect. state 를 건드리지 않으므로 StrictMode 이중 실행에도
    // 방금 만든 URL 이 먼저 해제되는 일이 없다(마운트 시점엔 ref 가 비어 있다).
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  /** 미리보기를 교체하면서 직전 blob URL 을 해제한다. */
  const showPreview = (file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(previewUrlRef.current);
    setPickedFile(file);
  };

  const handlePick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 고를 수 있도록 비운다. 안 그러면 change 가 두 번째부터 안 뜬다.
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setError("JPG · PNG · WebP · GIF 만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`사진은 ${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하만 올릴 수 있어요.`);
      return;
    }

    setError(null);
    setRemoveImage(false);
    showPreview(file);
  };

  const handleRemove = () => {
    setError(null);
    showPreview(null);
    // 저장된 사진이 있을 때만 서버에 삭제를 요청한다.
    // 고르다 만 파일을 취소한 거라면 아무것도 보낼 필요가 없다.
    setRemoveImage(profile.imagePath !== null);
  };

  const trimmed = nickname.trim();
  const nicknameChanged = trimmed !== profile.nickname;
  const dirty = nicknameChanged || pickedFile !== null || removeImage;

  const handleSave = async () => {
    if (!trimmed) {
      setError("닉네임을 입력해 주세요.");
      return;
    }
    if (!dirty) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    const result = await onSave({
      ...(nicknameChanged ? { nickname: trimmed } : {}),
      ...(pickedFile ? { imageFile: pickedFile } : {}),
      ...(removeImage ? { removeImage: true } : {}),
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
  };

  // 저장된 사진이 없으면 구글 아바타로 떨어진다. 삭제를 눌렀을 때도 마찬가지다.
  const storedUrl = removeImage ? fallbackImageUrl : (profile.imageUrl ?? fallbackImageUrl);
  const shownUrl = previewUrl ?? storedUrl;
  const canRemove = profile.imagePath !== null || pickedFile !== null;

  return (
    <Modal
      open
      title="프로필 수정"
      // 저장하는 중에는 바깥을 눌러도 닫히지 않게 한다.
      onClose={saving ? undefined : onClose}
      primaryAction={{ label: "저장", onClick: () => void handleSave(), loading: saving }}
      secondaryAction={{ label: "취소", onClick: saving ? undefined : onClose }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar src={shownUrl} size="xl" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon="image"
              disabled={saving}
              onClick={() => fileInputRef.current?.click()}
            >
              사진 변경
            </Button>
            {canRemove && (
              <Button
                variant="destructive"
                size="sm"
                leftIcon="delete"
                disabled={saving}
                onClick={handleRemove}
              >
                사진 삭제
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          onChange={handlePick}
          style={{ display: "none" }}
        />

        <TextField
          label="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX}
          placeholder="닉네임을 입력해 주세요"
          helperText={`${trimmed.length}/${NICKNAME_MAX}`}
          disabled={saving}
        />

        {error ? (
          <p className="text-body-md" style={{ margin: 0, color: "var(--color-text-error)" }}>
            {error}
          </p>
        ) : removeImage ? (
          <p className="text-body-md" style={{ margin: 0, color: "var(--color-text-muted)" }}>
            저장하면 기본 사진으로 돌아가요.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
