import React, { useState, useMemo, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "react-bootstrap";
import { FaEye, FaEyeSlash, FaArrowsAltH, FaTimes, FaPlus } from "react-icons/fa";
import * as XLSX from "xlsx";
import './App.css';

const DraggableColumnHeader = ({ header, toggleColumnVisibility, removeColumn, isHidden, hiddenColumns, handleFilterChange, filters, uniqueValues }) => {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: header.column.id });

  return (
    <th ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isHidden ? 0.4 : 1,
      backgroundColor: isHidden ? "#ccc" : "inherit" }}>
      <div className="d-flex flex-column align-items-center">
        <span {...attributes} {...listeners} className="cursor-move"><FaArrowsAltH /></span>
        <span className="fw-bold text-center">{header.column.columnDef.header}</span>
        <select className="form-select form-select-sm mt-2" value={filters[header.column.id] || ""} onChange={(e) => handleFilterChange(e, header.column.id)}>
          <option value="">Toutes</option>
          {uniqueValues.map((value, index) => <option key={index} value={value}>{value}</option>)}
        </select>
        <div className="d-flex mt-2">
          <Button variant="light" size="sm" onClick={() => toggleColumnVisibility(header.column.id)}>
            {hiddenColumns && hiddenColumns[header.column.id] ? <FaEyeSlash /> : <FaEye />}
          </Button>
          <Button variant="danger" size="sm" className="ms-1" onClick={() => removeColumn(header.column.id)}><FaTimes /></Button>
        </div>
      </div>
    </th>
  );
};

