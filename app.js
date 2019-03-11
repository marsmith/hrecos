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
import 'font-awesome/css/font-awesome.css';
import 'leaflet/dist/leaflet.css';
import 'marker-creator/stylesheets/markers.css';
import 'select2/dist/css/select2.css';
import 'bootstrap-datepicker/dist/css/bootstrap-datepicker.css';
import './styles/main.css';

//ES6 imports
import 'bootstrap/js/dist/util';
import 'bootstrap/js/dist/modal';
import 'bootstrap/js/dist/collapse';
import 'bootstrap/js/dist/tab';
import 'select2';
import moment from 'moment'
import Highcharts from 'highcharts';
import 'bootstrap-datepicker';
import { map, control, tileLayer, featureGroup, geoJSON, Icon } from 'leaflet';
import { basemapLayer, featureLayer } from 'esri-leaflet';

//START user config variables
var MapX = '-74.2'; //set initial map longitude
var MapY = '41.7'; //set initial map latitude
var MapZoom = 8; //set initial map zoom
//var sitesURL = './sitesGeoJSON.json';
//var sitesURL = './HRECOSsitesGeoJSON.json';
var sitesURL = './HRECOSsitesGeoJSONsubset.json';
var NWISivURL = 'https://nwis.waterservices.usgs.gov/nwis/iv/';
var HRECOSurl = 'http://localhost:8080/hrecos/query.php'; 
var crossOverDate = '2019-03-03';
//END user config variables 

//START global variables
var theMap;
var featureCollection;
var layer, sitesLayer, layerLabels;
var seriesData;

