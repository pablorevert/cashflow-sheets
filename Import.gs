function buildObjects(sheetName, range, constructor, initializer) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var range = sheet.getRange(range);
  
  var l = [];
  var errors = [];
  var notes = [];
  var backs = [];

  var maxRows = sheet.getMaxRows() - range.getRow() + 1;
  if (maxRows > 2) {
    if (range.getNumRows() > maxRows)
      range = sheet.getRange(range.getRow(), range.getColumn(), maxRows, range.getNumColumns());
    
    var values = range.getValues();
    var formulas = range.getFormulasR1C1()
                        .map(row => Object.entries(row).filter(c => c[1] != "").map(c => { return {col: parseInt(c[0]) + 1, formula: c[1]}}));
    var backgrounds = range.getBackgrounds();

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
      obj.values = values[i];
      obj.background = backgrounds[i][0];
      obj.formulas = formulas[i];
      var types = obj.METADATA.TYPES;
      if (!PARSER.eof(values[i], names, obj.METADATA.EOF))
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
        notes.push(PARSER.notes);
        backs.push(PARSER.backgrounds);
      }
      else
        break;
    }

    /*if (notes.length > 0) {*/
      var dataRange = sheet.getRange(range.getRow() + 2, range.getColumn(), notes.length, notes[0].length);
      dataRange.setNotes(notes);
      dataRange.setBackgrounds(backs);
    /*}*/
  }
  return {items: l, errors: errors};
}


var Error = function(table, row, field, error) {
  
  var self = this;
  self.table = table;
  self.row = row;
  self.field = field;
  self.error = error;
  
  self.toArray = function() {
    return [self.table, self.row + 1, self.field, self.error ];
  }
  
  self.toString = function() {
    return "[TABLE:" + self.table.padEnd(20) + "][ROW:" + self.row.toString().padStart(4) + "][COL:" + self.field.padEnd(20) + "] " + error;   
  }
}

function configValue(config, prop, defaultValue) {
  if (config == null || config[prop] == null)
    return defaultValue;
  else
    return config[prop];
}

/****************************
 *       TYPE STRING        *
 ****************************/

var StringType = function(config) {
  
  var self = this;
  self.lastError = null;

  //Configuración
  self.nullable = configValue(config, "nullable", true);

  
  self.isValid = function(val) {
    self.lastError = null;

    if (!self.nullable && (val == null || val.toString().trim() == ""))
      self.lastError = "El campo no puede estar vacío";
    
    return self.lastError == null;
  }

  self.parse = function(val) {
    return val != null && val.toString().trim() != ""
       ? val.toString().trim()
       : null;
  }
}

function testParsingStrings() {
  var stringNullable = new StringType({nullable:true});
  var stringNotNullable = new StringType({nullable:false});
  
  var test1 = assert(stringNullable.isValid(null), true);
  var test2 = assert(stringNullable.isValid(""), true);
  var test3 = assert(stringNullable.isValid(" "), true);
  var test4 = assert(stringNullable.isValid("Pablo"), true);

  var test5 = assert(stringNotNullable.isValid(null), false);
  var msg5 = stringNotNullable.lastError;
  var test6 = assert(stringNotNullable.isValid(""), false);
  var msg6 = stringNotNullable.lastError;
  var test7 = assert(stringNotNullable.isValid(" "), false);
  var msg7 = stringNotNullable.lastError;
  var test8 = assert(stringNotNullable.isValid("Pablo"), true);
}

/****************************
 *        TYPE DATE         *
 ****************************/

var DateType = function(config) {
  
  var self = this;
  self.lastError = null;

  //Configuración
  self.nullable = configValue(config, "nullable", true);

  
  self.isValid = function(val) {
    self.lastError = null;

    if (self.nullable && (val == null || val.toString().trim() == ""))
      return true;
    if (!self.nullable && ((val == null) || val.toString().trim() == ""))
      self.lastError = "El campo no puede estar vacío";
    else if (val instanceof Date)
    {
      if (isNaN(val.valueOf()))
        self.lastError = "La fecha es invalida";
    }   
    else if (isNaN(new Date(val).valueOf()))
      self.lastError = "No se como convertir el valor '" + val + "' en una fecha";
    
    return self.lastError == null;
  }
    
  self.parse = function(val) {
    return val != null && val.toString().trim() != ""
       ? (val instanceof Date ? val : new Date(val))
       : null;
  }
}

