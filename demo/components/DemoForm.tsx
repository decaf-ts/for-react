import React, { useEffect, useMemo } from "react";
import {
  RgxCrudField,
  RgxCrudForm,
  RgxFormService,
  type Option,
} from "../../src/lib";
import { useTranslate } from "../../src/lib";

export interface DemoFormField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readonly?: boolean;
  options?: Option[];
}

export interface DemoFormProps {
  id: string;
  fields: DemoFormField[];
  initialValues?: Record<string, unknown>;
  submitLabel?: string;
  onSubmit?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function DemoForm({
  id,
  fields,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: DemoFormProps) {
  const translate = useTranslate();
  const formProvider = useMemo(() => RgxFormService.get(id), [id]);

  useEffect(() => {
    formProvider.reset();
    Object.entries(initialValues || {}).forEach(([key, value]) => {
      formProvider.setValue(key, value);
    });
  }, [formProvider, initialValues]);

  return (
    <RgxCrudForm
      formProvider={formProvider}
      action={submitLabel ? translate(submitLabel) : undefined}
      onSubmit={(data) => onSubmit?.(data)}
      onCancel={onCancel}
    >
      {fields.map((field) => (
        <RgxCrudField
          key={field.name}
          name={field.name}
          path={field.name}
          label={translate(field.label)}
          placeholder={
            field.placeholder ? translate(field.placeholder) : undefined
          }
          type={field.type || "text"}
          required={field.required}
          readonly={field.readonly}
          options={field.options}
          formProvider={formProvider}
        />
      ))}
    </RgxCrudForm>
  );
}
