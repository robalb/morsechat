package morse

// english false positives adapted from
// https://github.com/TwiN/go-away/ (MIT license)
var falsePositiveWordsList = []string{
	"analy", // analysis, analytics
	"arsenal",
	"assassin",
	"assaying", // was saying
	"assert",
	"assign",
	"assimil",
	"assist",
	"associat",
	"assum", // assuming, assumption, assumed
	"assur", // assurance
	"banal",
	"basement",
	"bass",
	"cass",   // cassie, cassandra, carcass
	"canu",   // can u send, can u see
	"butter", // butter, butterfly
	"butthe",
	"button",
	"canvass",
	"circum",
	"clitheroe",
	"cockburn",
	"cocktail",
	"cumber",
	"cumbing",
	"cumulat",
	"dickvandyke",
	"document",
	"evaluate",
	"exclusive",
	"expensive",
	"explain",
	"expression",
	"grass",
	"harass",
	"hotwater",
	"identit",
	"kassa", // kassandra
	"kassi", // kassie, kassidy
	"lass",  // class
	"leafage",
	"libshitz",
	"magnacumlaude",
	"mass",
	"mocha",
	"pass", // compass, passion
	"penistone",
	"phoebe",
	"phoenix",
	"pushit",
	"sassy",
	"saturday",
	"scrap", // scrap, scrape, scraping
	"serfage",
	"sexist", // systems exist, sexist
	"shoe",
	"scunthorpe",
	"stitch",
	"sussex",
	"therapist",
	"therapeutic",
	"wharfage",
}
