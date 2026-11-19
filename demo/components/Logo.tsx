import React from "react";

export interface LogoProps {
  width?: number | string;
  className?: string;
  alt?: string;
}

export function Logo({
  width = 180,
  className = "",
  alt = "decaf-ts",
}: LogoProps) {
  return (
    <div className={`app-logo ${className}`.trim()}>
      <img
        src="/assets/images/decaf-logo.svg"
        alt={alt}
        title={alt}
        style={{ width: typeof width === "number" ? `${width}px` : width }}
      />
    </div>
  );
}
