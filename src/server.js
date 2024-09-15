import express from "express";
import winston from "winston";
import pkg from "pg"; // Import Pool from pg for PostgreSQL connection
import { MongoClient } from "mongodb"; // Import MongoClient from mongodb package

const { Pool } = pkg; 

const { createLogger, format, transports, level } = winston;

// Define the log levels
const LOG_LEVELS = {
  INFO: 'info',
  DEBUG: 'debug',
  ERROR: 'error',
};

// Initialize request counter
global.requestCounter = 0;

// Define a custom log format
const customFormat = format.printf(({ level, message }) => {

  // Get the current date and time
const dateTime = new Date();
const formattedDate = dateTime.getDate().toString().padStart(2, '0');
const formattedMonth = (dateTime.getMonth() + 1).toString().padStart(2, '0');
const formattedYear = dateTime.getFullYear().toString();
const formattedHours = dateTime.getHours().toString().padStart(2, '0');
const formattedMinutes = dateTime.getMinutes().toString().padStart(2, '0');
const formattedSeconds = dateTime.getSeconds().toString().padStart(2, '0');
const formattedMilliseconds = dateTime.getMilliseconds().toString().padStart(3, '0');

const formattedDateTime = `${formattedDate}-${formattedMonth}-${formattedYear} ${formattedHours}:${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;

  // Format the log line
  return `${formattedDateTime} ${level.toUpperCase()}: ${message} | request #${requestCounter}`;
});

// Create a logger instance
const Requests_Logger = createLogger({
  level: 'info',
  loggerName: 'request-logger',
  format: customFormat,
  transports: [
    new transports.File({ filename: 'logs/requests.log',  options: { flags: 'w' } }),
    new transports.Console(),
  ],
});

const TODO_logger = createLogger({
    level: 'info',
    loggerName: 'todo-logger',
    format: customFormat,
    transports: [
      new transports.File({ filename: 'logs/todos.log' ,  options: { flags: 'w' }}),
    ],
  });


const server = express();
server.use(express.json());

global.TODO = []
global.IdTODO = 1


global.statusOptions = ["ALL","PENDING","LATE","DONE"]


server.get("/logs/level", (req, res) => {
    let start = Date.now();
    requestCounter++
    //Log
    Requests_Logger.log(LOG_LEVELS.INFO, `Incoming request | #${requestCounter} | resource: /logs/level | HTTP Verb GET`);

    const logger_name = req.query["logger-name"]
    if(logger_name != "request-logger" && logger_name != "todo-logger")
        res.send("The logger's name is not acceptable");
    else
    {
        let logger_level
        if(logger_name == "request-logger")
         logger_level = Requests_Logger.level
        else
         logger_level = TODO_logger.level

        res.send(logger_level);   
    }

    //Log
    if(Requests_Logger.level == "debug")
    Requests_Logger.log(LOG_LEVELS.DEBUG, `request #${requestCounter} duration: ${Date.now() - start}ms`);
});


server.put("/logs/level", (req, res) => {
    let start = Date.now();
    requestCounter++
    //Log
    Requests_Logger.log(LOG_LEVELS.INFO, `Incoming request | #${requestCounter} | resource: /logs/level | HTTP Verb PUT`);

    const logger_name = req.query["logger-name"]
    if(logger_name != "request-logger" && logger_name != "todo-logger")
        res.send("The logger's name is not acceptable");
    else
    {
        const logger_level = req.query["logger-level"]
        if(logger_level != "ERROR" && logger_level != "INFO" && logger_level != "DEBUG")
         res.send("The logger's level is not acceptable");
        else
        {
            if(logger_name == "request-logger")
            Requests_Logger.level = logger_level.toLowerCase()
            else
            TODO_logger.level = logger_level.toLowerCase()
            res.send(logger_level);
        }
    }
    if(Requests_Logger.level == "debug")
    Requests_Logger.log(LOG_LEVELS.DEBUG, `request #${requestCounter} duration: ${Date.now() - start}ms`);
});


server.get("/todo/health", (req, res) => {
    let start = Date.now();
    requestCounter++
    //Log
    Requests_Logger.log(LOG_LEVELS.INFO, `Incoming request | #${requestCounter} | resource: /todo/health | HTTP Verb GET`);

    res.status(200).send("OK");

    //Log
    if(Requests_Logger.level == "debug")
    Requests_Logger.log(LOG_LEVELS.DEBUG, `request #${requestCounter} duration: ${Date.now() - start}ms`);
});


