<?php
//include config
include 'config.php';
include 'opendb.php';

//sanitze input
$_GET = filter_input_array(INPUT_GET, FILTER_SANITIZE_STRING);

//get input parameters
$querySites = $_GET['sites'];
$queryParameters = $_GET['parameters'];
$queryStartDT = $_GET['startDT'];
$queryEndDT = $_GET['endDT'];

//start query
$sql = "SELECT * FROM hrecos_test.raw_data WHERE ";

//get site list
$haveSites = FALSE;
if(isset($querySites) && !empty($querySites)){
    $siteList = "'" . implode("','", explode(",", $querySites)) . "'";
    $haveSites = TRUE;
    $sql .= "`site_name` IN (".$siteList.")";
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
    $sql .= "`datetime` BETWEEN '".$queryStartDT."' AND '" .$queryEndDT."'";
}

//limit records for testing
$sql .= " LIMIT 100;";
echo $sql;

//$sql2 = "SELECT * FROM hrecos_test.raw_data WHERE site_name='HRALBPH' LIMIT 100";
$result = mysqli_query($dbConnection, $sql) or die(mysql_error()); 
$rows = array();

while($r = mysqli_fetch_assoc($result)) {
    $rows[] = $r;
}
print json_encode($rows);

mysqli_close($dbConnection);
?> 