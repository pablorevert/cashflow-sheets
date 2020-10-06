class TaxDetail {
  constructor(data) {
    this.type = data.type;
    this.amount = data.amount;
    this.date = data.date;
    this.settled = data;
    this.fees = data.fees != null ? data.fees : [];
    this.taxes = data.taxes != null ? data.taxes : [];
    this.retentions = data.retentions != null ? data.retentions : [];
    this.perceptions = data.perceptions != null ? data.perceptions : [];
    this.refunds = data.refunds != null ? data.refunds : [];
    this.payed = data.payed != null ? data.payed : [];
  }
  
  getVatAmount() {
    var tax = this.taxes.find(t => t.name == "vat");
    if (tax == null)
      return 0;
    else
      return tax.amount.quantity;
  }
  
  getFeeAmount() {
    return this.fees.reduce((a, f) => a + f.amount.quantity, 0);
  }
  
  getFeeVatAmount() {
    return this.fees
               .map(f => f.taxes.find(t => t.name == "vat"))
               .reduce((a, f) => a + (f != null ? f.amount.quantity: 0), 0);
  }
  
  getRetentionsCurrency() {
    return this.settled.amount.unit;
  }
  
  getRetentionVat() {
    var retention = this.retentions.find(r => r.name == "vat");
    if (retention == null)
      return 0;
    else
      return retention.amount.quantity;
  }
  
  getRetentionIibb() {
    var retention = this.retentions.find(r => r.name == "iibb");
    if (retention == null)
      return 0;
    else
      return retention.amount.quantity;
  }
  
  getRetentionWht() {
    var retention = this.retentions.find(r => r.name == "wht");
    if (retention == null)
      return 0;
    else
      return retention.amount.quantity;
  }
  
  getRetentionSuss() {
    var retention = this.retentions.find(r => r.name == "suss");
    if (retention == null)
      return 0;
    else
      return retention.amount.quantity;
  }
}

class TaxManager {
  constructor(fees) {
    this.taxes = {
      vat: { descr: "IVA", period: {type: "monthly", settle_day: 22, payment_delay: 3, from: "invoice"}, base: "amount", ratio: 0.21, appliesTo: ["local"], increaseInvoiced: true, categories: ["Egresos","Impuestos", "IVA", "Impuesto"] },
      iibb: { descr: "IIBB",period: {type: "monthly", settle_day: 14, payment_delay: 1, from: "settle"}, base: "amount", ratio: 0.05, appliesTo: ["local"], categories: ["Egresos","Impuestos", "Ingresos Brutos", "Impuesto"] },
      wht:  { descr: "Ganancias",period: {type: "yearly", settle_day: 20, year_close_month: 6, payment_delay: 4, from: "invoice"}, base: "amount", ratio: 0.35, appliesTo: ["local","export"], categories: ["Egresos","Impuestos", "Ganancias", "Ingresos"] },
      db_cr: { descr: "DB/CR",period: {type: "daily", payment_delay: 0, from: "settle"}, base: "settled.amount", refundTo: "wht", refundRatio: 1, ratio: 0.006, appliesTo: ["local","export"], settle: true, categories: ["Egresos","Impuestos", "DB/CR","Source"] }
    };
    this.retentions = {
      vat: { descr: "IVA", period_override: { payment_delay: 1, from: "settle"}, base: "taxes.vat.amount", categories: ["Egresos","Impuestos", "IVA", "Retenciones"] },
      iibb: { descr: "IIBB", period_override: { payment_delay: 1, from: "settle"}, base: "amount", categories: ["Egresos","Impuestos", "Ingresos Brutos", "Retenciones"] }, 
      suss: { descr: "SUSS", period_override: { type: "monthly", settle_day: 10, payment_delay: 1, from: "settle"}, base: "amount", categories: ["Egresos","Salarios", "Cargas Sociales", "Retenciones"] }, 
      wht:  { descr: "Ganancias", period_override: { payment_delay: 1, from: "settle"}, base: "amount", categories: ["Egresos","Impuestos", "Ganancias", "Retenciones"] }
    };
    this.fees = fees;
  }
  
  addAll(amount, values) {
    var value = amount;
    for(var val of values)
       value = value.add(add);
    return value;
  }

  substractAll(amount, values) {
    var value = amount;
    for(var val of values)
       value = value.substract(add);
    return value;
  }

  
  elements(obj) {
    return Object.entries(obj).map(x => Object.assign({}, x[1], { name: x[0] }));
  }
  
