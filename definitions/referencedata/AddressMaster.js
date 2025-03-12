const functions = require('../includes/functions');
const sql = require('../includes/sql');

const tableNames = [
    'trustfinancial.Consumer_Q4',
    'trustfinancial.Consumer_Q4_fix',
    'trustfinancial.Consumer_2021_Q1_fix',
    'trustfinancial.Consumer_2021_Q1_final',
    'trustfinancial.Consumer_2021_q3',
    'trustfinancial.consumer2021q3',
    'trustfinancial.consumer2021q3_2',
    'trustfinancial.Consumer2022q2',
    'trustfinancial.Consumer2022_q2',
    'trustfinancial.consumer2022_q4',
    'trustfinancial.consumer2022q4_voter',

    'trustfinancial.consumer2022q4_voter_normalized',
    'trustfinancial.consumer2022q4_voter_gold',
    'trustfinancial.consumer2022_q2_gold',
    'trustfinancial.ConsumerQ1_2023'
]
const addressComponentColumns = [

    'housenumber',
    'predirection',
    'streetname',
    'streetsuffix',
    'postdirection',
    'unitdesignator',
    'unitdesignatornumber',
    'primaryaddress',
    'secondaryaddress',
    'state',

    'countyname',
    'citynameabbr',
    'cityname',
    'carrier_route',

    'NumberOfSources',


    // ... list all relevant address component columns here
];
const addressFloats = [
    'latitude',
    'longitude',
    'Xaxis',
    'Yaxis',
    'Zaxis',
]
const addressInts = [
    'AddressID',
    'livingunitid',
]

let transformedColumns = addressComponentColumns.map(column => sql.transformStringColumn(column)).join(",\n");
let transformedInts = addressInts.map(column => functions.dataCast(column, 'INT')).join(",\n");
let transformedFloats = addressFloats.map(column => functions.dataCast(column, 'FLOAT64')).join(",\n");

const unifiedTable = dataform.publish("GeoAddressMaster", {
    // ... other configurations ...
    schema: "referencedata",
    name: "GeoAddressMaster",
    type: "table",
    uniqueKey: ["livingunitid"],
    tags: ['address', 'geo'],
    bigquery: {
        //    partitionBy: "DATE(timestamp_column)", // Adjust if needed
        partitionBy: 'RANGE_BUCKET(H3Index_Bucket,GENERATE_ARRAY(1,4000,1))',
        updatePartitionFilter: "H3Index_Bucket = MOD(H3Index_Int,4000)",
        clusterBy: ['H3Index_Int', "livingunitid"], // Adjust or remove as per your requirements
    },
    description: "A unified master deduplicated table of living unit IDs and their respective information.",
}).
//dependencies: tableNames,
query(ctx => {
    let combinedQuery = "";

    tableNames.forEach((tableName, index) => {
        if (index > 0) combinedQuery += " UNION DISTINCT ";
        let where = "";
        if (index > 0) {
            //let previousStep = `${funnel.name}_${funnel.steps[i - 1].name}`;
            where = `and livingunitid not in (SELECT livingunitid from ${ctx.self()})`;
        }
        combinedQuery += `SELECT ${functions.toH3IndexPartitionKey('latitude','longitude',13)} as H3Index_Int,
        ${transformedInts},
        ${transformedColumns},
        ${sql.zipPad('ZipCode')},
        ${functions.dataCast('Zip_4','STRING')},
        ${transformedFloats},
  
        FROM ${tableName}
        WHERE livingunitid IS NOT NULL`;
    });

    return `
      SELECT
        *,MOD(H3Index_Int,4000) as H3Index_Bucket,
         ROW_NUMBER() OVER (partition by livingunitid) as rn
 
      FROM (
        ${combinedQuery}
      )
      -- GROUP BY livingunitid
      -- Additional aggregation or deduplication logic here if needed
    `;

});