const Table = ({ data, setData, columns, setColumns, removedColumns, setRemovedColumns, hiddenColumns, setHiddenColumns, fileName, removedColumnsData, setRemovedColumnsData, onFilteredDataChange }) => {
  const [filters, setFilters] = useState({});
  const [removedContainerHeight, setRemovedContainerHeight] = useState(0);
  const [uniqueColumnValues, setUniqueColumnValues] = useState({});

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setColumns((prevColumns) => {
      const oldIndex = prevColumns.findIndex((col) => col.id === active.id);
      const newIndex = prevColumns.findIndex((col) => col.id === over.id);

      return arrayMove(prevColumns, oldIndex, newIndex);
    });
  };

  useEffect(() => {
    if (data.length > 0) {
      const newUniqueValues = {};

      columns.forEach((col) => {
        const colValues = data.map(row => row[col.accessorKey]);
        newUniqueValues[col.id] = [...new Set(colValues)].filter(value => value !== undefined && value !== null);
      });

      setUniqueColumnValues(newUniqueValues);
    }
  }, [data, columns]);

  const removeColumn = (columnId) => {
    const columnToRemove = columns.find(col => col.id === columnId);
    if (!columnToRemove) return;

    const columnData = data.map(row => row[columnToRemove.accessorKey]);
    setRemovedColumnsData(prev => ({ ...prev, [columnId]: columnData }));

    setRemovedColumns((prevRemoved) => [
      ...prevRemoved,
      { ...columnToRemove, originalIndex: columns.findIndex(col => col.id === columnId) }
    ]);

    setColumns((prevColumns) => prevColumns.filter(col => col.id !== columnId));
  };

  const toggleColumnVisibility = (columnId) => {
    setHiddenColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const handleFilterChange = (event, columnId) => {
    const value = event.target.value;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [columnId]: value || undefined,
    }));
  };

  const restoreColumn = (columnId) => {
    const columnToRestore = removedColumns.find(col => col.id === columnId);
    if (!columnToRestore) return;

    setRemovedColumns(removedColumns.filter(col => col.id !== columnId));

    setColumns((prevColumns) => {
      const updatedColumns = [...prevColumns];
      const originalIndex = columnToRestore.originalIndex !== undefined ? columnToRestore.originalIndex : updatedColumns.length;
      updatedColumns.splice(originalIndex, 0, columnToRestore);

      return updatedColumns;
    });

    setData((prevData) => {
      const columnData = removedColumnsData[columnId];
      return prevData.map((row, index) => ({
        ...row,
        [columnToRestore.accessorKey]: columnData[index],
      }));
    });

    setRemovedColumnsData(prev => {
      const { [columnId]: _, ...rest } = prev;
      return rest;
    });
  };

  const restoreAllColumns = () => {
    setRemovedColumns([]);

    setColumns((prevColumns) => {
      const allColumns = [...prevColumns, ...removedColumns];
      const sortedColumns = allColumns.sort((a, b) => a.originalIndex - b.originalIndex);
      return sortedColumns;
    });

    setData((prevData) => {
      const newData = prevData.map(row => ({ ...row }));
      removedColumns.forEach(col => {
        const columnData = removedColumnsData[col.id];
        columnData.forEach((value, index) => {
          newData[index][col.accessorKey] = value;
        });
      });
      return newData;
    });

    setRemovedColumnsData({});
  };

  useEffect(() => {
    const removedColumnsContainer = document.querySelector(".fixed-removed-columns-container");

    if (!removedColumnsContainer) return;

    if (removedColumns.length > 0) {
      removedColumnsContainer.style.display = "flex";
      removedColumnsContainer.style.opacity = "1";
      removedColumnsContainer.style.visibility = "visible";

      setTimeout(() => {
        const newHeight = removedColumnsContainer.getBoundingClientRect().height;
        setRemovedContainerHeight(newHeight);
        document.documentElement.style.setProperty("--removed-container-height", `${newHeight}px`);
      }, 50);
    } else {
      removedColumnsContainer.style.opacity = "0";
      removedColumnsContainer.style.visibility = "hidden";
      setRemovedContainerHeight(0);
      document.documentElement.style.setProperty("--removed-container-height", `0px`);
    }
  }, [removedColumns, columns]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return columns.every(column => {
        const filterValue = filters[column.id];
        if (!filterValue) return true;
        return row[column.accessorKey] === filterValue;
      });
    });
  }, [data, columns, filters]);

  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData);
    }
  }, [filteredData, onFilteredDataChange]);

  return (
    <div className="table-wrapper">
      <div className="fixed-removed-columns-container">
        <div className="header">
          <FaTimes className="icon left-icon" />
          <span className="title fw-bold">Colonnes Inactives</span>
          <FaTimes className="icon right-icon" />
        </div>
        {removedColumns.length > 0 ? (
          removedColumns.map((col) => (
            <Button
              key={col.id}
              variant="secondary"
              size="sm"
              className="w-100 mb-2"
              onClick={() => restoreColumn(col.id)}
            >
              <FaPlus /> {col.header}
            </Button>
          ))
        ) : (
          <span className="text-muted">Aucune colonne supprimée</span>
        )}
        {removedColumns.length > 0 ? (
          <Button
            variant="success"
            size="sm"
            className="restore-all-button"
            onClick={restoreAllColumns}
          >
            <FaPlus /> Restaure all
          </Button>
        ) : (
          <span className="text-muted text-center">Toutes les colonnes sont actives.</span>
        )}

      </div>

      <div className="table-container">
        {columns.length > 0 ? (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.filter(col => !hiddenColumns[col.id]).map(col => col.id)}>
              <table className="table table-bordered table-hover table-sm table-striped">
                <thead className="table-dark">
                  <tr>
                    {columns.map((header) => (
                      <DraggableColumnHeader
                        key={header.id}
                        header={{ column: { id: header.id, columnDef: { header: header.header } } }}
                        toggleColumnVisibility={() => toggleColumnVisibility(header.id)}
                        removeColumn={() => removeColumn(header.id)}
                        isHidden={!!hiddenColumns[header.id]}
                        hiddenColumns={hiddenColumns}
                        handleFilterChange={handleFilterChange}
                        filters={filters}
                        uniqueValues={uniqueColumnValues[header.id] || []}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          title={row[column.accessorKey]}
                          className="truncate-cell"
                          style={{
                            visibility: hiddenColumns[column.id] ? "hidden" : "visible",
                            width: hiddenColumns[column.id] ? "0px" : "auto",
                            padding: hiddenColumns[column.id] ? "0px" : "inherit",
                          }}
                        >
                          {row[column.accessorKey]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-center text-muted">Aucune donnée disponible</p>
        )}
      </div>
    </div>
  );
};

export default Table;