  taxesFromSalary(invoice_date, settle_date, amount) {
    var detail = {
      type: "outcome",
      amount: amount,
      date: invoice_date,
      settled: {date: settle_date, amount: amount},
      fees: [],
      taxes: [],
      retentions: [],
      perceptions: [],
      refunds: [],
      payed: []
    }
    
    for(var tax of this.elements(this.taxes).filter(t => t.base == "settled.amount" && t.appliesTo.indexOf(type) != -1))
      detail.taxes.push(this.calculateMyTax(tax, invoice_date, settle_date, detail));
  }
    
  taxesFromBuy(invoice_date, settle_date, settle, vat, perceptions) {
    var detail = {
      type: "outcome",
      date: invoice_date,
      settled: { date: settle_date, amount: settle},
      fees: [],
      taxes: [],
      retentions: [],
      perceptions: [],
      refunds: [],
      payed: []
    };
    
    if (vat != null)
      detail.payed.push(this.buildPayedTax("vat", vat, invoice_date, settle_date, detail));
                        
    for(var p of perceptions)
      detail.perceptions.push(this.buildPayedPerception(p.name, p.amount, invoice_date, settle_date, detail));
    
    var amount = detail.settled.amount;
    
    for(var pay of detail.payed)
      amount = amount.substract(pay.amount);

    for(var p of detail.perceptions)
      amount = amount.substract(p.amount);
    
    detail.amount = amount;
    
    detail.payed.push(this.calculateMyTax(Object.assign({},this.taxes.wht,{name: "wht"}), invoice_date, settle_date, detail));
    
    return detail;
  }
  
  buildPayedTax(tax_name, amount, invoice_date, settle_date, values) {
    var tax = this.taxes[tax_name]; 
    var res =     { 
                     name: tax_name,
                     type: tax,
                     date: this.dateFrom(invoice_date, settle_date, tax.period)
                   };
    res.amount = amount;
    return res;
  }
  
    buildPayedPerception(perception_name, amount, invoice_date, settle_date, values) {
    var tax = this.taxes[perception_name];
    var params = this.retentions[perception_name];
    var res =     { 
                     name: perception_name,
                     type: params,
                     date: this.dateFrom(invoice_date, settle_date, tax != null ? tax.period : {}, params.period_override)
                   };
    res.amount = amount;
    return res;
  }
  
  taxesFromSell(invoice_date, settle_date, amount, customer) {
    var detail = new TaxDetail({
      type: "income",
      date: invoice_date,
      amount: amount
    });

    var type = customer.isLocal() ? "local" : "export";
    
    for(var tax of this.elements(this.taxes).filter(t => t.base != "settled.amount" && t.appliesTo.indexOf(type) != -1))
      detail.taxes.push(this.calculateMyTax(tax, invoice_date, settle_date, detail));
    
    for(var fee of this.fees.filter(f => f.appliesTo.indexOf(type) != -1))
      detail.fees.push(this.calculateFee(fee, invoice_date, settle_date, detail));
    
    for(var retention of customer.retentions)
      detail.retentions.push(this.calculateCustomerRetention(retention, invoice_date, settle_date, detail));

    //Calculates Settled
    var settled = detail.amount;
    for(var tax of this.elements(detail.taxes).filter(t => t.type.increaseInvoiced))
      settled = settled.add(tax.amount);
    
    for(var fee of detail.fees)
      settled = settled.substract(fee.total);
    
    for(var retention of detail.retentions)
      settled = settled.substract(retention.amount);

    detail.settled = {date: settle_date, amount: settled};
    
    for(var tax of this.elements(this.taxes).filter(t => t.base == "settled.amount" && t.appliesTo.indexOf(type) != -1))
      detail.taxes.push(this.calculateMyTax(tax, invoice_date, settle_date, detail));

    for(var tax of detail.taxes.filter(t => t.type.refundTo != null))
      detail.refunds.push(this.calculateRefund(tax, invoice_date, settle_date, detail));
    
    for(var fee of detail.fees)
      for(var tax of fee.taxes)
        detail.payed.push(tax);
    
    return detail;
  }
    
  calculateFee(fee, invoice_date, settle_date, values) {
    var res = 
        {
          name: fee.name,
          type: fee,
          date: settle_date,
          base: values.amount
        };
    res.amount = fee.feeFor(res.base);
    res.taxes = fee.taxes.map(name => this.calculateMyTax(Object.assign({},this.taxes[name],{name: name}), settle_date, settle_date, res));
    res.total = res.amount;
    for(var tax of this.elements(res.taxes).filter(t => t.type.increaseInvoiced))
      res.total = res.total.add(tax.amount);
    return res;
  }
  
  calculateMyTax(tax, invoice_date, settle_date, values, calc) {
    var res = 
        { name: tax.name,
          type: tax,
          date: this.dateFrom(invoice_date, settle_date, tax.period),
          base: this.getValue(values, tax.base),
          ratio: tax.ratio
        };
    res.amount = res.base.multiply(res.ratio);
    return res;
  }

