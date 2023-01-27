//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { promises: fs } = require("fs");
let global = {};

const init =  async function() {
   global.organisations = await helpers.getData('./app/data/organisations.json');
   let resources = await helpers.getData('./app/data/resources.json');
   const catalogue = await helpers.getData('./app/data/catalogue.json');
   const mappedCatalogue = helpers.mapLiveSchemaToSpec(catalogue);
   const nhs = await helpers.getData('./app/data/nhs.json');
   const mappedNhs = helpers.mapLiveSchemaToSpec(nhs.apis, 'National Health Service');
   resources = resources.concat(mappedNhs, mappedCatalogue);
   
   // SPRINT 1 ROUTES
   router.get('/s1/find', function(req, res) {    
    const count = resources.length;
    res.render("s1/find", { resources: resources, count: count });
   })
}


const helpers = {
    async getData(path) {
        try {
            const data = await fs.readFile(path, "utf-8");
            return JSON.parse(data);
    
        } catch (error) {
            console.log("e", error);
        }
    },
    mapLiveSchemaToSpec(data) {
        return data.map(function(e) {
            if(e.data) {
                e.title = e.data.name;
                e.description = e.data.description;
                e.issuing_body_readable = e.data.organisation;
            }
            else {
                e.title = e.name;
                e.description = e.description;
                e.issuing_body_readable = helpers.getOrgTitle(e.provider);
            }
            return e;
        }
        )
    },
    getOrgTitle(id) {
        let name;
        for (let i = 0; i < global.organisations.length; i++) {
            if (global.organisations[i]['id'] == id) {
                name = global.organisations[i]['name'];
                break;
            }
        }
        return name;
    }
}

init();
