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
import React, { type CSSProperties, type HTMLProps } from "react";
import { makeData, type Person } from "./fixtures/makeData";
import dragHandleIcon from "/public/icons8-drag-handle-30.png";

// 📌 Column 드래그 헤더
const DraggableTableHeader = ({
  header,
  onHeaderClick,
}: {
  header: Header<Person, unknown>;
  onHeaderClick: (e: React.MouseEvent, columnId: string) => void;
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
    <th
      ref={setNodeRef}
      style={style}
      colSpan={header.colSpan}
      className="hover:bg-gray-100"
    >
      {!header.isPlaceholder && (
        <div className="flex justify-between items-center">
          <span
            onClick={(e) => onHeaderClick(e, header.column.id)}
            className="cursor-pointer"
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-move"
          >
            <img src={dragHandleIcon} className="h-[13px] w-[13px]" />
          </span>
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
              <div className="flex justify-end items-center gap-2">
                <button {...attributes} {...listeners}>
                  <img src={dragHandleIcon} className="h-[13px] w-[13px]" />
                </button>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </td>
        );
      })}
    </tr>
  );
};

const IndeterminateCheckbox = ({
  indeterminate,
  className = "",
  ...rest
}: { indeterminate?: boolean } & HTMLProps<HTMLInputElement>) => {
  const ref = React.useRef<HTMLInputElement>(null!);

  React.useEffect(() => {
    if (typeof indeterminate === "boolean") {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className={className + " cursor-pointer"}
      {...rest}
    />
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
  const [rowSelection, setRowSelection] = React.useState({});
  const [showPopover, setShowPopover] = React.useState(false);
  const [popoverPos, setPopoverPos] = React.useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [targetColumnId, setTargetColumnId] = React.useState<string | null>(
    null
  );

  const dragHandleColumn: ColumnDef<Person> = {
    id: "drag-handle",
    header: ({ table }) => (
      <div className="flex justify-end">
        <IndeterminateCheckbox
          {...{
            checked: table.getIsAllRowsSelected(),
            indeterminate: table.getIsSomeRowsSelected(),
            onChange: table.getToggleAllRowsSelectedHandler(),
          }}
        />
      </div>
    ),
    cell: ({ row }) => (
      <IndeterminateCheckbox
        {...{
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          indeterminate: row.getIsSomeSelected(),
          onChange: row.getToggleSelectedHandler(),
        }}
      />
    ),
    size: 50,
  };

  const columns = React.useMemo(
    () => [dragHandleColumn, ...dynamicColumns],
    [dynamicColumns]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.userId,
    onRowSelectionChange: setRowSelection,
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

  const rerender = (count: number = 20) => setData(() => makeData(count));

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

  const removeRow = () => {
    const copyData = [...data];
    const selectedRowIds = Object.keys(table.getState().rowSelection);
    const newData = copyData.filter((c) => !selectedRowIds.includes(c.userId));
    setData(newData);
    table.toggleAllRowsSelected(false); // (선택 사항) 행 제거 후 모든 선택을 해제
  };

  const renderPopover = () => {
    if (!showPopover || !targetColumnId) return null;

    return (
      <div
        ref={popoverRef} // React가 해당 DOM 요소가 마운트되었을 때 popoverRef.current = 해당 DOM 노드를 넣어준다.
        className="absolute z-50 border rounded bg-white shadow p-2 text-sm"
        style={{
          top: popoverPos.top + 4,
          left: popoverPos.left,
        }}
      >
        <button
          onClick={() => {
            setDynamicColumns((prev) =>
              prev.filter((col) => col.id !== targetColumnId)
            );
            setShowPopover(false);
          }}
          className="text-red-600 hover:underline"
        >
          속성 삭제
        </button>
      </div>
    );
  };

  const handleHeaderClick = (e: React.MouseEvent, columnId: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopoverPos({ top: rect.bottom, left: rect.left });
    setTargetColumnId(columnId);
    setShowPopover(true);
  };

  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) // 팝오버 외부를 클릭했다는 뜻
      ) {
        setShowPopover(false);
      }
    };

    // 팝오버가 떠 있는 경우 mousedown 이벤트 리스너를 전역(document)에 추가
    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopover]);

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
          <button
            onClick={() => rerender()}
            className="border rounded-md p-1 bg-[#5da5ce] text-[#183347]"
          >
            Regenerate
          </button>
          <button
            onClick={() => rerender(100)}
            className="border rounded-md p-1 bg-[#ecbf42] text-[#402c1b]"
          >
            100 Data Regenerate
          </button>
          <button
            onClick={addDynamicColumn}
            className="border rounded-md p-1 bg-[#7bb781] text-[#1c3829]"
          >
            Add Column
          </button>
          <button
            onClick={addRow}
            className="border rounded-md p-1 bg-[#7bb781] text-[#1c3829]"
          >
            Add Row
          </button>
          <button
            onClick={removeRow}
            className="border rounded-md p-1 bg-[#f4ab9f] text-[#5d1715]"
          >
            Remove Row
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
                      <DraggableTableHeader
                        key={header.id}
                        header={header}
                        onHeaderClick={handleHeaderClick}
                      />
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
        {/* 데이터 목록 */}
        <pre>{JSON.stringify(data, null, 2)}</pre>
        {/* 체크된 데이터 Ids */}
        {/* <pre>{JSON.stringify(table.getState().rowSelection, null, 2)}</pre> */}
      </div>
      {renderPopover()}
    </DndContext>
  );
};
