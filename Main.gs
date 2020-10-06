function readTable(data, sheetName, range, builder, initializer, ...names) {
  var result = buildObjects(sheetName, range, builder, initializer);

  for (var e of result.errors)
    data.errors.push(e);

  for (var name of names)
    if (data[name] == null)
      data[name] = [];
  
  for (var item of result.items)
    for (var name of names)
      data[name].push(item);
  
}

function buildBucketManager(lastBalance, weeks, months, years, today) {

  if (today == null)
    today = getToday(); //Hoy
  
  var buckets = new BucketManager();
  
  //Último del mes anterior
  var start = addDays(today, -today.getDate());
  //Lunes pasado
  var lastMonday = addDays(today, today.getDay() == 0 ? -6 : -today.getDay() + 1);
  //Primera Semana
  var weekStart = addDays(lastMonday, weeks * 7);
  //Acomodo la fecha para siempre tener un saldo anterior
  if (lastMonday.getTime() == today.getTime())
    lastMonday = addDays(lastMonday, -1);
  if (lastMonday.getTime() > lastBalance.getTime())
    lastMonday = lastBalance;
  //Próximo mes
  var monthStart = addMonths(addDays(weekStart, -weekStart.getDate() + 1), 1);
  //Último mes
  var monthEnd = addMonths(monthStart, months);
  //Cierre de año
  var nextYear = addMonths(monthEnd, 12 - monthEnd.getMonth());
  //Último año
  var lastYear = addDays(addMonths(nextYear, 12 * years), -1); 
  
  buckets.add(new Bucket(null, start, "Anterior"));
  if (addDays(start,1).getTime() <= addDays(lastMonday,-1).getTime())
    buckets.add(new Bucket(addDays(start,1), addDays(lastMonday, -1), "Este mes"));

  var days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"];
  
  for(var d = lastMonday; d.getTime() < today.getTime(); d = addDays(d, 1)) {
    buckets.add(new Bucket(d, d, days[d.getDay()] + " " + d.getDate()));
  }

  buckets.add(new Bucket(today, addDays(today, 0.25), "Hoy Liq."));
  buckets.add(new Bucket(addHours(today, 6), addHours(today, 23), "Hoy Pend."));

  for(var d = addDays(today, 1); d.getTime() < weekStart.getTime(); d = addDays(d, 1)) {
    buckets.add(new Bucket(d, d, (d.getDate() != 1 ? `${days[d.getDay()] + " " + d.getDate()}` : `${getMonthName(d)}\n${days[d.getDay()] + " " + d.getDate()}`)));
  }

  var lastYearLastDay = new Date(1900 + today.getYear()-1, 11, 31);
  var diff = dateDiff(lastYearLastDay, weekStart, DATE_UNITS.days) - 1;
  var i = Math.ceil( diff / 7.0) + 1;
  for(var d = weekStart; d <= addDays(monthStart, -1); d = addDays(d, 7)) {
    var to = addDays(d, 6);
    if (to.getTime() >= addDays(monthStart, -1))
       to = addDays(monthStart, -1);
    buckets.add(new Bucket(d, to, `Semana ${i++}`));
  }

  for(var d = monthStart; d.getTime() < monthEnd.getTime(); d = addMonths(d, 1)) {
    buckets.add(new Bucket(d, addDays(addMonths(d,1),-1), (d.getMonth() != 0 ? `${getMonthName(d)}` : `${d.getYear() + 1900}\n${getMonthName(d)}`)));
  }
  
  if (addDays(monthEnd,1).getTime() < addDays(nextYear, -1).getTime()) {
    buckets.add(new Bucket(addDays(monthEnd,1), addDays(nextYear, -1), (monthEnd.getMonth() == 0 ? (monthEnd.getYear() + 1900) :  "Resto de " +  (monthEnd.getYear() + 1900))));
  }

  for(var d = nextYear; d.getTime() < lastYear.getTime(); d = addMonths(d, 12)) {
    buckets.add(new Bucket(d, addDays(addMonths(d, 12), -1), (d.getYear() + 1900)));
  } 
  return buckets;
}


function last(arr) {
  return arr[arr.length-1];
}