function testParsingDates() {
  var dateNullable = new DateType({nullable:true});
  var dateNotNullable = new DateType({nullable:false});
  
  var test01 = assert(dateNullable.isValid(null), true);
  var test02 = assert(dateNullable.isValid(""), true);
  var test03 = assert(dateNullable.isValid(" "), true);
  var test04 = assert(dateNullable.isValid("Pablo"), false);
  var msg04 = dateNullable.lastError;
  var test05 = assert(dateNullable.isValid("2020-01-14T00:00:00"), true);
  var test06 = assert(dateNullable.isValid(new Date()), true);
  var test07 = assert(dateNullable.isValid(new Date("P")), false);
  var msg07 = dateNullable.lastError;

  var test11 = assert(dateNotNullable.isValid(null), false);
  var msg11 = dateNotNullable.lastError;
  var test12 = assert(dateNotNullable.isValid(""), false);
  var msg12 = dateNotNullable.lastError;
  var test13 = assert(dateNotNullable.isValid(" "), false);
  var msg13 = dateNotNullable.lastError;
  var test14 = assert(dateNotNullable.isValid("Pablo"), false);
  var msg14 = dateNotNullable.lastError;
  var test15 = assert(dateNotNullable.isValid("2020-01-14T00:00:00"), true);
  var test16 = assert(dateNotNullable.isValid(new Date()), true);
  var test17 = assert(dateNotNullable.isValid(new Date("P")), false);
  var msg17 = dateNotNullable.lastError;
}

/****************************
 *      TYPE NUMBER         *
 ****************************/

var NumberType = function(config) {
  
  var self = this;
  self.lastError = null;

  //Configuración
  self.nullable = configValue(config, "nullable", true);

  
  self.isValid = function(val) {
    self.lastError = null;

    if (self.nullable && (val == null || val.toString().trim() == ""))
      return true;
    if (!self.nullable && ((val == null) || val.toString().trim() == ""))
      self.lastError = "El campo no puede estar vacío";
    else if (typeof val !== "number" && isNaN(Number.parseFloat(val)))
      self.lastError = "No se como convertir el valor '" + val + "' en un número";
    
    return self.lastError == null;
  }
    
  self.parse = function(val) {
    return val != null && val.toString().trim() != ""
       ? Number.parseFloat(val)
       : null;
  }
}

function testParsingNumbers() {
  var numberNullable = new NumberType({nullable:true});
  var numberNotNullable = new NumberType({nullable:false});
  
  var test01 = assert(numberNullable.isValid(null), true);
  var test02 = assert(numberNullable.isValid(""), true);
  var test03 = assert(numberNullable.isValid(" "), true);
  var test04 = assert(numberNullable.isValid("Pablo"), false);
  var msg04 = numberNullable.lastError;
  var test05 = assert(numberNullable.isValid("2"), true);
  var test06 = assert(numberNullable.isValid(2), true);
  var test07 = assert(numberNullable.isValid(new Date()), false);
  var msg07 = numberNullable.lastError;

  var test11 = assert(numberNotNullable.isValid(null), false);
  var msg11 = numberNotNullable.lastError;
  var test12 = assert(numberNotNullable.isValid(""), false);
  var msg12 = numberNotNullable.lastError;
  var test13 = assert(numberNotNullable.isValid(" "), false);
  var msg13 = numberNotNullable.lastError;
  var test14 = assert(numberNotNullable.isValid("Pablo"), false);
  var msg14 = numberNotNullable.lastError;
  var test15 = assert(numberNotNullable.isValid("2"), true);
  var test16 = assert(numberNotNullable.isValid(2), true);
  var test17 = assert(numberNotNullable.isValid(new Date()), false);
  var msg17 = numberNotNullable.lastError;
}

/****************************
 *      TYPE CURRENCY       *
 ****************************/

var CurrencyType = function(config) {
  
  var self = this;
  self.lastError = null;

  //Configuración
  self.nullable = configValue(config, "nullable", true);

  
  self.isValid = function(val) {
    self.lastError = null;

    if (self.nullable && (val == null || val.toString().trim() == ""))
      return true;
    if (!self.nullable && ((val == null) || val.toString().trim() == ""))
      self.lastError = "El campo no puede estar vacío";
    else if (typeof val !== "string")
      self.lastError = "No se como convertir el valor '" + val + "' en una moneda";
    else if (CURRENCY.values.findIndex(x => x == val.trim().toUpperCase()) == -1)
      self.lastError = "Código de moneda invalido: '" + val + "'. Debe ser uno de los siguientes: " + CURRENCY.values.join(", ");
    
    return self.lastError == null;
  }
    
  self.parse = function(val) {
    return val != null && val.toString().trim() != ""
       ?  val.trim().toUpperCase()
       : null;
  }
}

