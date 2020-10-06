class SortLine {
  constructor() {
    this.METADATA = 
    {
      TYPES: {
        cat1:       new StringType({nullable:false}),
        cat2:   new StringType({nullable:true}),
        cat3:   new StringType({nullable:true}),
        cat4:   new StringType({nullable:true}),
        cat5:   new StringType({nullable:true}),
      },
      EOF: ["cat1"],
      UNIQUE: x => x.customer
    };
    this.categories = [];
    this.sortNumber = 0;
  }
  
  init() {
    if (this.cat1 != null) {
      this.categories.push(this.cat1);
      if (this.cat2 != null) {
        this.categories.push(this.cat2);
        if (this.cat3 != null) {
          this.categories.push(this.cat3);
          if (this.cat4 != null) {
            this.categories.push(this.cat4);
            if (this.cat5 != null) {
              this.categories.push(this.cat5);
            }
          }
        }
      }
    }
  }
  
  length() {
    return this.categories.length;
  }
  
  cat(index) {
    return this.categories[index];
  }
  
  catAsArray() {
    return Array.from(this.categories);
  }
}

class CategoriesSorter {
  constructor(lines) {
    this.lines = lines;
    this.sortNumbers = new Map();
    this.fillSortNumbers();
  }
  
  fillSortNumbers() {
    var ids = [0,0,0,0,0];
    var cats = ["","","","",""];
    for(var i = 0; i < this.lines.length; i++)
    {
      var line = this.lines[i];
      var len = line.length();
      for(var j = 0; j < len; j++)
      {
        if (cats[j] != line.cat(j))
        {
          cats[j] = line.cat(j);
          ids[j]++;
          for(var k = j+1; k < 5; k++) {
            cats[k] = "";
            ids[k] = 0;
          }
        }
      }
      var sortNumber = 0;
      for(var j = 0; j < 5; j++) {
        sortNumber = sortNumber * 100
        if (j < len)
          sortNumber += ids[j]
      }
      line.sortNumber = sortNumber;
      var key = this.keyOf(line.catAsArray());
      this.sortNumbers.set(key, sortNumber);
    }
  }
  
  keyOf(arr) {
    return arr.map(x => `"${x.toString().trim().toLowerCase()}"`).join("|");
  }
  
  sortNumberOf(categories) {
    for(var l = categories.length; l > 0; l--) {
      var key = keyOf(categories.slice(0, l));
      var sortNumber = this.sortNumbers.get(key)
      if (key != null)
        return key;
    }
    return 0;
  }
}
