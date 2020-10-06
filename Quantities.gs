//Protocolo estándar de un Unit
class Unit {
  constructor(exponents) {
    if (typeof exponents == "string")
    {
      this.exponents = {};
      this.exponents[exponents] = 1;
    }
    else
      this.exponents = exponents;
  }
  
  toString() {
    var positives = Object.keys(this.exponents)
               .filter(u => this.exponents[u] > 0)
               .map(u => this.exponents[u] == 1 ? u : u + "^" + this.exponents[u]);
    var negatives = Object.keys(this.exponents)
               .filter(u => this.exponents[u] < 0)
               .map(u => this.exponents[u] == -1 ? u : u + "^" + (-this.exponents[u]));
    
    var numerator = positives.length > 0
                         ? positives.join(".")
                         : "1";
    
    var denominator = negatives.length > 0
                         ? (negatives.length > 1 ? "(" + negatives.join(".") + ")" : negatives[0])
                         : null;
    
    if (denominator != null)
      return numerator + "/" + denominator;
    else 
      return numerator;
  }
  
  multiply(unit) {
    var newExponents = Object.assign({}, this.exponents);
    Object.keys(unit.exponents)
          .forEach( u => {
             var e = unit.exponents[u];
             var c = newExponents[u];
             if (typeof c === "undefined")
                 c = 0;
    
             if ((e + c) == 0)
                delete newExponents[u];
             else
               newExponents[u] = e + c;
             });
     return new Unit(newExponents);
  }

  divide(unit) {
    var newExponents = Object.assign({}, this.exponents);
    Object.keys(unit.exponents)
          .forEach( u => {
             var e = unit.exponents[u];
             var c = newExponents[u];
             if (typeof c === "undefined")
                 c = 0;

             if ((c - e) == 0)
                delete newExponents[u];
             else
               newExponents[u] = c - e;
             });
     return new Unit(newExponents);
  }

}

//Protocolo estándar de un Quantity
// Sabe mostrarse
// Sabe sumarse y restarse con otro amount
// Sabe multiplicarse y dividirse por otro quantity
// Sabe multiplicarse y dividirse por un número

class SingleQuantity {
  constructor(unit, quantity) {
     this.unit = unit;
     this.quantity = Math.round(quantity * 100) / 100;
  }
  
  toString() {
    return this.unit + " " + (Math.round(this.quantity * 100) / 100).toLocaleString("es-ES",{minimumFractionDigits:0, maximumFractionDigits: 0, useGrouping: true});
  }

  add(quantity) {
    if (quantity instanceof SingleQuantity)
    {  
       if (_.isEqual(this.unit,quantity.unit))
          return new SingleQuantity(this.unit, this.quantity + quantity.quantity);
       else 
          return new CompoundQuantity(this, quantity);
    } 
    else
      return quantity.add(this);
  }
  
  negate() {
      return new SingleQuantity(this.unit, -this.quantity);
  }
  
  substract(quantity) {
    return this.add(quantity.negate());
  }
  
  multiply(number) {
    return new SingleQuantity(this.unit, this.quantity * number);
  }
}

class CompoundQuantity {
  constructor(...quantities) {
    this.quantities = [];
    for(var q of quantities)
        this._add(q);
    this._normalize();
  }
  
  toString() {
    return this.quantities.length > 0
           ? this.quantities.map(q => q.toString()).join(" + ")
           : "ZERO";
  }
  
  add(quantity) {
    var ret = new CompoundQuantity(...this.quantities);
    if (quantity instanceof SingleQuantity)
      ret._add(quantity);
    else
      for(var q of quantity.quantities)
        ret._add(q);

    ret._normalize();
    return ret;
  }
  
  negate() {
    return new CompoundQuantity(...(this.quantities.map(x => x.negate())));
  }
  
  substract(quantity) {
    return this.add(quantity.negate());
  }
  
  multiply(number) {
    return new CompoundQuantity(...(this.quantities.map(x => x.multiply(number))));
  }
  
  _add(singleQuantity) {
    var match = this.quantities.find(q => _.isEqual(q.unit,singleQuantity.unit));
    if (match)
    {
      _.remove(this.quantities, x => x === match);
      this.quantities.push(match.add(singleQuantity));
    }
    else
      this.quantities.push(singleQuantity);
  }
  
  _normalize() {
    this.quantities = this.quantities.filter(q => q.quantity != 0);
    this.quantities.sort((a, b) => compareStrings(a.unit.toString(), b.unit.toString()));
  }
}


//Testing Units

function testUnits() {
  
  var m = new Unit("m");
  var s = new Unit("s");
  var v = new Unit( {"m": 1, "s": -1});
  var a = new Unit({"m": 1, "s": -2});
  
  assert(m, "m");
  assert(s, "s");
  assert(v, "m/s");
  assert(a, "m/s^2");
  assert(m.divide(s), v);
  assert(m.divide(s).divide(s), a);
  assert(m.multiply(s), "m.s");
  assert(m.multiply(s).multiply(s), "m.s^2");
  assert(v.divide(v), "1");
}

//Testing Quantities 

function testQuantities() {
   var ars = new Unit("ARS");
   var usd = new Unit("USD");
   var eur = new Unit("EUR");
  
   var ars100 = new SingleQuantity(ars, 100);
   var ars500 = new SingleQuantity(ars, 500);
   var eur100 = new SingleQuantity(eur, 100);
   var eur500 = new SingleQuantity(eur, 500);
  
   assert(ars100.toString(), "100 ARS");
   assert(ars100.add(ars100), new SingleQuantity(ars, 200));
   assert(ars100.add(eur100), new CompoundQuantity(ars100, eur100));
   assert(eur100.add(ars100), new CompoundQuantity(ars100, eur100));
}

function testAmounts() {
   var ars = "ARS";
   var usd = "USD";
   var eur = "EUR";
  
   var ars100 = new SingleQuantity(ars, 100);
   var ars500 = new SingleQuantity(ars, 500);
   var eur100 = new SingleQuantity(eur, 100);
   var eur500 = new SingleQuantity(eur, 500);
  
   //add
   assert(ars100.toString(), "100 ARS");
   assert(ars100.add(ars100), new SingleQuantity(ars, 200));
   assert(ars100.add(eur100), new CompoundQuantity(ars100, eur100));
   assert(eur100.add(ars100), new CompoundQuantity(ars100, eur100));
  //negate
   assert(ars100.negate(), new SingleQuantity(ars, -100));
   assert(new CompoundQuantity(ars100, eur100).negate(), new CompoundQuantity(ars100.negate(), eur100.negate()));
  //multiply
   assert(ars100.multiply(0.5), new SingleQuantity(ars, 50));
   assert(new CompoundQuantity(ars100, eur100).multiply(2), new CompoundQuantity(ars100.multiply(2), eur100.multiply(2)));
   //substract
   assert(ars500.substract(ars100), new SingleQuantity(ars, 400));
   assert(new CompoundQuantity(ars500, eur500).substract(new CompoundQuantity(ars100, eur100)), new CompoundQuantity(ars100.multiply(4), eur100.multiply(4)));
}