function readData() {
  var data = { errors: [] };

  //Leo la info de parametros
  readTable(data, "Params", "D1:E100", () => new SortLine(), x => x.init(), "sort_lines");
  data.categories_sorter = new CategoriesSorter(data.sort_lines);
  readTable(data, "Comisiones", "A1:Z300", () => new FeeLine(), x => x.init(), "fee_lines");
  data.fees = Fee.buildFromLines(data.fee_lines)
  data.tax_manager = new TaxManager(data.fees);
  readTable(data, "Clientes", "A1:Z300", () => new Customer(data.fees), x => x.init(), "customers");
  readTable(data, "Saldos", "A1:G300", () => new Balance(), x => x.init(), "balances");
  data.balances_by_date = data.balances.reduce((o, e) => { o[e.date] = e; return o;}, {});
  
  //Calculo las fechas para los buckets
  data.date_today = getToday();
  data.yesterday_balance = data.balances[data.balances.length-1];
  var lastMonthDay = addDays(data.date_today, -data.date_today.getDate());
  var filtered = data.balances.filter(b => b.date.getTime() <= lastMonthDay.getTime());
  data.previous_balance = this.last(filtered);
  
  //Calculo los buckets
  data.bucket_manager = buildBucketManager(data.yesterday_balance.date, 2, 3, 1, data.date_today);
  
  //Leo las entradas y los eventos
  readTable(data, "Proyectos", "A1:Z300", () => new ProjectEntry(data.customers), x => x.init(), "projects", "entries");
  //readTable(data, "Mantenimientos", "A1:Z300", () => new Maitenance(data.customers), x => x.init(), "maitenance", "entries");
  
  readTable(data, "Pendientes", "A2:W1000", () => new Event(), x => x.init(), "events");
  readTable(data, "Facturados", "A2:W1000", () => new Event(), x => x.init(), "events");
  readTable(data, "Cancelados", "A2:W1000", () => new Event(), x => x.init(), "events");
  readTable(data, "Liquidados", "A2:W1000", () => new Event(), x => x.init(), "events");
  readTable(data, "Historicos", "A2:W1000", () => new Event(), x => x.init(), "old_events");
  
  var keys = new Set(data.events.map(x => x.id).concat(data.old_events.map(x => x.id)));

  var events = [];
  data.entries.forEach(e => events = events.concat(e.getEvents(data.tax_manager)));
  data.calculated_events = events.filter(e => !keys.has(e.id));
  
  data.all_events = data.events.concat(data.calculated_events);
  
  data.all_movs =
              data
                .all_events
                .filter(e => e.state != Event.STATES.CANCELLED)
                .reduce(
                   (acum, event) => {
                                     var aux = event.getMovements(data.tax_manager, data.date_today);
                                     return acum.concat(aux);
                   },
                   []
              );
  return data;
}

function testUpdateCashflow() {
  updateCashflow(false,0);
}

function createEvents() {
  var data = readData();
  var nextMonth = addMonths(getToday(),1);
  nextMonth.setDate(1);
  var events = data.calculated_events.filter(e => e.invoice_date.getTime() < nextMonth.getTime());
  updateMovements(events);
}

function updateMovements(add) {
  //Leo la info a cargar
  if (eventsSheetHasEvents("All Events"))
    throw "La última actualización fallo. Por favor revisar el tema con Pablo que se pueden perder movimientos";

  var events = [];
  var errors = [];
  
  if (add!=null)
    events = events.concat(add);
  
  treatResult(buildObjects("Pendientes", "A2:W1000", () => new Event(), x => x.init()), events, errors);
  treatResult(buildObjects("Facturados", "A2:W1000", () => new Event(), x => x.init()), events, errors);
  treatResult(buildObjects("Liquidados", "A2:W1000", () => new Event(), x => x.init()), events, errors);
  treatResult(buildObjects("Cancelados", "A2:W1000", () => new Event(), x => x.init()), events, errors);
  
  if (errors.length > 0)
    throw "Algunos registros están incompletos, por favor arreglelos y vuelva a intentar";
  
  eventsSheetBuild("All Events", events);
  eventsSheetBuild("Pendientes", events.filter(e => e.isPending()));
  eventsSheetBuild("Facturados", events.filter(e => e.state == Event.STATES.BILLED));
  eventsSheetBuild("Liquidados", events.filter(e => e.state == Event.STATES.SETTLED));
  eventsSheetBuild("Cancelados", events.filter(e => e.state == Event.STATES.CANCELLED));

  eventsSheetClear("All Events");
}


function archiveEvents() {
}

function updateCashflow(group, showIndex) {
  
  if (showIndex == null)
    showIndex = 2;
  //Leo todos los datos
  var data = readData();
  //Posibilidades
  var runs = [
    { states: [Movement.SCENARIOS.CONFIRMED], index: 0},
    { states: [Movement.SCENARIOS.VERY_LIKELY], index: 1},
    { states: [Movement.SCENARIOS.PROBABLE], index: 2},
    { states: [Movement.SCENARIOS.UNLIKELY], index: 3}
    ];
  runs.forEach(r => r.name = `Cashflow ${r.states[0]}s`);

  //Armo escenarios
  var scenario = new Scenario(data.bucket_manager.buckets, 
                              data.balances_by_date,
                              m => data.bucket_manager.getName(m.date), 
                              m => m.amount, 
                              (acum, m) => acum != null ? {"ARS": acum.ARS.add(FINANCE.convert(m, "ARS")), "Real": acum.Real.add(m)} : {"ARS": FINANCE.convert(m, "ARS"), "Real": m});
  
  //Armo esenarios y dibujo las hojas
  for(var i = 0; i <= showIndex && i < runs.length; i++) {
    var run = runs[i];
    var movs = data.all_movs.filter(m => run.states.indexOf(m.scenario) != -1);
    movs.forEach(m => scenario.add(m));
    buildNewCashflowSheet(run.index,run.name, scenario, group);
  }
}
