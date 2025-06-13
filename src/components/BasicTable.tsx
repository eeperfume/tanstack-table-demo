import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
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
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => onHeaderClick(e, id)} // 'id' (col-컬럼ID)를 넘겨주도록 변경
        >
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

  // 첫 번째 팝오버 (속성 삭제, 정렬 버튼)
  const [showPopover, setShowPopover] = React.useState(false);
  const [popoverPos, setPopoverPos] = React.useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [targetColumnId, setTargetColumnId] = React.useState<string | null>(
    null
  );

  // 두 번째 팝오버 (정렬 옵션)
  const [showSortPopover, setShowSortPopover] = React.useState(false);
  const [sortPopoverPos, setSortPopoverPos] = React.useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [sortColumnId, setSortColumnId] = React.useState<string | null>(null);

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
    // initialState: {
    //   columnOrder: ["drag-handle", "status", "visits"],
    // },
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
    useSensor(KeyboardSensor),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
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
        className="absolute z-50 border rounded bg-white shadow p-2 text-sm flex flex-col gap-1"
        style={{
          top: popoverPos.top + 4,
          left: popoverPos.left,
        }}
      >
        <button
          onClick={() => {
            setDynamicColumns((prev) =>
              prev.filter((col) => `col-${col.id}` !== targetColumnId)
            );
            setShowPopover(false);
            setShowSortPopover(false); // 팝오버 닫을 때 정렬 팝오버도 닫기
          }}
          className="text-red-600 hover:underline text-left"
        >
          속성 삭제
        </button>
        <button
          onMouseEnter={(e) => handleSortButtonHover(e)}
          className="text-blue-600 hover:underline text-left"
        >
          정렬
        </button>
      </div>
    );
  };

  const renderSortPopover = (): React.JSX.Element | null => {
    if (!showSortPopover || !sortColumnId) return null;

    return (
      <div
        ref={sortPopoverRef}
        className="absolute z-50 border rounded bg-white shadow p-2 text-sm flex flex-col gap-1"
        style={{
          top: sortPopoverPos.top,
          left: sortPopoverPos.left,
        }}
      >
        <button
          onClick={() => {
            handleSort(sortColumnId, "asc");
            setShowPopover(false); // 정렬 후 첫 번째 팝오버도 닫기
          }}
          className="hover:bg-gray-100 p-1 rounded text-left"
        >
          오름차순
        </button>
        <button
          onClick={() => {
            handleSort(sortColumnId, "desc");
            setShowPopover(false); // 정렬 후 첫 번째 팝오버도 닫기
          }}
          className="hover:bg-gray-100 p-1 rounded text-left"
        >
          내림차순
        </button>
      </div>
    );
  };

  const handleHeaderClick = (e: React.MouseEvent, columnId: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopoverPos({ top: rect.bottom, left: rect.left });
    setTargetColumnId(columnId);
    setShowPopover(true);
    setShowSortPopover(false); // 헤더 클릭 시 정렬 팝오버는 숨기기
  };

  const handleSortButtonHover = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setSortPopoverPos({ top: rect.top, left: rect.right + 4 });
    setSortColumnId(targetColumnId); // 정렬할 컬럼 ID 설정
    setShowSortPopover(true);
  };

  const handleSort = (columnId: string, direction: "asc" | "desc") => {
    // columnId에서 'col-' 접두사를 제거하여 실제 컬럼 ID를 얻습니다.
    const actualColumnId = columnId.replace("col-", "");

    // dynamicColumns에서 accessorKey가 있는 컬럼을 찾습니다.
    const column = dynamicColumns.find(
      (col) => col.id === actualColumnId && "accessorKey" in col
    ) as ColumnDef<Person> & { accessorKey: keyof Person }; // 타입 단언 추가

    if (!column || !column.accessorKey) {
      console.warn(
        "Invalid column or accessorKey not found for sorting:",
        columnId
      );
      return;
    }

    const accessorKey = column.accessorKey;

    const sortedData = [...data].sort((a, b) => {
      const valA = a[accessorKey];
      const valB = b[accessorKey];

      // undefined나 null 값에 대한 처리 (선택 사항)
      // 정렬 시 undefined/null 값을 어떻게 처리할지 결정해야 한다.
      // 여기서는 null/undefined를 가장 마지막으로 보내기로 한다.
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "string" && typeof valB === "string") {
        return direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else if (typeof valA === "number" && typeof valB === "number") {
        return direction === "asc" ? valA - valB : valB - valA;
      } else if (typeof valA === "boolean" && typeof valB === "boolean") {
        // boolean 값 정렬 (예: true가 false보다 큼)
        return direction === "asc"
          ? valA === valB
            ? 0
            : valA
            ? 1
            : -1
          : valA === valB
          ? 0
          : valA
          ? -1
          : 1;
      }
      // 다른 타입의 값에 대한 기본 정렬 (비교할 수 없는 경우 0 반환)
      return 0;
    });

    setData(sortedData);
    setShowSortPopover(false); // 정렬 후 두 번째 팝오버 닫기
  };

  const popoverRef = React.useRef<HTMLDivElement>(null);
  const sortPopoverRef = React.useRef<HTMLDivElement>(null);

  // 팝오버 외부 클릭 감지
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // 팝오버가 모두 닫혀있다면 더 이상 처리할 필요 없음
      if (!showPopover && !showSortPopover) {
        return;
      }

      const clickedElement = e.target as Node;

      // 첫 번째 팝오버의 외부를 클릭했고, 클릭된 요소가 두 번째 팝오버 내부에 있지 않은 경우
      const isClickedOutsideFirstPopover =
        popoverRef.current && !popoverRef.current.contains(clickedElement);

      // 두 번째 팝오버의 외부를 클릭했고, 클릭된 요소가 첫 번째 팝오버 내부에 있지 않은 경우
      const isClickedOutsideSecondPopover =
        sortPopoverRef.current &&
        !sortPopoverRef.current.contains(clickedElement);

      // 시나리오 1: 두 번째 팝오버가 열려있는 경우
      if (showSortPopover) {
        // 클릭된 위치가 두 번째 팝오버 외부인 경우 (정렬 버튼 클릭은 제외)
        if (isClickedOutsideSecondPopover) {
          // 클릭된 위치가 첫 번째 팝오버의 "정렬" 버튼이 아닌 경우에만 닫기
          // 즉, "정렬" 버튼을 클릭해서 두 번째 팝오버가 열렸고, 그 클릭이 외부 클릭으로 인식되면 안 되므로
          // 첫 번째 팝오버 안에 있지만 두 번째 팝오버는 아닌 영역을 클릭했을 때도 닫히도록 처리
          if (
            popoverRef.current &&
            popoverRef.current.contains(clickedElement) &&
            !sortPopoverRef.current?.contains(clickedElement) // 이 조건은 필요 없을 수 있으나, 안전을 위해
          ) {
            // 첫 번째 팝오버 내에서 "정렬" 버튼을 클릭해서 두 번째 팝오버가 열렸을 때
            // 해당 클릭은 외부 클릭으로 간주하지 않으므로 아무것도 하지 않음.
            // 하지만 그 외의 첫 번째 팝오버 영역을 클릭하면 닫히게 할 것.
            // 여기서 `return`을 하면 첫 번째 팝오버의 다른 부분을 클릭해도 닫히지 않게 됨.
            // 원하는 동작은 두 번째 팝오버가 열려 있을 때, 다른 곳을 클릭하면 둘 다 닫히는 것이므로
            // 이 조건 대신 아래의 통합된 닫기 로직을 사용.
          } else {
            // 두 번째 팝오버 외부를 클릭한 경우, 두 팝오버 모두 닫기
            setShowSortPopover(false);
            setShowPopover(false);
          }
        }
      }
      // 시나리오 2: 첫 번째 팝오버만 열려있는 경우 (두 번째 팝오버는 닫혀있음)
      else if (showPopover) {
        // 첫 번째 팝오버의 외부를 클릭한 경우
        if (isClickedOutsideFirstPopover) {
          setShowPopover(false);
        }
      }
    };

    // 팝오버가 하나라도 열려 있을 때만 이벤트 리스너 등록
    if (showPopover || showSortPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopover, showSortPopover]); // showPopover, showSortPopover 상태 변화에 따라 effect 재실행

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
      {renderSortPopover()}
    </DndContext>
  );
};
