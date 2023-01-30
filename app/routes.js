//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { promises: fs } = require("fs");
let itemsjs;
let items;

let global = {};

const init =  async function() {
   global.organisations = await helpers.getData('./app/data/organisations.json');
   let resources = await helpers.getData('./app/data/resources.json');
   const catalogue = await helpers.getData('./app/data/catalogue.json');
   const mappedCatalogue = helpers.mapLiveSchemaToSpec(catalogue);
   const nhs = await helpers.getData('./app/data/nhs.json');
   const mappedNhs = helpers.mapLiveSchemaToSpec(nhs.apis, 'National Health Service');
   resources = resources.concat(mappedNhs, mappedCatalogue);

   const index = searchSetup(resources);
   
   // SPRINT 1 ROUTES
   router.get('/s1/find', function(req, res) {  
    let items = resources;  
    let searchTerm;
    let appliedFilters = {};
    if (Object.keys(req.query).length !== 0) {
        if(req.query.q) {
            searchTerm = req.query.q;
        }
        if(Array.isArray(req.query.organisationFilters)) {
            appliedFilters.issuing_body = req.query.organisationFilters.filter(function(e) {
                if(e == '_unchecked') {
                    return false;
                }
                return true;
            })
        }
        const results = search(searchTerm, appliedFilters);
        items = results.data.items;
    }

    const filters = [
        {
            title: 'Organisations',
            id: 'organisationFilters',
            items: helpers.generateFilterItems(global.organisations, 'id', 'name', 'organisationFilters', req),
        }
    ]
    
    const count = items.length;
    res.render("s1/find", { resources: items, count: count, query: searchTerm, filters: filters });
   })
}

const searchSetup = function(data) {
    const configuration = {
        sortings: {
            name_dsc: {
            field: 'title',
            order: 'dsc'
            }
        },
        aggregations: {
            issuing_body: {
                title: 'Organisations',
                size: 30,
                conjunction: false
            }
        },
        searchableFields: ['title', 'description' ,'issuing_body_readable'],
    };
    itemsjs = require('itemsjs')(data, configuration);
    return itemsjs.search();
}

const search = function(query, filters) {
    const results = itemsjs.search({
        per_page: 1000,
        sort: 'name_dsc',
        query: query,
        filters: filters
    });
    // console.log(JSON.stringify(results, null, 2));
    
    return results;
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
                e.issuing_body = 'nhs-digital';
            }
            else {
                e.title = e.name;
                e.description = e.description;
                e.issuing_body = e.provider;
                e.issuing_body_readable = helpers.getOrgTitle(e.provider);
            }
            return e;
        }
        )
    },
    generateFilterItems(items, valueKey, textKey, groupId, req) {
        const query = req.query;
        return items.map(function(e) {
            let n = {};
            n.value = e[valueKey];
            n.text = e[textKey];
            n.name = groupId;
            if(query && query[groupId] && query[groupId].includes(n.value)) {
                n.checked = 'checked'
            }
            return n;
        });
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