function testParsingCurrencies() {
  var currencyNullable = new CurrencyType({nullable:true});
  var currencyNotNullable = new CurrencyType({nullable:false});
  
  var test01 = assert(currencyNullable.isValid(null), true);
  var test02 = assert(currencyNullable.isValid(""), true);
  var test03 = assert(currencyNullable.isValid(" "), true);
  var test04 = assert(currencyNullable.isValid("JPY"), false);
  var msg04 = currencyNullable.lastError;
  var test05 = assert(currencyNullable.isValid("ARS"), true);
  var test06 = assert(currencyNullable.isValid(2), false);
  var msg06 = currencyNullable.lastError;
  var test07 = assert(currencyNullable.isValid(new Date()), false);
  var msg07 = currencyNullable.lastError;

  var test11 = assert(currencyNotNullable.isValid(null), false);
  var msg11 = currencyNotNullable.lastError;
  var test12 = assert(currencyNotNullable.isValid(""), false);
  var msg12 = currencyNotNullable.lastError;
  var test13 = assert(currencyNotNullable.isValid(" "), false);
  var msg13 = currencyNotNullable.lastError;
  var test14 = assert(currencyNotNullable.isValid("JPY"), false);
  var msg14 = currencyNotNullable.lastError;
  var test15 = assert(currencyNotNullable.isValid("ARS"), true);
  var test16 = assert(currencyNotNullable.isValid(2), false);
  var msg16 = currencyNotNullable.lastError;
  var test17 = assert(currencyNotNullable.isValid(new Date()), false);
  var msg17 = currencyNotNullable.lastError;
}

/****************************
 *           PARSER         *
 ****************************/


var Parser = function() {
  var self = this;
  self.errors = [];
  self.notes = [];
  self.colors = []
  self.backgrounds = [];
 
  self.isEmpty = function(val) {
    return val == null
           || val.toString().trim() == "";
  }
  
  self.eof = function(values, names, eof) {
    var check;
    if (eof != null && eof.length > 1)
      check = eof.map(x => names.indexOf(x));
    else
      check = names.map((x,i) => i);
    
    for(var i of check)
      if (!self.isEmpty(values[i]))
        return false;
    
     return true;
  }
  
  self.parseRecord= function(table, row, obj, values, names, types, background) {
    var isValid = true;
    self.errors = [];
    self.notes = [];
    self.backgrounds = [];
    
    for(var i = 0; i < names.length; i++)
    {
      var field = names[i];
      var sourceValue = values[i];
      var type = types[field];
      if (type == null)
      {
        self.errors.push(new Error(table, row, field, "La columna no ha sido definida en la colección de tipos de la clase. Columnas definidas: " + Object.getOwnPropertyNames(types)));
        self.backgrounds.push("#eebbbb");
        self.notes.push("La columna no ha sido definida. Columnas definidas: " + Object.getOwnPropertyNames(types));
        isValid = false;
      }      
      else if (type.isValid(sourceValue)) {
        obj[field] = type.parse(sourceValue);
        self.notes.push("");
        self.backgrounds.push(background);
      }
      else
      {
        self.errors.push(new Error(table, row, field, type.lastError));
        self.notes.push(type.lastError);
        self.backgrounds.push("#eebbbb");
        isValid = false;
      }      
    }

    if (!isValid) {
      self.backgrounds = self.backgrounds.map(b => b == background ?  "#ffeeee"  : b);
      self.backgrounds[0] = background;
    }
    
    return isValid;
  }
}

var PARSER = new Parser();

function testRecordParsing() {
  
  var names = ["date", "currency", "amount"];
  var types = {
    date: new DateType({nullable: false}),
    currency: new CurrencyType({nullable: false}),
    amount: new NumberType({nullable: false})
  }

  var d = getToday();

  var obj = {}
  var values = [d, "ARS", 500];
  var test1_1 = assert(PARSER.parseRecord("Test", 1, obj, values, names, types), true);
  var test1_2 = assertDates(obj.date,d);
  var test1_3 = assert(obj.currency, "ARS");
  var test1_4 = assert(obj.amount, 500);
  var test1_5 = JSON.stringify(obj);
  
  obj = {}
  values = [null, "JPY", 500];
  var test2_1 = assert(PARSER.parseRecord("Test", 2, obj, values, names, types), false);
  var test2_2 = JSON.stringify(PARSER.errors[0]);
  var test2_3 = JSON.stringify(PARSER.errors[1]);
  var test2_4 = JSON.stringify(PARSER);
}

function testBuildObjects() {
  buildObjects("Facturados", "A2:V1000", () => new Event, x => x.init());
}
