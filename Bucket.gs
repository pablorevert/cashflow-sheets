class Bucket {
  constructor(from, to, name) {
    this.from = from;
    this.to = to;
    this.name = name;
  }
  
  isMatch(date) {
    
    if (this.from == null && this.to == null)
      return true;
    else if (this.from == null && date.getTime() <= this.to)
      return true;
    else if (this.from <= date.getTime() && this.to == null)
      return true;
    else if (this.from <= date.getTime() && date.getTime() <= this.to)
      return true;
    else
      return false;  
  }

}

class BucketManager {
  constructor() {
    this.buckets = [];
  }
  
  add(bucket) {
    this.buckets.push(bucket);
  }
  
  getName(date) {
    var index = this.getIndex(date);
    if (index == -1)
      return null;
    else
      return this.buckets[index].name;
  }
  
  getIndex(date) {
    return this.buckets.findIndex(x => x.isMatch(date));
  }
}

function testBuckets() {

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
  
  var result = [];
  for(var d = addDays(t0, -2); d <= addDays(t0,30); d = addDays(d,1))
    result.push({date: d, name: buckets.getName(d), index: buckets.getIndex(d)});
  
  var a = JSON.stringify(result[0]);
  var b = JSON.stringify(result[1]);
  var c = JSON.stringify(result[2]);
  var d = JSON.stringify(result[3]);
  var e = JSON.stringify(result[6]);
  var f = JSON.stringify(result[7]);
  var g = JSON.stringify(result[8]);
  var h = JSON.stringify(result[9]);
  var i = JSON.stringify(result[15]);
  var j = JSON.stringify(result[16]);
  var k = JSON.stringify(result[17]);
  var l = JSON.stringify(result[18]);
}