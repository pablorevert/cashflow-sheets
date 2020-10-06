const MAX_YEARS = 5;

class Fee {
  constructor(name, feeLines) {
    this.name = name;
    this.lines = feeLines;
    this.appliesTo = ["export"];
    this.taxes = ["vat","wht"];
  }
  
  static buildFromLines(feeLines) {
    var data = feeLines.reduce((a, l) => {var aux = a; if (a[l.code] == null) aux[l.code] = []; aux[l.code].push(l); return aux;}, {});
    var entries = Object.entries(data);
    var fees = entries.map(x => new Fee(x[0], x[1]));
    return fees;
  }
  
  feeFor(singleQuantity) {
      var line = this.lines.find(f => f.match(singleQuantity));
      if (line != null)
        return line.feeFor(singleQuantity);  
      else
        return new SingleQuantity(singleQuantity.unit, 0);
  }
}

class FeeLine {
  constructor() {
    //code	currency	from	to	fixed	variable	min	max
    this.METADATA = 
    {
      TYPES: {
        code:       new StringType({nullable:false}),
        currency:   new CurrencyType({nullable:false}),
        from:       new NumberType({nullable:true}),
        to:         new NumberType({nullable:true}),
        fixed:      new NumberType({nullable:true}),
        variable:   new NumberType({nullable:true}),
        min:        new NumberType({nullable:true}),
        max:        new StringType({nullable:true})
      },
      EOF: ["customer"],
      UNIQUE: x => x.customer
    };
  }
  
  static fromData(data) {
    var res = new FeeLine;
    res.code = data.code;
    res.currency = data.currency;
    res.from = data.from;
    res.to = data.to;
    res.fixed = data.fixed;
    res.variable = data.variable;
    res.min = data.min;
    res.max = data.max;
    return res;
  }
  
  init() {
    if (isEmpty(this.fixed)) this.fixed = 0;
    if (isEmpty(this.variable)) this.variable = 0;
    if (this.min == 0) this.min = null;
    if (this.max == 0) this.max = null;
  }
  
  match(singleQuantity) {
    var equiv = FINANCE.convert(singleQuantity, this.currency);
    return  (isEmpty(this.from) || this.from <= equiv.quantity)
        &&  (isEmpty(this.to) || equiv.quantity <= this.to); 
  }
  
  feeFor(singleQuantity) {
    var equiv = FINANCE.convert(singleQuantity, this.currency);
    var fee = this.fixed + (this.variable * equiv.quantity);
    if (this.min != null && fee < this.min)
      fee = this.min;
    if (this.max != null && this.max < fee)
      fee = this.max;
    return FINANCE.convert(new SingleQuantity(this.currency, fee), singleQuantity.unit);
  }
}

class Customer {
  constructor() {
    //customer	country	vat	retention_vat	retention_suss	retention_wht	retention_iibb	retention_suss	expenses
    this.METADATA = 
    {
      TYPES: {
        customer:        new StringType({nullable:false}),
        country:         new StringType({nullable:false}),
        vat:             new NumberType({nullable:true}),
        iibb:            new NumberType({nullable:true}),
        retention_vat:   new NumberType({nullable:true}),
        retention_suss:  new NumberType({nullable:true}),
        retention_wht:   new NumberType({nullable:true}),
        retention_iibb:  new NumberType({nullable:true}),
        expenses:        new StringType({nullable:true})
      },
      EOF: ["customer"],
      UNIQUE: x => x.customer
    };
    this.retentions = [];
  }
  
  init() {
    this._buildRetention("vat");
    this._buildRetention("suss");
    this._buildRetention("wht");
    this._buildRetention("iibb");
  }
  
  _buildRetention(name) {
    if (this["retention_" + name])
      this.retentions.push({name: name, ratio: this["retention_" + name]});
  }
  
  isLocal() {
    return this.country.trim().toUpperCase() == "ARGENTINA";
  }
  
