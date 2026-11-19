import React, { useEffect, useMemo, useState } from "react";
import { ComponentEventNames } from "../../engine/constants.js";
import { IPaginationCustomEvent } from "../../engine/interfaces.js";

/**
 * @description Public props accepted by the {@link RgxPagination} component.
 * @summary Sets the page count and current page, toggles page-number rendering
 * and truncation, and supplies the callback that receives pagination events.
 * @memberOf module:for-react
 */
export interface RgxPaginationProps {
  totalPages: number;
  current?: number;
  disablePages?: boolean;
  truncatePages?: boolean;
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

/**
 * @description Page navigator with previous/next buttons and optional numbered
 * page buttons.
 * @summary Tracks the active page locally and resynchronises it whenever the
 * `current` prop changes. When `truncatePages` is enabled and more than five
 * pages exist, the number list is condensed with separators around the active
 * page; otherwise every page is listed. Clicking a page, or the previous/next
 * buttons, updates the active page and emits a click event whose data carries
 * the direction and target page, unless `disablePages` hides the number
 * buttons.
 * @param {RgxPaginationProps} props - Values that control the rendered pages.
 * @returns {React.ReactElement} The rendered pagination container.
 * @memberOf module:for-react
 */
export const RgxPagination: React.FC<RgxPaginationProps> = ({
  totalPages,
  current = 1,
  disablePages = false,
  truncatePages = true,
  onChange,
  className,
}) => {
  const [active, setActive] = useState(current);

  useEffect(() => {
    setActive(current);
  }, [current]);

  const pages = useMemo(() => {
    if (!truncatePages) {
      return Array.from({ length: Math.max(0, totalPages) }, (_, index) => {
        const page = index + 1;
        return {
          index: page,
          text: page.toString().padStart(2, "0"),
          className: "button",
        };
      });
    }
    return buildPages(totalPages, active);
  }, [totalPages, active, truncatePages]);

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
      {!disablePages &&
        pages.map((page) =>
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
