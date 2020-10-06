class Event {
  constructor(data) {
    this.METADATA = {
      TYPES: {
        id: new StringType({nullable:false}), 
        type: new StringType({nullable:false}), 
        cat1: new StringType({nullable:false}), 
        cat2: new StringType({nullable:false}), 
        restCategories: new StringType({nullable:false}), 
        detail: new StringType({nullable:true}),
        origin: new StringType({nullable:false}),
        currency: new CurrencyType({nullable:false}), 
        settlement: new NumberType({nullable:false}), 
        invoice_date: new DateType({nullable:false}), 
        invoice_number: new StringType({nullable:true}), 
        settlement_date: new DateType({nullable:false}), 
        state: new StringType({nullable:false}), 
        paymentDelay: new NumberType({nullable:true}), 
        initialInvoiceDate: new DateType({nullable:true}), 
        initialSettleDate: new DateType({nullable:true}), 
		amount: new NumberType({nullable:false}), 
		vat: new NumberType({nullable:true}), 
		fee: new NumberType({nullable:true}), 
		fee_vat: new NumberType({nullable:true}), 
		ret_per_vat: new NumberType({nullable:true}), 
		ret_per_iibb: new NumberType({nullable:true}), 
		ret_per_wht: new NumberType({nullable:true}), 
		ret_per_suss: new NumberType({nullable:true})
      },
      EOF: ["id"],
      UNIQUE: x => x.id
    }
    if (data != null) {
      this.id = data.id;
      this.type = data.type;
      this.cat1 = data.cat1;
      this.cat2 = data.cat2;
      this.detail = data.detail;
      this.restCategories = data.restCategories;
      this.origin = data.origin;
      this.currency = data.currency;
      this.settlement = data.settlement;
      this.invoice_date = data.invoice_date;
      this.invoice_number = data.invoice_number;
      this.settlement_date = data.settlement_date;
      this.state = data.state;
      this.paymentDelay = data.paymentDelay;
      this.initialInvoiceDate = data.initialInvoiceDate;	
      this.initialSettleDate = data.initialSettleDate;
      this.amount = data.amount;
      this.vat = data.vat;
      this.fee = data.fee;
      this.fee_vat = data.fee_vat;
      this.ret_per_vat = data.ret_per_vat;
      this.ret_per_iibb = data.ret_per_iibb;
      this.ret_per_wht = data.ret_per_wht;
      this.ret_per_suss = data.ret_per_suss;
    }
  }
  
  init() {
  }
  
  _getValues() {
    return [
      this.id,
      this.type,
      this.cat1,
      this.cat2,
      this.restCategories,
      this.detail,
      this.origin,
      this.currency,
      this.settlement,
      this.invoice_date,
      this.invoice_number,
      this.settlement_date,
      this.state,
      this.paymentDelay,
      this.initialInvoiceDate,
      this.initialSettleDate,
      this.amount,
      this.vat,
      this.fee,
      this.fee_vat,
      this.ret_per_vat,
      this.ret_per_iibb,
      this.ret_per_wht,
      this.ret_per_suss
    ];      
  }
  
  write(sheet, row) {
    if (this.values != null) {
      sheet.getRange(row, 1, 1, this.values.length).setValues([this.values]);
      this.formulas.forEach(f =>  sheet.getRange(row, f.col).setFormulaR1C1(f.formula));
    } 
    else {
      var values = this._getValues();
      sheet.getRange(row, 1, 1, values.length).setValues([values]);
    }
  }
  
  getMovements(taxManager, today) {
    var data = {};
    var movs = [];
    var categories = [this.cat1, this.cat2].concat(this.restCategories.split("|").map(c => c.toString().trim()));
    var scenario = this.getScenario();
    
    // Calculo las fechas, y las muevo para adelante si no está facturado / liquidado
    var invoice_date = this.invoice_date;
    var settlement_date = this.settlement_date;

    if (this.isPending()
        && this.type == Event.TYPES.SELL
        && invoice_date.getTime() < today.getTime()) 
    {
      var days_to_settlement = dateDiff(this.invoice_date, this.settlement_date, DATE_UNITS.days);
      invoice_date = today;
      settlement_date = addDays(invoice_date, days_to_settlement);
    }
    else if (this.state != Event.STATES.SETTLED
             && settlement_date.getTime() < today.getTime()) {
         settlement_date = today;
    }

    var taxInfo = taxManager.getTaxInfo(this.type, this.origin, categories, this.detail, invoice_date, settlement_date, this.amount, this.settlement);

    if (taxInfo.settlement.date.getTime() == today.getTime() && this.state != Event.STATES.SETTLED)
         taxInfo.settlement.date = addHours(taxInfo.settlement.date, 12);
        
    //Movimiento liquidado
    this.tryAddMovement(data, movs, "settlement", scenario, this.id, categories, taxInfo.settlement.date, new SingleQuantity(this.currency, this.settlement * taxInfo.settlement.sign), taxInfo.settlement.comment);
    
    //IMPUESTOS
    //IVA
    this.tryAddMovement(data, movs, "vat", scenario, this.id, taxInfo.vat.categories, taxInfo.vat.date, new SingleQuantity(this.currency, this.vat * taxInfo.vat.sign), taxInfo.vat.comment);
    //IIBB
    this.tryAddMovement(data, movs, "iibb", scenario, this.id, taxInfo.iibb.categories, taxInfo.iibb.date, new SingleQuantity(this.currency, taxInfo.iibb.amount), taxInfo.iibb.comment);
    //DB/CR
    this.tryAddMovement(data, movs, "db_cr", scenario, this.id, taxInfo.db_cr.categories, taxInfo.db_cr.date, new SingleQuantity(this.currency, taxInfo.db_cr.amount), taxInfo.db_cr.comment);
    
    //RETENCIONES / PERCEPCIONES
    //IVA
    this.tryAddMovement(data, movs, "ret_per_vat", scenario, this.id, taxInfo.ret_per_vat.categories, taxInfo.ret_per_vat.date, new SingleQuantity(this.currency, this.ret_per_vat * taxInfo.ret_per_vat.sign), taxInfo.ret_per_vat.comment);
    this.tryAddMovement(data, movs, "fee_vat", scenario, this.id, taxInfo.fee_vat.categories, taxInfo.fee_vat.date, new SingleQuantity(this.currency, this.fee_vat * taxInfo.fee_vat.sign), taxInfo.fee_vat.comment);
    //IIBB
    this.tryAddMovement(data, movs, "ret_per_iibb", scenario, this.id, taxInfo.ret_per_iibb.categories, taxInfo.ret_per_iibb.date, new SingleQuantity(this.currency, this.ret_per_iibb * taxInfo.ret_per_iibb.sign), taxInfo.ret_per_iibb.comment);
    //Ganancias
    this.tryAddMovement(data, movs, "ret_per_wht", scenario, this.id, taxInfo.ret_per_wht.categories, taxInfo.ret_per_wht.date, new SingleQuantity(this.currency, this.ret_per_wht * taxInfo.ret_per_wht.sign), taxInfo.ret_per_wht.comment);
    //SUSS
    this.tryAddMovement(data, movs, "ret_per_suss", scenario, this.id, taxInfo.ret_per_suss.categories, taxInfo.ret_per_suss.date, new SingleQuantity(this.currency, this.ret_per_suss * taxInfo.ret_per_suss.sign), taxInfo.ret_per_suss.comment);
    //DB/CR aplicado a ganancias
    this.tryAddMovement(data, movs, "refund_db_cr_wht", scenario, this.id, taxInfo.refund_db_cr_wht.categories, taxInfo.refund_db_cr_wht.date, new SingleQuantity(this.currency, -taxInfo.db_cr.amount), taxInfo.db_cr.comment);

    var comment = `${this.detail}\n`;

    comment += `   - Estado: ${this.state.toLocaleUpperCase()}\n`;
    
    if (this.type == Event.TYPES.SELL && this.invoice_number != null && this.invoice_number.trim() != "") 
        comment += `   - Factura ${this.invoice_number}\n`;
    
    if (this.type == Event.TYPES.SELL && this.invoice_number != null) 
        comment += `   - F. Emisión: ${this.invoice_date.toLocaleDateString("es-AR")}\n`;
  
    if (this.vat != 0 && this.amount != 0)
      comment += `   - Monto: ${this.currency} ${formatNumber(this.amount,2)} + ${formatNumber(this.vat,2)}\n`;
    else if (this.amount != 0)
      comment += `   - Monto: ${this.currency} ${formatNumber(this.amount,2)}\n`;
    
    if (this.fee != 0)
        comment += `   - Comisión: ${this.currency} ${formatNumber(this.fee,2)} ${this.fee_vat != 0 ? ' + ' + formatNumber(this.fee_vat,2) : ''}\n`
  
    if (this.ret_per_vat + this.ret_per_iibb + this.ret_per_wht + this.ret_per_suss != 0)
        comment += `   - Retenciones: ${this.currency} ${formatNumber(this.ret_per_vat + this.ret_per_iibb + this.ret_per_wht + this.ret_per_suss,2)}\n`

    comment += `  LIQUIDACIÓN: ${this.currency} ${formatNumber(this.settlement,2)} el ${this.settlement_date.toLocaleDateString("es-AR")}\n`; 

    if (data.settlement != "N/A")
      data.settlement.comment = comment;
    else
      Logger.log(`WARNING: settlement N/A for id ${this.id}`);
  
    return movs;    
  }
  
  tryAddMovement(data, movs, label, scenario, id, categories, date, amount, comment) {
    if (Math.abs(amount.quantity) > 0.01) {
      var mov = new Movement(scenario, id, categories, date, amount, comment);
      data[label] = mov;
      movs.push(mov);
    }
    else {
      data[label] = "N/A";
    }
  }
  
  isPending() {
    return [Event.STATES.BILLED, Event.STATES.SETTLED, Event.STATES.CANCELLED].indexOf(this.state) == -1;
  }
  
  getScenario() {
    if (this.state == Event.STATES.PENDING)
      return Movement.SCENARIOS.CONFIRMED;
    else if (this.state == Event.STATES.BILLED)
      return Movement.SCENARIOS.CONFIRMED;
    else if (this.state == Event.STATES.SETTLED)
      return Movement.SCENARIOS.CONFIRMED;
    else if (this.state == Event.STATES.CANCELLED)
      return Movement.SCENARIOS.CANCELLED;
    else if (this.state == Event.STATES.VERY_LIKELY)
      return Movement.SCENARIOS.VERY_LIKELY;
    else if (this.state == Event.STATES.PROBABLE)
      return Movement.SCENARIOS.PROBABLE;
    else if (this.state == Event.STATES.UNLIKELY)
      return Movement.SCENARIOS.UNLIKELY;
    else
      throw `Estado desconocido ${this.state} para el evento ${this.id}`; 
    
  }
}