  settlementFor(singleQuantity) {

    var fee = new SingleQuantity(singleQuantity.unit, 0);//feeFor(singleQuantity);
    
    var vat = singleQuantity.multiply(this.vat).negate();
    var retention_vat = vat.multiply(this.retention_vat).negate();
    var retention_suss = singleQuantity.multiply(this.retention_suss);
    var retention_wht = singleQuantity.multiply(this.retention_wht);
    var retention_iibb = singleQuantity.multiply(this.retention_iibb);
    
    return {
      amount: singleQuantity,
      vat: vat,
      retention_vat: retention_vat,
      retention_suss: retention_suss, 
      retention_wht: retention_wht, 
      retention_iibb: retention_iibb,
      fee: fee,
      settlement: singleQuantity.substract(vat).substract(fee).substract(retention_vat).substract(retention_suss).substract(retention_iibb).substract(retention_wht)
    };
  }
}

class BaseEvent {
  constructor() {
  }
  
  getMovs (type, taxManager, scenario, id, milestone, categories, currency, amount, invoice_date, settle_date, customer) {
    var amount = new SingleQuantity(currency, amount);
    var detail;
    if (type == "sell")
      detail = taxManager.taxesFromSell(invoice_date, settle_date, amount, customer);
    else if (type = "salary")
      detail = taxManager.taxesFromSalary(invoice_date, settle_date, amount);
    return this.buildMovements(scenario, id, milestone.toUpperCase(), categories, detail);
  }
  
  buildMovements(scenario, id, descr, categories, detail) {
    var movs = [];
    var comment = descr + "\n";
    comment += `     Factura: ${id} del ${detail.date.toLocaleDateString("es-AR")} \n`;
    var vat = detail.taxes.find(t => t.name == "vat");
    if (vat != null)
      comment += `     Monto: ${detail.amount} + ${vat.amount} (IVA)\n`;
    else
      comment += `     Monto: ${detail.amount}\n`;
    
    detail.fees.forEach(f => comment += `   Comisión: ${f.amount} + ${f.total.substract(f.amount)}\n`);
    if (detail.taxes.length > 0) comment += "     Impuestos:\n" + detail.taxes.map(t => `      - ${t.type.descr}: ${t.amount} a pagar el ${t.date.toLocaleDateString("es-AR")}`).join("\n") + "\n";
    if (detail.retentions.length > 0) comment += "     Retenciones:\n" + detail.retentions.map(r => `      - ${r.type.descr}: ${r.amount}`).join("\n") + "\n";
    if (detail.perceptions.length > 0) comment += "     Percepciones:\n" + detail.perceptions.map(r => `      - ${r.type.descr}: ${r.amount}`).join("\n") + "\n";

    comment += `  Liquidado: ${detail.settled.amount} el ${detail.settled.date.toLocaleDateString("es-AR")}\n`;
  
    if (detail.type == "income") 
      movs.push(new Movement(scenario, id, categories, detail.settled.date, detail.settled.amount, comment));
    else 
      movs.push(new Movement(scenario, id, categories, detail.settlement.date, detail.settlement.amount.negate));
    
    detail.retentions.forEach(r => movs.push(new Movement(scenario, id, r.type.categories, r.date, r.amount)));
    detail.perceptions.forEach(p => movs.push(new Movement(scenario, id, replaceLast(p.type.categories,"Percepciones"), p.date, p.amount)));
    //Estos son los que ya fueron liquidados
    detail.taxes.filter(f => f.type.settle).forEach(t => movs.push(new Movement(scenario, id, this.replaceLast(t.type.categories,categories[1]), t.date, t.amount.negate())));
    //Estos son los que quedaron por pagar
    detail.taxes.filter(f => !(f.type.settle)).forEach(t => movs.push(new Movement(scenario, id, t.type.categories, t.date, t.amount.negate())));
    return movs;
  }
  replaceLast(categories, category) {
    var a = categories.slice(0, categories.length - 1);
    var b = a.concat([category]);
    return categories.slice(0, categories.length - 1).concat([category]);
  }
}