  calculateRefund(tax, invoice_date, settle_date, values) {
    var params = this.taxes[tax.type.refundTo];
    var res = 
        {
          source: tax,
          name: tax.type.refundTo,
          type: params,
          date: this.dateFrom(invoice_date, settle_date, params.period),
          base: tax.amount,
          ratio: tax.type.refundRatio
        };
    res.amount = res.base.multiply(tax.type.refundRatio);
    return res;
  }
  
  calculateCustomerRetention(retention, invoice_date, settle_date, values) {
    var tax = this.taxes[retention.name];
    var params = this.retentions[retention.name];
    var retention = 
        {
          name: retention.name,
          type: params,
          date: this.dateFrom(invoice_date, settle_date, tax != null ? tax.period : {}, params.period_override),
          base: this.getValue(values, params.base),
          ratio: retention.ratio
        };
    retention.amount = retention.base.multiply(retention.ratio);
    return retention;
  }
    
  getValue(values, name) {
    var paths = name.split(".");
    var val = values;
    for(var p of paths) {
       if (val == null)
          var i = 9;
       if (val instanceof Array)
         val = val.find(x => x.name == p);
       else
         val = val[p];
    }
    return val;
  }
  
  dateFrom(invoice_date, settle_date, period, period_override) {
    var period = Object.assign({}, period, period_override != null ? period_override : {});
    var start = period.from == "invoice" ? invoice_date : settle_date;
    if (period.type == "daily")
      return start;
    else if (period.type == "monthly") {
      var date = addMonths(start, period.payment_delay);
      date.setDate(period.settle_day)
      return date;
    }
    else
    {
      if ((start.getMonth() + 1) <= period.year_close_month) 
        //Mismo Año
        return addMonths(new Date(getYear(start), period.year_close_month,period.settle_day), period.payment_delay);
      else
        //Próximo Año
        return addMonths(new Date(getYear(start) + 1, period.year_close_month, period.settle_day), period.payment_delay);
    }
  }
  
  getTaxInfo(type, origin, categories, description, invoice_date, settlement_date, amount, settlement) {
    var taxInfo = {};
    var base = { amount: amount, settled: { amount: settlement } };
    var name = `- ${description} (${categories.slice(1).join(", ")})`;
    
    taxInfo.settlement = {date: settlement_date, sign: type == Event.TYPES.SELL ? 1 : -1, comment: null};
  
    taxInfo.vat = {date: this.dateFrom(invoice_date, settlement_date, this.taxes.vat.period), sign: type == Event.TYPES.SELL ? -1 : 1, comment: name, categories: ["Egresos", "Impuestos", "IVA", type == Event.TYPES.SELL ? "IVA Ventas" : "IVA Compras"]};
  
    taxInfo.iibb = {date: this.dateFrom(invoice_date, settlement_date, this.taxes.iibb.period), comment: name, categories: ["Egresos", "Impuestos", "IIBB", "Impuesto"],
                    amount: (type == Event.TYPES.SELL && origin == Event.ORIGINS.LOCAL) ? -this.getValue(base, this.taxes.iibb.base) * this.taxes.iibb.ratio : 0 };
  
    taxInfo.db_cr = {date: this.dateFrom(invoice_date, settlement_date, this.taxes.db_cr.period), comment: null, categories: ["Egresos", "Impuestos", "DB/CR", "Impuesto"],
                    amount: -this.getValue(base, this.taxes.db_cr.base) * this.taxes.db_cr.ratio };
    
    taxInfo.fee_vat = {date: this.dateFrom(invoice_date, settlement_date, this.taxes.vat.period, this.retentions.vat.period_override), sign: 1, comment: name, categories: ["Egresos", "Impuestos", "IVA", "IVA Compras"]};
    taxInfo.ret_per_vat = {date: this.dateFrom(invoice_date, settlement_date, this.taxes.vat.period, this.retentions.vat.period_override), sign: 1, comment: name, categories: ["Egresos", "Impuestos", "IVA", "Retenciones/Percepciones"]};
    taxInfo.ret_per_iibb= {date: this.dateFrom(invoice_date, settlement_date, this.taxes.iibb.period, this.retentions.iibb.period_override), sign: 1, comment: name, categories: ["Egresos", "Impuestos", "IIBB", "Retenciones/Percepciones"]};
    taxInfo.ret_per_wht = {date: this.dateFrom(invoice_date, settlement_date, this.taxes.wht.period, this.retentions.wht.period_override), sign: 1, comment: null, categories: ["Egresos", "Impuestos", "Ganancias", "Retenciones/Percepciones"]};
    taxInfo.ret_per_suss = {date: this.dateFrom(invoice_date, settlement_date, {}, this.retentions.suss.period_override), sign: 1, comment: name, categories: ["Egresos", "Salarios", "Cargas Sociales", "Retenciones/Percepciones"]};
  
    taxInfo.refund_db_cr_wht = {date: this.dateFrom(invoice_date, settlement_date, this.taxes.wht.period, this.retentions.wht.period_override), sign: 1, comment: null, categories: ["Egresos", "Impuestos", "Ganancias", "Reintegro DB/CR"]};
  
    return taxInfo;
  }
}

