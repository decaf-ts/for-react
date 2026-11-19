import { minlength, model, Model, password, required } from "@decaf-ts/decorator-validation";
import type { ModelArg } from "@decaf-ts/decorator-validation";
import { uielement, uimodel } from "@decaf-ts/ui-decorators";

@uimodel("ngx-decaf-crud-form")
@model()
export class LoginForm extends Model {
  @required()
  @minlength(4)
  @uielement("ngx-decaf-crud-field", {
    label: "login.username.label",
    placeholder: "login.username.placeholder",
  })
  username!: string;

  @uielement("ngx-decaf-crud-field", {
    label: "login.password.label",
    placeholder: "login.password.placeholder",
  })
  @password()
  @required()
  password!: string;

  constructor(args: ModelArg<LoginForm> = {}) {
    super(args);
  }
}
