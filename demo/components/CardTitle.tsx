import React from "react";
import { useTranslate } from "../../src/lib";
import { Switcher, TabItem } from "./Switcher";

export interface CardTitleProps {
  title: string;
  subtitle?: string;
  tabs?: TabItem[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
  children?: React.ReactNode;
}

export function CardTitle({
  title,
  subtitle,
  tabs,
  activeTab = 0,
  onTabChange,
  children,
}: CardTitleProps) {
  const translate = useTranslate();
  return (
    <div className="app-card-title">
      <div className="app-card-title-text">
        <h2>{translate(title)}</h2>
        {subtitle ? <p>{translate(subtitle)}</p> : null}
      </div>
      {tabs?.length ? (
        <Switcher
          items={tabs}
          activeIndex={activeTab}
          type="tabs"
          onChange={onTabChange}
        />
      ) : null}
      {children}
    </div>
  );
}
