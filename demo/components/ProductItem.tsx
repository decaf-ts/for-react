import React from "react";
import { RgxIcon } from "../../src/lib";
import { useTranslate } from "../../src/lib";

export interface ProductItemValue {
  productCode: string;
  inventedName?: string;
  internalMaterialCode?: string;
  nameMedicinalProduct?: string;
  importLicenseNumber?: string;
  productRecall?: boolean;
  batches?: string;
}

export interface ProductItemProps {
  item: ProductItemValue;
  onRead?: (productCode: string) => void;
  onUpdate?: (productCode: string) => void;
  onDelete?: (productCode: string) => void;
  onFilterBatches?: (productCode: string) => void;
}

export function ProductItem({
  item,
  onRead,
  onUpdate,
  onDelete,
  onFilterBatches,
}: ProductItemProps) {
  const translate = useTranslate();
  const locale = "product";

  const handleKey = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  return (
    <article className="app-product-item dcf-card dcf-card-small">
      <div className="app-product-main">
        <RgxIcon name="ti-package" color="tertiary" />
        <div>
          <p className="app-product-name">{item.inventedName}</p>
          <span className="app-product-gtin">
            {translate(`${locale}.gtin`)}: {item.productCode}
          </span>
        </div>
        <div className="app-product-actions">
          <button
            type="button"
            className="app-icon-action"
            aria-label={translate("operations.update.title")}
            title={translate("operations.update.title")}
            onClick={() => onUpdate?.(item.productCode)}
          >
            <RgxIcon name="ti-pencil" color="primary" />
          </button>
          <button
            type="button"
            className="app-icon-action"
            aria-label={translate("operations.delete.title")}
            title={translate("operations.delete.title")}
            onClick={() => onDelete?.(item.productCode)}
          >
            <RgxIcon name="ti-trash" color="danger" />
          </button>
        </div>
      </div>
      <div className="app-product-details">
        <p>
          <span>{translate(`${locale}.internalMaterialCode.label`)}</span>
          <strong>{item.internalMaterialCode}</strong>
        </p>
        <p>
          <span>{translate(`${locale}.nameMedicinalProduct.label`)}</span>
          <strong>{item.nameMedicinalProduct}</strong>
        </p>
        <p>
          <span>{translate(`${locale}.importLicenseNumber.label`)}</span>
          <strong>{item.importLicenseNumber}</strong>
        </p>
        <p>
          <span>{translate(`${locale}.recalled.label`)}</span>
          <strong>
            {item.productRecall
              ? translate(`${locale}.recalled.yes`)
              : translate(`${locale}.recalled.no`)}
          </strong>
        </p>
        <p
          role="button"
          tabIndex={0}
          onClick={() => onFilterBatches?.(item.productCode)}
          onKeyUp={(event) =>
            handleKey(event, () => onFilterBatches?.(item.productCode))
          }
        >
          <span>{translate(`${locale}.batches`)}</span>
          <strong>{item.batches || "-"}</strong>
        </p>
      </div>
      <button
        type="button"
        className="app-link-button"
        onClick={() => onRead?.(item.productCode)}
      >
        {translate("operations.read.title")}
      </button>
    </article>
  );
}
