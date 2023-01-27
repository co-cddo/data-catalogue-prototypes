//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { promises: fs } = require("fs");

const init =  async function() {
   const resources = await helpers.getData('./app/data/resources.json');
   console.log(resources);
   
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
    }
}

init();
