import React from "react";
import { useNavigate } from "react-router-dom";
import { RgxEmptyState } from "../../src/lib";
import { useTranslate } from "../../src/lib";

export function NotFoundPage() {
  const navigate = useNavigate();
  const translate = useTranslate();
  return (
    <section className="app-page">
      <RgxEmptyState
        title={translate("not_found.title")}
        subtitle={translate("not_found.subtitle")}
        buttonText={translate("not_found.back")}
        onButtonClick={() => navigate("/")}
      />
    </section>
  );
}
