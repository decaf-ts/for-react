import React, { useEffect, useMemo, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { CrudOperations } from "@decaf-ts/db-decorators";
import { KeyValue } from "../../engine/types.js";
import { IPagedComponentProperties } from "@decaf-ts/ui-decorators";
import { RgxCard } from "../card/RgxCard.js";
import { translateKey } from "../../services/RgxTranslateService.js";

/**
 * @description Page descriptor used by {@link RgxSteppedForm}.
 * @summary Extends the decaf paged-component properties with the items or child
 * nodes that belong to the page and allows additional page-specific keys.
 * @memberOf module:for-react
 */
export interface SteppedPage extends IPagedComponentProperties {
  items?: unknown[];
  children?: unknown[];
  [key: string]: unknown;
}

/**
 * @description Public props accepted by the {@link RgxSteppedForm} component.
 * @summary Describes the pages, their titles, the current operation, the card
 * styling and localisation, plus callbacks for submission, cancellation and
 * page changes. An optional page renderer and per-page validity check customise
 * how pages are drawn and validated.
 * @memberOf module:for-react
 */
export interface RgxSteppedFormProps {
  children?: React.ReactNode;
  pages?: number | IPagedComponentProperties[];
  pageTitles?: IPagedComponentProperties[];
  paginated?: boolean;
  notifyOnInvalidSubmit?: boolean;
  operation?: CrudOperations;
  startPage?: number;
  locale?: string;
  className?: string;
  cardBody?: "default" | "small" | "blank";
  cardType?: "clear" | "shadow";
  onSubmit?: (event: { data?: KeyValue; page: number }) => void;
  onCancel?: () => void;
  onPageChange?: (page: number) => void;
  renderPage?: (page: SteppedPage, index: number) => React.ReactNode;
  isValid?: (page: number) => boolean;
}

function renderPageItems(page?: SteppedPage): React.ReactNode {
  const items = page?.items || page?.children || [];
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <>
      {items.map((item, index) =>
        React.isValidElement(item) ? (
          React.cloneElement(item as React.ReactElement, { key: index })
        ) : (
          <div key={index} className="dcf-stepped-form-item" />
        )
      )}
    </>
  );
}

/**
 * @description Multi-page form that can advance through steps or render every
 * page in a single scrolling form.
 * @summary Resolves the page list from an explicit array, from children tagged
 * with a `page` prop, or from a page count, and clamps the active page within
 * the available range. When `paginated` is `false` all pages are rendered as
 * cards with cancel and submit buttons. When paginated, it shows a step
 * indicator and the active page, with previous/next/submit buttons that emit
 * `onPageChange` on navigation and `onSubmit` with the active page on submit.
 * If `notifyOnInvalidSubmit` and `isValid` are supplied, an invalid final submit
 * surfaces an error instead of calling `onSubmit`. A READ operation displays a
 * read-only marker.
 * @param {RgxSteppedFormProps} props - Values that define pages and behaviour.
 * @returns {React.ReactElement} The rendered stepped or single-step form.
 * @memberOf module:for-react
 */
