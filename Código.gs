var _ = LodashGS.load();
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Cashflow')
      .addItem('🖌 Actualizar Cashflow Completo c/agrupaciones (lento)', 'updateCashflowAllFull')
      .addItem('🖋 Actualizar Cashflow Completo s/agrupamientos (rápido)', 'updateCashflowAllFast')
      .addSubMenu(ui.createMenu('…… Otras actualizaciones')
                  .addItem('🖌 Cashflow Confirmados c/agrupaciones', 'updateCashflowConfirmedFull')
                  .addItem('🖌 Cashflow Estimado c/agrupaciones', 'updateCashflowProbableFull')
                  .addItem('🖌 Cashflow Simulado c/agrupaciones', 'updateCashflowSimulatedFull')
                  .addSeparator()
                  .addItem('🖋 Cashflow Confirmados s/agrupaciones', 'updateCashflowConfirmedFast')
                  .addItem('🖋 Cashflow Estimado s/agrupaciones', 'updateCashflowProbableFast')
                  .addItem('🖋 Cashflow Simulado s/agrupaciones', 'updateCashflowSimulatedFast')
                  )
      .addSeparator()
      .addItem('📥 Crear Pendientes del mes', 'createEvents')
      .addItem('♻️ Actualizar Movimientos', 'updateMovements')
      .addItem('📤 Pasar Mes Anterior a Histórico', 'archiveEvents')
      .addSeparator()
      .addSubMenu(ui.createMenu('📓 Agregar Evento Pendiente')
                  .addItem('👍  Ingreso', 'createSell')
                  .addItem('👎 Egreso', 'createBuy')
                  )
      .addItem('💰 Agregar Saldo', 'createBalance')
      /*
      .addSubMenu(ui.createMenu('Procesar')
                  .addItem('Generar pendientes de facturación', 'buildPendingInvoices')
                  .addItem('Procesar facturados', 'processInvoiced')
                  .addItem('Procesar liquidados', 'processSettled')
                  )
                  */
      //.addSeparator()
      //.addSubMenu(ui.createMenu('Sub-menu')
      //    .addItem('Second item', 'menuItem2'))
      .addToUi();

}

function updateCashflowAllFast() {
  return updateCashflow(false);
}

function updateCashflowConfirmedFast() {
  return updateCashflow(false, 0);
}

function updateCashflowProbableFast() {
  return updateCashflow(false, 1);
}

function updateCashflowSimulatedFast() {
  return updateCashflow(false, 2);
}

function updateCashflowAllFull() {
  return updateCashflow(true);
}

function updateCashflowConfirmedFull() {
  return updateCashflow(true, 0);
}

function updateCashflowProbableFull() {
  return updateCashflow(true, 1);
}

function updateCashflowSimulatedFull() {
  return updateCashflow(true, 2);
}

function createRow(sheetName) {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var row = sheet.getMaxRows() + 1;
  sheet.insertRowAfter(row-1);
  return {sheet: sheet, row: row};
}

function newId(numerator) {
  var id = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Params").getRange(numerator,2).getValue();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Params").getRange(numerator,2).setValue(id+1);
  return id;
}

function setCursor(sheet, row, col) {
  sheet.activate();
  sheet.getRange(row, col).activate();
}

function fillRow(sheet, row, data) {
  for(var i = 0; i < data.length; i++) {
    var field = data[i];
    var col = i + 1;
    var range = sheet.getRange(row, col);
    
    if (field.value != null)
      range.setValue(field.value);
    else if (field.formula != null)
      range.setFormula(field.formula);
    else if (field.formulaR1C1 != null)
      range.setFormulaR1C1(field.formulaR1C1);
    
    if (field.foreground != null)
      range.setFontColor(field.foreground);
    
    if (field.background != null)
      range.setBackground(field.background);
    
    if (field.numberFormat != null)
      range.setNumberFormat(field.numberFormat);
    
    if (field.align != null)
      range.setHorizontalAlignment(field.aling);
    
    if (field.note != null)
      range.setNote(field.note);
  }
}