function printDetail(invoice, detail) {
  var data = [];
  data.push(`Invoice:\t ${invoice.invoice_date.toLocaleDateString()} ${invoice.id} ${invoice.customer.name} ${detail.amount}`); 
  data.push(`Settle:\t${detail.settled.date.toLocaleDateString()} ${detail.settled.amount}`); 
  detail.fees.forEach(f =>
    {
      data.push(`Fee: ${f.date.toLocaleDateString()} ${f.name} ${f.total}`);
      f.taxes.map(t => `Fee=>Tax: ${t.date.toLocaleDateString()} ${t.name} ${t.amount}`).forEach(x => data.push(x));
    });
  detail.taxes.map(t => `Tax: ${t.date.toLocaleDateString()} ${t.name} ${t.amount}`).forEach(x => data.push(x));
  detail.refunds.map(t => `Refund: ${t.date.toLocaleDateString()} ${t.name} ${t.amount}`).forEach(x => data.push(x));
  detail.retentions.map(t => `Retention: ${t.date.toLocaleDateString()} ${t.name} ${t.amount}`).forEach(x => data.push(x));
  detail.perceptions.map(t => `Perception: ${t.date.toLocaleDateString()} ${t.name} ${t.amount}`).forEach(x => data.push(x));
  detail.payed.map(t => `Payed: ${t.date.toLocaleDateString()} ${t.name} ${t.amount}`).forEach(x => data.push(x));

  return data;
}

function testSeellerTaxes() {
  var feeLines = [
    FeeLine.fromData({ code: "Credicoop", currency: "USD", from: 0, to: 500, fixed: 15, variable: 0, min: null, max: null }),
    FeeLine.fromData({ code: "Credicoop", currency: "USD", from: 500, to: 1000, fixed: 25, variable: 0, min: null, max: null }),
    FeeLine.fromData({ code: "Credicoop", currency: "USD", from: 1000, to: null, fixed: 0, variable: 0.002, min: 75, max: null })
    ];
    
  var fees = Fee.buildFromLines(feeLines);
  
  var taxesManager = new TaxManager(fees);
  
  var localCustomer = {
    name: "Mercedes-Benz Argentina S.A.U.",
    country: "Argentina",
    isLocal: x => true,
    retentions: [
      { name: "vat", base: "vat", ratio: 0.8 },
      { name: "iibb", base: "amount", ratio: 0.02 },
      { name: "wht", base: "amount", ratio: 0.014 },
      { name: "suss", base: "amount", ratio: 0.01 }
    ]
  };

  var foreignCustomer = {
    name: "Mercedes-Benz Charleston",
    country: "Estados Unidos",
    isLocal: x => false,
    retentions: []
  };


  var localBuy = {  
                id: "0024-00000001",
                customer: {name: "iPlan"},
                invoice_date: new Date(2020, 3, 1),
                settle_date: new Date(2020,3,2),
                settle: new SingleQuantity("ARS", 1270000),
                vat: new SingleQuantity("ARS", 210000),
                perceptions: [{name: "iibb", amount: new SingleQuantity("ARS", 10000)}, {name: "suss", amount: new SingleQuantity("ARS", 50000)}]
               };

  var localInvoice = { id: "0001-000000058", 
                     invoice_date: new Date(2020, 3, 1), 
                     customer: localCustomer, 
                     settle_date: new Date(2020, 3, 30), 
                     amount: new SingleQuantity("ARS", 1000000) };

  var exportInvoice = { id: "0001-000000059",
                     invoice_date: new Date(2020, 3, 1),
                     customer: foreignCustomer,
                     settle_date: new Date(2020, 3, 30),
                     amount: new SingleQuantity("USD", 20000) };

  var result = {
               localBuy:    printDetail(localBuy, taxesManager.taxesFromBuy(localBuy.invoice_date, localBuy.settle_date, localBuy.settle, localBuy.vat, localBuy.perceptions)),
               localSell:   printDetail(localInvoice, taxesManager.taxesFromSell(localInvoice.invoice_date, localInvoice.settle_date, localInvoice.amount, localInvoice.customer)),
               exportSell:  printDetail(exportInvoice, taxesManager.taxesFromSell(exportInvoice.invoice_date, exportInvoice.settle_date, exportInvoice.amount, exportInvoice.customer))
    };

  
}




