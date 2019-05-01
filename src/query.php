<?php
//include config
include 'config.php';
include 'opendb.php';

//Access-Control-Allow-Origin header with wildcard.
header('Access-Control-Allow-Origin: *');

//sanitze input
$_GET = filter_input_array(INPUT_GET, FILTER_SANITIZE_STRING);

//get input parameters
$querySites = $_GET['sites'];
$queryParameters = $_GET['parameterCd'];
$queryStartDT = $_GET['startDT'];
$queryEndDT = $_GET['endDT'];
$querySource = $_GET['source'];

//check for NERRS query
if($querySource == "NERRS") {
    //override table name
    $tablename = "NERRS";
}

//start query
$sql = "SELECT * FROM ". $dbname . "." . $tablename . " WHERE ";

//get site list
$haveSites = FALSE;
if(isset($querySites) && !empty($querySites)){
    $searchTerms = explode(',', $querySites);
    $searchTermBits = array();

    foreach ($searchTerms as $site) {
        $site = trim($site);
        if (!empty($site)) {
            //get first 6 digits
            $subsite = substr($site,0,6);
            $searchTermBits[] = "`site_name` LIKE '$subsite%'";
        }
    }

    $haveSites = TRUE;
    $sql .= "(". implode(' OR ', $searchTermBits) . ")";

    // $siteList = "'" . implode("','", explode(",", $querySites)) . "'";
    // $haveSites = TRUE;
    // $sql .= "`site_name` IN (".$siteList.")";

}

//get parameters
$haveParameters = FALSE;
if(isset($queryParameters) && !empty($queryParameters)){
    $parameterList = "'" . implode("','", explode(",", $queryParameters)) . "'";
    $haveParameters = TRUE;
    if ($haveSites) { $sql .= " AND ";};
    $sql .= "`parameter` IN (".$parameterList.")";
}

//get dates
if(isset($queryStartDT) && !empty($queryStartDT) && isset($queryEndDT) && !empty($queryEndDT)){
    if ($haveParameters || $haveSites) { $sql .= " AND ";};
    $sql .= "`date_time` >= '".$queryStartDT."' AND `date_time` <= '".$queryEndDT."'";
}

//limit records for testing
//$sql .= " LIMIT 100;";
//echo $sql;

//$sql2 = "SELECT * FROM hrecos_test.raw_data WHERE site_name='HRALBPH' LIMIT 100";
$result = mysqli_query($dbConnection, $sql) or die(mysql_error()); 
$rows = array();

while($r = mysqli_fetch_assoc($result)) {
    $rows[] = $r;
}

print json_encode(array(
    "declaredType" => "legacyDB",
    "queryInfo" => array(
        "criteria" => array(
            "sql" => $sql,
            "server" => $servername,
            "locationParam" => $querySites,
            "variableParam" => $queryParameters,
            "timeParam" => array(
                "beginDateTime" => $queryStartDT,
                "endDateTime" => $queryEndDT
            )
        )
    ),
    "values" => $rows
));

mysqli_close($dbConnection);
?> 