class Project extends BaseEvent {
  constructor(customers) {
    super();
    // purchaseOrder	responsible	proyect	milestone	percentage	invoice_date	settlement_date	status	customer	total_amount	currency	amount
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
    if (this.state == "Planificado"
        && this.invoice_date.getTime() < getToday().getTime)
    {
      //Incremento la fecha una semana después de hoy
      var days = dateDiff(this.invoice_date, getToday(), DATE_UNITS.days);
      this.invoice_date = addDays(this.invoice_Date, days);
      this.settlement_date = addDays(this.settlement_date, days);
    }
    this.Customer = this.customers.find(x => x.customer == this.customer);
    if (this.Customer == null)
      this.customer += " (desconocido)";
  }
  
  getMovements(taxManager, start) {

    var cashflows = [];
    var categories = ["Ingresos", "Proyectos", this.customer, this.project];
    var scenario;
    if (this.state == "Planificado" || this.state == "Facturado")
      scenario = "Confirmado";
    else 
      scenario = this.state;
    
    if (this.Customer != null)
      return this.getMovs("sell", taxManager, scenario, this.id, this.milestone.toUpperCase(), categories, this.currency, this.amount, this.invoice_date, this.settlement_date, this.Customer);
  }
}

class Maitenance extends BaseEvent {
  constructor(customers) {
    super();
    //id	customer	category	state	purchaseOrder	project	paymentDelay	currency	total	duration	inAdvance	frequency	installment	first	last
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
    this.Customer = this.customers.find(x => x.customer == this.customer);
    if (this.Customer == null)
      this.customer += " (desconocido)";
  }
  
  getMovements(taxManager, start) {

    var cashflows = [];
    var categories = ["Ingresos", this.category, this.customer, ...(this.project.split("|").map(x => x.trim()))];
    var scenario;
    if (this.state == "Aprobado" || this.state == "Ok Informal")
      scenario = "Confirmado";
    else 
      scenario = this.state;
    
    var movs = [];
    
    if (this.Customer != null) {
      if (this.inAdvance > 0)
        movs = movs.concat(this.getMovs("sell", taxManager, scenario, this.id + "-ADV", "ADVANCE", categories, this.currency, this.inAdvance, this.first, addDays(this.first,7), this.Customer));
      
      for(var d = this.first; d.getTime() <= this.last.getTime(); d = addMonths(d, this.frequency))
        movs = movs.concat(this.getMovs("sell", taxManager, scenario, `${this.id}-${d.getYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`, getMonthName(d), categories, this.currency, this.installment, d, addDays(d,this.paymentDelay), this.Customer));
      }
    else
      throw `Invalid Customer ${this.customer}`;
  
    return movs;
    
  }
  
}
  
class Recurring {
  constructor() {
    //id	category	name	scenario	day	VAT	currency	amount_2020_09	amount_2020_10	amount_2020_11	amount_2020_12	amount_2021_01	amount_2021_02	amount_2021_03	amount_2021_04	amount_2021_05	amount_2021_06	amount_2021_07	amount_2021_08	amount_2021_09	amount_2021_10	amount_2021_11	amount_2021_12
    this.METADATA = 
    {
      TYPES: {
        id:        new StringType({nullable:false}),
        category:  new StringType({nullable:true}),
        name:      new StringType({nullable:false}),
        scenario:  new StringType({nullable:false}),
        day:       new NumberType({nullable:false}),
        VAT:       new NumberType({nullable:true}),
        currency:  new CurrencyType({nullable:false})
      },
      EOF: ["category", "name"],
      UNIQUE: x => x.id
    };
    
    var start = getYear(getToday());
    var end = start + MAX_YEARS;
    for(var y = start; y <= end; y++)
      for(var m = 1; m <= 12; m++)
        this.METADATA.TYPES[this.key(m,y)] = new NumberType({nullable:true});
  }
  