var parameterList = [
  {pcode:'00010', HRECOScode: 'WTMP', desc:'Temperature, water', unit:'degrees Celsius'},
  {pcode:'00020', HRECOScode: 'ATMP', desc:'Temperature, air', unit:'degrees Celsius'},

  {pcode:'00036', HRECOScode: 'WD', desc:'Wind direction', unit:'degrees clockwise from true north'},

  {pcode:'00045', HRECOScode: 'RAIN', desc:'Precipitation', unit:'total, inches'},

  {pcode:'00052', HRECOScode: 'RHUM', desc:'Relative humidity', unit:'percent'},

  {pcode:'00065', HRECOScode: 'DEPTH', desc:'Gage height', unit:'feet'},

  {pcode:'00095', HRECOScode: 'SPCO', desc:'Specific cond at 25C', unit:'microsiemens per centimeter'},

  {pcode:'00300', HRECOScode: 'DO', desc:'Dissolved oxygen, water, unfiltered', unit:'mg/l'},
  {pcode:'00301', HRECOScode: 'DOPC', desc:'Diss oxygen,%saturtn', unit:'percent of saturation'},

  {pcode:'00400', HRECOScode: 'PH', desc:'pH', unit:'standard units'},

  {pcode:'62620', HRECOScode: 'ELEV', desc:'Elevation, ocean/est', unit:'elevation above NAVD 1988, feet'},

  {pcode:'63680', HRECOScode: 'TURBF', desc:'Turbidity, Form Neph', unit:'formazin nephelometric units (FNU)'},

  {pcode:'70969', HRECOScode: '', desc:'DCP battery voltage', unit:'volts'},

  {pcode:'75969', HRECOScode: 'BARO', desc:'BarometricPressUncor', unit:'millibars'},

  {pcode:'72253', HRECOScode: 'STEMP', desc:'Temperature, soil', unit:'deg C'},

  {pcode:'82127', HRECOScode: 'WSPD', desc:'Wind speed', unit:'knots'},

  {pcode:'99989', HRECOScode: 'PAR', desc:'PAR, total', unit:''}

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

  sitesLayer.on('click', function (e) {
    openPopup(e);
  });
  /*  END EVENT HANDLERS */
});

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
        csvData.push('Description,"' + data.variableDescription + '"');
        csvData.push('');

        csvData.push('Time,Value');

        $(data.values).each(function (i, value) {
            csvData.push(value.dateTime + ',' + value.value);
        });
    
        //console.log(csvData);
        
        csvData = csvData.join('\n');
    
        var filename = data.siteCode.replace(':','_') + '.csv';
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

  //set request infos
  var compareYears = false;
  var requestDatas = [];
  var requestData = {
    format: 'json',
  };

  //get siteID list and format
  var siteData = $('#stationSelect').select2('data');
  var siteIDs = siteData.map(function(item) {
    return item.value;
  }).join(',');
  requestData.sites = siteIDs;

  //get siteparameter list and format
  var siteParameter = $('#parameterSelect').select2('data');
  var parameterCodes = siteParameter.map(function(item) {
    return item.value;
  }).join(',');
  requestData.parameterCd = parameterCodes;

  //validate station and parameter selections
  if (siteData.length === 0 || siteParameter.length === 0) {
    alert('You must choose at least one station and one parameter to continue');
    return;
  }

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


  //add internal access code
  requestData.access = '3';



  //  1.  if both dates before 12-31-18 then purely legacy query
  if (moment(requestData.startDT).isSameOrBefore(crossOverDate) && moment(requestData.endDT).isSameOrBefore(crossOverDate)) {
    console.log('ALL LEGACY DB QUERY');

    //make copy of the request, make some changes to the parameters for PHP query
    var legacyRequestData = JSON.parse(JSON.stringify(requestData));
    legacyRequestData.parameterCd = lookupHRECOScode(requestData.parameterCd);
    legacyRequestData.sites = lookupHRECOSsite(requestData.sites);

    //add hours
    legacyRequestData.startDT = moment(legacyRequestData.startDT + ' 00:00:00').add(5, 'hours').format('YYYY-MM-DD HH:mm:ss');
    legacyRequestData.endDT = moment(legacyRequestData.endDT + ' 23:59:59').add(5, 'hours').format('YYYY-MM-DD HH:mm:ss');
    console.log('times:',legacyRequestData.startDT, legacyRequestData.endDT);

    legacyRequestData.source = 'legacy';
    requestDatas.push(legacyRequestData);
    
  }

  //  2.  need to query both if the dates span over 12-31-18
  if (moment(requestData.startDT).isSameOrBefore(crossOverDate) && moment(requestData.endDT).isAfter(crossOverDate)) {
    console.log('QUERY SPAN DB CROSSOVER, MAKING 2 QUERIES');

    //make copy of the request, make some changes to the parameters for PHP query
    var legacyRequestData = JSON.parse(JSON.stringify(requestData));
    legacyRequestData.parameterCd = lookupHRECOScode(requestData.parameterCd);
    legacyRequestData.sites = lookupHRECOSsite(requestData.sites);
    
    //add hours
    legacyRequestData.startDT = moment(legacyRequestData.startDT + ' 00:00:00').add(5, 'hours').format('YYYY-MM-DD HH:mm:ss');
    legacyRequestData.endDT = moment(legacyRequestData.endDT + ' 23:59:59').add(5, 'hours').format('YYYY-MM-DD HH:mm:ss');
    console.log('times:',legacyRequestData.startDT, legacyRequestData.endDT);

    legacyRequestData.source = 'legacy';
    requestDatas.push(legacyRequestData);

    //have to make two queries here so also push original
    requestDatas.push(requestData);
    
  }

  //  3.  otherwise just regular NWIS query
  if (moment(requestData.startDT).isAfter(crossOverDate) && moment(requestData.endDT).isAfter(crossOverDate)) {
    console.log('REGULAR NWIS QUERY ONLY');
    requestDatas.push(requestData);
  }

  //if comparing years, get new dates minus one year
  if (compareYears) {

    //make copy of request and then change the dates
    var newRequestData = JSON.parse(JSON.stringify(requestData))
    newRequestData.startDT = moment(requestData.startDT).subtract(1, 'years').format('YYYY-MM-DD');
    newRequestData.endDT = moment(requestData.endDT).subtract(1, 'years').format('YYYY-MM-DD');
    requestDatas.push(newRequestData);
  }

  seriesData = [];
  var counter = 0;

  console.log('Processing', requestDatas.length, 'requests');

  $(requestDatas).each(function (i, inputRequest) {

    //overwrite url if source is legacy
    var url = NWISivURL;
    if (inputRequest.source == 'legacy') url = HRECOSurl;

    console.log('input Request:',url, inputRequest);
    
    $.ajax({
      url: url,  
      dataType: 'json',
      data: inputRequest, 
      type: 'GET',
      success: function(data) {

        console.log('response:',data);
        var processedData;

        counter += 1;

        //create simulated USGS waterservices response from legacy DB data
        if (data.declaredType === "legacyDB") {

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
              //console.log("HERE",value.parameter, timeSeries.variable.variableCode[0])
              if (value.parameter === timeSeries.variable.variableCode[0].HRECOSvalue && value.site_name === timeSeries.sourceInfo.siteNameHRECOS) timeSeriesExists = true;
            });
            

            //if it doesnt exist add the new object
            if (!timeSeriesExists) {

              

              var siteInfo = lookupNWISsite(value.site_name);
              var parameterInfo = lookupParameter(value.parameter);

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
                  variableDescription: parameterInfo.desc + ', ' + parameterInfo.unit,
                  valueType: '',
                  unit:{
                    unitCode:parameterInfo.unit
                  }
                },
                values: [{
                    value: [{
                      value: value.value,
                      qualifiers: ["P"],
                      dateTime: value.datetime
                    }],
                    method: [{
                      methodDescription: "[legacy]",
                      methodID: 99999
                    }]
                }],
                name: "USGS:" + siteInfo["Site ID"] + ":" + parameterInfo.pcode + ":00000"
              }

              console.log('new timeseries item:',timeSeries)
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
                    dateTime: value.datetime
                  };
                  timeSeries.values[0].value.push(newValue);

                }
              });
            }
            
          });

          console.log('legacy datazzzzz',processedData);
               
        }

        //copy standard USGS waterservices response
        else {
          processedData = data;
        }

        if (processedData.value.timeSeries.length <= 0) {
          if (processedData.declaredType === 'legacyDB') alert('Found a HRECOS site [' + siteIDs + '] but it had no data in the legacy HRECOS DB for [' +  parameterCodes + ']');
          else alert('Found an NWIS site [' + siteIDs + '] but it had no data in waterservices for [' +  parameterCodes + ']');
          console.log('no values found for:', processedData)
          //return;
        }

        var startTime = processedData.value.queryInfo.criteria.timeParam.beginDateTime; 
    
        $(processedData.value.timeSeries).each(function (i, siteParamCombo) {

          console.log('siteParamCombo',siteParamCombo)

          $(siteParamCombo.values).each(function (i, value) {

            console.log('value here:',value);

            //check to make sure there are some values
            if (value.value.length === 0) return;

            var valueArray = value.value.map(function(item) {
              var seconds = new Date(item.dateTime)/1;

              //subtract 5 hours if data is from HRECOS
              if (value.method[0].methodDescription === '[legacy]') seconds = seconds - 18000000;
              
              //return item.value/1;
              return [seconds,item.value/1];
            });

            var description;
            console.log('method description:', siteParamCombo.variable.variableDescription, value.method[0].methodDescription)
            if (value.method[0].methodDescription.length > 0) description = siteParamCombo.variable.variableDescription + ', ' + value.method[0].methodDescription;
            else description = siteParamCombo.variable.variableDescription;

            var name = siteParamCombo.sourceInfo.siteName + ' | ' + $('<div>').html(description).text();

            //replace this string for clarity
            name = name.replace('[HRECOS]','[NWIS]');
      
            var series = {
              showInLegend: true,
              values: value,
              data: valueArray,
              color: getRandomColor(),
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
              series.name = processedData.value.queryInfo.note[1].value.split('INTERVAL[')[1].split('-')[0] + ' | ' + siteParamCombo.sourceInfo.siteName + ' | ' + $('<div>').html(siteParamCombo.variable.variableName).text(); 
            }
      
            seriesData.push(series);
          });
        });

        //check if were done
        if (counter === requestDatas.length) {
          console.log('hiding loader');
          $('#loading').hide();
        }



        showGraph(startTime,seriesData);
      }
    });
  });

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
  console.log('seriesData',startTime,seriesData);

  //clear out graphContainer
  $('#graphContainer').html('');

  //if there is some data, show the div
  $('#graphModal').modal('show');

	Highcharts.setOptions({
		global: { useUTC: false },
		lang: { thousandsSep: ','}
  });
  
  //chart init object
  var chartSetup = {
    legend: {
      itemStyle: {
        color: '#000000',
        fontWeight: 'normal'
      }
    },
		chart: {
			type: 'line',
			spacingTop: 20,
			spacingLeft: 0,
			spacingBottom: 0,
    },
    plotOptions: {
      series: {
        pointStart: startTime,
        pointInterval: 900000 //15 minutes
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
  
        return "<div style='width: 400px; white-space:normal;'>" + legendSymbol + series.name + ": <b>" + point.y + "</b><br/></div>";
  
      }
    },
		xAxis: {
			type: "datetime",
			labels: {
				formatter: function () {
					return Highcharts.dateFormat('%m/%d', this.value);
				},
				//rotation: 90,
				align: 'center',
				tickInterval: 172800 * 1000
			}
    },
		yAxis: [],
		series: []
  };

  console.log('series Data',seriesData);

  //loop over series data so we can match up the axis and series indexes
  $(seriesData).each(function (i, obj) {
    console.log('individual seires:',obj);

    var yaxis =   {
      title: { 
        text: obj.unit,
        style: {
          color: obj.color
        }
      },
      labels: {
        style: {
            color: obj.color
        }
      },
      //put odd items on opposite axis
      //opposite: isOdd(i)
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

	var chart = Highcharts.chart('graphContainer', chartSetup);
}

function resetFilters() {

  //reset geoJSON
  sitesLayer.clearLayers();
  var geoJSONlayer = geoJSON(featureCollection, {
    pointToLayer: function (feature, latlng) {

      //considtional classString
      var classString = iconLookup[feature.properties.testType];

      addToLegend(classString);

      var icon = L.divIcon({ className: classString })
      return L.marker(latlng, { icon: icon });
    }
  });

  sitesLayer.addLayer(geoJSONlayer);

  //clear filter selections
  $('.appFilter').each(function (i, obj) {
    var divID = $(obj).attr('id');
    $('#' + divID).val(null).trigger('change');
  });
}

function initializeFilters(data) {

  $('.appFilter').each(function (i, obj) {

    var divID = $(obj).attr('id');
    var selectName = $(obj).data('selectname');
    var selectData = [];

    console.log('processing:',divID,selectName)

    
    if (divID === 'parameterSelect') {
            
      $.each(parameterList, function (idx,item) {
        selectData.push({
          id:idx,
          text:item.desc,
          value:item.pcode
        });
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
  console.log('site clicked', e.layer.feature.properties);

  var popupContent = '';

  //look up better header
  $.each(e.layer.feature.properties, function (shortKey, property) {

    //make sure we have something
    if (property.length > 0) {

      if(shortKey === 'Site ID') {
        
        popupContent += '<b>' + shortKey + ':</b>&nbsp;&nbsp;<a href="https://waterdata.usgs.gov/usa/nwis/uv?' + property + '" target="_blank">' + property + '</a></br>';

      }
      //otherwise add as normal
      else popupContent += '<b>' + shortKey + ':</b>&nbsp;&nbsp;' + property + '</br>';
    }
  });

  L.popup({ minWidth: 320 })
    .setLatLng(e.latlng)
    .setContent(popupContent)
    .openOn(theMap);
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
  console.log('looking up NWIS param codes for:',HRECOSparamCode)
  $(parameterList).each(function (i, parameter) {
    if(HRECOSparamCode === parameter.HRECOScode) {
      console.log('MATCH FOUND for:', HRECOSparamCode);
      response = parameter;
    }
  });
  return response;
}

function lookupNWISsite(HRECOSid) {
  var response;
  console.log('looking up NWIS site info for:',HRECOSid, featureCollection)
  $(featureCollection.features).each(function (i, feature) {
    if(HRECOSid === feature.properties["HRECOS ID"]) {
      console.log('MATCH FOUND for:', HRECOSid,'result:',feature.properties)
      response = feature.properties;
      
    }
  });
  return response;
}