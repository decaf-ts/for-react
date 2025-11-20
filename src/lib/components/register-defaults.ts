import { RgxComponentRegistry } from "../engine/ComponentRegistry";
import { RgxCard } from "./card/RgxCard";
import { RgxCrudField } from "./crud-field/RgxCrudField";
import { RgxCrudForm } from "./crud-form/RgxCrudForm";
import { RgxLayout } from "./layout/RgxLayout";
import { RgxComponentRenderer } from "./component-renderer/RgxComponentRenderer";
import { RgxModelRenderer } from "./model-renderer/RgxModelRenderer";
import { RgxIcon } from "./icon/RgxIcon";
import { RgxEmptyState } from "./empty-state/RgxEmptyState";
import { RgxPagination } from "./pagination/RgxPagination";
import { RgxSearchbar } from "./searchbar/RgxSearchbar";

let registered = false;

export function registerDefaultComponents(): void {
  if (registered) return;
  RgxComponentRegistry.register("ngx-decaf-card", RgxCard);
  RgxComponentRegistry.register("ngx-decaf-crud-field", RgxCrudField);
  RgxComponentRegistry.register("ngx-decaf-crud-form", RgxCrudForm);
  RgxComponentRegistry.register("ngx-decaf-layout", RgxLayout);
  RgxComponentRegistry.register("ngx-decaf-icon", RgxIcon);
  RgxComponentRegistry.register("ngx-decaf-searchbar", RgxSearchbar);
  RgxComponentRegistry.register("ngx-decaf-empty-state", RgxEmptyState);
  RgxComponentRegistry.register("ngx-decaf-pagination", RgxPagination);
  RgxComponentRegistry.register("ngx-decaf-component-renderer", RgxComponentRenderer);
  RgxComponentRegistry.register("ngx-decaf-model-renderer", RgxModelRenderer);
  registered = true;
}
