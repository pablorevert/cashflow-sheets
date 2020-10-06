class BaseEntry {
  constructor() {
  }
  
  getEvents() {
    throw "No implementado aún";
  }
}

class ProjectEntry extends BaseEntry {
  constructor(customers) {
    super();
    this.METADATA = 
    {
      TYPES: {
        id:               new StringType({nullable:false}),
        purchaseOrder:    new StringType({nullable:true}),
        responsible:      new StringType({nullable:true}),
        project:          new StringType({nullable:false}),
        milestone:        new StringType({nullable:true}),
        percentage:       new NumberType({nullable:true}),
        invoice_date:     new DateType({nullable:false}),
        settlement_date:  new DateType({nullable:false}),
        payment_delay:    new NumberType({nullable:true}),
        state:            new StringType({nullable:false}),
        customer:         new StringType({nullable:false}),
        total_amount:     new NumberType({nullable:true}),
        currency:         new CurrencyType({nullable:false}),
        amount:      new NumberType({nullable:true})
      },
      EOF: ["currency", "amount"],
      UNIQUE: x => x.id
    };
    this.customers = customers;
  }
  
  init() {
    /*
    if (this.state == "Planificado"
        && this.invoice_date.getTime() < getToday().getTime)
    {
      //Incremento la fecha una semana después de hoy
      var days = dateDiff(this.invoice_date, getToday(), DATE_UNITS.days);
      this.invoice_date = addDays(this.invoice_Date, days);
      this.settlement_date = addDays(this.settlement_date, days);
    }*/
    this.Customer = this.customers.find(x => x.customer == this.customer);
    if (this.Customer == null)
      this.customer += " (desconocido)";
  }
  
  
  getEvents(taxManager) {
    var taxDetail = taxManager.taxesFromSell(this.invoice_date, this.settlement_date, new SingleQuantity(this.currency, this.amount), this.Customer);
    var event = new Event(
      {
        id: this.id, 
        type: Event.TYPES.SELL, 
        cat1: "Ingresos",  
        cat2: "Proyectos",
        restCategories: `${this.customer} | ${this.project}`, 
        detail: this.milestone,
        origin: this.Customer != null ? (this.Customer.country.toLowerCase() == "argentina" ? "Argentina" : "Exterior") : "Argentina",
        currency: taxDetail.settled.amount.unit, 
        settlement: taxDetail.settled.amount.quantity, 
        invoice_date: this.invoice_date, 
        invoice_number: "",
        settlement_date: this.settlement_date, 
        state: this.getEventState(), 
        paymentDelay: this.payment_delay, 
        initialInvoiceDate: this.invoice_date, 
        initialSettleDate: this.settlement_date, 
		amount: taxDetail.amount.quantity, 
		vat: taxDetail.getVatAmount(), 
		fee: taxDetail.getFeeAmount(), 
		fee_vat: taxDetail.getFeeVatAmount(), 
		ret_per_vat: taxDetail.getRetentionVat(), 
		ret_per_iibb: taxDetail.getRetentionIibb(), 
		ret_per_wht:  taxDetail.getRetentionWht(), 
		ret_per_suss:  taxDetail.getRetentionSuss() 
      });
    return [event];
  }
      
  getEventState() {
      if (this.state == ProjectEntry.STATES.CONFIRM_PLANNED)
        return Event.STATES.PENDING;
      else if (this.state == ProjectEntry.STATES.CONFIRM_BILLED)
        return Event.STATES.PENDING;
      else if (this.state == ProjectEntry.STATES.VERY_LIKELY)
        return Event.STATES.VERY_LIKELY;
      else if (this.state == ProjectEntry.STATES.PROBABLE)
        return Event.STATES.PROBABLE;
      else if (this.state == ProjectEntry.STATES.UNLIKELY)
        return Event.STATES.UNLIKELY;
      else if (this.state == ProjectEntry.STATES.CANCELLED)
        return Event.STATES.CANCELLED;
      else
        throw `Proyecto '${this.id}' con estado inválido ${this.state}`;
  }
}
      
ProjectEntry.STATES = {
      CONFIRM_PLANNED: "Planificado",
      CONFIRM_BILLED:  "OK para facturar",
      VERY_LIKELY: "Muy Probable",
      PROBABLE: "Posible",
      UNLIKELY: "Poco Probable",
      CANCELLED: "Cancelado"
};

class MaitenanceEntry extends BaseEntry {
  constructor(customers) {
    super();
    this.METADATA = 
    {
      TYPES: {
        id:               new StringType({nullable:false}),
        customer:         new StringType({nullable:false}),
        category:         new StringType({nullable:false}),
        state:            new StringType({nullable:false}),
        purchaseOrder:    new StringType({nullable:true}),
        project:          new StringType({nullable:false}),
        paymentDelay:     new NumberType({nullable:true}),
        currency:         new CurrencyType({nullable:false}),
        total:            new NumberType({nullable:true}),
        duration:         new NumberType({nullable:true}),
        inAdvance:        new NumberType({nullable:false}),
        frequency:        new NumberType({nullable:false}),
        installment:      new NumberType({nullable:false}), 
        first:            new DateType({nullable:false}),
        last:             new DateType({nullable:false})
      },
      EOF: ["currency", "amount"],
      UNIQUE: x => x.id,
    };  
    this.customers = customers;
  }
  
