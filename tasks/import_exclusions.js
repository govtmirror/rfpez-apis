var fs = require('fs')
  , csv = require('csv')
  , cheerio = require('cheerio')
  , request = require('request')
  , mongoose = require('mongoose')
  , sys = require('sys')
  , exec = require('child_process').exec;

if (process.env.MONGOHQ_URL) {
  global.DB = mongoose.createConnection(process.env.MONGOHQ_URL)
} else {
  global.DB = mongoose.createConnection('localhost', 'rfpez-apis');
}

var Exclusion = require('../models/exclusion');

var dataFolder = __dirname + '/../_data/epls/';

var mongooseKeyFor = function (key) {
  return key.replace(/\/|\s|-/g, '_').replace(/_+/, '_').toLowerCase();
};

var parse = function(req, res) {

  if (process.argv.indexOf('--sample-data') !== -1) {
    console.log("++++++++ USING SAMPLE DATA ++++++++");
    var csv_file = dataFolder + 'exclusions_sample.csv';
  } else {
    var csv_file = dataFolder + 'exclusions.csv';
  }

  var exclusions = new Array();

  csv()
    .fromPath(csv_file, {
      columns: true
    })
    .on('data',function(data,index){
      newRecord = {};
      for (key in data) {
        newRecord[mongooseKeyFor(key)] = data[key];
      }
      exclusions.push(newRecord);
    })
    .on('end',function(count){

      var saveExclusions = function (exclusions) {
        var newExclusion = new Exclusion(exclusions.shift());
        var runCb = function() {
          if (exclusions.length > 0) {
            console.log(exclusions.length + ' records remaining.');
            saveExclusions(exclusions);
          } else {
            process.exit();
          }
        }

        Exclusion.findOne({sam_number: newExclusion.sam_number}, function(err, exists){
          if (exists) {
            console.log('exclusion already exists.');
            runCb();

          } else {
            newExclusion.save(function(){
              console.log('saved record.');
              runCb();
            });
          }
        });
      }

      saveExclusions(exclusions);
    })

};

request('https://www.sam.gov/public-extracts/SAM-Public/', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    var $ = cheerio.load(body);
    var href = $('a').last().attr('href');
    console.log("Grabbing file: https://www.sam.gov/public-extracts/SAM-Public/" + href);
    console.log("Writing temp zip file to " + dataFolder + 'exclusions.zip');
    var savedZip = fs.createWriteStream(dataFolder + 'exclusions.zip');

    request("https://www.sam.gov/public-extracts/SAM-Public/" + href)
    .pipe(savedZip)
    .on('close', function () {
      console.log('Zip file saved!. Now uncompressing...');
      exec("cd " + dataFolder + "; unzip " + dataFolder + "exclusions.zip; mv " + dataFolder + "SAM*.CSV " + dataFolder + "exclusions.csv", function (error, stdout, stderr) {      // one easy function to capture data/errors
          console.log(stdout);
          console.log(stderr);
          if (error !== null) {
            console.log('exec error: ' + error);
            process.exit();
          } else {
            console.log("Now parsing...");
            parse();
          }
        });
    });
  }
});