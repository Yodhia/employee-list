// 1. SETUP EXPRESS
const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require ('bcrypt');
const jwt = require('jsonwebtoken');
const dbname = "employee_list"; //database name

// enable dotenv - allow Express application to read .env files
require('dotenv').config();

// set the mongouri to be the MONGO_URI from the .env file
//make sure to read data from process.env after require('dotenv').config
const mongoUri = process.env.MONGO_URI;

// funtion to generate an access token
function generateAccessToken(id, email){
    // set the payload of the JWT (i.e developer can add any data they want)
    let payload = {
        'user_id': id,
        'email': email,
    }

    // create the JWT
    // parameter for jwt.sign()
    // - parameter 1: the payload (sometimes known as 'claims')
    // - parameter 2: token secret,
    // - parameter 3: options (to set expiresIn)

    let token = jwt.sign(payload, process.env.TOKEN_SECRET,{
        'expiresIn': '1h'// h for hour, d for days, m is for minutes and s is for seconds
    });

    return token;
}

// middleware: a function that executes before a route function
function verifyToken (req,res,next){
    // get the JWT from the headers
    let authHeader = req.headers['authorization'];
    let token = null;
    if(authHeader){
        // the token will be stored as in the headed as: BEARER <JWT TOKEN>
        token = authHeader.split(' ')[1];
        if (token){
            // the callback function in the third parameter will be called after the token has been verified
            jwt.verify(token, process.env.TOKEN_SECRET, function(err,payload){
                if(err){
                    console.error(err);
                    return res.sendStatus(403);
                }
                // save the payload into the request
                req.user = payload;

                // call the next middleware or the route funtion
                next();
            })
        } else {
            return res.sendStatus(403);
        }
    } else {
        return res.sendStatus(403);
    }

}

// 1a. create the app
const app = express();
app.use(cors()); //enable cross origin resource sharing

//1b. enable JSON processing (i.e allow client to seend JSON data to our server)
app.use(express.json());