  init() {
    /*
    if (this.state == "Planificado"
        && this.invoice_date.getTime() < getToday().getTime)
    {
      //Incremento la fecha una semana después de hoy
      var days = dateDiff(this.invoice_date, getToday(), DATE_UNITS.days);
      this.invoice_date = addDays(this.invoice_Date, days);
      this.settlement_date = addDays(this.settlement_date, days);
    }*/
    this.Customer = this.customers.find(x => x.customer == this.customer);
    if (this.Customer == null)
      this.customer += " (desconocido)";
  }
  
  
  getEvents(taxManager) {

    var cashflows = [];
    var events = [];
    
    if (this.Customer != null) {
      
      if (this.inAdvance > 0)
        events.push(this.getEvent(taxManager, "ADEL", "Adelanto", this.first, addDays(this.first,7), 7, this.currency, this.inAdvance));
      
      for(var d = this.first; d.getTime() <= this.last.getTime(); d = addMonths(d, this.frequency))
        events.push(
          this.getEvent(
            taxManager,
            `${(d.getYear()+1900).toString()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`,
            `${getMonthName(d)} ${(d.getYear()+1900).toString()}`, 
             d, 
             addDays(d,this.paymentDelay),
             this.paymentDelay,
             this.currency,
             this.installment));
    }
    else
      throw `Invalid Customer ${this.customer}`;
    
    return events;
  }
      
  getEvent(taxManager, code, name, invoice_date, settlement_date, payment_delay, currency, amount) {
    var taxDetail = taxManager.taxesFromSell(invoice_date, settlement_date, new SingleQuantity(currency,amount), this.Customer);
    return new Event(
      {
        id: `${this.id}(${code})`, 
        type: Event.TYPES.SELL, 
        cat1: "Ingresos",  
        cat2: `${this.category}`,
        restCategories: `${this.customer} | ${this.project}`, 
        detail: `Abono ${name}`,
        origin: this.Customer != null ? (this.Customer.country.toLowerCase() == "argentina" ? "Argentina" : "Exterior") : "Argentina",
        currency: taxDetail.settled.amount.unit, 
        settlement: taxDetail.settled.amount.quantity, 
        invoice_date: invoice_date, 
        invoice_number: "",
        settlement_date: settlement_date, 
        state: this.getEventState(), 
        paymentDelay: payment_delay, 
        initialInvoiceDate: invoice_date, 
        initialSettleDate: settlement_date, 
		amount: taxDetail.amount.quantity, 
		vat: taxDetail.getVatAmount(), 
		fee: taxDetail.getFeeAmount(), 
		fee_vat: taxDetail.getFeeVatAmount(), 
		ret_per_vat: taxDetail.getRetentionVat(), 
		ret_per_iibb: taxDetail.getRetentionIibb(), 
		ret_per_wht:  taxDetail.getRetentionWht(), 
		ret_per_suss:  taxDetail.getRetentionSuss() 
      });
  }

  getEventState() {
      if (this.state == MaitenanceEntry.STATES.APPROVED)
        return Event.STATES.PENDING;
      else if (this.state == MaitenanceEntry.STATES.INFORMAL_CONFIRMED)
        return Event.STATES.VERY_LIKELY;
      else if (this.state == MaitenanceEntry.STATES.VERY_LIKELY)
        return Event.STATES.VERY_LIKELY;
      else if (this.state == MaitenanceEntry.STATES.PROBABLE)
        return Event.STATES.PROBABLE;
      else if (this.state == MaitenanceEntry.STATES.UNLIKELY)
        return Event.STATES.UNLIKELY;
      else if (this.state == MaitenanceEntry.STATES.CANCELLED)
        return Event.STATES.CANCELLED;
      else
        throw `Mantenimento '${this.id}' con estado inválido ${this.state}`;
  }
}
MaitenanceEntry.STATES = {
      APPROVED: "Aprobado",
      INFORMAL_CONFIRMED:  "OK informal",
      VERY_LIKELY: "Muy Probable",
      PROBABLE: "Probable",
      UNLIKELY: "Poco Probable",
      CANCELLED: "Cancelado"
};

