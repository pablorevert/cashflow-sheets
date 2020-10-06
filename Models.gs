class Balance {
  constructor() {
    //date	credicoop_cc	galicia_cc	patagonia_cc	credicoop_fci	galicia_fci	total
    this.METADATA = 
    {
      TYPES: {
        date:	        new DateType({nullable: false}),
        credicoop_cc:	new NumberType({nullable: true}),
        galicia_cc:	 	new NumberType({nullable: true}),
        patagonia_cc:	new NumberType({nullable: true}),
        credicoop_fci:	new NumberType({nullable: true}),
        galicia_fci:	new NumberType({nullable: true}),
        total:	        new NumberType({nullable: false})
      },
      EOF: ["date","total"],
      UNIQUE: x => x.date
    };
  }
  
  init() {
  }
}