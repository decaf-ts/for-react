import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslate } from "../../src/lib";

export interface BackButtonProps {
  fallback?: string;
  label?: string;
}

export function BackButton({ fallback = "/", label }: BackButtonProps) {
  const navigate = useNavigate();
  const translate = useTranslate();
  const text = label || translate("common.back");

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate(fallback, { replace: true });
  };

  return (
    <button
      type="button"
      className="app-back-button"
      onClick={goBack}
      aria-label={text}
      title={text}
    >
      <span aria-hidden="true">←</span>
      <span className="app-back-button-label">{text}</span>
    </button>
  );
}
