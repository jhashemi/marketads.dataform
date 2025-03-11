function transformStringColumn(columnName, includeColumnName = true) {
    return `NULLIF(TRIM(UPPER(CASE 
           WHEN SAFE_CAST(${columnName} as STRING) = 'NULL' THEN NULL 
           WHEN UPPER(SAFE_CAST(${columnName} as STRING)) = '${columnName.toUpperCase()}' THEN NULL 
           ELSE SAFE_CAST(${columnName} as STRING)
         END)), '')${includeColumnName?` AS ${columnName}`:''}`;
}
function clean_flag(columnName,flagChar='U',includeColumnName = true){
    return `NULLIF(${columnName},${(flagChar=='U')?" 'U' " : flagChar}) ${includeColumnName?`as ${columnName}`:''}`;
}
function dataCast(columnName, dataType, includeColumnName = true) {
    return `SAFE_CAST(${columnName} as ${dataType}) ${includeColumnName?`as ${columnName}`:''}`;
}

function dataCastInt(columnName, includeColumnName = true) {
    return dataCast(columnName, 'INTEGER', includeColumnName);
}
function dataCastIntFlag(columnName, includeColumnName = true) {
    return `${dataCast(clean_flag(columnName,'U',false),'INTEGER',false)}${includeColumnName?` as ${columnName}`:''}`;
}
function dataCastBool(columnName, includeColumnName = true) {

    return `CASE WHEN UPPER(${columnName}) IN ('Y','YES','TRUE','1') THEN TRUE WHEN UPPER(${columnName}) IN ('N','NO','FALSE','0') THEN FALSE WHEN UPPER(${columnName}) IN ('U','',' ') THEN NULL ELSE NULL  END  ${includeColumnName?`as ${columnName}`:''}`;

}

function toH3Index(latColName, lngColName, resolution = 13) {
    return `carto.H3_FROMLONGLAT(${dataCast(transformStringColumn(lngColName,false),'FLOAT64',false)},${dataCast(transformStringColumn(latColName,false),'FLOAT64',false)},${resolution})`;
    //-- 84390cbffffffff
}

function toH3IndexPartitionKey(latColName, lngColName, resolution = 13) {
    return `carto.H3_STRING_TOINT(${toH3Index(latColName,lngColName,resolution)})`;
    //-- 84390cbffffffff
}

function to_hem(columnName, algo = 'MD5') {
    return `TO_HEX(MD5(${cleanEmail(columnName)}))`;
}

function zipPad(columnName) {
    return `LPAD(${transformStringColumn(columnName,false)},5,'0') as ${columnName}`;
}

function createPartitionKeyId(columnName, identifierType) {
    return `ABS(FARM_FINGERPRINT(CONCAT( ${identifierType} ,${transformStringColumn(columnName,false)})))`
}


function cleanEmail(columnName, ignoreDepartmentEmails = true) {
    if (!ignoreDepartmentEmails) return `justfunctions.us.clean_email(${columnName})`;
    return `(SELECT CASE WHEN justfunctions.us.detect_department_email(${columnName}) =0 THEN justfunctions.us.clean_email(${columnName}) ELSE NULL END)`;

}
module.exports = {
    cleanString: transformStringColumn,
    transformStringColumn,
    dataCast,
    zipPad,
    createPartitionKeyId,
    toH3Index,
    toH3IndexPartitionKey,
    dataCastInt,
    cleanEmail,
    to_hem,
    dataCastBool, clean_flag,
    dataCastIntFlag
};
