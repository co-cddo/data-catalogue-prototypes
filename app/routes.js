//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { promises: fs } = require("fs");

const init =  async function() {
   let resources = await helpers.getData('./app/data/resources.json');
   const nhs = await helpers.getData('./app/data/nhs.json');
   const mappedNhs = helpers.mapLiveSchemaToSpec(nhs.apis, 'National Health Service');
   resources = resources.concat(mappedNhs);
   
   // SPRINT 1 ROUTES
   router.get('/s1/find', function(req, res) {    
    res.render("s1/find", { resources: resources });
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
    mapLiveSchemaToSpec(data, orgName) {
        return data.map(function(e) {
            e.issuing_body = e.data.organisation;
            e.title = e.data.name;
            e.description = e.data.description;
            // This is a cheat so I don't have to set up a proper org entity
            e.issuing_body_readable = orgName;
            return e;
        }
        )
    }
}

init();