export const RgxSteppedForm: React.FC<RgxSteppedFormProps> = ({
  children = [],
  pages = 1,
  pageTitles,
  paginated = true,
  notifyOnInvalidSubmit = false,
  operation = OperationKeys.CREATE,
  startPage = 1,
  locale = "steppedForm",
  className = "",
  cardBody = "default",
  cardType = "clear",
  onSubmit,
  onCancel,
  onPageChange,
  renderPage,
  isValid,
}) => {
  const childNodes = useMemo(
    () => React.Children.toArray(children) as React.ReactElement[],
    [children]
  );

  const resolvedPages = useMemo(() => {
    if (Array.isArray(pages) && pages.length) {
      return pages.map((page, index) => {
        const pageItems = childNodes.filter(
          (node) =>
            Number((node.props as KeyValue)?.page as number) === index + 1
        );
        const existing = ((page as SteppedPage).items || []) as unknown[];
        return {
          ...page,
          items: pageItems.length ? pageItems : existing,
        } as SteppedPage;
      });
    }
    if (childNodes.length) {
      return childNodes.map((node) => ({ items: [node] })) as SteppedPage[];
    }
    const count = typeof pages === "number" ? pages : 1;
    return Array.from({ length: count }, () => ({})) as SteppedPage[];
  }, [childNodes, pages]);

  const titles = useMemo(() => {
    if (pageTitles?.length) return pageTitles;
    if (Array.isArray(pages)) return pages;
    return resolvedPages.map((page) => ({
      title: page.title,
      description: page.description,
    }));
  }, [pageTitles, pages, resolvedPages]);

  const total = resolvedPages.length;
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(startPage, 1), Math.max(total, 1))
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    setActiveIndex((current) => Math.min(Math.max(current, 1), Math.max(total, 1)));
  }, [total]);

  const changePage = (next: number) => {
    setActiveIndex(next);
    setError(false);
    onPageChange?.(next);
  };

  const handleNext = (submit: boolean) => {
    if (submit) {
      if (notifyOnInvalidSubmit && isValid && !isValid(activeIndex)) {
        setError(true);
        return;
      }
      onSubmit?.({ page: activeIndex });
      return;
    }
    changePage(Math.min(activeIndex + 1, total));
  };

  if (!paginated) {
    return (
      <form className={["dcf-steped-form", className].filter(Boolean).join(" ")} noValidate>
        <div className="dcf-single-step">
          {resolvedPages.map((page, index) => (
            <RgxCard key={index} body={cardBody} type={cardType} className={className}>
              {(page.title || page.description) && (
                <div className="dcf-information">
                  {page.title && <div className="dcf-title">{translateKey(page.title)}</div>}
                  {page.description && (
                    <div className="dcf-description">{translateKey(page.description)}</div>
                  )}
                </div>
              )}
              {renderPage ? renderPage(page, index) : renderPageItems(page)}
            </RgxCard>
          ))}
          <div className="dcf-buttons-container dcf-flex dcf-flex-right">
            <button type="button" className="dcf-button light" onClick={onCancel}>
              {translateKey(`${locale}.cancel`) || "Cancel"}
            </button>
            <button
              type="button"
              className="dcf-button primary"
              onClick={() => handleNext(true)}
            >
              {translateKey(`${locale}.submit`) || "Submit"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  const activePage = resolvedPages[activeIndex - 1];
  const activeTitle = titles[activeIndex - 1];

  return (
    <form
      className={["dcf-steped-form", "paginated", className].filter(Boolean).join(" ")}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleNext(activeIndex === total);
      }}
    >
      <div
        className="dcf-page-steps"
        role="group"
        aria-label={translateKey(`${locale}.step_of`, {
          current: activeIndex,
          total,
        })}
      >
        <div className="dcf-grid dcf-grid-collapse skip">
          {titles.map((page, index) => (
            <div className="dcf-flex dcf-flex-middle" key={index}>
              <div
                className={[
                  "dcf-step",
                  activeIndex === index + 1 ? "dcf-active" : "",
                  index + 1 < activeIndex ? "dcf-passed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={activeIndex === index + 1 ? "step" : undefined}
              >
                {index + 1}
              </div>
              {(page?.title || page?.description) && (
                <div className="dcf-information dcf-visible@s">
                  {page?.title && <div className="dcf-title">{translateKey(page.title)}</div>}
                  {page?.description && (
                    <div className="dcf-description">{translateKey(page.description)}</div>
                  )}
                </div>
              )}
              {index < titles.length - 1 && <div className="dcf-arrow-container">›</div>}
            </div>
          ))}
        </div>
      </div>

      {(activeTitle?.title || activeTitle?.description) && (
        <div className="dcf-current-step">
          {activeTitle?.title && (
            <div className="dcf-title">{translateKey(activeTitle.title)}</div>
          )}
          {activeTitle?.description && (
            <div className="dcf-description">
              {translateKey(activeTitle.description)}
            </div>
          )}
        </div>
      )}

      <div className="dcf-stepped-form-grid paginated">
        {renderPage
          ? renderPage(activePage, activeIndex - 1)
          : renderPageItems(activePage)}
      </div>
      {error && (
        <div className="dcf-error-message" role="alert">
          {translateKey(`${locale}.invalid`) || "Please fix the errors before continuing"}
        </div>
      )}

      <div className="dcf-buttons-container dcf-grid dcf-grid-collapse dcf-flex dcf-flex-left">
        <div className="dcf-width-1-2@s">
          <button
            type="button"
            className="dcf-button light"
            onClick={() => changePage(Math.max(1, activeIndex - 1))}
            disabled={activeIndex <= 1}
          >
            {translateKey(`${locale}.previous`) || "Previous"}
          </button>
        </div>
        <div className="dcf-width-1-2@s">
          <button type="button" className="dcf-button primary" onClick={() => handleNext(activeIndex === total)}>
            {activeIndex === total
              ? translateKey(`${locale}.submit`) || "Submit"
              : translateKey(`${locale}.next`) || "Next"}
          </button>
        </div>
      </div>
      {operation === OperationKeys.READ && (
        <span className="dcf-readonly">{translateKey(`${locale}.readonly`) || "Read only"}</span>
      )}
    </form>
  );
};