server.post("/todo", async function(req, res) {
    let start = Date.now();
    requestCounter++

    //Log
    Requests_Logger.log(LOG_LEVELS.INFO, `Incoming request | #${requestCounter} | resource: /todo | HTTP Verb POST`);

    if(mongoTODO.some(elem => elem.title === req.body.title))
    {
        let error_Message = `Error: TODO with the title [${req.body.title}] already exists in both databases`
        res.status(409).send({
            result: "",
            errorMessage: error_Message
        });
        //Log
        TODO_logger.log(LOG_LEVELS.ERROR, `${error_Message}`);
    }

    else if(req.body.dueDate < Date.now())
    {
        let error_Message = "Error: Can’t create new TODO that its due date is in the past"
        res.status(409).send({
            result: "",
            errorMessage: error_Message
        });
        //Log
        TODO_logger.log(LOG_LEVELS.ERROR, `${error_Message}`);
    }   
    else
    {
        try{
        const newTODOMongo = { 
            rawid: ++mongoItemCount,
            content: req.body.content,
            duedate: req.body.dueDate,
            state: "PENDING",
            title: req.body.title
            };
            const newTODOPostgre = {
                rawid: ++postgreItemCount,
                content: req.body.content,
                duedate: req.body.dueDate,
                state: "PENDING",
                title: req.body.title
                };        

        // Insert into MongoDB
        await mongoCollection.insertOne(newTODOMongo);

        // Insert into PostgreSQL
        const insertQuery = {
            text: 'INSERT INTO todos(rawid, content, duedate, state, title) VALUES($1, $2, $3, $4, $5)',
            values: [newTODOPostgre.rawid, newTODOPostgre.content, newTODOPostgre.duedate, newTODOPostgre.state, newTODOPostgre.title]
        };
        await PostgreSQL_Db.query(insertQuery);


        mongoTODO.push(newTODOMongo)
        postgreTODO.push(newTODOPostgre)

        res.status(200).send({
            result: newTODOPostgre.rawid,
            errorMessage: ""
        });


        //Logs
        TODO_logger.log(LOG_LEVELS.INFO, `Creating new TODO with Title [${newTODOMongo.title}]`);
        if(TODO_logger.level == "debug")
        TODO_logger.log(LOG_LEVELS.DEBUG, `Currently there are ${newTODOMongo.rawid-1} TODOs in the system. New TODO will be assigned with id ${newTODOMongo.rawid}`);
    }
    catch (error) {
        console.error("Error inserting todo:", error);
        res.status(500).send({
            result: "",
            errorMessage: "Internal server error"
            
        });
    }
    //Log
    if(Requests_Logger.level == "debug")
    Requests_Logger.log(LOG_LEVELS.DEBUG, `request #${requestCounter} duration: ${Date.now() - start}ms`);     
}
});


server.get("/todo/size", (req, res) => {
    let start = Date.now();
    requestCounter++
    //Log
    Requests_Logger.log(LOG_LEVELS.INFO, `Incoming request | #${requestCounter} | resource: /todo/size | HTTP Verb GET`);

    let num_totos_for_log
    let desired_Db = (req.query.persistenceMethod === "MONGO") ? mongoTODO : postgreTODO

    if(!statusOptions.includes(req.query.status))
    {
        res.status(400).send({
            result: "",
           errorMessage: "bad request"
       });  
    }

    else if(req.query.status === "ALL")
    {
        num_totos_for_log = desired_Db.length
        res.status(200).send({
            result: num_totos_for_log,
            errorMessage: ""
        });
    }

    else
    {
        let count=0
        desired_Db.forEach(function(item, index){
                if(item.state === req.query.status)
                {
                    count++
                }
            });         
            res.status(200).send({
                 result: count,
                errorMessage: ""
             });
             num_totos_for_log = count 
    }
    //Logs
    TODO_logger.log(LOG_LEVELS.INFO, `Total TODOs count for state ${req.query.status} is ${num_totos_for_log}`);
    if(Requests_Logger.level == "debug")
    Requests_Logger.log(LOG_LEVELS.DEBUG, `request #${requestCounter} duration: ${Date.now() - start}ms`);
});