var NUMERATORS = {
  MANUAL: 3
}

function createBalance() {
  var ret = createRow("Saldos");
  var sheet = ret.sheet;
  var row = ret.row;
  var id = newId(NUMERATORS.MANUAL);
  
  fillRow(sheet, row, [
    {/*date*/ value: addDays(getToday(),-1)},
    {/*credicoop_cc*/ value: 0, numberFormat: Event.FORMATS.number_format},
    {/*galicia_cc*/ value: 0, numberFormat: Event.FORMATS.number_format},
    {/*patagonia_cc*/ value: 0, numberFormat: Event.FORMATS.number_format},
    {/*credicoop_fci*/ value: 0, numberFormat: Event.FORMATS.number_format},
    {/*galicia_fci*/ value: 0, numberFormat: Event.FORMATS.number_format},
    {/*total*/ formula: `SUM(B${row}:F${row})`, numberFormat: Event.FORMATS.number_format}
  ]);
  
  sheet.setFrozenRows(2);
  setCursor(sheet, row, 1);

}

function createBuy() {
  var ret = createRow("Pendientes");
  var sheet = ret.sheet;
  var row = ret.row;
  var id = newId(NUMERATORS.MANUAL);
  
  fillRow(sheet, row, [
    {/*id*/ value:`MAN${id.toString().padStart(6,"0")}` },
    {/*type*/ value: Event.TYPES.EXPENSE},
    {/*cat1*/ value: "Egresos"},
    {/*cat2*/ value: ""},
    {/*restCategories*/ value: "" },
    {/*detail*/ },
    {/*currency*/ value: "ARS"},
    {/*total*/},
    {/*invoice_date*/ value: getToday()},
    {/*settle_date*/ value: getToday()},
    {/*state*/ value: Event.STATES.PENDING},
    {/*paymentDelay*/ },
    {/*initialInvoiceDate*/ },
    {/*initialSettleDate*/ },
    {/*amount*/ formula: `H${row}-SUM(P${row}:W${row})`},
    {/*vat*/ value: 0},
    {/*fee*/ value: 0},
    {/*fee_vat*/ value: 0},
    {/*ret_per_currency*/ formula: `G${row}`},
    {/*ret_per_vat*/ value: 0},
    {/*ret_per_iibb*/ value: 0},
    {/*ret_per_wht*/ value: 0},
    {/*ret_per_suss*/ value: 0}
  ]);
  
  Event.formatRows(sheet, row, 1);
  sheet.setFrozenRows(3);
  setCursor(sheet, row, 1);
}

function createSell() {
  var ret = createRow("Pendientes");
  var sheet = ret.sheet;
  var row = ret.row;
  var id = newId(NUMERATORS.MANUAL);
  
  fillRow(sheet, row, [
    {/*id*/ value:`MAN${id.toString().padStart(6,"0")}` },
    {/*type*/ value: Event.TYPES.SELL},
    {/*cat1*/ value: "Ingresos"},
    {/*cat2*/ value: ""},
    {/*restCategories*/ value: "" },
    {/*detail*/ },
    {/*currency*/ value: "ARS"},
    {/*total*/},
    {/*invoice_date*/ value: getToday()},
    {/*settle_date*/ formula: `I${row}+L${row}+7`},
    {/*state*/ value: Event.STATES.PENDING},
    {/*paymentDelay*/ value: 30},
    {/*initialInvoiceDate*/ },
    {/*initialSettleDate*/ },
    {/*amount*/ formula: `H${row}-SUM(P${row}:W${row})`},
    {/*vat*/ value: 0},
    {/*fee*/ value: 0},
    {/*fee_vat*/ value: 0},
    {/*ret_per_currency*/ formula: `G${row}`},
    {/*ret_per_vat*/ value: 0},
    {/*ret_per_iibb*/ value: 0},
    {/*ret_per_wht*/ value: 0},
    {/*ret_per_suss*/ value: 0}
  ]);
  
  Event.formatRows(sheet, row, 1);
  sheet.setFrozenRows(3);
  setCursor(sheet, row, 1);
}

