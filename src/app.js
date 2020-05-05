// ------------------------------------------------------------------------------
// ----- HRECOS -----------------------------------------------------------------
// ------------------------------------------------------------------------------

// copyright:   2018 Martyn Smith - USGS NY WSC

// authors:  Martyn J. Smith - USGS NY WSC

// purpose:  Web Mapping interface for HRECOS Sites

// updates:
// 04.19.2018 mjs - Created
// 07.25.2018 mjs - Major overhaul to get NWIS data, compare multiple sites and parameters

//CSS imports

import 'bootstrap/dist/css/bootstrap.css';
import 'marker-creator/public/css/markers.css';
import 'leaflet/dist/leaflet.css';
import 'select2/dist/css/select2.css';
import 'bootstrap-datepicker/dist/css/bootstrap-datepicker.css';
import './styles/main.css';


//ES6 imports
import 'bootstrap/js/dist/util';
import 'bootstrap/js/dist/modal';
import 'bootstrap/js/dist/collapse';
import 'bootstrap/js/dist/tab';
import 'select2';
import moment from 'moment';
import Highcharts from 'highcharts';
import addExporting from 'highcharts/modules/exporting';
import addBrokenAxis from 'highcharts/modules/broken-axis';
import 'bootstrap-datepicker';
import { map, control, tileLayer, featureGroup, geoJSON, Icon } from 'leaflet';
import { basemapLayer } from 'esri-leaflet';
addExporting(Highcharts);
addBrokenAxis(Highcharts);
import { config, library, dom } from '@fortawesome/fontawesome-svg-core';
import { faBars } from '@fortawesome/free-solid-svg-icons/faBars';
import { faInfo } from '@fortawesome/free-solid-svg-icons/faInfo';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons/faExclamationCircle';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons/faQuestionCircle';
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog';

import { faTwitterSquare } from '@fortawesome/free-brands-svg-icons/faTwitterSquare';
import { faFacebookSquare } from '@fortawesome/free-brands-svg-icons/faFacebookSquare';
import { faGooglePlusSquare } from '@fortawesome/free-brands-svg-icons/faGooglePlusSquare';
import { faGithubSquare } from '@fortawesome/free-brands-svg-icons/faGithubSquare';
import { faFlickr } from '@fortawesome/free-brands-svg-icons/faFlickr';
import { faYoutubeSquare } from '@fortawesome/free-brands-svg-icons/faYoutubeSquare';
import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';

library.add(faBars, faPlus, faMinus, faInfo, faExclamationCircle, faCog, faQuestionCircle, faTwitterSquare, faFacebookSquare,faGooglePlusSquare, faGithubSquare, faFlickr, faYoutubeSquare, faInstagram );
config.searchPseudoElements = true;
dom.watch();


//START user config variables
var MapX = '-73.6'; //set initial map longitude
var MapY = '41.7'; //set initial map latitude
var MapZoom = 8; //set initial map zoom
//var sitesURL = './HRECOSsitesGeoJSON.json';
var sitesURL = './HRECOSsitesGeoJSONsubset.json';
var NWISivURL = 'https://nwis.waterservices.usgs.gov/nwis/iv/?';
var HRECOSurl;
//process.env.NODE_ENV === 'production' ? HRECOSurl = 'https://ny.water.usgs.gov/maps/hrecos/query.php' : HRECOSurl = 'http://localhost:8080/hrecos/query.php';
process.env.NODE_ENV === 'production' ? HRECOSurl = 'https://ny.water.usgs.gov/maps/hrecos/query.php' : HRECOSurl = 'https://ny.water.usgs.gov/maps/hrecos/query.php';
//check if staging
//if (window.location.href.indexOf('staging-ny') !== -1) HRECOSurl = 'https://staging-ny.water.usgs.gov/maps/hrecos/query.php'
var crossOverDate = '2019-03-06';
//END user config variables 

//START global variables
var theMap;
var featureCollection;
var layer, sitesLayer, layerLabels;
var seriesData;
var chart;
var compareYears;
var requests = [];

