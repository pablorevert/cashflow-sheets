var format = {
  firstRows: [
    {row:  1, background: '#000000', foreground: '#ffffff', fontSize: 11, "bold": true},
    {row:  2, background: '#808080', foreground: '#ffffff', fontSize: 11, "bold": false},
    {row:  3, background: '#808080', foreground: '#ffffff', fontSize: 10, "bold": false},
    {row:  4, background: '#000000', foreground: '#ffffff', fontSize: 11, "bold": true}
    ],
  categories: [
    {level:  1, background: '#101010', foreground: '#ffffff', fontSize: 11, "bold": true},
    {level:  2, background: '#303030', foreground: '#ffffff', fontSize: 11, "bold": true},
    {level:  3, background: '#606060', foreground: '#ffffff', fontSize: 10, "bold": true},
    {level:  4, background: '#a0a0a0', foreground: '#000000', fontSize: 10, "bold": false},
    {level:  5, background: '#a0a0a0', foreground: '#000000', fontSize: 9, "bold": true},
    {level:  6, background: '#b0b0b0', foreground: '#000000', fontSize: 8, "bold": true},
    {level:  7, background: '#c0c0c0', foreground: '#000000', fontSize:  8, "bold": true},
    {level:  8, background: '#d0d0d0', foreground: '#000000', fontSize:  8, "bold": true},
    {level:  9, background: '#e0e0d0', foreground: '#000000', fontSize:  8, "bold": true},
    {level: 10, background: '#f0f0f0', foreground: '#000000', fontSize:  8, "bold": true},
    {level: 11, background: '#fafafa', foreground: '#000000', fontSize:  8, "bold": true}
  ],
  normal: {background: '#ffffff', foreground: '#000000', fontSize: 8, "bold": false},
}

function buildNewCashflowSheet(sheetIndex, name, scenario, group) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  //Inicializo la hoja
  var sheet = spreadsheet.getSheetByName(name);
  if (sheet != null)
     spreadsheet.deleteSheet(sheet);
  
  spreadsheet.insertSheet(sheetIndex);
  sheet = spreadsheet.getActiveSheet().setName(name);
  
  //Freezo la primer fila y columna
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(1);
  sheet.setColumnWidth(1, 319);
  
  //Armo los titulos de las columnas
  var colTitles = scenario.buckets.map(b => b.name);
  sheet.getRange(1,2,1,colTitles.length).setValues([colTitles]);

  //Armo los saldos
  sheet.getRange(1,1,4).setValues([["Período"],["Saldo Real"],["Diff"],["Saldo Cashflow"]]);
  var todayIndex = scenario.buckets.findIndex(b => b.name.startsWith("Hoy"));
  var a = scenario.buckets.slice(0, todayIndex);
  var balances = scenario.buckets.slice(0, todayIndex).map(b => { var b = scenario.balances[b.to]; return b != null ? b.total : null; });
  sheet.getRange(2,2,1,balances.length).setValues([balances]);
  sheet.getRange(4,3,1,colTitles.length-1).setFormula('=IF(B2<>0;B2+C5;B4+C5)');
  sheet.getRange(3,3,1,colTitles.length-1).setFormula('=IF(C2<>0;C2-C4;"")');
 
  //Reelleno el contenido
  var values = scenario.asMatrix(x => x.ARS.quantity);
  sheet.getRange(5,1,values.length - 1, values[0].length).setValues(values.slice(1));
  sheet.getRange(2,2,values.length+2, values[0].length-1).setNumberFormat('#,##0;[Red] (#,##0); -');
  //Limpio los valores de Anterior
  sheet.getRange(5,2,values.length - 1, 1).setValue(0);

  //Pinto las filas
  var cols = values[0].length + 1;
  formatRow(sheet, 1, 1, cols, format.firstRows[0]);
  formatRow(sheet, 2, 1, cols, format.firstRows[1]);
  formatRow(sheet, 3, 1, cols, format.firstRows[2]);
  formatRow(sheet, 4, 1, cols, format.firstRows[3]);
  
  for(var i = scenario.categories.length - 1; i >= 0; i--)
  {
    var c = scenario.categories[i];
    //Formateo columna y armo grupos
    if (c.childrenStart != null)
    {
      formatRow(sheet, c.index + 4, 1, cols, format.categories[c.level]);
      if (group) {
        var range = (c.childrenStart + 4) + ":" + (c.childrenEnd + 4);
        sheet.getRange(range).shiftRowGroupDepth(1);
        if (c.level > 2)
          sheet.getRowGroup(c.index + 4, 1).collapse();
      }
    }
    else
       formatRow(sheet, c.index + 4, 1, cols, format.normal);
    //Agrego los comments
    for(var key of c.comments.keys())
    {
      var comment = c.comments.get(key);
      var names = scenario.buckets.map(x => x.name);
      var col = names.indexOf(key) + 2;
      if (col != 0)
         sheet.getRange(c.index + 4, col).setNote(comment);
    }
  }
}

