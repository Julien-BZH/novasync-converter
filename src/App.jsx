import { FaFileExport, FaInfoCircle } from "react-icons/fa";
import React, { useState } from "react";
import Table from "./Table";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import './App.css';

const App = () => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [removedColumns, setRemovedColumns] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState({});
  const [fileName, setFileName] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [removedColumnsData, setRemovedColumnsData] = useState({});
  const [filteredData, setFilteredData] = useState([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      complete: (result) => {
        const parsedData = result.data;
        if (parsedData.length === 0) {
          alert("Le fichier CSV est vide !");
          return;
        }

        if (!parsedData.length || !parsedData[0]) {
          alert("Le fichier CSV est vide ou mal formaté !");
          return;
        }
        const headers = parsedData[0].map((header, index) => ({
          id: `col_${index}`,
          header: header || `Colonne_${index}`,
          accessorKey: header || `col_${index}`,
          originalIndex: index
        }));

        let rows = parsedData.slice(1).map((row) =>
          Object.fromEntries(headers.map((col, index) => [col.accessorKey, row[index]]))
        );

        const columnsToRemove = headers.filter((col, index) => {
          return rows.some(row => typeof row[col.accessorKey] === 'string' && row[col.accessorKey].startsWith('https'));
        });

        const visibleColumns = headers.filter(col => !columnsToRemove.some(removed => removed.id === col.id));
        const filteredRows = rows.map(row => {
          let newRow = {};
          visibleColumns.forEach(col => {
            newRow[col.accessorKey] = row[col.accessorKey];
          });
          return newRow;
        });

        setColumns(visibleColumns);
        setData(filteredRows);
        setRemovedColumns(columnsToRemove);
        setHiddenColumns({});

        const removedColumnsData = {};
        columnsToRemove.forEach(col => {
          removedColumnsData[col.id] = rows.map(row => row[col.accessorKey]);
        });
        setRemovedColumnsData(removedColumnsData);
      },
      header: false,
      skipEmptyLines: true,
    });
  };

  const handleFilteredDataChange = (filteredData) => {
    setFilteredData(filteredData);
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("Aucune donnée à exporter !");
      return;
    }

    const visibleColumns = columns.filter(col => !hiddenColumns[col.id] && !removedColumns.some(removed => removed.id === col.id));

    if (visibleColumns.length === 0) {
      alert("Aucune colonne visible à exporter !");
      return;
    }

    const orderedData = filteredData.map((row) => {
      let newRow = {};
      visibleColumns.forEach((col) => {
        newRow[col.header] = row[col.accessorKey];
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(orderedData, { header: visibleColumns.map(col => col.header) });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Données");

    const exportFileName = fileName ? `${fileName.replace(".csv", "")}_NOVASYNC.xlsx` : "export_NOVASYNC.xlsx";

    XLSX.writeFile(workbook, exportFileName);
  };

  return (
    <div className="container py-5 text-center">
  <h1 className="text-primary mb-4">Novasync - Converter</h1>
      <div className="d-flex justify-content-between align-items-center mb-3 position-relative">
        <input type="file" accept=".csv" onChange={handleFileUpload} className="form-control w-75" />
        <div className="fixed-buttons ms-3">
          <button className="btn btn-success me-2" onClick={exportToExcel}>
            <FaFileExport /> Exporter Excel
          </button>
          <button className="btn btn-info" onClick={() => setIsPopupOpen(true)}>
            <FaInfoCircle />
          </button>
        </div>
      </div>


      {data.length > 0 ? (
        <Table
          data={data}
          setData={setData}
          columns={columns}
          setColumns={setColumns}
          removedColumns={removedColumns}
          setRemovedColumns={setRemovedColumns}
          hiddenColumns={hiddenColumns}
          setHiddenColumns={setHiddenColumns}
          fileName={fileName}
          removedColumnsData={removedColumnsData}
          setRemovedColumnsData={setRemovedColumnsData}
          onFilteredDataChange={handleFilteredDataChange}
        />
      ) : (
        <p className="text-center text-muted">Aucun fichier chargé.</p>
      )}

      {isPopupOpen && (
        <div className="popup-note" onClick={() => setIsPopupOpen(false)}>
          <div className="popup-note-content" onClick={(e) => e.stopPropagation()}>
            <h2>Hello,</h2>
            <p>Cette application permet de convertir un fichier .csv extrait d'une table Novaflow en un fichier Excel.</p>
            <p>Vous pouvez filtrer, masquer et réorganiser les colonnes avant export.</p>
            <p>Les colonnes de formulaires contenant des liens (https://) sont automatiquement supprimées. Vous pouvez les restaurer dans le bloc des Colonnes Intactives</p>
            <p>Tout ce que vous voyez dans ce tableau dynamique sera exporté proprement en fichier excel .xlsx.</p>
            <p>bug ? julien.carnec@oplusm.fr - merci :) </p>
            <button className="btn btn-secondary" onClick={() => setIsPopupOpen(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