var parameterList = [
  {pcode:'00010', type: 'Hydrologic', HRECOScode: 'WTMP', NERRScode: 'TEMP', desc:'Temperature, water, degrees Celsius', label: 'Temperature, water', unit:'deg C', conversion: null},
  {pcode:'00020', type: 'Meteorologic', HRECOScode: 'ATMP', NERRScode: 'ATEMP', desc:'Temperature, air, degrees Celsius', label: 'Temperature, air', unit:'deg C', conversion: null},

  {pcode:'00036', type: 'Meteorologic', HRECOScode: 'WD', NERRScode: 'WDIR', desc:'Wind direction, degrees clockwise from true north', label: 'Wind direction', unit:'Deg', conversion: null},

  {pcode:'00045', type: 'Meteorologic', HRECOScode: 'RAIN', NERRScode: 'CUMPRCP', desc:'Precipitation, inches', label: 'Precipitation', unit:'in', conversion: null},

  {pcode:'00052', type: 'Meteorologic', HRECOScode: 'RHUM', NERRScode: 'RH', desc:'Relative humidity, percent', label: 'Relative Humidity', unit:'%', conversion: null},

  {pcode:'00065', type: 'Hydrologic', HRECOScode: 'DEPTH', NERRScode: 'DEPTH', desc:'Gage height, feet', label: 'Gage height', unit:'feet', conversion: null},

  {pcode:'00095', type: 'Hydrologic', HRECOScode: 'SPCO', NERRScode: 'SPCOND', desc:'Specific conductance, water, unfiltered, microsiemens per centimeter at 25 degrees Celsius', label: 'Specific conductance', unit:'uS/cm @25C', conversion: null},

  {pcode:'00300', type: 'Hydrologic', HRECOScode: 'DO', NERRScode: 'DO_MGL', desc:'Dissolved oxygen, water, unfiltered, milligrams per liter', label: 'Dissolved oxygen', unit:'mg/l', conversion: null},
  {pcode:'00301', type: 'Hydrologic', HRECOScode: 'DOPC', NERRScode: 'DO_PCT', desc:'Dissolved oxygen, water, unfiltered, percent of saturation', label: 'Dissolved oxygen', unit:'% saturatn', conversion: null},

  {pcode:'00400', type: 'Hydrologic', HRECOScode: 'PH', NERRScode: 'PH', desc:'pH, water, unfiltered, field, standard units', label: 'pH', unit:'std units', conversion: null},

  //commented out 7/23/2019 to simplify
  // {pcode:'62619', type: 'Hydrologic', HRECOScode: null, NERRScode: null, desc:'Estuary or ocean water surface elevation above NGVD 1929, feet', label: 'Elevation', unit:'ft', conversion: 3.28084},
  {pcode:'62620', type: 'Hydrologic', HRECOScode: 'ELEV', NERRScode: null, desc:'Estuary or ocean water surface elevation above NAVD 1988, feet, NAVD88', label: 'Elevation', unit:'ft', conversion: 3.28084},

  {pcode:'63680', type: 'Hydrologic', HRECOScode: 'TURB', NERRScode: 'TURB', desc:'Turbidity, water, unfiltered, monochrome near infra-red LED light, 780-900 nm, detection angle 90 +-2.5 degrees, formazin nephelometric units (FNU)', label: 'Turbidity', unit:'FNU', conversion: null},

  {pcode:'72254', type: 'Hydrologic', HRECOScode: 'VEL', NERRScode: null, desc:'Water velocity reading from field sensor, feet per second', label: 'Water velocity', unit:'ft/sec', conversion: null},

  {pcode:'75969', type: 'Meteorologic', HRECOScode: 'BARO', NERRScode: 'BP', desc:'Barometric pressure, not corrected to sea level, millibars', label: 'Barometric pressure', unit:'mbar', conversion: null},

  {pcode:'72253', type: 'Meteorologic', HRECOScode: 'STMP', NERRScode: null, desc:'Soil temperature, degrees Celsius', label: 'Soil temperature', unit:'deg C', conversion: null},

  {pcode:'61727', type: 'Meteorologic', HRECOScode: null, NERRScode: null, desc:'Wind gust speed, knots', label: 'Wind gust speed', unit:'knots', conversion: null},

  {pcode:'82127', type: 'Meteorologic', HRECOScode: 'WSPD', NERRScode: 'WSPD', desc:'Wind speed, knots', label: 'Wind speed', unit:'knots', conversion: null},

  {pcode:'90860', type: 'Hydrologic', HRECOScode: 'SALT', NERRScode: 'SAL', desc:'Salinity, water, unfiltered, practical salinity units at 25 degrees Celsius', label: 'Salinity', unit:'PSU', conversion: null},

  {pcode:'99989', type: 'Meteorologic', HRECOScode: 'PAR', NERRScode: 'TotPAR', desc:'Photosynthetically active radiation (average flux density on a horizontal surface during measurement interval), micromoles of photons per square meter per second', label: 'Photosynthetically Active Radiation', unit:'mmol/m2', conversion: null},

  //NERRS ONLY PARAMETERS (looked up relevant pcodes from: https://help.waterdata.usgs.gov/code/parameter_cd_query?fmt=rdb&inline=true&group_cd=%)
  {pcode:'32316', type: 'Hydrologic', HRECOScode: null, NERRScode: 'CHLFLUOR', desc:'Chlorophyll fluorescence measured in micrograms per Liter', label: 'Chlorophyll fluorescence', unit:'ug/L', conversion: null},

  //commented out 7/23/2019 to simplify
  // {pcode:'62625', type: 'Meteorologic', HRECOScode: null, NERRScode: 'MAXWSPD', desc:'Max wind speed measured in meters per second', label: 'Max wind speed', unit:'m/s', conversion: null},
  // {pcode:'99965', type: 'Meteorologic', HRECOScode: null, NERRScode: 'MAXWSPDT', desc:'Time of max wind speed measurement', label: 'Time of max wind speed', unit:'hh:mm', conversion: null}
];

//END global variables

//instantiate map
$(document).ready(function () {
  console.log('Application Information: ' + process.env.NODE_ENV + ' ' + 'version ' + VERSION);
  $('#appVersion').html('Application Information: ' + process.env.NODE_ENV + ' ' + 'version ' + VERSION);

  Icon.Default.imagePath = './images/';

  //create map
  theMap = map('mapDiv', { zoomControl: false });

  //add zoom control with your options
  control.zoom({ position: 'topright' }).addTo(theMap);
  control.scale().addTo(theMap);

  //basemap
  layer = tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  }).addTo(theMap);

  //set initial view
  theMap.setView([MapY, MapX], MapZoom);

  //define layers
  sitesLayer = featureGroup().addTo(theMap);

  loadSites();

  initDatePicker();

  $('.datepicker').datepicker({
    format: 'yyyy-mm-dd'
  });

  /*  START EVENT HANDLERS */
  $('#timePeriodSelect').select2({
    dropdownAutoWidth: true,
    minimumResultsForSearch: -1
  });

  $('.basemapBtn').click(function () {
    $('.basemapBtn').removeClass('slick-btn-selection');
    $(this).addClass('slick-btn-selection');
    var baseMap = this.id.replace('btn', '');
    setBasemap(baseMap);
  });

  $('#mobile-main-menu').click(function () {
    $('body').toggleClass('isOpenMenu');
  });

  $('#resetView').click(function () {
    resetView();
  });

  $('#aboutButton').click(function () {
    $('#aboutModal').modal('show');
  });

  $('#showGraph').click(function () {
    getData();
  });

  $('#downloadData').click(function () {
    downloadData();
  });

  $('#graphModal').on('hidden.bs.modal', function () {
    abortAllRequests();
  });

  $('#stationSelect').on('select2:select', function(e) { 
    openPopup(e);
  });

  /*  END EVENT HANDLERS */
});

function abortAllRequests() {
  console.log('Aborting all AJAX requests...')
  requests.forEach(function(request) {
    request.abort();
  });
}

