import React, { type CSSProperties } from "react";

import {
  type CellContext,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Header,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import { makeData, type Person } from "./fixtures/makeData";

// needed for table body level scope DnD setup
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// needed for row & cell level scope DnD setup
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 열 드래그용
const DraggableTableHeader = ({
  header,
}: {
  header: Header<Person, unknown>;
}) => {
  const id = `col-${header.column.id}`;
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useSortable({ id });

  const style: CSSProperties = {
    opacity: isDragging ? 0.33 : 1,
    position: "relative",
    transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
    transition: "width transform 0.2s ease-in-out",
    whiteSpace: "nowrap",
    width: header.column.getSize(),
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <th colSpan={header.colSpan} ref={setNodeRef} style={style}>
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      <button {...attributes} {...listeners}>
        🟰
      </button>
    </th>
  );
};

// Cell Component
const RowDragHandleCell = ({ rowId }: { rowId: string }) => {
  const { attributes, listeners } = useSortable({
    id: rowId,
  });
  return (
    // Alternatively, you could set these attributes on the rows themselves
    <button {...attributes} {...listeners}>
      🟰
    </button>
  );
};

// 행 드래그용
const DraggableRow = ({ row }: { row: Row<Person> }) => {
  const id = `row-${row.original.userId}`;
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform), //let dnd-kit do its thing
    transition: transition,
    opacity: isDragging ? 0.33 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };
  return (
    // connect row ref to dnd-kit, apply important styles
    <tr ref={setNodeRef} style={style}>
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} style={{ width: cell.column.getSize() }}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
};

// Table Component
export const BasicTable = () => {
  const dragHandleColumn: ColumnDef<Person> = {
    id: "drag-handle",
    header: "Move",
    cell: ({ row }) => (
      <RowDragHandleCell rowId={`row-${row.original.userId}`} />
    ),
    size: 60,
  };
  const [dynamicColumns, setDynamicColumns] = React.useState<
    ColumnDef<Person>[]
  >([
    // Create a dedicated drag handle column. Alternatively, you could just set up dnd events on the rows themselves.
    {
      accessorKey: "firstName",
      id: "firstName",
      cell: (info) => info.getValue(),
    },
    {
      accessorFn: (row) => row.lastName,
      accessorKey: "lastName",
      id: "lastName",
      cell: (info) => info.getValue(),
      header: () => <span>Last Name</span>,
    },
    {
      accessorKey: "age",
      id: "age",
      header: () => "Age",
    },
    {
      accessorKey: "visits",
      id: "visits",
      header: () => <span>Visits</span>,
    },
    {
      accessorKey: "status",
      id: "status",
      header: "Status",
    },
    {
      accessorKey: "progress",
      id: "progress",
      header: "Profile Progress",
    },
  ]);
  const columns = React.useMemo<ColumnDef<Person>[]>(
    () => [dragHandleColumn, ...dynamicColumns],
    [dynamicColumns]
  );
  const [data, setData] = React.useState(() => makeData(20));

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ userId }) => `row-${userId}`),
    [data]
  );

  const rerender = () => setData(() => makeData(20));

  // 동적으로 컬럼 추가
  const addDynamicColumn = () => {
    const newColumnKey = crypto.randomUUID();
    const newColumn = {
      accessorKey: newColumnKey,
      id: newColumnKey,
      header: `동적 컬럼 ${dynamicColumns.length - 1}`,
      cell: (info: any) => `값: ${info.getValue() || "-"}`,
    };

    // dynamicColumns 상태 업데이트로 useMemo로 값을 기억하고 있는 columns을 다시 계산하도록 한다.
    setDynamicColumns((prevColumns) => [...prevColumns, newColumn]);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.userId, //required because row indexes will change
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  // reorder rows after drag & drop
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const isRow = active.id.toString().startsWith("row-");
    const isCol = active.id.toString().startsWith("col-");

    if (isRow) {
      // const oldIndex = dataIds.indexOf(active.id);
      // const newIndex = dataIds.indexOf(over.id);
      const rowItems = table.getRowModel().rows;
      const oldIndex = rowItems.findIndex(
        (row) => `row-${row.original.userId}` === active.id
      );
      const newIndex = rowItems.findIndex(
        (row) => `row-${row.original.userId}` === over.id
      );
      if (oldIndex !== -1 && newIndex !== -1) {
        const newData = arrayMove(
          rowItems.map((r) => r.original),
          oldIndex,
          newIndex
        );
        setData(newData);
      }
    }

    if (isCol) {
      const oldIndex = dynamicColumns.findIndex(
        (col) => `col-${col.id}` === active.id
      );
      const newIndex = dynamicColumns.findIndex(
        (col) => `col-${col.id}` === over.id
      );
      setDynamicColumns((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  // 행은 수직, 열은 수평으로만 DnD를 할 수 있도록
  const getModifiersForDragId = (id: string): Modifier[] => {
    if (id.startsWith("row-")) return [restrictToVerticalAxis];
    if (id.startsWith("col-")) return [restrictToHorizontalAxis];
    return [];
  };

  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const rowIdsKey = table
    .getRowModel()
    .rows.map((r) => r.id)
    .join("-");

  return (
    // NOTE: This provider creates div elements, so don't nest inside of <table> elements
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id)}
      onDragEnd={(event) => {
        setActiveId(null);
        handleDragEnd(event);
      }}
      modifiers={activeId ? getModifiersForDragId(String(activeId)) : []}
      sensors={sensors}
    >
      <div className="p-2">
        <div className="h-4" />
        <div className="flex flex-wrap gap-2">
          <button onClick={rerender} className="border p-1">
            Regenerate
          </button>
          <button onClick={addDynamicColumn} className="border p-1">
            Add Column
          </button>
        </div>
        <div className="h-4" />
        <table>
          <thead>
            <SortableContext
              key={dynamicColumns.map((c) => c.id).join("-")}
              items={dynamicColumns
                .filter((col) => col.id !== "drag-handle")
                .map((col) => `col-${col.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    if (header.column.id === "drag-handle") {
                      return (
                        <th
                          key={header.id}
                          style={{ width: header.column.getSize() }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </th>
                      );
                    } else {
                      return (
                        <DraggableTableHeader key={header.id} header={header} />
                      );
                    }
                  })}
                </tr>
              ))}
            </SortableContext>
          </thead>
          <tbody>
            <SortableContext
              key={rowIdsKey}
              // items={data.map((row) => `row-${row.userId}`)}
              items={table
                .getRowModel()
                .rows.map((row) => `row-${row.original.userId}`)}
              strategy={verticalListSortingStrategy}
            >
              {table.getRowModel().rows.map((row) => (
                <DraggableRow key={`row-${row.original.userId}`} row={row} />
              ))}
            </SortableContext>
          </tbody>
        </table>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </DndContext>
  );
};
