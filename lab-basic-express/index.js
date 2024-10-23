const express = require('express');
const cors = require('cors');

// create new express application
const app = express();

// set up CORS (Cross Origin Resource Sharing)
app.use(cors());

//route must be after last app.use()
//and before app.listen()
//app.get() -> HTTP GET method
//first parameter "/" -> the "/" URL on the server
//second parameter is annoymous function
    // first parameter - the request(what the client send to server)
    // second parameter - the response (what the server send back to the client)
app.get("/", function(req,res){
//send back a response using 'res' object
res.json({
    "message":"hello world!"
})
})

app.get("/quote-of-the-day", function(req, res){
    res.json({
        "quote":"The smallest things take up the most room in your heart!"
    })
})

// the :name is a placeholder (URL parameter)
app.get("/hello/:name", function(req,res){
    //we use req.params to access the placeholder
    let name = req.params.name;
    res.json({
        "message":"Hello " + name
    })
})

app.get("/addTwo/:number1/:number2", function(req,res){
    let n1 = req.params.number1;
    let n2 = req.params.number2;
    //all URL parameters are strings
    let sum = Number(n1) + Number(n2);
    res.json({
        "message":"The sum is " + sum
    })
})

//assume user is going to query string with two keys: employeeName and joinDate
app.get("/employee", function(req,res){
    console.log(req.query);
    let employeeName = req.query.employeeName;
    let joinDate = req.query.joinDate;
    res.json({
        "Employee Name": employeeName,
        "Date of Join": joinDate
    })
})

//start server using listen function
//first parameter is PORT number to run the server on
//second parameter is call back funtion for when the server is started successfully
app.listen(3000, function(){
    console.log("Server started")
})