server.get("/todo/content", (req, res) => {
    let start = Date.now();
    requestCounter++
    //Log
    Requests_Logger.log(LOG_LEVELS.INFO, `Incoming request | #${requestCounter} | resource: /todo/content | HTTP Verb GET`);

    let desired_Db = (req.query.persistenceMethod === "MONGO") ? mongoTODO : postgreTODO

    const sortByOptions = ["ID","DUE_DATE","TITLE"]
    let desired_TODO = []
    if(!statusOptions.includes(req.query.status) || (req.query.sortBy && !sortByOptions.includes(req.query.sortBy)))
    {
        res.status(400).send({
            result: "",
           errorMessage: "bad request"
       });  
    }

    else
    {

        if(req.query.status !== "ALL")
        {
            desired_Db.forEach(function(item, index){    
                if(item.state === req.query.status)
                {
                    desired_TODO.push(item)
                }
            });    
        }
        else{
            desired_TODO = JSON.parse(JSON.stringify(desired_Db))
        }

        if(req.query.sortBy)
        {
        switch(req.query.sortBy)
        {
            case "ID":
                desired_TODO = desired_TODO.sort((a, b) => {
                    if (a.rawid < b.rawid) {
                      return -1;
                    }
                  });
            break

            case "DUE_DATE":
                desired_TODO = desired_TODO.sort((a, b) => {
                    if (a.duedate < b.duedate) {
                      return -1;
                    }
                  });
            break

            default:
                desired_TODO = desired_TODO.sort((a, b) => {
                    if (a.title < b.title) {
                      return -1;
                    }
                  });
        }


        //For succeeding in the tests
        desired_TODO = desired_TODO.map(item => ({
            id: item.rawid,
            title: item.title,
            content: item.content,
            dueDate: item.duedate,
            status: item.state
        }));

        res.status(200).send({
            result: desired_TODO,
           errorMessage: ""
        });
        //Log
        TODO_logger.log(LOG_LEVELS.INFO, `Extracting todos content. Filter: ${req.query.status} | Sorting by: ${req.query.sortBy}`);
    }

    else
    {
        desired_TODO = desired_TODO.sort((a, b) => {
            if (a.rawid < b.rawid) {
              return -1;
            }
          });

        //For succeeding in the tests
        desired_TODO = desired_TODO.map(item => ({
            id: item.rawid,
            title: item.title,
            content: item.content,
            dueDate: item.duedate,
            status: item.state
        }));

          res.status(200).send({
            result: desired_TODO,
           errorMessage: ""
        }); 
        //Log
        TODO_logger.log(LOG_LEVELS.INFO, `Extracting todos content. Filter: ${req.query.status} | Sorting by: ID`);
    }
    
    }

    //Logs
    if(TODO_logger.level == "debug")
    TODO_logger.log(LOG_LEVELS.DEBUG, `There are a total of ${mongoTODO.length} todos in the system. The result holds ${desired_TODO.length} todos`);
    if(Requests_Logger.level == "debug")
    Requests_Logger.log(LOG_LEVELS.DEBUG, `request #${requestCounter} duration: ${Date.now() - start}ms`);
});


server.put("/todo", async function(req, res)  {
    let start = Date.now();
    requestCounter++
    //Logs
    Requests_Logger.log(LOG_LEVELS.INFO, `Incoming request | #${requestCounter} | resource: /todo | HTTP Verb PUT`);
    TODO_logger.log(LOG_LEVELS.INFO, `Update TODO id [${req.query.id}] state to ${req.query.status}`);

    const newStatusOptions = JSON.parse(JSON.stringify(statusOptions))
    newStatusOptions.shift()

    var index = -1
    for(var i=0; i<mongoTODO.length; i++ )
    {
        if(mongoTODO[i].rawid === parseInt(req.query.id))
        {
            index = i
            break
        }
    }
    if(index === -1)
    {
        let error_Message = `Error: no such TODO with id ${req.query.id}`
        res.status(404).send({
            result: "",
           errorMessage: error_Message
       });  
       //Log
       TODO_logger.log(LOG_LEVELS.ERROR, `${error_Message}`);
    }

    else if(!newStatusOptions.includes(req.query.status))
    {
        res.status(400).send({
            result: "",
            errorMessage: "bad request"
       });
    }

    else
    {
        const oldState = mongoTODO[index].state
        // Update the state of the TODO in MongoDB
        await mongoCollection.updateOne({ rawid: parseInt(req.query.id) }, { $set: { state: req.query.status } });

        // Update the state of the TODO in PostgreSQL
        const updateQuery = {
            text: 'UPDATE todos SET state = $1 WHERE rawid = $2',
            values: [req.query.status, parseInt(req.query.id)],
        };
        await PostgreSQL_Db.query(updateQuery);

        // Update the state in the global arrays
        mongoTODO[index].state = req.query.status;
        postgreTODO[index].state = req.query.status;
        
        res.status(200).send({
            result: oldState,
           errorMessage: ""
        }); 

    //Log
    if(TODO_logger.level == "debug")
    TODO_logger.log(LOG_LEVELS.DEBUG, `Todo id [${req.query.id}] state change: ${oldState} --> ${req.query.status}`);
    }

    //Log
    if(Requests_Logger.level == "debug")
    Requests_Logger.log(LOG_LEVELS.DEBUG, `request #${requestCounter} duration: ${Date.now() - start}ms`);
});