Event.formatRows = function(sheet, row, numRows) {
    
    sheet.getRange(row, 1, numRows).setFontColor(Event.FORMATS.id_color);
    sheet.getRange(row, 2, numRows, 22).setFontColor(Event.FORMATS.normal_color);

    sheet.getRange(row, 10, numRows, 2).setHorizontalAlignment('center');
    sheet.getRange(row, 13, numRows, 3).setHorizontalAlignment('center');
    sheet.getRange(row,9, numRows).setNumberFormat(Event.FORMATS.number_format);
    sheet.getRange(row,16, numRows,8).setNumberFormat(Event.FORMATS.number_format);

  sheet.getRange(row, 2, numRows)
         .setDataValidation(
           SpreadsheetApp.newDataValidation()
             .setAllowInvalid(false)
             //.setHelpText('Seleccione una de las opciones por favor')
             .requireValueInList(Object.values(Event.TYPES), true)
             .build());
    
    sheet.getRange(row, 7, numRows)
         .setDataValidation(
           SpreadsheetApp.newDataValidation()
             .setAllowInvalid(false)
             //.setHelpText('Seleccione una de las opciones por favor')
             .requireValueInList(Object.values(Event.ORIGINS), true)
             .build());

  sheet.getRange(row, 8, numRows)
         .setDataValidation(
           SpreadsheetApp.newDataValidation()
             .setAllowInvalid(false)
             //.setHelpText('Seleccione una de las opciones por favor')
             .requireValueInList(Object.values(CURRENCY.values), true)
             .build());
    
    
    sheet.getRange(row, 12, numRows)
         .setDataValidation(
           SpreadsheetApp.newDataValidation()
             .setAllowInvalid(false)
             //.setHelpText('Seleccione una de las opciones por favor')
             .requireValueInList(Object.values(Event.STATES), true)
             .build());  
  }

Event.ORIGINS = {
  LOCAL: "Argentina",
  FOREIGN: "Exterior"
}

Event.TYPES = {
      SELL: "Venta", 
      EXPENSE: "Gasto", 
      TAX: "Impuesto", 
      TAX_PAYED: "Adelanto Impuesto", 
      SALARY: "Salario", 
      INTEREST: "Interés", 
      LOAN: "Préstamo (capital)"
    };

Event.STATES = {
      PENDING: "Pendiente",
      BILLED: "Facturado",
      SETTLED: "Liquidado",
      CANCELLED: "Cancelado",
      VERY_LIKELY: "Muy Probable",
      PROBABLE: "Probable",
      UNLIKELY: "Poco Probable"
    };

Event.FORMATS = {
  id_color: '#999999',
  normal_color: '#000000',
  number_format: '#,##0;[Red] (#,##0); -'
}