function treatResult(result, events, errors) {
  result.items.forEach(e => events.push(e));
  result.errors.forEach(e => errors.push(e));
}



var config = {};

function initEnvironment() {
  config.BUCKETS_MANAGER = new buildBucketManager(2,1,2, getToday());
}

function buildBucketManager(weeks, months, years, today) {

  if (today == null)
    today = getToday(); //Hoy
  
  var buckets = new BucketManager();
  
  //Último del mes anterior
  var start = addDays(today, -today.getDate());
  //Lunes pasado
  var lastMonday = addDays(today, today.getDay() == 0 ? -6 : -today.getDay() + 1);
  if (lastMonday.getTime() == today)
    lastMonday = addDays(lastMonday, - 1);
  //Primera Semana
  var weekStart = addDays(lastMonday, weeks * 7);
  //Próximo mes
  var monthStart = addMonths(addDays(weekStart, -weekStart.getDate() + 1), 1);
  //Último mes
  var monthEnd = addMonths(monthStart, months);
  //Cierre de año
  var nextYear = addMonths(monthEnd, 12 - monthEnd.getMonth());
  //Último año
  var lastYear = addDays(addMonths(nextYear, 12 * years), -1); 
  
  buckets.add(new Bucket(null, start, "Anterior"));
  if (addDays(start,1).getTime() <= addDays(today,-1).getTime())
    buckets.add(new Bucket(addDays(start,1), addDays(today, -1), "Este mes"));

  var days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"];
  
  for(var d = lastMonday; d.getTime() < today.getTime(); d = addDays(d, 1)) {
    buckets.add(new Bucket(d, d, days[d.getDay()] + " " + d.getDate()));
  }

  buckets.add(new Bucket(today, addDays(today, 0.25), "Hoy Liq."));
  buckets.add(new Bucket(addDays(today, 0.25), addDays(today, 0.99), "Hoy Pend."));

  for(var d = addDays(today, 1); d.getTime() < weekStart.getTime(); d = addDays(d, 1)) {
    buckets.add(new Bucket(d, d, (d.getDate() != 1 ? `${days[d.getDay()] + " " + d.getDate()}` : `${getMonthName(d)}\n${days[d.getDay()] + " " + d.getDate()}`)));
  }

  var lastYearLastDay = new Date(1900 + today.getYear()-1, 11, 31);
  var diff = dateDiff(lastYearLastDay, weekStart, DATE_UNITS.days) - 1;
  var i = Math.ceil( diff / 7.0) + 1;
  for(var d = weekStart; d <= addDays(monthStart, -1); d = addDays(d, 7)) {
    var to = addDays(d, 6);
    if (to.getTime() >= addDays(monthStart, -1))
       to = addDays(monthStart, -1);
    buckets.add(new Bucket(d, to, `Semana ${i++}`));
  }

  for(var d = monthStart; d.getTime() < monthEnd.getTime(); d = addMonths(d, 1)) {
    buckets.add(new Bucket(d, addDays(addMonths(d,1),-1), (d.getMonth() != 0 ? `${getMonthName(d)}` : `${d.getYear() + 1900}\n${getMonthName(d)}`)));
  }
  
  if (addDays(monthEnd,1).getTime() < addDays(nextYear, -1).getTime()) {
    buckets.add(new Bucket(addDays(monthEnd,1), addDays(nextYear, -1), (monthEnd.getMonth() == 0 ? (monthEnd.getYear() + 1900) :  "Resto de " +  (monthEnd.getYear() + 1900))));
  }

  for(var d = nextYear; d.getTime() < lastYear.getTime(); d = addMonths(d, 12)) {
    buckets.add(new Bucket(d, addDays(addMonths(d, 12), -1), (d.getYear() + 1900)));
  } 
  return buckets;
}

function testAutomaticBuckets() {
  var m1 = buildBucketManager(2, 6, 0, new Date(2020, 0, 1)).buckets.map(b => `${b.name}`);
}