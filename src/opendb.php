<?php
$dbConnection = new mysqli($servername, $username, $password, $dbname);

// If there are errors (if the no# of errors is > 1), print out the error and cancel loading the page via exit();
if (mysqli_connect_errno()) {
    $error = "Could not connect to MySQL database: " . mysqli_connect_error();
    
    // Set http header error
    header('HTTP/1.0 500 Internal Server Error');
    
    // Return error message
    die($error);
}
?>