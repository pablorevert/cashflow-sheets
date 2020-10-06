class SingleCashflow {
  constructor(date, amount) {
    this.date = date;
    this.amount = amount;
  }
  
  add(cashflow) {
    if (cashflow instanceof CompoundCashflow)
      return cashflow.add(this);
    else if (cashflow.date.getTime() == this.date.getTime())
       return new SingleCashflow(this.date, this.amount.add(cashflow.amount));
    else
      return new CompoundCashflow(this, cashflow);
  }
  
  asSingleCashflows() {
    return [this];
  }
  
  toString() {
    return `(${this.date != null ? this.date.toLocaleString() : "no date"}=>${this.amount})`
  }
}

class CompoundCashflow {
  constructor(...cashflows) {
    this.cashflows = {};
    for(var c of cashflows)
      this._add(c);
  }
  
  add(cashflow) {
    var ret = new CompoundCashflow(this);
    ret._add(cashflow);
    return ret;
  }
  
  _add(cashflow) {
    if (cashflow instanceof SingleCashflow)
      this._addSingleCashflow(cashflow);
    else
       for(var date of Object.keys(cashflow.cashflows))
         this._addSingleCashflow(cashflow.cashflows[date]);
  }
  
  _addSingleCashflow(singleCashflow) {
    var previous = this.cashflows[singleCashflow.date];
    var current;
    if (previous != null)
      current = previous.add(singleCashflow);
    else
      current = singleCashflow;
    this.cashflows[singleCashflow.date] = current;
  }
  
  asSingleCashflows() {
    return Object.values(this.cashflows);
  }
  
  toString() {
    return `[${Object.values(this.cashflows).map(x => x.toString()).join(",\n")}]`;
  }
}

class Finance {
  constructor() {
    this.FXs = {
      "ARS": { "ARS":  1.0,       "USD": 1.0 / 79.5,   "EUR": 1.0 / (91) },
      "USD": { "ARS": 79.5,       "USD": 1.0,          "EUR": 79.50 / 91.0},
      "EUR": { "ARS": 91.0,       "USD": 91.0 / 79.5,  "EUR": 1.0}
    };
    this.RATEs = {
      "ARS": 0.4,
      "USD": 0.01,
      "EUR": 0.01
    }
  }
  
  convert(item, currency) {
    if (item instanceof SingleQuantity)
      return this._convertSingleAmount(item, currency);
    else if (item instanceof CompoundQuantity)
      return this._convertCompoundAmount(item, currency);
    else if (item instanceof SingleCashflow)
      return this._convertSigleCashflow(item, currency);
    else if (item instanceof CompoundCashflow)
      return this._convertCoumpundCashflow(item, currency);
    else
      throw `Unnable to concert ${item} of type ${typeof item} to ${currency}`;
  }
  
  convertAsOf(date, item, currency) {
    //En un futuro el tipo de cambio deberá depender de la fecha
    return this.convert(item, currench);
  }
  
  _convertSingleAmount(amount, currency) {
    return new SingleQuantity(currency, amount.quantity * this.FXs[amount.unit][currency]);
  }
  _convertCompoundAmount(amount, currency) {
    var converted = new SingleQuantity(currency, 0);
    for(var single of amount.quantities)
       converted = converted.add(this._convertSingleAmount(single, currency));
    return converted;
  }
  _convertSigleCashflow(cashflow, currency) {
    return new SingleCashflow(cashflow.date, this.convertAsOf(cashflow.date, cashflow.amount, currency));
  }
  
  _convertCoumpundCashflow(cashflow, currency) {
    return new CompoundCashflow(cashflow.asSingleCashflows().map(c => this.convert(c, currency)));
  }
}
/*
var Finance = function() {
  
  self.asDateOf = function(singleCashflow, date) {
    var days = DateDiff(singleCashflow.date, date, DATE_UNITS.days);
    var rate = self.RATEs[singleCashflow.currency];
    if (days > 0)
      var amount = singleCashflow.amount * (1 + rate * days / 365);
    else
      var amount = singleCashflow.amount / (1 + rate * -days / 365);

    return new SimplCashflow(date, singleCashflow.currency, amount);
  }
  
  self.convert = function(singleCashflow, currency) {
    return new SingleCashflow(
      singleCashflow.date,
      currency,
      singleCashflow.amount * self.FXs[singleCashflow.currency][currency]
      );
  }
  
  self.convertAsDateOf = function(singleCashflow, date, currency) {
    return self.asDateOf(self.convert(singleCashflow, currency), date);
  }
}*/

var FINANCE = new Finance();

var CURRENCY = {
  ARS: "ARS",
  USD: "USD",
  EUR: "EUR",
  LOCAL: "ARS",
  values: ["ARS","USD","EUR"]
}

//TEST FINANCE

function testCashflows() {
  var ars = "ARS";
  var usd = "USD";
  var ars100 = new SingleQuantity(ars,100);
  var ars500 = new SingleQuantity(ars,500);
  var usd100 = new SingleQuantity(usd,100);
  var usd500 = new SingleQuantity(usd, 500);
  
  var march100Ars = new SingleCashflow(new Date(2020, 2, 1), ars100);
  var april100Ars = new SingleCashflow(new Date(2020, 3, 1), ars100);
  var may100Ars = new SingleCashflow(new Date(2020, 4, 1), ars100);
  var june500Ars = new SingleCashflow(new Date(2020, 5, 1), ars500);
  
  var a = may100Ars.add(june500Ars);
  var b = april100Ars.add(a);
  var c = march100Ars.add(b);
  var d = march100Ars.add(c);
}

function testAsSingleCashflows() {
  var ars = "ARS";
  var usd = "USD";
  var jan100Ars = new SingleCashflow(new Date(2020, 0, 1), new SingleQuantity(ars, 100));
  var feb100Ars = new SingleCashflow(new Date(2020, 1, 1), new SingleQuantity(ars, 100));
  var both = new CompoundCashflow(jan100Ars, feb100Ars);
  
  assert(jan100Ars.asSingleCashflows(), [jan100Ars]);
  assert(both.asSingleCashflows(), [jan100Ars, feb100Ars]);
}

function testConversions() {
  assert(FINANCE._convertSingleAmount(new SingleQuantity("USD", 100), "ARS"), new SingleQuantity("ARS", 7500));
  assert(FINANCE._convertCompoundAmount(new CompoundQuantity(new SingleQuantity("USD", 100), new SingleQuantity("ARS", 500)), "ARS"), new SingleQuantity("ARS", 8000));
  assert(FINANCE._convertSingleAmount(new SingleQuantity("USD", 100), "ARS"), new SingleQuantity("ARS", 7500));
  assert(FINANCE._convertCompoundAmount(new CompoundQuantity(new SingleQuantity("USD", 100), new SingleQuantity("ARS", 500)), "ARS"), new SingleQuantity("ARS", 8000));
}