import { index, pk } from "@decaf-ts/core";
import { OperationKeys, readonly, timestamp } from "@decaf-ts/db-decorators";
import { Model, model, required } from "@decaf-ts/decorator-validation";
import type { ModelArg } from "@decaf-ts/decorator-validation";
import {
  hideOn,
  HTML5InputTypes,
  uielement,
  uilayoutprop,
  uilistmodel,
  uilistprop,
  uimodel,
} from "@decaf-ts/ui-decorators";

@uilistmodel("ngx-decaf-list-item", { icon: "ti-cup" })
@uimodel("ngx-decaf-crud-form")
@model()
export class CategoryModel extends Model {
  @pk({ type: "Number" })
  @hideOn(OperationKeys.CREATE)
  @uilistprop("uid")
  @uielement("ngx-decaf-crud-field", {
    label: "category.id.label",
    placeholder: "category.id.placeholder",
    readonly: true,
  })
  @readonly()
  id!: number;

  @uielement("ngx-decaf-crud-field", {
    label: "category.name.label",
    placeholder: "category.name.placeholder",
  })
  @uilistprop("title")
  @uilayoutprop(1, 2)
  @required()
  name!: string;

  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "category.period.label",
    type: HTML5InputTypes.RADIO,
    translatable: false,
    justify: "start",
    labelPlacement: "end",
    options: [
      { text: "All", value: "all" },
      { text: "15 days", value: "fifteen" },
      { text: "30 days", value: "month" },
      { text: "Year", value: "year" },
    ],
  })
  sets?: string;

  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "category.period.label",
    type: HTML5InputTypes.SELECT,
    translatable: false,
    options: [
      { text: "All", value: "all" },
      { text: "15 days", value: "fifteen" },
      { text: "30 days", value: "month" },
      { text: "Year", value: "year" },
    ],
  })
  sets2?: string;

  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "category.description.label",
    placeholder: "category.description.placeholder",
    type: "textarea",
  })
  @uilistprop("description")
  @index()
  @uilayoutprop(1, 2)
  description!: string;

  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "category.created.label",
    placeholder: "category.created.placeholder",
    type: "textarea",
  })
  @uilistprop("info")
  @timestamp([OperationKeys.CREATE])
  @hideOn(OperationKeys.CREATE)
  createdAt!: Date;

  constructor(args: ModelArg<CategoryModel> = {}) {
    super(args);
  }
}
