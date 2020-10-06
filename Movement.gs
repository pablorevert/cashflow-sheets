class Movement {
  constructor(scenario, id, categories, date, amount, comment) {
    this.categories = ["Total"].concat(categories);
    this.id = id;
    this.scenario = scenario;
    this.date = date;
    this.amount = amount;
    this.comment = comment;
  }
}
Movement.SCENARIOS = {
  CONFIRMED: "Confirmado",
  VERY_LIKELY: "Muy Probable",
  PROBABLE: "Probable",
  UNLIKELY: "Poco Probable",
  CANCELLED: "Cancelado"
}

class CategoryLine {
  constructor(path, name) {
    this.path = path;
    this.name = name;
    this.values = new Map();
    this.index = null;
    this.childrenStart = null;
    this.childrenEnd = null;
    this.children = {};
    this.level = path.length;
    this.comments = new Map();
  }
  
  addComment(key, comment) {
    var previous = this.comments.get(key);
    if (previous != null)
      comment = previous + "\n" + comment;
    this.comments.set(key,comment);
  }
  
  add(key, aggregate, value) {
    var previous = this.values.get(key);
    var newValue = aggregate(previous, value);
    this.values.set(key, newValue);
  }
  
  asRow(buckets, f) {
    if (f == null) f = x => x;
    var row = new Array(buckets.length + 1).fill(0);
    if (this.level > 1)
       row[0] = "  ".repeat(this.level) + "- " + this.name;
    else
       row[0] = this.name;
    
    for(var i = 0; i < buckets.length; i++)
    {
      var bucket = buckets[i];
      var value = this.values.get(bucket.name);
      if (value != null)
        row[i+1] = f(value);
    }
    return row;
  }
}

class Scenario {
  constructor(buckets, getKey, getValue, aggregate) {
    this.buckets = buckets;
    this.getKey = getKey;
    this.getValue = getValue;
    this.aggregate = aggregate;
    this.tree = {children: {}};
    this.categories = [];
  }
  
  add(movement) {
    this.addCashflow(movement.categories, new SingleCashflow(movement.date, movement.amount), movement.comment);
  }
  
  addCashflow(categoryNames, cashflow, comment) {
    var key = this.getKey(cashflow);
    var value = this.getValue(cashflow);
    var path = [];
    var current = this.tree;
    for (var catName of categoryNames)
    {
      var category = current.children[catName];
      if (category == null)
      {
        category = new CategoryLine(path, catName);
        current.children[catName] = category
      }
      category.add(key, this.aggregate, value);
      path = Array.from(path);
      path.push(catName);
      current = category;
    }
    if (comment != null)
      current.addComment(key, comment);
  }
  
  _numerate() {
    this.categories = [];
    this._numerateNode(this.tree.children.Total, [0]);
  }
  
  _numerateNode(node, index) {
    node.index = ++index[0];
    this.categories.push(node);
    var children = Object.values(node.children);
    if (children.length > 0)
    {
      node.childrenStart = index[0] + 1;
      for(var child of children)
        this._numerateNode(child, index);
      node.childrenEnd = index[0];        
    }
  }
  
  asMatrix(f) {
    if (f == null) f = x => x;
    this._numerate();
    var matrix = [];
    var headers = [" "].concat(this.buckets.map(x => x.name));
    matrix.push(headers);
    for(var cat of this.categories)
      matrix.push(cat.asRow(this.buckets, f));
    return matrix;
  }
}


//TESTING
function testingMovements(){
  var a = new Movement(["Ingreso","Ventas","Proyectos","Mercdes-Benz Argentina","PIMs"], "Confirmado", new SingleCashflow(new Date(2020,9,1), new SingleQuantity("USD", 5438)));
  var b = new Movement(["Ingreso","Ventas","Mantenimientos","Mercdes-Benz Argentina","VANs"],"Confirmado",
                       new CompoundCashflow( new SingleCashflow(new Date(2020,9,1), new SingleQuantity("ARS", 145000)),
                                             new SingleCashflow(new Date(2020,10,1), new SingleQuantity("ARS", 145000))));
}

