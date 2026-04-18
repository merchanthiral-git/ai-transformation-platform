import React from "react";

export type ColumnType = "text" | "numeric" | "status" | "badge" | "action";
export type SortDirection = "asc" | "desc";

export interface Column {
  id: string;
  header: string;
  accessor: string | ((row: any) => any);
  type?: ColumnType;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: any) => React.ReactNode;
}

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any) => void;
}

export interface DataTableProps {
  data: any[];
  columns: Column[];
  density?: "comfortable" | "compact";
  rowActions?: (row: any) => RowAction[];
  onRowClick?: (row: any) => void;
  selection?: {
    mode: "none" | "single" | "multi";
    selected: string[];
    onChange: (ids: string[]) => void;
  };
  pagination?: {
    pageSize?: number;
    pageSizes?: number[];
  };
  sort?: {
    by: string;
    direction: SortDirection;
  };
  onSortChange?: (by: string, dir: SortDirection) => void;
  search?: {
    placeholder: string;
    onSearch?: (q: string) => void;
  };
  emptyState?: React.ReactNode;
  loading?: boolean;
  exportable?: boolean;
  caption?: string;
}
