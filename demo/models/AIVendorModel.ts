import { pk, table } from "@decaf-ts/core";
import { OperationKeys } from "@decaf-ts/db-decorators";
import type { ModelArg } from "@decaf-ts/decorator-validation";
import {
  list,
  Model,
  model,
  required,
} from "@decaf-ts/decorator-validation";
import {
  hideOn,
  HTML5InputTypes,
  uielement,
  uilistmodel,
  uilistprop,
  uimodel,
} from "@decaf-ts/ui-decorators";
import { AIFeatures, AIVendors } from "../constants";

@uimodel("ngx-decaf-crud-form")
@uilistmodel("ngx-decaf-list-item", { icon: "ti-world", className: "testing" })
@model()
export class AIVendorModel extends Model {
  @pk({ type: "String", generated: false })
  @uielement("ngx-decaf-crud-field", {
    label: "aivendors.name.label",
    placeholder: "aivendors.name.placeholder",
    type: HTML5InputTypes.SELECT,
    options: Object.values(AIVendors).map((item) => ({
      text: item,
      value: item,
    })),
  })
  @uilistprop("title")
  name!: string;

  @uielement("ngx-decaf-crud-field", {
    label: "aivendors.models.label",
    placeholder: "aivendors.models.placeholder",
    type: HTML5InputTypes.SELECT,
    optionsMapper: (item: AIModel) => ({ text: item.name, value: item.name }),
    options: () => AIModel,
  })
  @uilistprop("title")
  @required()
  @list(String)
  models!: string[];

  constructor(arg?: ModelArg<AIVendorModel>) {
    super(arg);
  }
}

@table("ai_models")
@uimodel("ngx-decaf-crud-form")
@uilistmodel("ngx-decaf-list-item", { icon: "ti-world", className: "testing" })
@model()
export class AIModel extends Model {
  @pk({ type: "String", generated: false })
  @uielement("ngx-decaf-crud-field", {
    label: "aimodel.name.label",
    placeholder: "aimodel.name.placeholder",
  })
  @uilistprop("title")
  name!: string;

  @uielement("ngx-decaf-crud-field", {
    label: "aimodel.features.label",
    placeholder: "aimodel.features.placeholder",
    type: "checkbox",
    options: Object.values(AIFeatures).map((item) => ({
      text: item,
      value: item,
    })),
  })
  @uilistprop("description")
  @list(String)
  @hideOn(OperationKeys.CREATE)
  features!: AIFeatures[];

  constructor(arg?: ModelArg<AIModel>) {
    super(arg);
  }
}
