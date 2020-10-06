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
        currency: taxDetail.settled.amount.unit, 
        settlement: taxDetail.settled.amount.quantity, 
        invoice_date: this.invoice_date, 
        settlement_date: this.settlement_date, 
        state: this.getEventState(), 
        paymentDelay: this.payment_delay, 
        initialInvoiceDate: this.invoice_date, 
        initialSettleDate: this.settlement_date, 
		amount: taxDetail.amount.quantity, 
		vat: taxDetail.getVatAmount(), 
		fee: taxDetail.getFeeAmount(), 
		fee_vat: taxDetail.getFeeVatAmount(), 
		ret_per_currency: taxDetail.getRetentionsCurrency(), 
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