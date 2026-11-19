import React, { useState } from "react";
import {
  RgxCard,
  RgxEmptyState,
  RgxFormService,
} from "../../src/lib";
import { CardTitle } from "../components/CardTitle";
import { ExpiryDateField } from "../components/ExpiryDateField";
import { ProductItem, ProductItemValue } from "../components/ProductItem";
import { Switcher } from "../components/Switcher";

const products: ProductItemValue[] = [
  {
    productCode: "09501101530003",
    inventedName: "Aspirin 100mg",
    internalMaterialCode: "MAT-001",
    nameMedicinalProduct: "Acetylsalicylic acid",
    importLicenseNumber: "IMP-2026-001",
    productRecall: false,
    batches: "4",
  },
  {
    productCode: "09501101530010",
    inventedName: "Paracetamol 500mg",
    internalMaterialCode: "MAT-002",
    nameMedicinalProduct: "Paracetamol",
    importLicenseNumber: "IMP-2026-002",
    productRecall: true,
    batches: "2",
  },
];

export function ComponentsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const expiryForm = RgxFormService.get("expiry-demo");

  return (
    <section className="app-page" aria-labelledby="components-title">
      <CardTitle
        title="components.title"
        subtitle="components.subtitle"
        tabs={[
          { title: "components.products", value: "products" },
          { title: "components.expiry", value: "expiry" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <h2 id="components-title" className="app-visually-hidden">
        Components
      </h2>
      {activeTab === 0 ? (
        <>
          <Switcher
            items={[
              { title: "components.all", value: "all" },
              { title: "components.recalled", value: "recalled" },
            ]}
            activeIndex={0}
            onChange={() => undefined}
          />
          <div className="app-product-list">
            {products.map((product) => (
              <ProductItem
                key={product.productCode}
                item={product}
                onRead={(code) => setSelectedProduct(code)}
                onUpdate={(code) => setSelectedProduct(code)}
                onDelete={(code) => setSelectedProduct(code)}
                onFilterBatches={(code) => setSelectedProduct(code)}
              />
            ))}
          </div>
          {selectedProduct ? (
            <p role="status" aria-live="polite" className="app-status">
              Selected product: {selectedProduct}
            </p>
          ) : (
            <RgxEmptyState
              title="components.no_selection.title"
              subtitle="components.no_selection.subtitle"
              showIcon={false}
            />
          )}
        </>
      ) : (
        <RgxCard type="shadow">
          <ExpiryDateField formProvider={expiryForm} />
        </RgxCard>
      )}
    </section>
  );
}