server.delete("/todo", async function(req, res)  {
    let start = Date.now();
    requestCounter++
    //Log
    Requests_Logger.log(LOG_LEVELS.INFO, `Incoming request | #${requestCounter} | resource: /todo | HTTP Verb DELETE`);

    var index = -1
    for(var i=0; i<mongoTODO.length; i++ )
    {
        if(mongoTODO[i].rawid === parseInt(req.query.id))
        {
            index = i
            break
        }
    }  
    if(index === -1)
    {
        let error_Message = `Error: no such TODO with id ${req.query.id}`
        res.status(404).send({
            result: "",
           errorMessage: error_Message
       });  
       //Log
       TODO_logger.log(LOG_LEVELS.ERROR, `${error_Message}`);
    }

    else
    {
        // Remove the TODO from MongoDB
        await mongoCollection.deleteOne({ rawid: parseInt(req.query.id) });

            const deleteQuery = {
                text: 'DELETE FROM todos WHERE rawid = $1',
                values: [parseInt(req.query.id)],
            };
            await PostgreSQL_Db.query(deleteQuery);

            // Remove the TODO from the global arrays
            mongoTODO.splice(index, 1);
            postgreTODO.splice(index, 1);

        res.status(200).send({
            result: mongoTODO.length,
           errorMessage: ""
        }); 
        //Logs
        TODO_logger.log(LOG_LEVELS.INFO, `Removing todo id ${req.query.id}`);
        if(TODO_logger.level == "debug")
        TODO_logger.log(LOG_LEVELS.DEBUG, `After removing todo id [${req.query.id}] there are ${TODO.length} TODOs in the system`);

    }

    //Log
    if(Requests_Logger.level == "debug")
    Requests_Logger.log(LOG_LEVELS.DEBUG, `request #${requestCounter} duration: ${Date.now() - start}ms`);
});



  //// MongoDB connection URL
  const mongoUrl = "mongodb://mongo";
  const dbName = "todos";
  const collectionName = "todos";


// Connect to MongoDB and PostgreSQL
async function connectToDatabases() {
    try {
        // Connect to MongoDB
        const client = await MongoClient.connect(mongoUrl);
        // console.log("Connected to MongoDB");
        const db = client.db(dbName);
        global.mongoCollection = db.collection(collectionName);
        const findResult = await mongoCollection.find({}).toArray();

        global.mongoItemCount = findResult.length;

        // Remove _id field from mongoTODO array
        global.mongoTODO = findResult.map(todo => {
            const { _id, ...todoWithoutId } = todo;
            return todoWithoutId;
        });

        // console.log('Found documents from MongoDB:', findResult);

        // Connect to PostgreSQL
        global.PostgreSQL_Db = new Pool({
            user: 'postgres',
            password: 'docker',
            host: 'postgres',
            port: 5432,
            database: 'todos',
        });

        PostgreSQL_Db.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });

        PostgreSQL_Db.query('SELECT * FROM todos', (err, res) => {
            if (err) {
                console.error('Error executing query', err);
            } else {
                // console.log('All rows from todos table:', res.rows);
                // TODO_logger.log(LOG_LEVELS.INFO, `Retrieved all rows from todos table: ${JSON.stringify(res.rows)}`);

                global.postgreItemCount = res.rows.length;

                // Extract data from the result rows and format it into an array of items
                global.postgreTODO = res.rows.map(row => {
                    return {
                    rawid: row.rawid,
                    content: row.content,
                    duedate: parseInt(row.duedate),
                    state: row.state,
                    title: row.title
                    };
                });

                // Start the server listening after both connections are established
                startServer();
            }
        });

    } catch (error) {
        console.error("Error connecting to databases:", error);
    }
}

// Function to start the server
function startServer() {
    server.listen(9285, () => {
        console.log("Server listening on port 9285 ...\n");
        // console.log(`Mongo ItemCount = ${global.mongoItemCount}`)
        // console.log(`postgres ItemCount = ${global.postgreItemCount}\n`)
    });
}

// Call the function to connect to MongoDB and PostgreSQL
connectToDatabases();