function buildCashflowSheet(sheetIndex, name, scenario, group) {

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  //Inicializo la hoja
  var sheet = spreadsheet.getSheetByName(name);
  if (sheet != null)
     spreadsheet.deleteSheet(sheet);
  
  spreadsheet.insertSheet(sheetIndex);
  sheet = spreadsheet.getActiveSheet().setName(name);
  
  //Freezo la primer fila y columna
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(1);
  sheet.setColumnWidth(1, 319);
  
  //Reelleno el contenido
  var values = scenario.asMatrix(x => x.ARS.quantity);
  sheet.getRange(5,1,values.length - 1, values[0].length).setValues(values.slice(1));
  sheet.getRange(2,2,values.length+2, values[0].length-1).setNumberFormat('#,##0;[Red] (#,##0); -');
  //Limpio los valores de Anterior
  sheet.getRange(5,2,values.length - 1, 1).setValue(0);
  
  //Armo los titulos de las columnas
  var colTitles = scenario.buckets.map(b => b.name);
  sheet.getRange(1,2,1,colTitles.length).setValues([colTitles]);

  sheet.getRange(1,1,4).setValues([["Período"],["Saldo Real"],["Diff"],["Saldo Cashflow"]]);
  sheet.getRange(4,2).setValue(1200000);
  sheet.getRange(4,3,1,values[0].length-2).setFormula('=B4+C5');
  sheet.getRange(3,3,1,values[0].length-2).setFormula('=IF(C2<>0;C2-C4;"")');

  //Pinto las filas
  var cols = values[0].length + 1;
  formatRow(sheet, 1, 1, cols, format.firstRows[0]);
  formatRow(sheet, 2, 1, cols, format.firstRows[1]);
  formatRow(sheet, 3, 1, cols, format.firstRows[2]);
  formatRow(sheet, 4, 1, cols, format.firstRows[3]);
  
  for(var i = scenario.categories.length - 1; i >= 0; i--)
  {
    var c = scenario.categories[i];
    //Formateo columna y armo grupos
    if (c.childrenStart != null)
    {
      formatRow(sheet, c.index + 4, 1, cols, format.categories[c.level]);
      if (group) {
        var range = (c.childrenStart + 4) + ":" + (c.childrenEnd + 4);
        sheet.getRange(range).shiftRowGroupDepth(1);
        if (c.level > 2)
          sheet.getRowGroup(c.index + 4, 1).collapse();
      }
    }
    else
       formatRow(sheet, c.index + 4, 1, cols, format.normal);
    //Agrego los comments
    for(var key of c.comments.keys())
    {
      var comment = c.comments.get(key);
      var names = scenario.buckets.map(x => x.name);
      var col = names.indexOf(key) + 2;
      if (col != 0)
         sheet.getRange(c.index + 4, col).setNote(comment);
    }
  }
  
}

function formatRow(sheet, row, start, columns, format) {
  sheet.getRange(row,start,1,columns)
            .setFontWeight(format.bold ? 'bold' : 'normal')
            .setBackground(format.background)
            .setFontColor(format.foreground)
            .setFontSize(format.fontSize);
}

function eventsSheetHasEvents(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  return sheet.getMaxRows() > 3;
}

function eventsSheetClear(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.setFrozenRows(0);
  var rowsToDelete = sheet.getMaxRows() - 3;
  if (rowsToDelete > 0)
    sheet.deleteRows(4, rowsToDelete);
}

function eventsSheetBuild(sheetName, events) {

  logStart("events-build-sheet", `Start sheet ${sheetName} build with ${events.length.toLocaleString("es-AR")} events`);
           
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  //Borro la info vieja
  sheet.setFrozenRows(0);
  var rowsToDelete = sheet.getMaxRows() - 3;
  if (rowsToDelete > 0)
    sheet.deleteRows(4, rowsToDelete);
  
  logStep("events-build-sheet", "Old rows deleted");
  
  var newRows = events.length;
  
  if (newRows > 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), newRows);

    logStep("events-build-sheet", "New rows inserted");

    for(var i = 0; i < events.length; i++)
      events[i].write(sheet, i + 4, 1);

    logStep("events-build-sheet", "Data writed");

    Event.formatRows(sheet, 4, newRows);

    logStep("events-build-sheet", "Format made");

    sheet.setFrozenRows(3);  
  }

  logEnd("events-build-sheet", "Process finalized");

}


function testWrite() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("Cashflow");

  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).activate();
  spreadsheet.getActiveRangeList().clear({contentsOnly: true, skipFilteredRows: true});

  sheet.getRange(1,1,2,2).setValues([["A", "B"], ["C", "D"]]);
}