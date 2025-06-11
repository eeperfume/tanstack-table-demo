import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
  type Row,
} from "@tanstack/react-table";
import React, { type CSSProperties } from "react";
import { makeData, type Person } from "./fixtures/makeData";

// 📌 Column 드래그 헤더
const DraggableTableHeader = ({
  header,
}: {
  header: Header<Person, unknown>;
}) => {
  const id = `col-${header.column.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: "width transform 0.2s ease-in-out",
    opacity: isDragging ? 0.33 : 1,
    width: header.column.getSize(),
    position: "relative",
  };

  return (
    <th ref={setNodeRef} style={style} colSpan={header.colSpan}>
      {header.isPlaceholder ? null : (
        <div {...attributes} {...listeners}>
          {flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      )}
    </th>
  );
};

// 📌 Row 드래그
const DraggableRow = ({ row }: { row: Row<Person> }) => {
  const id = `row-${row.original.userId}`; // prefix 유지!
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.33 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {row.getVisibleCells().map((cell) => {
        const isHandle = cell.column.id === "drag-handle";
        return (
          <td key={cell.id} style={{ width: cell.column.getSize() }}>
            {isHandle ? (
              <button {...attributes} {...listeners}>
                👉
              </button>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </td>
        );
      })}
    </tr>
  );
};

// 📌 전체 Table 컴포넌트
export const BasicTable = () => {
  const [data, setData] = React.useState(() => makeData(20));
  const [dynamicColumns, setDynamicColumns] = React.useState<
    ColumnDef<Person>[]
  >([
    { accessorKey: "firstName", id: "firstName", header: "First Name" },
    { accessorKey: "lastName", id: "lastName", header: "Last Name" },
    { accessorKey: "age", id: "age", header: "Age" },
    { accessorKey: "visits", id: "visits", header: "Visits" },
    { accessorKey: "status", id: "status", header: "Status" },
    { accessorKey: "progress", id: "progress", header: "Profile Progress" },
  ]);

  const dragHandleColumn: ColumnDef<Person> = {
    id: "drag-handle",
    header: "Move",
    cell: () => null,
    size: 50,
  };

  const columns = React.useMemo(
    () => [dragHandleColumn, ...dynamicColumns],
    [dynamicColumns]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.userId,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isRow = `${active.id}`.startsWith("row-");
    const isCol = `${active.id}`.startsWith("col-");

    if (isRow) {
      const rows = table.getRowModel().rows;
      const oldIdx = rows.findIndex(
        (r) => `row-${r.original.userId}` === active.id
      );
      const newIdx = rows.findIndex(
        (r) => `row-${r.original.userId}` === over.id
      );
      if (oldIdx !== -1 && newIdx !== -1) {
        const newData = arrayMove(
          rows.map((r) => r.original),
          oldIdx,
          newIdx
        );
        setData(newData);
      }
    }

    if (isCol) {
      const oldIdx = dynamicColumns.findIndex(
        (col) => `col-${col.id}` === active.id
      );
      const newIdx = dynamicColumns.findIndex(
        (col) => `col-${col.id}` === over.id
      );
      if (oldIdx !== -1 && newIdx !== -1) {
        setDynamicColumns((prev) => arrayMove(prev, oldIdx, newIdx));
      }
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const getModifiersForDragId = (id: string): Modifier[] => {
    if (id.startsWith("row-")) return [restrictToVerticalAxis];
    if (id.startsWith("col-")) return [restrictToHorizontalAxis];
    return [];
  };

  const rowIds = table
    .getRowModel()
    .rows.map((r) => `row-${r.original.userId}`);
  const colIds = dynamicColumns.map((c) => `col-${c.id}`);

  const rerender = () => setData(() => makeData(20));

  const addDynamicColumn = () => {
    const newColumnKey = `dynamic-col-${dynamicColumns.length + 1}`;
    const newColumn = {
      accessorKey: newColumnKey,
      id: newColumnKey,
      header: `동적 컬럼 ${dynamicColumns.length + 1}`,
      cell: (info: any) => `${info.getValue() || "-"}`,
    };
    setDynamicColumns((prevColumns) => [...prevColumns, newColumn]);
  };

  const addRow = () => {
    const copyData = [...data];
    const addData = makeData(1);
    setData([...copyData, ...addData]);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragEnd={(e) => {
        setActiveId(null);
        handleDragEnd(e);
      }}
      modifiers={activeId ? getModifiersForDragId(`${activeId}`) : []}
    >
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <button onClick={rerender} className="border p-1">
            Regenerate
          </button>
          <button onClick={addDynamicColumn} className="border p-1">
            Add Column
          </button>
          <button onClick={addRow} className="border p-1">
            Add Row
          </button>
        </div>
        <table>
          <thead>
            <SortableContext
              items={colIds}
              strategy={horizontalListSortingStrategy}
            >
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) =>
                    header.column.id === "drag-handle" ? (
                      <th
                        key={header.id}
                        style={{ width: header.column.getSize() }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ) : (
                      <DraggableTableHeader key={header.id} header={header} />
                    )
                  )}
                </tr>
              ))}
            </SortableContext>
          </thead>
          <tbody>
            <SortableContext
              items={rowIds}
              strategy={verticalListSortingStrategy}
            >
              {table.getRowModel().rows.map((row) => (
                <DraggableRow key={row.id} row={row} />
              ))}
            </SortableContext>
          </tbody>
        </table>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </DndContext>
  );
};