function buildTestMovements() {
  var t0 = getToday();
  return {
    "pim": new Movement(["Ingresos", "MBA", "PIMs"],"Confirmado",
                         new CompoundCashflow(
                           new SingleCashflow(t0, new SingleQuantity("USD", 5000)),
                           new SingleCashflow(new Date(2020,4,1), new SingleQuantity("USD", 5000)),
                           new SingleCashflow(new Date(2020,5,1), new SingleQuantity("USD", 5000)),

                           new SingleCashflow(new Date(2020,8,1), new SingleQuantity("USD", 5000))
                         )
                        ),
    "sfdm": new Movement(["Ingresos", "MBA", "SFDM"],"Confirmado",
                         new CompoundCashflow(
                           new SingleCashflow(new Date(2020,2,1), new SingleQuantity("ARS", 180000)),
                           new SingleCashflow(new Date(2020,3,1), new SingleQuantity("ARS", 180000)),
                           new SingleCashflow(new Date(2020,4,1), new SingleQuantity("ARS", 180000)),
                           new SingleCashflow(new Date(2020,5,1), new SingleQuantity("ARS", 180000)),
                           new SingleCashflow(new Date(2020,6,1), new SingleQuantity("ARS", 180000)),
                           new SingleCashflow(new Date(2020,7,1), new SingleQuantity("ARS", 180000)),
                           new SingleCashflow(new Date(2020,8,1), new SingleQuantity("ARS", 180000)),
                           new SingleCashflow(new Date(2020,9,1), new SingleQuantity("ARS", 180000)),
                           new SingleCashflow(new Date(2020,10,1), new SingleQuantity("ARS", 180000))
                           )
                          ),
    "maitenance": new Movement(["Ingresos", "MBA", "MAITENANCE"],"Confirmado",
                         new CompoundCashflow(
                           new SingleCashflow(new Date(2020,0,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,1,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,2,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,3,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,4,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,5,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,6,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,7,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,8,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,9,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,10,1), new SingleQuantity("ARS", 120000)),
                           new SingleCashflow(new Date(2020,11,1), new SingleQuantity("ARS", 120000))
                           )
                          )
  };
}

function buildBuckets() {
  var t0 = getToday();
  var t1 = addDays(t0,1);
  var w1 = addDays(t0,7);
  var w2 = addDays(t0,14);
  
  var buckets = new BucketManager();
  
  buckets.add(new Bucket(null, addDays(t0,-1), 'Past'));
  buckets.add(new Bucket(t0, t0, 'Today'));
  buckets.add(new Bucket(t1, t1, 'Tomorrow'));
  buckets.add(new Bucket(t1, w1, 'This week'));
  buckets.add(new Bucket(w1, w2, 'Next week'));
  buckets.add(new Bucket(w2, null, 'Science Fiction'));
  
  return buckets;
}

function testingDateScenarios() {
  var data = buildTestMovements();
  var scenario = new Scenario([], m => m.date.getTime(), m => m.amount, (p, n) => p != null ? p.add(n) : n);
  scenario.add(data.pim);
  scenario.add(data.sfdm);
  scenario.add(data.maitenance);
}

function testingBucketScenarios() {
  var data = buildTestMovements();
  var buckets = buildBuckets();
  var scenario = new Scenario(buckets.buckets, m => BUCKETS.getName(m.date), m => m.amount, (p, n) => p != null ? {"ARS": p.ARS.add(n), "Real": p.Real.add(n)} : {"ARS": n, "Real": n});
  scenario.add(data.pim);
  scenario.add(data.sfdm);
  scenario.add(data.maitenance);
  var keys = Array.from(scenario.tree.children.Total.values.keys());
  var values = Array.from(scenario.tree.children.Total.values.values());
  var matrix = scenario.asMatrix(x => x.Real.toString());
}