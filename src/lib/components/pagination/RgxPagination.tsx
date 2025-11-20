import React, { useEffect, useMemo, useState } from "react";
import { ComponentEventNames } from "../../engine/constants";
import { IPaginationCustomEvent } from "../../engine/interfaces";
import "./pagination.component.css";

export interface RgxPaginationProps {
  totalPages: number;
  current?: number;
  onChange?: (event: IPaginationCustomEvent) => void;
  className?: string;
}

type Direction = "next" | "previous";

const buildPages = (total: number, current: number) => {
  const pages: { index: number | null; text: string; className: string }[] = [];
  const addPage = (index: number | null, text = "", className = "button") => {
    if (pages.some((page) => page.index === index && index !== null)) return;
    const display = index !== null ? index.toString().padStart(2, "0") : text;
    pages.push({ index, text: display, className });
  };

  if (total <= 5) {
    for (let i = 1; i <= total; i += 1) addPage(i);
  } else {
    addPage(1);
    addPage(2);
    if (current > 3) addPage(null, "…", "separator");
    if (current > 2 && current < total - 1) addPage(current);
    if (current < total - 2) addPage(null, "…", "separator");
    addPage(total - 1);
    addPage(total);
  }
  return pages;
};

export const RgxPagination: React.FC<RgxPaginationProps> = ({
  totalPages,
  current = 1,
  onChange,
  className,
}) => {
  const [active, setActive] = useState(current);

  useEffect(() => {
    setActive(current);
  }, [current]);

  const pages = useMemo(() => buildPages(totalPages, active), [totalPages, active]);

  const emit = (direction: Direction, page: number) => {
    const event: IPaginationCustomEvent = {
      name: ComponentEventNames.CLICK,
      data: { direction, page },
      component: "PaginationComponent",
    };
    onChange?.(event);
  };

  const handleClick = (page: number) => {
    setActive(page);
    const direction: Direction = page > active ? "next" : "previous";
    emit(direction, page);
  };

  const next = () => {
    if (active >= totalPages) return;
    const page = active + 1;
    setActive(page);
    emit("next", page);
  };

  const previous = () => {
    if (active <= 1) return;
    const page = active - 1;
    setActive(page);
    emit("previous", page);
  };

  return (
    <div className={`dcf-pagination ${className || ""}`}>
      <button className="dcf-page-nav" type="button" onClick={previous} disabled={active <= 1}>
        ‹
      </button>
      {pages.map((page) =>
        page.index ? (
          <button
            key={page.index}
            className={`dcf-page ${page.className} ${page.index === active ? "active" : ""}`}
            onClick={() => handleClick(page.index!)}
            type="button"
          >
            {page.text}
          </button>
        ) : (
          <span key={`${page.text}-${Math.random()}`} className="dcf-page separator">
            {page.text}
          </span>
        )
      )}
      <button className="dcf-page-nav" type="button" onClick={next} disabled={active >= totalPages}>
        ›
      </button>
    </div>
  );
};