function initDatePicker() {

  var dateObj = new Date();
  var currentDate = formatDate(dateObj);
  var lastWeekDate = formatDate(dateObj.getTime() - (7 * 24 * 60 * 60 * 1000));

  // var currentDate = '2018-06-04';
  // var lastWeekDate = '2018-06-03';
  console.log('dates:',currentDate,lastWeekDate);

  $('#startDate').val(lastWeekDate);
  $('#endDate').val(currentDate);


}

function formatDate(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

function downloadData() {
  
  if (seriesData) {
    $(seriesData).each(function (i, data) {
      
      if (data) {
  
        // start CSV file
        var csvData = [];
        csvData.push('Site Name,"' + data.siteName + '"');
        csvData.push('Site ID,"' + data.siteID + '"');
        csvData.push('Description,"' + data.variableDescription.replace('[HRECOS]','[NWIS]') + '"');
        csvData.push(''); 

        csvData.push('Time (EST),Value');

        //convert time formats
        $(data.data).each(function (i, item) {
            csvData.push(moment(item[0]).format('YYYY-MM-DD HH:mm:ss') + ',' + item[1]);
        });
    
        csvData = csvData.join('\n');
    
        var filename = data.siteCode.replace(':','_');

        //append data type to filename
        if (data.variableDescription.indexOf('[legacy]') != -1) filename += '_legacy';
        if (data.variableDescription.indexOf('[HRECOS]') != -1) filename += '_NWIS';
        
        filename += '.csv';

        //there will be one download for each site/param/database combo
        downloadFile(csvData,filename);
      }
    
      else {
        alert('No data to export');
      }
    });

  }
  else {
    alert('No data to export');
  }

}

function downloadFile(data,filename) {
	var blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
	if (navigator.msSaveBlob) { // IE 10+
		navigator.msSaveBlob(blob, filename);
	} else {
		var link = document.createElement('a');
		var url = URL.createObjectURL(blob);
		if (link.download !== undefined) { // feature detection
			// Browsers that support HTML5 download attribute
			link.setAttribute('href', url);
			link.setAttribute('download', filename);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
		else {
			window.open(url);
		}
	}
}

function getData() {

  //clear out graphContainer
  $('#graphContainer').html('');

  //show loader
  $('#loading').show();
  $('#downloadData').prop('disabled', true);
  $('#toggleTooltip').prop('disabled', true);
  $('#graphStatus').html('');

  //set request infos
  var newRequestData;
  compareYears = false;
  var inputRequests = [];
  var requestDatas = [];
  requests = [];
  var requestData = {
    format: 'json',
  };

  //get siteID list and format
  var siteData = $('#stationSelect').select2('data');
  var mainSsiteIDlist = siteData.map(function(item) {
    return item.value;
  });

  //check for NERRS
  var NERRSsiteIDlist = mainSsiteIDlist.filter(function(value, index, arr){
    return value.indexOf('NERRS_') !== -1;
  });

  var siteIDlist = mainSsiteIDlist.filter(function(value, index, arr){
    return value.indexOf('NERRS_') === -1;
  });

  console.log('Site lists:',NERRSsiteIDlist, siteIDlist);

  var siteNameList = siteData.map(function(item) {
    return item.text;
  });

  //get siteparameter list and format
  var metParameter = $('#metParameterSelect').select2('data');
  var hydParameter = $('#hydParameterSelect').select2('data');

  if (metParameter) {
    var metParameterCodes = metParameter.map(function(item) {
      return item.value;
    });
  }

  if (hydParameter) {
    var hydParameterCodes = hydParameter.map(function(item) {
      console.log('HERE',item);
      return item.value;
    });
  }

  //bail if nothing is selected
  if (metParameterCodes.length == 0 && hydParameterCodes.length == 0) {
    alert('No parameters selected');
    return;
  }

  var parameterCodesList = metParameterCodes.concat(hydParameterCodes).join(',').split(',');
  var processedParmeterCodesList = [];

  requestData.parameterCd = parameterCodesList.join(',');
  console.log('parameter code list:',parameterCodesList);


  //time and date stuff
  var timeOption = $('input[name=timeSelect]:checked').val();

  //get compare years
  if ($("#compareYears").prop('checked')) {
    compareYears = true;
  }
  
  //convert periods to start and end dates with moment
  if (timeOption === 'period') {
    var period = $('#timePeriodSelect').select2('data')[0].id;
    requestData.endDT = moment().format('YYYY-MM-DD');
    requestData.startDT = moment().subtract(moment.duration(period)).format('YYYY-MM-DD'); 
  }
  else {
    requestData.startDT = $('#startDate').val();
    requestData.endDT = $('#endDate').val();
  }

  //main check if query is >90 days
  if (moment(requestData.endDT).diff(moment(requestData.startDT), 'years') > 2) {
    alert('The maximum query range is 2 years');
    return;
  }

  //validate station and parameter selections
  if (siteData.length === 0 || parameterCodesList.length === 0) {
    alert('You must choose at least one station and one parameter to continue');
    return;
  }

  //ok to show modal
  $('#graphModal').modal('show');

  //add internal access code
  requestData.access = '0';

  //push request
  requestDatas.push(requestData);

  //if comparing years, get new dates minus one year
  if (compareYears) {

    //make copy of request and then change the dates
    newRequestData = JSON.parse(JSON.stringify(requestData))
    newRequestData.startDT = moment(requestData.startDT).subtract(1, 'years').format('YYYY-MM-DD');
    newRequestData.endDT = moment(requestData.endDT).subtract(1, 'years').format('YYYY-MM-DD');
    requestDatas.push(newRequestData);
  }

  //loop over input requests (including compareYears request if selected) and determine query type
  $(requestDatas).each(function (i, inputRequest) {

    //NERRS parameter codes
    if (NERRSsiteIDlist.length > 0) {
      console.log('NERRS query');

      //make copy of the request, make some changes to the parameters for PHP query
      var legacyinputRequest = JSON.parse(JSON.stringify(inputRequest));
      legacyinputRequest.parameterCd = lookupNERRScode(inputRequest.parameterCd);
      legacyinputRequest.sites = lookupHRECOSsite(NERRSsiteIDlist.join(','));

      legacyinputRequest.source = 'NERRS';
      inputRequests.push(legacyinputRequest);
    }

    if (siteIDlist.length > 0) {
      var siteIDs = siteIDlist.join(',');
      inputRequest.sites = siteIDs;

      //  1.  if both dates before crossover date then purely legacy query
      if (moment(inputRequest.startDT).isSameOrBefore(crossOverDate) && moment(inputRequest.endDT).isSameOrBefore(crossOverDate)) {
        console.log('ALL LEGACY DB QUERY');

        //make copy of the request, make some changes to the parameters for PHP query
        var legacyinputRequest = JSON.parse(JSON.stringify(inputRequest));
        legacyinputRequest.parameterCd = lookupHRECOScode(inputRequest.parameterCd);
        legacyinputRequest.sites = lookupHRECOSsite(inputRequest.sites);

        //add hours
        legacyinputRequest.startDT = moment(legacyinputRequest.startDT + ' 00:00:00').add(5, 'hours').format('YYYY-MM-DD HH:mm:ss');
        legacyinputRequest.endDT = moment(legacyinputRequest.endDT + ' 00:00:00').add(5, 'hours').format('YYYY-MM-DD HH:mm:ss');
        console.log('times:',legacyinputRequest.startDT, legacyinputRequest.endDT);

        legacyinputRequest.source = 'legacy';
        inputRequests.push(legacyinputRequest);
        
      }

      //  2.  need to query both if the dates span over crossover date
      if (moment(inputRequest.startDT).isSameOrBefore(crossOverDate) && moment(inputRequest.endDT).isAfter(crossOverDate)) {
        console.log('QUERY SPAN DB CROSSOVER, MAKING 2 QUERIES');

        //make copy of the request, make some changes to the parameters for PHP query
        var legacyinputRequest = JSON.parse(JSON.stringify(inputRequest));
        legacyinputRequest.parameterCd = lookupHRECOScode(inputRequest.parameterCd);
        legacyinputRequest.sites = lookupHRECOSsite(inputRequest.sites);
        
        //add hours
        legacyinputRequest.startDT = moment(legacyinputRequest.startDT + ' 00:00:00').add(5, 'hours').format('YYYY-MM-DD HH:mm:ss');
        //set end date of NWIS request to crossover date
        legacyinputRequest.endDT = moment(crossOverDate + ' 23:59:59').add(5, 'hours').format('YYYY-MM-DD HH:mm:ss');
        console.log('times:',legacyinputRequest.startDT, legacyinputRequest.endDT);

        legacyinputRequest.source = 'legacy';
        inputRequests.push(legacyinputRequest);

        //set start date of NWIS request to crossover date
        inputRequest.startDT = crossOverDate;

        //have to make two queries here so also push original
        inputRequests.push(inputRequest);
        
      }

      //  3.  otherwise just regular NWIS query
      if (moment(inputRequest.startDT).isAfter(crossOverDate) && moment(inputRequest.endDT).isAfter(crossOverDate)) {
        console.log('REGULAR NWIS QUERY ONLY');
        inputRequests.push(inputRequest);
      }
    }




  });


  seriesData = [];
  var counter = 0;

  console.log('Processing', inputRequests.length, 'requests');
  var processedSites = [];
  var qualifierFound = false;

  $(inputRequests).each(function (i, inputRequest) {

    //overwrite url if source is legacy
    var url = NWISivURL;
    if (inputRequest.source == 'legacy') url = HRECOSurl;
    else if (inputRequest.source == 'NERRS') url = HRECOSurl;

    console.log('input Request:',url, inputRequest);

    //check if this is a previous year
    var previousYear = false;
    if (compareYears && inputRequest.startDT < $('#startDate').val()) {
      previousYear = true;
    }
    
    var XHR = $.ajax({
      url: url,  
      dataType: 'json',
      data: inputRequest, 
      type: 'GET',
      success: function(data) {

        console.log('response:',data);
        var processedData;
        var NERRSdata = false;
        
        //create simulated USGS waterservices response from legacy DB data
        if (data.declaredType === "legacyDB") {

          //Add NERRS banner
          if (data.queryInfo.criteria.sql.indexOf('.NERRS') !== -1) {
            NERRSdata = true;
            $('#graphStatus').append("<div class='alert alert-primary' role='alert' style='font-size:small;'>NERRS Site data is courtesy of NOAA's <a href='http://cdmo.baruch.sc.edu/' target='_blank'>National Estuarine Research Reserve System </a>.  All data is provisional.  Please visit the NERRS website to download data.</div>"); 

            //sort NERRS data.  For some reason it doesn't come back sorted
            data.values.sort((a,b) => (a.date_time > b.date_time) ? 1 : ((b.date_time > a.date_time) ? -1 : 0));

            
          }

          //create shell data object
          processedData = {
            declaredType: data.declaredType,
            value: {
                queryInfo: data.queryInfo,
                timeSeries: []
            }
          };

          console.log('legacyDB response:',processedData);

          //loop over datas, add to appropriate timeSeries
          $(data.values).each(function (i, value) {
            
            //check if we have this parameter in our time series yet
            var timeSeriesExists = false;
            $(processedData.value.timeSeries).each(function (i, timeSeries) {
              //console.log("HERE",value.parameter,timeSeries.variable.variableCode[0].HRECOSvalue, value.site_name, timeSeries.sourceInfo.siteNameHRECOS);
              if (value.parameter === timeSeries.variable.variableCode[0].HRECOSvalue && value.site_name === timeSeries.sourceInfo.siteNameHRECOS) timeSeriesExists = true;
            });
            

            //if it doesnt exist add the new object
            if (!timeSeriesExists) {

              //do search with first 6 digits only
              var siteNm = value.site_name.substring(0,6);

              if (data.queryInfo.criteria.sql.indexOf('.NERRS') !== -1) {
                var siteNm = value.site_name;
              }

              var siteInfo = lookupNWISsite(siteNm);
              
              var parameterInfo;

              //NERRS parameter lookup
              if (NERRSdata) {
                parameterInfo = lookupNERRSParameter(value.parameter);

                //special override for NERRS precipitation label
                if (parameterInfo.NERRScode === 'CUMPRCP') {
                  parameterInfo.desc = 'Precipitation, cumulative daily total, inches';
                  parameterInfo.conversion = 0.0393701;
                }
                console.log('NERRS data',parameterInfo);
              }
              else {
                parameterInfo = lookupParameter(value.parameter);
              }

              console.log('this one doesnt exist, creating new time series:',value,siteInfo, parameterInfo) ;

              var timeSeries = {
                sourceInfo: {
                  siteNameHRECOS: value.site_name,
                  siteName: siteInfo["Station Name"],
                  siteCode: [{
                    value: siteInfo["Site ID"],
                    network: value.agency_id,
                    agencyCode: value.agency_id
                  }]
                },
                variable: {
                  variableCode:[{
                    value: parameterInfo.pcode,
                    HRECOSvalue: value.parameter,
                    network:value.agency_id,
                  }],
                  variableName: parameterInfo.desc,
                  variableDescription: parameterInfo.desc,
                  valueType: '',
                  unit:{
                    unitCode:parameterInfo.unit
                  },
                  conversion: parameterInfo.conversion
                },
                values: [{
                    value: [{
                      value: value.value,
                      qualifiers: ["P"],
                      dateTime: value.date_time
                    }],
                    method: [{
                      methodDescription: "[legacy]",
                      methodID: 99999
                    }]
                }],
                name: "USGS:" + siteInfo["Site ID"] + ":" + parameterInfo.pcode + ":00000"
              };

              //console.log('new timeseries item:',timeSeries)
              processedData.value.timeSeries.push(timeSeries);
            }

            //otherwise just add this value to the current timeseries
            else {
              //console.log('should be just adding value here',value);

              $(processedData.value.timeSeries).each(function (i, timeSeries) {
                if (value.parameter === timeSeries.variable.variableCode[0].HRECOSvalue && value.site_name === timeSeries.sourceInfo.siteNameHRECOS) {
                  var newValue = {
                    value: value.value,
                    qualifiers: ["P"],
                    dateTime: value.date_time
                  };
                  timeSeries.values[0].value.push(newValue);

                }
              });
            }
            
          });

          //console.log('legacy data:',processedData);
               
        }

        //copy standard USGS waterservices response
        else {
          processedData = data;
        }

        counter += 1;

        //need to loop over original sitelist and response sitelist to see if we got data for all
        //console.log('TESTING, sites:',inputRequest.sites)

        if (processedData.value.timeSeries.length <= 0) {
          var siteList = siteNameList.filter(function (a) {
            return processedSites.indexOf(a) === -1;
          });
          var badges = [];
          $(siteList).each(function (i, obj) {
            badges.push('<span class="badge badge-secondary">'+ obj + '</span>');
          });

          if (processedData.declaredType === 'legacyDB') {

            //check if were done
            if (counter === requestDatas.length) {
              $('#loading').hide();
            }

            $('#graphStatus').append('<div id="hrecosAlert" class="alert alert-warning" role="alert" style="font-size:small;">Found HRECOS site(s): ' + badges.join('  ') + ' but no data in the legacy HRECOS DB was found for parameters: [' +  requestData.parameterCd + ']</div>');

            //$('#graphStatus').append('<div id="hrecosAlert" class="alert alert-warning" role="alert" style="font-size:small;">Found HRECOS site(s) [' + siteIDs + '] but no data in the legacy HRECOS DB was found [' +  requestData.parameterCd + ']</div>');
          }
          else {

            //check if were done
            console.log("HERE",counter,requestDatas.length)
            if (counter === requestDatas.length) {
              $('#loading').hide();
            }

            $('#graphStatus').append('<div id="nwisAlert" class="alert alert-warning" role="alert" style="font-size:small;">Found NWIS site(s): ' + badges.join('  ') + ' but no data was found in USGS NWIS waterservices for parameters: [' +  requestData.parameterCd + ']</div>');

            //$('#graphStatus').append('<div id="nwisAlert" class="alert alert-warning" role="alert" style="font-size:small;">Found NWIS site(s) [' + siteIDs + '] but no data was found in USGS NWIS waterservices for [' +  requestData.parameterCd + ']</div>');
          }
        }

        //need to make sure we have the same amount of timeseries as we did original pcodes
        else {
          console.log('CHECKING:',processedData.value.timeSeries.length,parameterCodesList.length)
          if (processedData.value.timeSeries.length !== parameterCodesList.length) {
            $('#graphStatus').append('<div class="alert alert-warning" role="alert" style="font-size:small;">Data for one or more parameters is missing</div>');
          }
        }

        var startTime = moment(processedData.value.queryInfo.criteria.timeParam.beginDateTime).valueOf(); 
        //console.log('setting starttime:',startTime);
        //var qualifierFound = false;

        $(processedData.value.timeSeries).each(function (timeSeriesIndex, siteParamCombo) {

          console.log('siteParamCombo',siteParamCombo, processedSites);

          //push to processed site list if we dont have it yet
          if (processedSites.indexOf(siteParamCombo.sourceInfo.siteName) === -1) processedSites.push(siteParamCombo.sourceInfo.siteName);

          $(siteParamCombo.values).each(function (i, value) {

            //check to make sure there are some values
            if (value.value.length === 0) return;

            var valueArray = value.value.map(function(item, index) {
              var seconds = moment(item.dateTime).valueOf();

              //here is where we add a year to each value so compareYears plots can use the same x-axis
              if (previousYear) seconds = moment(seconds).add(1, 'years').valueOf();

              var itemValue = item.value/1;

              //null out the values if there is a maintenance flag
              if (item.qualifiers.indexOf('Mnt') !== -1 || item.qualifiers.indexOf('Eqp') !== -1 || item.qualifiers.indexOf('Ssn') !== -1) {
                itemValue = null;
                qualifierFound = true;
              }

              //check for unit conversion
              if (siteParamCombo.variable.conversion) {
                itemValue = itemValue * siteParamCombo.variable.conversion;
              }

              //subtract 5 hours if data is from HRECOS
              if (value.method[0].methodDescription === '[legacy]') seconds = seconds - 18000000;

              //block for adding null values for data gaps  NOT FINISHED, replaced by highcharts 'broken-axis' module
              
              // if (index > 0) {
              //   //console.log("INDEX", index)
              //   var previousX = moment(siteParamCombo.values[0].value[index - 1].dateTime).valueOf();
              //   var distance = seconds - previousX;

              //   //if distance in time from this point to previous point is greater than 15 minutes
              //   if (distance === 900000) {
              //     return [seconds,itemValue];
              //   } else {
              //     console.log("WE FOUND A DATAGAP:", distance)
              //     //data.push([previousX + 1, null])
              //     //data.push(datapoints.lineData[i]);
              //     return [seconds,null];
              //   }
              // }

              return [seconds,itemValue];
            });

        
            var description;
            var variableDescription = siteParamCombo.variable.variableDescription;

            //replace NWIS text for precipitation to remove the word 'total'
            if (siteParamCombo.variable.variableDescription.indexOf('Precipitation, total, inches') !== -1) {
              variableDescription = 'Precipitation, inches'
            }

            //console.log('method description:', siteParamCombo.variable.variableDescription, value.method[0].methodDescription)
            if (value.method[0].methodDescription.length > 0) description = variableDescription + ', ' + value.method[0].methodDescription;
            else description = siteParamCombo.variable.variableDescription;

            var name = siteParamCombo.sourceInfo.siteName + ' | ' + $('<div>').html(description).text();

            //replace this string for clarity
            if (name.indexOf('[HRECOS]') !== -1) name = name.replace('[HRECOS]','[NWIS]');
            else if (name.indexOf('[legacy]') === -1) name += ' [NWIS]';

            //observed/predicted text replacement
            if (name.indexOf('Estuary or ocean water surface elevation above NAVD 1988, feet, NAVD88 [NWIS]')) {
              name = name.replace('Estuary or ocean water surface elevation above NAVD 1988, feet, NAVD88 [NWIS]','OBSERVED: Estuary or ocean water surface elevation above NAVD 1988, feet, NAVD88 [NWIS]')
            }
            if (name.indexOf('Estuary or ocean water surface elevation above NAVD 1988, feet, tidal prediction, NAVD88 [NWIS]')) {
              name = name.replace('Estuary or ocean water surface elevation above NAVD 1988, feet, tidal prediction, NAVD88 [NWIS]','PREDICTED: Estuary or ocean water surface elevation above NAVD 1988, feet, NAVD88 [NWIS]')
            }

            //override PSU
            if (siteParamCombo.variable.unit.unitCode === 'PSS') siteParamCombo.variable.unit.unitCode = 'psu';
      
            var series = {
              showInLegend: true,
              values: value,
              data: valueArray,
              color: getColor(timeSeriesIndex),
              siteID: siteParamCombo.sourceInfo.siteCode[0].value,
              siteName: siteParamCombo.sourceInfo.siteName,
              siteCode: siteParamCombo.name,
              variableDescription: description,
              variableName: siteParamCombo.variable.variableName,
              unit: siteParamCombo.variable.unit.unitCode,
              name:name,
            };

            //update the name to include the year if compare years is on
            if (compareYears) {
              var beginDate,endDate;
              if (processedData.value.queryInfo.criteria.timeParam.beginDateTime.indexOf('T') > -1) {
                beginDate = processedData.value.queryInfo.criteria.timeParam.beginDateTime.split('T')[0]
                endDate = processedData.value.queryInfo.criteria.timeParam.endDateTime.split('T')[0]
              }
              else if (processedData.value.queryInfo.criteria.timeParam.beginDateTime.indexOf(' ') > -1) {
                beginDate = processedData.value.queryInfo.criteria.timeParam.beginDateTime.split(' ')[0]
                endDate = processedData.value.queryInfo.criteria.timeParam.endDateTime.split(' ')[0]
              }
              series.name = beginDate + ' to ' + endDate + ' | ' + name; 

            }
      
            seriesData.push(series);
          });
        });

        //check if were done with requests
        console.log("length test:",counter,inputRequests.length,seriesData.length)

        //if (counter === seriesData.length && counter === inputRequests.length) {
        if (counter === inputRequests.length) {

          //final check to see if we missed any site data
          if (processedSites.length > 0) {

            //if we have anything, show the graph
            // setTimeout(function(){ 
            //   showGraph(startTime,seriesData); 
            // }, 1500);

            showGraph(startTime,seriesData); 

            //enable download button
            if (!NERRSdata) {
              // $('#downloadData').prop('disabled', false);
              // $('#toggleTooltip').prop('disabled', false);
            }

            if (qualifierFound) $('#graphStatus').append('<div class="alert alert-warning" role="alert" style="font-size:small;">Qualifier flags were found for the input request, some data is missing.</div>');

            //compare original list to processed site list
            if(processedSites.sort().join(',')=== siteNameList.sort().join(',')){
              console.log('processed site list and original site list match',counter,requestDatas.length, processedSites, siteNameList);
              
            }
            else {
              console.log('processed site list and original site list DONT match',counter,requestDatas.length, processedSites, siteNameList);

              //check if there already is NWIS alert, dont need to duplicate
              if ($('#nwisAlert').length){
                //already have div
              }
              else {
                var siteList = siteNameList.filter(function (a) {
                  return processedSites.indexOf(a) == -1;
                });
                var badges = [];
                $(siteList).each(function (i, obj) {
                  badges.push('<span class="badge badge-secondary">'+ obj + '</span>');
                })
                $('#graphStatus').append('<div class="alert alert-warning" role="alert" style="font-size:small;">Site(s) missing data in USGS NWIS waterservices: ' + badges.join('  ') + '</div>');
              }

            }
          }
        }

        
      },
      error: function(error){

        $('#loading').hide();
        console.error("Error:",error);
        $('#graphStatus').append('<div class="alert alert-danger" role="alert" style="font-size:small;">There was an error while requesting data from the legacy database.</div>');

      }
    });

    // Add the AJAX reference to the array
    requests.push(XHR);
  });

}

function getColor(i) {
  console.log('index:',i)
 var pallette = ['#4363d8', '#f58231','#e6194b', '#3cb44b', '#ffe119', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#000000']

  return pallette[i];
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function showGraph(startTime,seriesData) {
  console.log('In ShowGraph.  Processing this many:',seriesData.length, seriesData);

  //enable download button
  $('#downloadData').prop('disabled', false);
  $('#toggleTooltip').prop('disabled', false);

	Highcharts.setOptions({
		global: { useUTC: false },
		lang: { thousandsSep: ','}
  });
  
  //chart init object
  var chartSetup = {
    legend: {
      itemStyle: {
        color: '#000000',
        fontWeight: 'normal',
        fontSize: '14px'
      },
      itemCheckboxStyle: {
        width: "18px", 
        height: "18px", 
        position:"absolute"
      }
    },
		chart: {
      type: 'line',
      zoomType: 'xy',
			spacingTop: 20,
			spacingLeft: 0,
			spacingBottom: 0,
    },
    plotOptions: {
      series: {
        pointStart: startTime,
        pointInterval: 900000, //15 minutes

        //show gap in line if we are missing any 15 min value
        gapSize: 1,

        //turn on checkbox and set it to toggle series visibility
        events: {
          checkboxClick: function (event) {

            //console.log('checkbox was clicked',this)

            var chart = this.chart;
            Highcharts.each(chart.legend.allItems, function (p, i) {
              $(p.checkbox).change(
                function () {
                  if (this.checked) {
                    chart.legend.allItems[i].show();
                  } else {
                    chart.legend.allItems[i].hide();
                  }
                });
            });
          },
          //this will toggle the checkbox on legend text click
          legendItemClick: function () {
            this.checkbox.checked = !this.checkbox.checked;
          }
        },
        showCheckbox: true,
        selected: true
      }
    },
		title:{
			text:''
		},
		credits: {
			enabled: false
    },
    tooltip: {
      shared: true,
      useHTML: true,
      pointFormatter: function() {
        var point = this,
          series = point.series,
          legendSymbol = "<svg width='20' height='20'>" + series.legendSymbol.element.outerHTML + "</svg>";
  
        return "<div class='tooltip-body'>" + legendSymbol + series.name + ": <b>" + point.y + "</b><br/></div>";
  
      }
    },
		xAxis: {
			type: "datetime",
			labels: {
				formatter: function () {
          if (compareYears) return Highcharts.dateFormat('%m/%d', this.value);
          else return Highcharts.dateFormat('%m/%d/%Y', this.value);
        },
        style: {
          fontSize: "12px"
        },
				//rotation: 90,
				align: 'center',
        tickInterval: 172800 * 1000,

			}
    },
		yAxis: [],
		series: []
  };


    //loop over series data so we can match up the axis and series indexes
    $(seriesData).each(function (i, obj) {
    //console.log('individual seires:',i, obj, seriesData.length);

    var yaxis =   {
      title: { 
        text: obj.unit,
        style: {
          color: obj.color
        }
      },
      labels: {
        style: {
            color: obj.color,
            fontSize: '12px'
        }
      }
    };

    //we only want one yAxis for each param with the same units. do that here
    var exists = false;
    $(chartSetup.yAxis).each(function (i, data) { 
      if (data.title.text == obj.unit) exists = true;
    });

    if (!exists) { 
      chartSetup.yAxis.push(yaxis);
    }
    chartSetup.series.push(obj);
    //chart.update(chartSetup,true);
  });



  //second loop for assigning axis to each series
  $(seriesData).each(function (i, obj) {
    $(chartSetup.yAxis).each(function (i, data) { 

      //assign yAxis index if we have a unit match
      if (data.title.text == obj.unit) obj.yAxis = i;
      
      //make each alternating one opposite
      data.opposite = isOdd(i);


    });
  });

  
  $('#loading').hide();
  chart = Highcharts.chart('graphContainer', chartSetup);

  //enable tooltip toggle
  chart.enableTooltip = true;
  $('#toggleTooltip').bind('click', function() {
    
    chart.enableTooltip = !chart.enableTooltip;

    chart.update({
        tooltip: {
            enabled: chart.enableTooltip
        }
    });

    $(this).text(chart.enableTooltip ? 'Disable Tooltip' : 'Enable Tooltip');
  });
}

function initializeFilters(data) {

  $('.appFilter').each(function (i, obj) {

    var divID = $(obj).attr('id');
    var selectName = $(obj).data('selectname');
    var selectData = [];

    console.log('processing:',divID,selectName)

    
    if (divID === 'metParameterSelect') {
            
      $.each(parameterList, function (idx,item) {

        var obj = {
          id:idx,
          text:item.label,
          value:item.pcode
        }

        if (item.type === 'Meteorologic') {

          //check to see if we already have this label in the dropdown
          var foundIndex = containsObject(obj,selectData);
          if (foundIndex) {
            
            //if this label exists, just push the pcode
            selectData[foundIndex].value.push(item.pcode)

          }
          else {
            selectData.push(obj);
          }

        }
      });
    }

    if (divID === 'hydParameterSelect') {
            
      $.each(parameterList, function (idx,item) {

        var obj = {
          id:idx,
          text:item.label,
          value:[item.pcode]
        }

        if (item.type === 'Hydrologic') {
          

          //check to see if we already have this label in the dropdown
          var foundIndex = containsObject(obj,selectData);
          if (foundIndex) {
            
            //if this label exists, just push the pcode
            //console.log('1a', item)
            selectData[foundIndex].value.push(item.pcode)

          }
          else {
            //console.log('111',obj)
            selectData.push(obj);
          }

        }
      });
    }

    if (divID === 'stationSelect') {

      $.each(data.features, function (idx,item) {
        selectData.push({
          "id":idx,
          "text":item.properties['Station Name'],
          "value":item.properties['Site ID']
        });
      });
    }

    $('#' + divID).select2({
      placeholder: selectName,
      data:selectData,
      dropdownAutoWidth: true
    });

    //watch for any change, and spawn a parameter selector for each site that is selected
    $('#' + divID).on('change', function (e) {
      $('#' + divID).select2('data');
    });

  });
}

function openPopup(e) {
    
  var siteName = e.params.data.text;

  console.log('station select',siteName);

  sitesLayer.eachLayer(function(geoJSON){
    geoJSON.eachLayer(function(layer) { 

      if (siteName == layer.feature.properties['Station Name']) {
        layer.openPopup();
      }
    });
  });

}

function addToLegend(text, classString) {

  var legendID= camelize(text);;
  var description = text;;

  //check if this symbol is already in legend, if not add it
  if (document.getElementById(legendID) === null) {
    $("#legend").append('<div id="' + legendID + '" class="card-text"><icon class="' + classString + '" /><span>' + description + '</span></div>');
  }
}

function loadSites() {

  $.ajax({
    url: sitesURL,
    success: function (data) {
      featureCollection = data;

      var geoJSONlayer = geoJSON(featureCollection, {
        pointToLayer: function (feature, latlng) {
    
          //considtional classString
          var classString = 'wmm-pin wmm-mutedblue wmm-icon-circle wmm-icon-white wmm-size-25';
    
          addToLegend('HRECOS Site',classString);
    
          var icon = L.divIcon({ className: classString })
          return L.marker(latlng, { icon: icon });
        },
        onEachFeature: function(feature, layer) {

          
          var popupContent = '';

          //look up better header
          $.each(feature.properties, function (shortKey, property) {

            //make sure we have something
            if (property.length > 0) {

              if(shortKey === 'Site ID' && feature.properties["Station Name"].indexOf('NERRS') === -1) {
                
                popupContent += '<b>' + shortKey + ':</b>&nbsp;&nbsp;<a href="https://waterdata.usgs.gov/usa/nwis/uv?' + property + '" target="_blank">' + property + '</a></br>';

              }

              //otherwise add as normal
              else {
                if(shortKey === 'Partners') {
                  feature.properties[shortKey].forEach(function(key,value) {
                    popupContent += '<b>Partner :</b>&nbsp;&nbsp;<a href="' + key.url + '" target="_blank">' + key.name + '</a>' + '</br>';
                  });
                }

                else {
                  popupContent += '<b>' + shortKey + ':</b>&nbsp;&nbsp;' + property + '</br>';
                } 

              }
            }

            
          });

          layer.bindPopup(popupContent);
        }
      });
    
      sitesLayer.addLayer(geoJSONlayer);

      initializeFilters(featureCollection);
    },
    complete: function () {
      // call a function on complete 
      
    }
  });
}

function setBasemap(baseMap) {

  switch (baseMap) {
    case 'Streets': baseMap = 'Streets'; break;
    case 'Satellite': baseMap = 'Imagery'; break;
    case 'Clarity': baseMap = 'ImageryClarity'; break;
    case 'Topo': baseMap = 'Topographic'; break;
    case 'Terrain': baseMap = 'Terrain'; break;
    case 'Gray': baseMap = 'Gray'; break;
    case 'DarkGray': baseMap = 'DarkGray'; break;
    case 'NatGeo': baseMap = 'NationalGeographic'; break;
  }

  if (layer) theMap.removeLayer(layer);
  layer = basemapLayer(baseMap);
  theMap.addLayer(layer);
  if (layerLabels) theMap.removeLayer(layerLabels);
  if (baseMap === 'Gray' || baseMap === 'DarkGray' || baseMap === 'Imagery' || baseMap === 'Terrain') {
    layerLabels = basemapLayer(baseMap + 'Labels');
    theMap.addLayer(layerLabels);
  }
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
    return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
  }).replace(/\s+/g, '');
}

function isOdd(n) {
  return !!(n % 2);
}

function lookupNERRScode(NWISpcode) {
  var NERRScodes = [];
  $(NWISpcode.split(',')).each(function (i,pcode) {

    $(parameterList).each(function (i, parameter) {
      if(pcode === parameter.pcode) NERRScodes.push(parameter.NERRScode);
    });
  });
  
  return NERRScodes.join(',');

}

function lookupHRECOScode(NWISpcode) {
  var HRECOScodes = [];
  $(NWISpcode.split(',')).each(function (i,pcode) {

    $(parameterList).each(function (i, parameter) {
      if(pcode === parameter.pcode) HRECOScodes.push(parameter.HRECOScode);
    });
  });
  
  return HRECOScodes.join(',');

}

function lookupHRECOSsite(NWISsites) {
  var HRECOSsites = [];
  $(NWISsites.split(',')).each(function (i,nwissite) {

    $(featureCollection.features).each(function (i, feature) {
      if(nwissite === feature.properties["Site ID"]) HRECOSsites.push(feature.properties["HRECOS ID"]);
    });
  });
  
  return HRECOSsites.join(',');

}

function lookupParameter(HRECOSparamCode) {
  var response;
  //console.log('looking up NWIS param codes for:',HRECOSparamCode)
  $(parameterList).each(function (i, parameter) {
    if(HRECOSparamCode === parameter.HRECOScode) {
      //console.log('MATCH FOUND for:', HRECOSparamCode);
      response = parameter;
    }
  });
  return response;
}

function lookupNERRSParameter(code) {
  var response;
  //console.log('looking up NWIS param codes for:',HRECOSparamCode)
  $(parameterList).each(function (i, parameter) {
    if(code === parameter.NERRScode) {
      response = parameter;
    }
  });
  return response;
}

function lookupNWISsite(HRECOSid) {
  var response;
  //console.log('looking up NWIS site info for:',HRECOSid, featureCollection)
  $(featureCollection.features).each(function (i, feature) {
    if(HRECOSid === feature.properties["HRECOS ID"]) {
      //console.log('MATCH FOUND for:', HRECOSid,'result:',feature.properties)
      response = feature.properties;
      
    }
  });
  return response;
}

function containsObject(obj, list) {
  var i;
  for (i = 0; i < list.length; i++) {
      if (list[i].text === obj.text) {
          return i;
      }
  }

  return false;
}