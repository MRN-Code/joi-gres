#! /usr/bin/env node
/*
 * joi-gres : joi schema generator for postgresql
 * Matt Stone - mstone@mrn.org
 * github: mstone/joi-gres
 */

var Promise = require('bluebird');
var pg = Promise.promisifyAll(require('pg'));

// Parse cl args
var fs = require('fs');

var userArgs = process.argv.slice(2);

if (userArgs.length < 1) {
    throw "Expected atleast one argument";
}

var serverData, index;
if (userArgs[0] == '-h') {
    printUsage();
} else if (userArgs[0] == "-c") {
    // open config file
    serverData = JSON.parse(fs.readFileSync(userArgs[1], 'utf8'));
    index = 2;
} else {
    serverData = parseServerUrl(userArgs[0]);
    index = 1;
}

arg_loop:
while (index < userArgs.length) {
    switch(userArgs[index]) {
        case "-U":
            serverData['username'] = checkNextArg("Username", index);
            break;

        case "-P":
            serverData['password'] = checkNextArg("Password", index);
            break;

        case "-u":
            serverData['url'] = checkNextArg("URL", index);
            break;

        case "-d":
            serverData['db_name'] = checkNextArg("DB name", index);
            break;

        default:
            break arg_loop;
            break;            
    }
    index += 2;
}

validateServerData(serverData);

var tables = userArgs.slice(index);
retrieveSchema(tables, serverData);


// FUNCTIONS

// Prints usage and exits
function printUsage() {
    console.log(["joi-gres",
                 "Usage:",
                 "    joi-gres ( -c config_file | username:password@server/db_name ) [-PpUu] <table_name>...",
                 "",
                 "Options:",
                 "    -c  Specify configuration file",
                 "    -P  Specify password",
                 "    -d  Specify db_name",
                 "    -U  Specify username",
                 "    -u  Specify url"].join('\n'));    
}

// Parse server url from command line
function parseServerUrl(data) {
    var username, password, url, db_name, combinedUrl;    
    data = data.split('@');
    if (data[1] != null) {
        var creds = data[0].split(':');
        username = creds[0];
        password = creds[1];
        combinedUrl = data[1].split('/');
    } else {
        combinedUrl = data[0].split('/');
    }
    url     = combinedUrl[0];
    db_name = combinedUrl[1];
    
    return {
        username: username,
        password: password,
        url:      url,
        db_name:  db_name
    }
}

// Checks if the next arg exists and returns
function checkNextArg(type, index) {
    if ((index + 1) > userArgs.length) {
        throw type + " expected";
    } else {
        return userArgs[index + 1];
    }
}

// Validates server data
function validateServerData(serverData) {
    ['username', 'password', 'db_name', 'url'].map(function (key) {
        if (serverData[key] == null) {
            throw key + " not found";
        }
    });
}
    
// Creates db request for the given table
function retrieveSchema(tables, serverData) {
    var conString = "postgres://" 
            + serverData['username'] + ":"
            + serverData['password'] + "@"
            + serverData['url'] + "/"
            + serverData['db_name'];
    var client = new pg.Client(conString);
    
    client.connectAsync()
        .then(function() {
            return Promise.all(tables.map(function (table) {
                var result = client.queryAsync("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = '" + table + "';");
                return result;
            }));
        }).then(function (results) {
            client.end();
            printSchema(results, tables);
        }).catch(function(err) {
            console.log("Error: ", err);
        });
}

// Prints schema from the given data
function printSchema(results, tables) {
    var index = 0;
    results.map(function(data) {
        console.log("Table: " + tables[index]);
        index++;
        data.rows.map(function(row) {
            var line = "";
            var name = row.column_name;
            while(name.indexOf('_') !== -1) {
                name = capitalizeLetter(name, (name.indexOf('_') + 1));
            }
            line += "    " + name + ": joi.";
            
            line += (function getType() {
                switch(row.data_type) {
                case "numeric":
                    return "number()";
                
                case "character varying":
                    if (row.character_maximum_length) {
                        return "string().max('" + row.character_maximum_length + "')";
                    } else {
                        return "string()";
                    }

                case "timestamp without time zone":
                    return "date()";
                
                case "boolean":
                    return "boolean()";

                case "text":
                    return "string()";

                default:
                    return "any()";

                }
            })();
            
            if (!row.is_nullable) {
                line += ".required()";
            }

            lines += ","

            console.log(line);
        
        });
    });
    
    console.log("\n");
}

// Converts <begin> _<letter><end> to <begin>_<LETTER><end>
function capitalizeLetter(string, index) {
    return string.slice(0, index - 1) + string.charAt(index).toUpperCase() + string.slice(index + 1);
}

