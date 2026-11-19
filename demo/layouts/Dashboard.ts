import { OperationKeys } from "@decaf-ts/db-decorators";
import { model, Model, required } from "@decaf-ts/decorator-validation";
import type { ModelArg } from "@decaf-ts/decorator-validation";
import {
  uichild,
  uielement,
  uilayout,
  uilayoutprop,
} from "@decaf-ts/ui-decorators";
import { CategoryModel } from "../models/CategoryModel";
import { EmployeeModel } from "../models/EmployeeModel";

@uilayout("ngx-decaf-layout", 3, [
  "dashboard.first_line.title",
  "dashboard.second_line.title",
  "dashboard.third_line.title",
])
@model()
export class DashboardLayout extends Model {
  @required()
  @uielement("ngx-decaf-empty-state", {
    title: "dashboard.main.title",
    subtitle: "dashboard.main.subtitle",
  })
  @uilayoutprop("full", 1)
  main!: string;

  @uilayoutprop(3, 2)
  @uichild(EmployeeModel.name, "ngx-decaf-crud-form")
  employee!: EmployeeModel;

  @required()
  @uielement("ngx-decaf-empty-state", { match: true })
  @uilayoutprop(1, 3)
  employeeRight!: string;

  @uilayoutprop(1, 3)
  @uichild(CategoryModel.name, "ngx-decaf-crud-form", {
    operation: OperationKeys.CREATE,
  })
  category!: CategoryModel;

  @required()
  @uielement("ngx-decaf-empty-state", {
    title: "dashboard.second.title",
    subtitle: "dashboard.second.subtitle",
    className: "dcf-card-default",
  })
  @uilayoutprop(1, 3)
  categoryRight!: string;

  constructor(args: ModelArg<DashboardLayout> = {}) {
    super(args);
  }
}