//uri = connection string
async function connect(uri, dbname) {
    //create a Mongo Client - software/driver that allow to communicate with a database
    let client = await MongoClient.connect(uri, {
        useUnifiedTopology: true
    });
    let db = client.db(dbname);//use <database> in Mongo Shell
    return db;
}
// 2. CREATE ROUTES
// All routes will be created in the 'main' function
async function main() {

    //connect to the mongo databse
    let db = await connect(mongoUri, dbname);

    app.get('/', function (req, res) {
        res.json({
            "message": "Hello World!"
        });
    });

    // allow the user to search by name, employmentStatus, joinDate
    app.get("/employeeList", async function (req, res) {
        try {
            // shorter way to write the code 
            // let(employmentStatus, employeeName, joinDate) = req.query;
            let employmentStatus = req.query.employmentStatus;
            let employeeName = req.query.employeeName;
            let joinDate = req.query.joinDate;

            let criteria = {};

            if (employmentStatus) {
                criteria["employmentStatus"] = {
                    "$in": employmentStatus.split(",")
                }
            }

            if (employeeName) {
                criteria["employeeName"] = {
                    "$regex": employeeName, "$options": "i" // "i" means not case sensitive
                }
            }
            if (joinDate) {
                criteria["joinDate"] = {
                    "$in": joinDate.split(",")
                }
            }
            console.log("Query criteria:", criteria);

            let employeeList = await db.collection("employeeList").find(criteria).toArray();
            res.json({
                'employeeList': employeeList
            })
        } catch (error) {
            console.error("Error fetching employeeList", error);
            res.status(500);
        }
    })

    // to get details of employee with _id
    app.get("/employeeList/:id", async function (req, res) {
        try {
            // get the id of the employee that we want to get full details off
            let id = req.params.id;
            let employeeList = await db.collection('employeeList').findOne({
                "_id": new ObjectId(id)
            });

            if (!employeeList) {
                return res.status(404).json({
                    "error": "Sorry, employee not found"
                })
            }

            res.json({
                'employeeList': employeeList
            })

        } catch (error) {
            console.error("Error fetching employeeList:", error);
            res.status(500);
        }
    });

    //to get new data - use app.post for HTTP method POST
    app.post("/employeeList", async function (req, res) {
        try {

            // user to provide employeeName, employmentStatus, joinDate
            // when we use POST, PATCH and PUT to send data to server, the data are in req.body
            let { employeeName, age, salary, joinDate, department, employmentStatus } = req.body;

            // basic validation: make sure employeeName, employmentStatus, joinDate are provided
            if (!employeeName || !age || !salary || !joinDate || !department || !employmentStatus) {
                return res.status(400).json({
                    "error": "Missing field required"
                })
            }

            // find department to attach to employee
            let departmentDocument = await db.collection('department').findOne({
                "departmentName": department
            })


            let newEmployeeListDocument = {
                employeeName,
                age,
                salary,
                "department": departmentDocument,
                joinDate,
                employmentStatus
            };

            // insert the new employeeList document into the collection
            let result = await db.collection("employeeList").insertOne(newEmployeeListDocument);
            //201 is status code for created
            res.status(201).json({
                'message': 'New employee has been created',
                'employeeId': result.insertedId //insertedId is the new _id of the new document
            })
        } catch (e) {
            console.error(e);
            res.status(500);
        }
    })

    app.put("/employeeList/:id", async function (req, res) {
        try {
            let id = req.params.id;

            // user to provide employeeName, employmentStatus, joinDate
            // when we use POST, PATCH and PUT to send data to server, the data are in req.body
            let { employeeName, age, salary, department, joinDate, employmentStatus } = req.body;

            // basic validation: make sure employeeName, employmentStatus, joinDate are provided
            if (!employeeName || !age || !salary || !department || !joinDate || !employmentStatus) {
                return res.status(400).json({
                    "error": "Missing field required"
                })
            }

            //find department to attach to employee
            let departmentDocument = await db.collection('department').findOne({
                "departmentName": department
            });

            //check if deparment exist
            if (!departmentDocument){
                return res.status(400).json({
                    "error": "Department not found"
                })
            }

            let updatedEmployeeListDocument = {
                employeeName,
                age,
                salary,
                "department": departmentDocument.departmentName,
                joinDate,
                employmentStatus
            };

            // insert the new employeeList document into the collection
            let result = await db.collection("employeeList")
                .updateOne({
                    "_id": new ObjectId(id)
                }, {
                    "$set": updatedEmployeeListDocument
                });

            //if there is no matches, means no update took place
            if (result.matchedCount == 0) {
                return res.status(404).json({
                    "error": "Employee not found"
                })
            }

            res.status(200).json({
                "message": "Employee updated"
            })

        } catch (e) {
            console.error(e);
            res.status(500);
        }
    })

    app.delete("/employeeList/:id", async function (req, res) {
        try {
            let id = req.params.id;

            let results = await db.collection('employeeList').deleteOne({
                "_id": new ObjectId(id)
            });

            if (results.deletedCount == 0) {
                return res.status(404).json({
                    "error": "Employee not found"
                })
            }

            res.json({
                "message": "Employee has been deleted successfully"
            })

        } catch (e) {
            console.error(e);
            res.status(500);
        }
    })

    // route for user to sign up
    // the user must provide email and password
    app.post('/users', async function (req, res) {

        try {
            let{email, password} = req.body;
            if (!email || !password) {
                return res.status(400).json({
                    "error": "Please provide user name and password"
                })
            }

            // if the request has both email and password
            let userDocument = {
                email,
                password: await bcrypt.hash(password, 12)
            };

            let result = await db.collection("users").insertOne(userDocument);

            res.json({
                "message": "New user account has been created",
                result
            })

        } catch (e) {
            console.error(e);
            res.status(500);
        }
       
    })

    // the client is supposed to provide the email and password in req.body
    app.post('/login', async function(req,res){
        try {
            let {email,password} = req.body;
            if (!email || !password){
                return res.status(400).json({
                    'message': "Please provide email and password"
                })
            }

            // find user by email
            let user = await db.collection('users').findOne({
                "email": email
            });

            // if the user exist
            if (user) {
                // check password (compare plaintext with the hashed one in the database)
                if (bcrypt.compareSync(password, user.password)){
                    let accessToken = generateAccessToken(user._id, user.email);
                    res.json({
                        "accessToken": accessToken
                    })
                } else{
                    res.status(401);
                }
            } else {
                res.status(401);
            }


        } catch (e) {
            console.error(e);
            res.status(500);
        }

    })

    app.get('/profile', verifyToken, async function(req,res){

        // get the payload
        let user = req.user;
        
        res.json({
            user
        })
    })


}
main();


// 3. START SERVER (Don't put any routes after this line)
app.listen(3000, function () {
    console.log("Server has started");
})