class SalaryEntry extends BaseEntry {
  constructor() {
    super();this.METADATA = 
    {
      TYPES: {
        id:        new StringType({nullable:false}),
        category:  new StringType({nullable:true}),
        name:      new StringType({nullable:false}),
        scenario:  new StringType({nullable:false}),
        currency:  new CurrencyType({nullable:false})
      },
      EOF: ["category", "name"],
      UNIQUE: x => x.id
    };
    
    var start = getYear(getToday());
    var end = start + MAX_YEARS;
    for(var y = start; y <= end; y++)
      for(var m = 1; m <= 12; m++)
      {
        var key = this.key(m,y);
        this.METADATA.TYPES[key] = new NumberType({nullable:true});
        if (m==6 || m==12)
           this.METADATA.TYPES[key + "_B"] = new NumberType({nullable:true});
      }
  }
  
  init() {
  }
  
  
  getEvents(taxManager) {

    var payments = [];
    
    for(var y = getYear(getToday()); y < getYear(getToday()) + MAX_YEARS; y++)
      for(var m = 1; m <= 12; m++)
      {
        var date = addDays(new Date(y, m, 1), -1);
          var value = this[this.key(m, y)];
          if (value != null)
          {
            var extra = this[this.key(m, y) + "_B"];
            if (extra != null && m == 6)
              payments.push({date: date, amount: new SingleQuantity(this.currency, -value-extra), key: this.key(m, y), year: y, month: m, name: "Haberes + Aguinaldo"});
            else if (extra != null && m == 12)
            {
              payments.push({date: addDays(date,-16), amount: new SingleQuantity(this.currency, -extra), key: this.key(m, y), year: y, month: m, name: "Aguinaldo"});
              payments.push({date: date, amount: new SingleQuantity(this.currency, -value), key: this.key(m, y) + "_B", year: y, month: m, name: "Haberes"});
            }
            else
              payments.push({date: date, amount: new SingleQuantity(this.currency, -value), key: this.key(m, y), year: y, month: m, name: "Haberes"});
          }
      }
        
    return payments.map(c => 
                        this.getEvent(taxManager, 
                                      `${c.year}-${c.month.toString().padStart(2, "0")}`, 
                                      `${c.name} del ${c.month.toString().padStart(2, "0")}\/${c.year}`, 
                                       c.date, 
                                       c.amount.unit, 
                                       -c.amount.quantity));
  }
  
  key(month, year) {
    return "salary_" + year + "_" + ("" + month).padStart(2, "0");
  }
      
  getEvent(taxManager, code, name, date, currency, amount) {
    return new Event(
      {
        id: `${this.id}(${code})`, 
        type: Event.TYPES.SALARY, 
        cat1: "Egresos",  
        cat2: "Salarios",
        restCategories: `${this.category} | ${this.name}`, 
        detail: `${name}`,
        origin: "Argentina",
        currency: currency, 
        settlement: amount, 
        invoice_date: date, 
        invoice_number: "",
        settlement_date: date, 
        state: this.getEventState(), 
        paymentDelay: 0, 
        initialInvoiceDate: date, 
        initialSettleDate: date, 
		amount: 0, 
		vat: 0, 
		fee: 0, 
		fee_vat: 0, 
		ret_per_vat: 0, 
		ret_per_iibb: 0, 
		ret_per_wht:  0, 
		ret_per_suss: 0
      });
  }

  getEventState() {
      return Event.STATES.PENDING;
    /*
      if (this.state == MaitenanceEntry.STATES.APPROVED)
        return Event.STATES.PENDING;
      else if (this.state == MaitenanceEntry.STATES.INFORMAL_CONFIRMED)
        return Event.STATES.VERY_LIKELY;
      else if (this.state == MaitenanceEntry.STATES.VERY_LIKELY)
        return Event.STATES.VERY_LIKELY;
      else if (this.state == MaitenanceEntry.STATES.PROBABLE)
        return Event.STATES.PROBABLE;
      else if (this.state == MaitenanceEntry.STATES.UNLIKELY)
        return Event.STATES.UNLIKELY;
      else if (this.state == MaitenanceEntry.STATES.CANCELLED)
        return Event.STATES.CANCELLED;
      else
        throw `Mantenimento '${this.id}' con estado inválido ${this.state}`;
        */
  }
}
SalaryEntry.STATES = {
      APPROVED: "Aprobado",
      INFORMAL_CONFIRMED:  "OK informal",
      VERY_LIKELY: "Muy Probable",
      PROBABLE: "Posible",
      UNLIKELY: "Poco Probable",
      CANCELLED: "Cancelado"
};

function testProjectEntry() {
  var movs = [];
  var errors = [];
  var feeLines = treatObjects(buildObjects("Comisiones", "A1:Z300", () => new FeeLine(), x => x.init()), errors);
  var fees = Fee.buildFromLines(feeLines);
  var taxManager = new TaxManager(fees);
  var customers = treatObjects(buildObjects("Clientes", "A1:Z300", () => new Customer(fees), x => x.init()), errors);
  var result = buildObjects("Proyectos", "A1:Z300", () => new ProjectEntry(customers), x => x.init());
  var events = [];
  result.items.forEach(entry => events = events.concat(entry.getEvents(taxManager)));
  var values = events.map(ev => ev._getValues());
}