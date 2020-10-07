function Prueba() {
  var spreadsheet = SpreadsheetApp.getActive();
  var sheet = spreadsheet.getActiveSheet();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).activate();
  spreadsheet.getActiveRangeList().clear({contentsOnly: true, skipFilteredRows: true});
  spreadsheet.getActiveSheet().setFrozenRows(1);
  spreadsheet.getActiveSheet().setFrozenColumns(1);
};

function Prueba2() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('B1').activate();
  spreadsheet.getCurrentCell().setFormula('=A1+B2');
  spreadsheet.getRange('B2').activate();
};

function Hoja() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('1:33').activate()
  .shiftRowGroupDepth(-1)
  .shiftRowGroupDepth(-1)
  .shiftRowGroupDepth(-1);
  spreadsheet.getRange('B15').activate();
  spreadsheet.deleteActiveSheet();
  spreadsheet.insertSheet(1);
  spreadsheet.getActiveSheet().setName('Cashflow');
  spreadsheet.moveActiveSheet(1);
};

function Format2() {
  var spreadsheet = SpreadsheetApp.getActive();
  var sheet = spreadsheet.getActiveSheet();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).activate();
  spreadsheet.getActiveSheet().autoResizeColumns(1, 26);
  spreadsheet.getActiveSheet().autoResizeRows(1, 1000);
  spreadsheet.getRange('42:1000').activate();
  spreadsheet.getActiveSheet().deleteRows(spreadsheet.getActiveRange().getRow(), spreadsheet.getActiveRange().getNumRows());
  spreadsheet.getRange('Z:Z').activate();
  spreadsheet.getActiveSheet().deleteColumns(spreadsheet.getActiveRange().getColumn(), spreadsheet.getActiveRange().getNumColumns());
};

function Collapse() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('A9').activate();
  spreadsheet.getActiveSheet().getRowGroup(8, 4).collapse();
};

function Collapse2() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('14:14').activate();
  spreadsheet.getActiveSheet().getRowGroup(13, 4).collapse();
};

function Collapse3() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('14:14').activate();
  spreadsheet.getActiveSheet().getRowGroup(8, 4).collapse();
  spreadsheet.getActiveSheet().getRowGroup(13, 4).collapse();
  spreadsheet.getActiveSheet().getRowGroup(7, 3).collapse();
  spreadsheet.getActiveSheet().getRowGroup(6, 2).collapse();
  spreadsheet.getActiveSheet().getRowGroup(5, 1).collapse();
};

function Comment() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('X9').activate();
  spreadsheet.getActiveSheet().setColumnWidth(1, 319);
};

function Collapse1() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('K20').activate();
};

function FormatRow() {
};

function PartialFontColor() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('E10').activate();
  spreadsheet.getCurrentCell().setRichTextValue(SpreadsheetApp.newRichTextValue()
  .setText('Mantenimiento | Francisco Villa')
  .setTextStyle(0, 16, SpreadsheetApp.newTextStyle()
  .setForegroundColor('#6aa84f')
  .build())
  .build());
};