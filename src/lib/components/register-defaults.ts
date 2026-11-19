import { RgxComponentRegistry } from "../engine/ComponentRegistry.js";
import { RgxCard } from "./card/RgxCard.js";
import { RgxComponentRenderer } from "./component-renderer/RgxComponentRenderer.js";
import { RgxContainer } from "./container/RgxContainer.js";
import { RgxCrudField } from "./crud-field/RgxCrudField.js";
import { RgxCrudForm } from "./crud-form/RgxCrudForm.js";
import { RgxDashboard } from "./dashboard/RgxDashboard.js";
import { RgxEmptyState } from "./empty-state/RgxEmptyState.js";
import { RgxFieldset } from "./fieldset/RgxFieldset.js";
import { RgxFileUpload } from "./file-upload/RgxFileUpload.js";
import { RgxFilter } from "./filter/RgxFilter.js";
import { RgxIcon } from "./icon/RgxIcon.js";
import { RgxLayout } from "./layout/RgxLayout.js";
import { RgxList } from "./list/RgxList.js";
import { RgxListItem } from "./list-item/RgxListItem.js";
import { RgxModal, RgxModalConfirm } from "./modal/RgxModal.js";
import { RgxModelBuilder } from "./model-builder/RgxModelBuilder.js";
import { RgxModelRenderer } from "./model-renderer/RgxModelRenderer.js";
import { RgxPagination } from "./pagination/RgxPagination.js";
import { RgxSearchbar } from "./searchbar/RgxSearchbar.js";
import { RgxSteppedForm } from "./stepped-form/RgxSteppedForm.js";
import { RgxTable } from "./table/RgxTable.js";

let registered = false;

/**
 * @description Registers the library's built-in components with the registry.
 * @summary Maps every default component to its `ngx-decaf-*` tag so rendered
 * configurations can resolve them by name. The work runs at most once per
 * process; subsequent calls are no-ops.
 * @returns {void}
 * @memberOf module:for-react
 */
export function registerDefaultComponents(): void {
  if (registered) return;
  RgxComponentRegistry.register("ngx-decaf-card", RgxCard);
  RgxComponentRegistry.register("ngx-decaf-component-renderer", RgxComponentRenderer);
  RgxComponentRegistry.register("ngx-decaf-container", RgxContainer);
  RgxComponentRegistry.register("ngx-decaf-crud-field", RgxCrudField);
  RgxComponentRegistry.register("ngx-decaf-crud-form", RgxCrudForm);
  RgxComponentRegistry.register("ngx-decaf-dashboard", RgxDashboard);
  RgxComponentRegistry.register("ngx-decaf-empty-state", RgxEmptyState);
  RgxComponentRegistry.register("ngx-decaf-fieldset", RgxFieldset);
  RgxComponentRegistry.register("ngx-decaf-file-upload", RgxFileUpload);
  RgxComponentRegistry.register("ngx-decaf-filter", RgxFilter);
  RgxComponentRegistry.register("ngx-decaf-icon", RgxIcon);
  RgxComponentRegistry.register("ngx-decaf-layout", RgxLayout);
  RgxComponentRegistry.register("ngx-decaf-list", RgxList);
  RgxComponentRegistry.register("ngx-decaf-list-item", RgxListItem);
  RgxComponentRegistry.register("ngx-decaf-modal", RgxModal);
  RgxComponentRegistry.register("ngx-decaf-modal-confirm", RgxModalConfirm);
  RgxComponentRegistry.register("ngx-decaf-model-builder", RgxModelBuilder);
  RgxComponentRegistry.register("ngx-decaf-model-renderer", RgxModelRenderer);
  RgxComponentRegistry.register("ngx-decaf-pagination", RgxPagination);
  RgxComponentRegistry.register("ngx-decaf-searchbar", RgxSearchbar);
  RgxComponentRegistry.register("ngx-decaf-stepped-form", RgxSteppedForm);
  RgxComponentRegistry.register("ngx-decaf-table", RgxTable);
  registered = true;
}
