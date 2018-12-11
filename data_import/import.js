//
//  run with: "node --max-old-space-size=4096 import.js" to prevent out of memory errors
//
// TRUNCATE TABLE hrecos_test.raw_data2;
// CREATE TABLE IF NOT EXISTS hrecos_test.raw_data (site_name TEXT, `parameter` TEXT, `datetime` TEXT, value FLOAT, flag TEXT, comment TEXT, tz_code TEXT, agency_id TEXT);
// LOAD DATA LOCAL INFILE 'c:/NYBackup/GitHub/hrecos/data_import/test.csv' INTO TABLE hrecos_test.raw_data FIELDS TERMINATED BY ',' ENCLOSED BY '"' IGNORE 1 ROWS;
// UPDATE hrecos_test.raw_data SET `datetime` = STR_TO_DATE(`datetime`, '%Y-%m-%dT%H:%i:%sZ');
// ALTER TABLE hrecos_test.raw_data MODIFY COLUMN `datetime` DATETIME NULL;



var mysql = require( 'mysql' );
var csv = require("fast-csv");
var async   = require('async');
var ElapsedTime = require('elapsed-time');
var dbInfo = require('./dbInfo.js');

var raw_data_table = "CREATE TABLE IF NOT EXISTS hrecos_test.raw_data (site_name TEXT, param TEXT, time DATETIME, value FLOAT, flag TEXT, comment TEXT, tz_code TEXT, agency_id TEXT);";
var post_data_table = "CREATE TABLE IF NOT EXISTS hrecos_test.post_data   (site_name TEXT, param TEXT, time DATETIME, value FLOAT, flag TEXT, comment TEXT, tz_code TEXT, agency_id TEXT);";

var et = ElapsedTime.new().start();
var db; //database variable

async.series([

    //creates DB connection and connects
    function(callback){
        db = mysql.createConnection(dbInfo.data); 

        db.connect(function(err){
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        callback(); //goes to the next function
        }); 
    },

    //raw_date
    function(callback){
        console.log('creating raw_data table:', et.getValue());
        db.query(raw_data_table, function(){
   
            csv
            .fromPath('./raw_data.csv', {headers: false})
            .on("data", function(data){

                var date = formatDate(new Date(data[2]));

                //console.log('processing log entry for:',date, data.join(','));

                var updateQuery = "INSERT INTO hrecos_test.raw_data (site_name,param,time,value,flag,comment,tz_code,agency_id) VALUES('" + data[0] + "','" + data[1] + "','" + date + "','" + data[3] + "','" + data[4] + "','" + data[5] + "','" + data[6] + "','"+ data[7] + "')";

                //run query
                db.query(updateQuery);


            })
            .on("end", function(){
                console.log('finished raw_data table:', et.getValue());
                db.end();
                callback(); //goes to the next function
            });

        });    
    }

    // //performs the Query 2
    // function(callback){
    //     console.log('creating post_data table')
    //     db.query(post_data_table, function(){

        

    //     callback(); //goes to the next function
    //     });    
    // }
]);


var formatDate = function(d) {
    return (d.getFullYear() + "-" + ("00" + (d.getMonth() + 1)).slice(-2)) + "-" + ("00" + d.getDate()).slice(-2) + " " + ("00" + d.getHours()).slice(-2) + ":" + ("00" + d.getMinutes()).slice(-2) + ":" + ("00" + d.getSeconds()).slice(-2);
}