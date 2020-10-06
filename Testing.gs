function assertDates(value, expected) {

  //Valido nulos
  if (value == null && expected == null)
    return;
  else if (value == null || expected == null)
    throw "[ERROR][0] value '" + nvl(value, "null") + "' <=> expected: '" + nvl(expected, "null") + "'";  
  
  //Convierto a fecha
  if (typeof value === "string")
    value = new Date(value);
  if (typeof expected === "string")
    expected = new Date(expected);
  
  //Comparo valores
  if (value.valueOf() == expected.valueOf())
    return;
  else
    throw "[ERROR][1] value: '" + value + "' <=> expected: '" + expected + "'";
}

function assert(value, expected) {
  if (_.isEqual(value, expected))
    return;
  else if (value == expected)
    return;
  else 
    throw "[ERROR] value: '" + nvl(value, "null") + "' <=> expected: '" + nvl(expected, "null") + "'";  
}

function assertNot(value, expected) {
  if (value != expected)
    return;
  else
    throw "[ERROR] value: '" + nvl(value, "null") + "' <=> not expected: '" + nvl(expected, "null") + "'";  
}

function assertThrow(f, name) {
  try {
    f();
    throw name + " does nto throw and exception";
  }
  catch (err) {return;}
}

function testAssertDates() {
  assertDates(null, null);
  assertThrow( () => assertDates(null, new Date()), "assertDates(null, new Date())");
  assertThrow( () => assertDates(new Date(), null), "assertDates(new Date(), null)");
  assertDates(new Date(2020,0,1), "2020-01-01T00:00");
  assertDates(new Date(2020,0,1), new Date(2020,0,1));
  assertDates("2020-01-01T00:00", "2020-01-01T00:00");
  assertThrow( () => assertDates("2020-01-02T00:00", "2020-01-01T00:00"), "assertDates(\"2020-01-02T00:00\", \"2020-01-01T00:00\")");

}