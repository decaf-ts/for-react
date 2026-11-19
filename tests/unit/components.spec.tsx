import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RgxCard } from "../../src/lib/components/card/RgxCard";
import { RgxContainer } from "../../src/lib/components/container/RgxContainer";
import { RgxEmptyState } from "../../src/lib/components/empty-state/RgxEmptyState";
import { RgxFieldset } from "../../src/lib/components/fieldset/RgxFieldset";
import { RgxFileUpload } from "../../src/lib/components/file-upload/RgxFileUpload";
import { RgxFilter } from "../../src/lib/components/filter/RgxFilter";
import { RgxList } from "../../src/lib/components/list/RgxList";
import { RgxListItem } from "../../src/lib/components/list-item/RgxListItem";
import { RgxModal } from "../../src/lib/components/modal/RgxModal";
import { RgxModelBuilder } from "../../src/lib/components/model-builder/RgxModelBuilder";
import { RgxPagination } from "../../src/lib/components/pagination/RgxPagination";
import { RgxSearchbar } from "../../src/lib/components/searchbar/RgxSearchbar";
import { RgxSteppedForm } from "../../src/lib/components/stepped-form/RgxSteppedForm";
import { RgxTable } from "../../src/lib/components/table/RgxTable";
import { RgxDashboard } from "../../src/lib/components/dashboard/RgxDashboard";
import { RgxDashboard as _RgxDashboard } from "../../src/lib/components/dashboard/RgxDashboard";
import { OperationKeys } from "@decaf-ts/db-decorators";

void _RgxDashboard;

describe("components", () => {
  it("renders cards", () => {
    render(
      <RgxCard title="Hello" subtitle="World">
        Body
      </RgxCard>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renders containers with flex classes", () => {
    const { container } = render(<RgxContainer position="center">Content</RgxContainer>);
    expect(container.querySelector(".dcf-flex-center")).toBeTruthy();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders empty states", () => {
    render(<RgxEmptyState title="Nothing here" subtitle="Try again" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders pagination and emits page changes", () => {
    const onChange = jest.fn();
    render(<RgxPagination totalPages={5} current={1} onChange={onChange} />);
    fireEvent.click(screen.getByText("›"));
    expect(onChange).toHaveBeenCalled();
  });

  it("renders searchbars and debounces search", () => {
    jest.useFakeTimers();
    const onSearch = jest.fn();
    render(<RgxSearchbar placeholder="Find" debounce={10} onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText("Find"), {
      target: { value: "abc" },
    });
    jest.advanceTimersByTime(20);
    expect(onSearch).toHaveBeenCalledWith("abc");
    jest.useRealTimers();
  });

  it("renders list items from mapped data", () => {
    render(
      <RgxListItem
        item={{ id: 1, name: "Jane", role: "Admin" }}
        mapper={{ title: "name", description: "role" }}
      />
    );
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders lists with search filtering and pagination", async () => {
    const data = [
      { id: 1, name: "Alpha" },
      { id: 2, name: "Beta" },
      { id: 3, name: "Gamma" },
    ];
    render(
      <RgxList
        data={data}
        pageSize={2}
        searchableKeys="name"
        mapper={{ title: "name" }}
        enableFilter={false}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Beta" } });
    await waitFor(() =>
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders tables with headers and actions", () => {
    const onAction = jest.fn();
    render(
      <RgxTable
        data={[{ id: 1, name: "Alpha" }]}
        operations={[OperationKeys.UPDATE, OperationKeys.DELETE]}
        onAction={onAction}
        modelName="Users"
      />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Update"));
    expect(onAction).toHaveBeenCalled();
  });

  it("renders fieldsets with items", () => {
    render(
      <RgxFieldset title="Addresses" value={[{ title: "Home" }, { title: "Work" }]} />
    );
    expect(screen.getByText(/Home/)).toBeInTheDocument();
    expect(screen.getByText(/Work/)).toBeInTheDocument();
  });

  it("renders filters and emits queries", () => {
    const onFilter = jest.fn();
    render(<RgxFilter onFilter={onFilter} />);
    fireEvent.change(screen.getByLabelText("Attribute"), {
      target: { value: "name" },
    });
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "Jane" },
    });
    expect(onFilter).toHaveBeenCalled();
  });

  it("renders file uploads in read mode", () => {
    render(
      <RgxFileUpload
        operation={OperationKeys.READ}
        value={JSON.stringify([{ name: "a.png", size: 1, type: "image/png" }])}
      />
    );
    expect(screen.getByText("a.png")).toBeInTheDocument();
  });

  it("renders modals through a portal", () => {
    render(
      <RgxModal isOpen title="Dialog">
        Modal body
      </RgxModal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Modal body")).toBeInTheDocument();
  });

  it("renders stepped forms and advances pages", () => {
    const onPageChange = jest.fn();
    render(
      <RgxSteppedForm
        pages={[
          { title: "Step one" },
          { title: "Step two" },
        ]}
        onPageChange={onPageChange}
      />
    );
    expect(screen.getAllByText("Step one").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("renders model builders and builds definitions", () => {
    const onBuild = jest.fn();
    render(<RgxModelBuilder onBuild={onBuild} />);
    fireEvent.click(screen.getByText("Add property"));
    fireEvent.click(screen.getByText("Build model"));
    expect(onBuild).toHaveBeenCalled();
    const definition = onBuild.mock.calls[0][0];
    expect(definition.name).toBe("GeneratedModel");
    expect(definition.properties.length).toBe(1);
  });

  it("renders dashboards in create mode with a palette", () => {
    render(
      <RgxDashboard
        palette={[{ tag: "ngx-decaf-card", label: "Card" }]}
        operation={OperationKeys.CREATE}
      />
    );
    fireEvent.click(screen.getByText("Card"));
    expect(screen.getByText("Save")).toBeInTheDocument();
  });
});