  init() {
  }
  
  key(month, year) {
    return "amount_" + year + "_" + ("" + month).padStart(2, "0");
  }

  getMovements(taxManager, start) {

    var cashflows = [];
    
    for(var y = getYear(start); y < getYear(getToday()) + MAX_YEARS; y++)
      for(var m = 1; m <= 12; m++)
      {
        var date = new Date(y, m-1, this.day);
        if (start.getTime() <= date.getTime())
        {
          var value = this[this.key(m, y)];
          if (value != null)
              cashflows.push(new SingleCashflow(date, new SingleQuantity(this.currency, -value)));
        }
      }
        
    var subCategories = this.name.split("|").map(x => x.trim());
    return cashflows.map(c => new Movement(["Egresos", this.category, ...subCategories], this.scenario, c));
  }
  
}

class Salary extends BaseEvent{
  constructor() {
    super();
    this.METADATA = 
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
  
  key(month, year) {
    return "salary_" + year + "_" + ("" + month).padStart(2, "0");
  }
  
  getMovements(taxManager, start) {

    var cashflows = [];
    
    for(var y = getYear(start); y < getYear(getToday()) + MAX_YEARS; y++)
      for(var m = 1; m <= 12; m++)
      {
        var date = addDays(new Date(y, m, 1), -1);
        if (start.getTime() <= date.getTime())
        {
          var value = this[this.key(m, y)];
          if (value != null)
          {
            var extra = this[this.key(m, y) + "_B"];
            if (extra != null && m == 6)
              cashflows.push(new SingleCashflow(date, new SingleQuantity(this.currency, -value - extra)));
            else if (extra != null && m == 12)
            {
              cashflows.push(new SingleCashflow(addDays(date,-16), new SingleQuantity(this.currency, -extra)));
              cashflows.push(new SingleCashflow(date, new SingleQuantity(this.currency, -value)));
            }
            else
              cashflows.push(new SingleCashflow(date, new SingleQuantity(this.currency, -value)));
          }
        }
      }
        
    return cashflows.map(c => new Movement(["Egresos", "Salarios", this.category, this.name], this.scenario, c));
  }
}

function treatObjects(source, errors) {
  for (var e of source.errors)
    errors.push(e);

  return source.items;  
}

function treatSource(taxManager, source, movs, errors, sortKey) {
  if (sortKey != null)
    source.items.sort((a, b) => compareStrings(sortKey(a).toString(), sortKey(b).toString()));
  
  for (var e of source.errors)
    errors.push(e);
  
  for (var item of source.items)
    for (var mov of item.getMovements(taxManager, getToday()))
      movs.push(mov);
}

function mReadData() {
  var movs = [];
  var errors = [];
  var feeLines = treatObjects(buildObjects("Comisiones", "A1:Z300", () => new FeeLine(), x => x.init()), errors);
  var fees = Fee.buildFromLines(feeLines);
  var taxManager = new TaxManager(fees);
  var customers = treatObjects(buildObjects("Clientes", "A1:Z300", () => new Customer(fees), x => x.init()), errors);
  treatSource(taxManager, buildObjects("Proyectos", "A1:Z300", () => new Project(customers), x => x.init()), movs, errors, x => x.customer + "@" + x.project);
  treatSource(taxManager, buildObjects("Mantenimientos", "A1:Z300", () => new Maitenance(customers), x => x.init()), movs, errors, x => x.customer + "@" + x.project);
  //treatSource(taxManager, buildObjects("Salarios", "A1:Z300", () => new Salary(), x => x.init()), movs, errors, x => x.category + "@" + x.name);
  //treatSource(taxManager, buildObjects("Recurrentes", "A1:Z300", () => new Recurring(), x => x.init()), movs, errors);
  return { movs: movs, errors: errors };
}