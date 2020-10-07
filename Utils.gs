function nvl(val, def) {
  return val == null ? def : val;
}

function isEmpty(val) {
    return val == null
           || val.toString().trim() == "";
}

function formatNumber(number, decimals) {
  var base = 10^decimals;
  return Math.round((number * base) / base).toLocaleString("es-ES",{minimumFractionDigits:0, maximumFractionDigits: decimals, useGrouping: true});
}

function compareStrings(a,b) {
  if (a < b)
    return -1;
  else if (b < a)
    return 1;
  else
    return 0;
}

function ColumnOrVectorToArray(matrix) {
  if (matrix instanceof Array && matrix.length == 0)
    return [];
  else if (!matrix[0] instanceof Array)
    return matrix;
  else if (matrix.length >= matrix[0].length)
  {
    //Es una columna:     [[a],[b],[c]]
    return matrix.map(r => r[0]);
  }
  else 
  {
    //Es una fila: [[a,b,c]]
    return matrix[0];
  }
}

function testColumnOrVectorToArray() {
  var test1 = JSON.stringify(ColumnOrVectorToArray([[1],[2],[3]]));
  var test2 = JSON.stringify(ColumnOrVectorToArray([[1,2,3]]));
  var test3 = JSON.stringify(ColumnOrVectorToArray([["Pablo"],["Andrés"],["Revert"]]));
  var test4 = JSON.stringify(ColumnOrVectorToArray([["Pablo","Andrés","Revert"]]));
}

function buildObjects(sheetName, range, constructor, initializer) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var values = sheet.getRange(range).getValues();
  var backgrounds = sheet.getRange(range).getBackgrounds();

  var l = [];
  var errors = [];
  
  //Armo los nombres de propiedades de la clase
  var names = [];
  for(var i = 0; i < values[1].length; i++)
    if (typeof values[1][i] !== "undefined"
        && values[1][i] != "")
      names.push(values[1][i])
    else
      break;
  
  for (var i=2; i < values.length; i++)
  {
    var obj = constructor();
    var types = obj.TYPES;
    if (!PARSER.eof(values[i], names, types))
    {
      if (PARSER.parseRecord(sheetName, i, obj, values[i], names, types, backgrounds[i][0]))
      {
        initializer(obj);
        l.push(obj);
      }
      else
      {
        errors = errors.concat(PARSER.errors);
      }
    }
    else
      break;
  }
  
  return {items: l, errors: errors};
}


var DATE_UNITS = {
  miliseconds: "ms",
  seconds: "s",
  minutes: "m",
  hours: "h",
  days: "d",
  months: "M",
  years : "y"
}

function getDatepart(date) {
  var result = new Date(date);
  result.setHours(0,0,0,0);
  return result;
}

function getToday() {
  return getDatepart(new Date());
}

function getMonth(date) {
  return date.getMonth() + 1;
}

function getYear(date) {
  return date.getYear() + 1900;
}

function daysOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function dateDiff(date1, date2, unit) {
  var diff = date2.getTime() - date1.getTime();
  switch (unit) {
          case DATE_UNITS.miliseconds: return diff;
          case DATE_UNITS.seconds: return diff / 1000;
          case DATE_UNITS.minutes: return diff / 1000 / 60;
          case DATE_UNITS.hours: return diff / 1000 / 3600;
          case DATE_UNITS.days: return diff / 1000 / 3600 / 24;
          case DATE_UNITS.months: return diff / 1000 / 3600 / 24 / 30;
          case DATE_UNITS.years:  return diff / 1000 / 3600 / 24 / 365;
          }
}

function getMonthName(date) {
  var month = date.getMonth() + 1;
  switch (month) {
    case 1: return "Enero";
    case 2: return "Febrero";
    case 3: return "Marzo";
    case 4: return "Abril";
    case 5: return "Mayo";
    case 6: return "Junio";
    case 7: return "Julio";
    case 8: return "Agosto";
    case 9: return "Septiembre";
    case 10: return "Octubre";
    case 11: return "Noviembre";
    case 12: return "Diciembre";
    default: return month.toString();
  }
}

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date, hours) {
  var result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function addMonths(date, months) {
  var result = new Date(date);
  var day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (day > result.getDate())
  {
    if (months >= 0)
      result.setMonth(result.getMonth(), 0);
    else
      result.setMonth(result.getMonth(),0)
  }
  return result;
}

var timers = new Map();

function defineTimer(name) {
  timers.set(name, { start: new Date(), acum: 0, state: "running" });
}

function startTimer(name) {
  var t = timers.get(name);
  t.start = new Date();
  t.state = "running";
}

function stopTimer(name) {
  var t = timers.get(name);
  var diff = dateDiff(t.start, new Date(), DATE_UNITS.miliseconds);
  t.start = null;
  t.aum += diff;
  t.state = "stopped";
}

function getTimerElapsed(name) {
  var t = timers.get(name);
  var running = 0;
  if (t.state == "running")
    running += dateDiff(t.start, new Date(), DATE_UNITS.miliseconds);
  return running + t.acum;
}

function showTimer(name, message) {
  Logger.log(`${message != null ? message : name}: ${getTimerElapsed(name)} ms.`);
}

var loggers = new Map();

function logStart(name, message) {
  var d = new Date();
  loggers.set(name, { start: d, last: d });
  if (message != null)
    Logger.log(`${message}`);
}

function logPartial(name, message) {
  var t = loggers.get(name);
  var d = new Date();
  var time = dateDiff(t.last, d, DATE_UNITS.miliseconds);
  Logger.log(`(${time} ms) ${message}`);
}

function logStep(name, message) {
  var t = loggers.get(name);
  var d = new Date();
  var time = dateDiff(t.last, d, DATE_UNITS.miliseconds);
  Logger.log(`(${time} ms) ${message}`);
  t.last = d;
}

function logEnd(name, message) {
  var t = loggers.get(name);
  var d = new Date();
  var time = dateDiff(t.start, d, DATE_UNITS.miliseconds);
  Logger.log(`(${time} ms) ${message}`);
  loggers.delete(name);
}

function tests() {
  var jan01 = new Date("2020-01-01T00:00:00");
  var jan31 = new Date("2020-01-31T00:00:00");
  
  var test1 = assertDates(addDays(jan01, 1), "2020-01-02T00:00:00");
  var test2 = assertDates(addDays(jan01, 31), "2020-02-01T00:00:00");
  var test3 = assertDates(addMonths(jan01, 1), "2020-02-01T00:00:00");
  var test4 = assertDates(addMonths(jan31, 0), "2020-01-31T00:00:00");
  var test5 = assertDates(addMonths(jan31, 1), "2020-02-29T00:00:00");
  var test6 = assertDates(addMonths(jan31, 2), "2020-03-31T00:00:00");
  var test7 = assertDates(addMonths(jan31, -1), "2019-12-31T00:00:00");
  var test8 = assertDates(addMonths(jan31, -2), "2019-11-30T00:00:00");

}

function testBuildObjects() {
  var sheetName = "Mantenimentos Aprobados";
  var range = "A1:N10";
  
  var ret = buildObjects(sheetName, range, () => new Maitenance(), m => m.init());
  var retJson = JSON.stringify(ret);
  var items = JSON.stringify(ret.items);
  var errors = JSON.stringify(ret.errors);
}

function testLogs() {
  logStart("Name", "Start");
  logStep("Name", "Step 1");
  logPartial("Name", "Step 1");
  logStep("Name", "Step 2");
  logPartial("Name", "Step 2");
  logEnd("Name", "End");
}