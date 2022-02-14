import "dotenv/config";
import mysql from "mysql";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import {
  translateCCAIDtoName,
  translateCCANametoID,
  translateUserNametoID,
  translateUserIDtoName,
  translateTime,
  translateDate,
  createCCACategory,
  createCCA,
  createUserAccount,
  createAnnoucement,
  checkPrivilege,
  addMemberToCCA,
  addLeaderToCCA,
  retrieveAllCCA,
  getCurrentDate,
  convertStringToArray,
} from "./helper.js";
import { pool, queryDatabase } from "./connection.js";
import * as bcrypt from "bcrypt";
import pkg from "jsonwebtoken";
const { sign, verify } = pkg;

/**
 * Express backend setup
 */
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

/**
 * Function checks for existing cookies in the user response
 * Check whether user is authenticated.
 * Ends the response if user is not, else passes the response into function
 */
const withAuth = function (request, response, next) {
  const token =
    request.body.CCAWeb ||
    request.query.CCAWeb ||
    request.headers["x-access-token"] ||
    request.cookies.CCAWeb;

  if (!token) {
    response.status(401).end();
  } else {
    verify(token, config["JWT_SECRET"], function (err, decoded) {
      if (err) {
        response.status(401).end();
      } else {
        request.studentID = decoded.studentID;
        next();
      }
    });
  }
};

/**
 * Config table setup. This is where all the table names for
 * the SQL database can be found.
 */
const config = {
  TABLE_USER_LIST: process.env.TABLE_USER_LIST,
  TABLE_USER_CCA_RECORD: process.env.TABLE_USER_CCA_RECORD,
  TABLE_CCA_LIST: process.env.TABLE_CCA_LIST,
  TABLE_CCA_SESSIONS: process.env.TABLE_CCA_SESSIONS,
  TABLE_CCA_CATEGORY: process.env.TABLE_CCA_CATEGORY,
  TABLE_CCA_SESSION_ATTENDANCE: process.env.TABLE_CCA_SESSION_ATTENDANCE,
  TABLE_ANNOUCEMENTS: process.env.TABLE_ANNOUCEMENTS,
  JWT_SECRET: process.env.JWT_SECRET,
  SALT_ROUNDS: process.env.SALT_ROUNDS,
  SQL_ROW_LIMIT: process.env.SQL_ROW_LIMIT,
};

/**
 * Get all upcoming CCAs based on the member
 * @author   Chung Loong
 * @return   {JSON} JSON object indicating all upcoming CCAs for the user
 */
app.get("/api/session/member/latest", withAuth, function (request, response) {
  // TESTING PURPOSE
  let { id } = request.query;

  // ACTUAL
  //let { id } = request.body;

  if (id) {
    const ccaQuery = mysql.format(
      "SELECT ccaID FROM ?? WHERE studentID = ? LIMIT ?",
      [config["TABLE_USER_CCA_RECORD"], id, parseInt(config["SQL_ROW_LIMIT"])]
    );
    queryDatabase(ccaQuery)
      .then((sqlResult) => {
        const ccaResults = sqlResult[0];
        if (ccaResults.length > 0) {
          let promiseArray = [];
          for (let i = 0; i < ccaResults.length; i++) {
            const ccaRow = ccaResults[i];
            const selectQuery = mysql.format(
              "SELECT id, date, week, startTime, endTime FROM ?? WHERE ccaID = ? ORDER BY date",
              [config["TABLE_CCA_SESSIONS"], ccaRow.ccaID]
            );

            promiseArray.push(
              new Promise((resolve, _reject) => {
                queryDatabase(selectQuery).then((data) => {
                  const sessionResults = data[0];
                  let promiseArray2 = [];

                  if (sessionResults.length > 0) {
                    for (let j = 0; j < sessionResults.length; j++) {
                      const sessionRow = sessionResults[j];
                      promiseArray2.push(
                        new Promise((resolve, _reject) => {
                          translateCCAIDtoName(
                            ccaRow.ccaID,
                            sessionRow,
                            (result, _parameter) => {
                              resolve({
                                id: _parameter.id,
                                ccaName: result,
                                ccaID: ccaRow.ccaID,
                                week: _parameter.week,
                                date: translateDate(_parameter.date),
                                startTime: translateTime(_parameter.startTime),
                                endTime: translateTime(_parameter.endTime),
                              });
                            }
                          );
                        })
                      );
                    }

                    Promise.all(promiseArray2).then((promiseResult2) => {
                      resolve(promiseResult2);
                    });
                  } else {
                    resolve("");
                  }
                });
              })
            );
          }

          Promise.all(promiseArray).then((values) => {
            response.send({ success: true, data: values[0] });
            response.end();
          });
        } else {
          response.send({ success: true, data: [] });
          response.end();
        }
      })
      .catch((_err) => {
        response.send({ success: false, data: [] });
        response.end();
      });
  } else {
    response.send({ success: false, data: [] });
    response.end();
  }
});

/**
 * Get all upcoming CCAs sessions based on the CCA ID
 * @author   
 * @return   {JSON} JSON object indicating all upcoming CCAs sessions for the user
 */
app.get("/api/session/cca/upcoming", withAuth, function (request, response) {
  
  
  
  
});

/**
 * Get all previous CCAs sessions based on the CCA ID
 * @author   
 * @return   {JSON} JSON object indicating all previous CCAs sessions for the user
 */
app.get("/api/session/cca/previous", withAuth, function (request, response) {
  
  
  
});

/**
 * View session details based on ID
 * @author   
 * @return   {JSON} JSON object details based on particular sessionID
 */
app.get("/api/session/cca/id", withAuth, function (request, response) {
 
 
 
 
 
});

/* ----------------  CCA Functions          --------------- */

/**
 * Show the member list for a CCA leader, with individual member and attendance
 * Visible to CCA leaders only for that particular CCA
 * @author   Chung Loong
 * @return   {JSONArray} JSON Array
 */
app.get("/api/cca/overview", withAuth, function (request, response) {
  // TESTING PURPOSE
  let { id, ccaID } = request.query;

  // ACTUAL
  //let { id } = request.body;

  if (id && ccaID) {
    checkPrivilege(id, ccaID, (leader) => {
      if (leader) {
        const selectQuery = mysql.format(
          "SELECT studentID, ccaAttendance FROM ?? WHERE ccaID = ?",
          [config["TABLE_USER_CCA_RECORD"], ccaID]
        );
        queryDatabase(selectQuery).then((data) => {
          const selectResult = data[0];
          let promiseArray = [];

          if (selectResult.length > 0) {
            for (let i = 0; i < selectResult.length; i++) {
              const selectRow = selectResult[i];
              promiseArray.push(
                new Promise((resolve, _reject) => {
                  translateUserIDtoName(
                    selectRow.studentID,
                    selectRow,
                    (dataResult, _parameter) => {
                      resolve({
                        studentName: dataResult,
                        ccaAttendance: _parameter.ccaAttendance,
                      });
                    }
                  );
                })
              );
            }

            Promise.all(promiseArray).then((data) => {
              let result = { success: true, data: data };
              response.send(result);
              response.end();
            });
          } else {
            response.send({ success: true, data: {} });
            response.end();
          }
        });
      } else {
        response.send({
          success: false,
          data: {},
        });
        response.end();
      }
    });
  } else {
    response.send({ success: false, data: {} });
    response.end();
  }
});

/**
 * Show the individual member and attendance
 * Visible to CCA leaders only for that particular CCA
 * @author   Chung Loong
 * @return   {JSONArray} JSON Array
 */
app.get("/api/cca/individual", withAuth, function (request, response) {
  // TESTING PURPOSE
  let { id, targetID, ccaID } = request.query;

  // ACTUAL
  //let { id, targetID, ccaID } = request.body;

  if (id && targetID && ccaID) {
    checkPrivilege(id, ccaID, (leader) => {
      if (leader) {
        const selectQuery = mysql.format(
          "SELECT ??.date, ??.week, ??.ccaAttendance FROM ?? INNER JOIN ?? ON ??.id = ??.sessionID WHERE ??.ccaID = ? and ??.studentID = ? ",
          [
            config["TABLE_CCA_SESSIONS"],
            config["TABLE_CCA_SESSIONS"],
            config["TABLE_CCA_SESSION_ATTENDANCE"],
            config["TABLE_CCA_SESSION_ATTENDANCE"],
            config["TABLE_CCA_SESSIONS"],
            config["TABLE_CCA_SESSIONS"],
            config["TABLE_CCA_SESSION_ATTENDANCE"],
            config["TABLE_CCA_SESSION_ATTENDANCE"],
            ccaID,
            config["TABLE_CCA_SESSION_ATTENDANCE"],
            targetID,
          ]
        );

        queryDatabase(selectQuery).then((data) => {
          const selectResult = data[0];
          let promiseArray = [];

          if (selectResult.length > 0) {
            for (let i = 0; i < selectResult.length; i++) {
              const selectRow = selectResult[i];
              promiseArray.push(
                new Promise((resolve, _reject) => {
                  translateUserIDtoName(
                    targetID,
                    selectRow,
                    (dataResult, _parameter) => {
                      resolve({
                        date: _parameter.date,
                        week: _parameter.week,
                        studentName: dataResult,
                        ccaAttendance: _parameter.ccaAttendance,
                      });
                    }
                  );
                })
              );
            }

            Promise.all(promiseArray).then((data) => {
              let result = { success: true, data: data };
              response.send(result);
              response.end();
            });
          } else {
            response.send({ success: true, data: [] });
            response.end();
          }
        });
      } else {
        response.send({
          success: false,
          data: [],
        });
        response.end();
      }
    });
  } else {
    response.send({ success: false, data: [] });
    response.end();
  }
});

/* ----------------  User Functions          --------------- */

/**
 * Login function for users
 * @author   Chung Loong
 * @return   {JSON} JSON object indicating status
 */
app.post("/api/user/login", function (request, response) {
  // For HTTP GET (Testing purposes through URL only)
  //const body = request.query;

  // For HTTP POST
  const body = request.body;

  const { studentID, password } = body;
  if (studentID && password) {
    const loginSQL = mysql.format(
      "SELECT id, password FROM ?? WHERE studentID = ? ",
      [config["TABLE_USER_LIST"], studentID]
    );
    queryDatabase(loginSQL)
      .then((loginResult) => {
        const data = loginResult[0];
        if (data.length > 0 && data.length < 2) {
          const db_pass = data[0].password;
          bcrypt.compare(password, db_pass, function (_err, bcryptResult) {
            if (bcryptResult) {
              const payload = {
                studentID: studentID,
                id: data[0].id,
              };
              const token = sign(payload, config["JWT_SECRET"], {
                expiresIn: "1d",
              });
              response
                .cookie("CCAWeb", token, {
                  httpOnly: true,
                })
                .sendStatus(200);
            } else {
              response
                .status(401)
                .send({ success: false, data: "Error in logging in" });
              response.end();
            }
          });
        } else {
          response
            .status(401)
            .send({ success: false, data: "Error in logging in" });
          response.end();
        }
      })
      .catch((_err) => {
        response.send({ success: false, data: "" });
        response.end();
      });
  } else {
    response.send({ success: false, data: "" });
    response.end();
  }
});

/**
 * Change password function for user
 * @author   Chung Loong
 * @return   {JSON} JSON object indicating status
 */
app.post("/api/user/changepassword", function (request, response) {
  // For HTTP GET (Testing purposes through URL only)
  //const body = request.query;

  // For HTTP POST
  const body = request.body;

  const { id, opassword, npassword } = body;
  if (id && opassword && npassword) {
    const loginSQL = mysql.format("SELECT password FROM ?? WHERE id = ? ", [
      config["TABLE_USER_LIST"],
      id,
    ]);
    queryDatabase(loginSQL)
      .then((loginResult) => {
        const data = loginResult[0];
        if (data.length > 0 && data.length < 2) {
          const db_pass = data[0].password;
          bcrypt.compare(opassword, db_pass, function (_err, bcryptResult) {
            if (bcryptResult) {
              bcrypt.genSalt(
                parseInt(config["SALT_ROUNDS"]),
                function (_err, salt) {
                  bcrypt.hash(npassword, salt, function (_err, hash) {
                    const updateSQL = mysql.format(
                      "UPDATE ?? SET password = ? where id = ?",
                      [config["TABLE_USER_LIST"], hash, id]
                    );
                    queryDatabase(updateSQL)
                      .then((_data) => {
                        console.log("SUCCESSFULLY UPDATED PASSWORD");
                        response.send({
                          success: true,
                          data: "Password succesfully changed",
                        });
                        response.end();
                      })
                      .catch((err) => {
                        console.log(err);
                      });
                  });
                }
              );
            } else {
              response.status(401).send({
                success: false,
                data: "Previous password does not match",
              });
              response.end();
            }
          });
        } else {
          response
            .status(401)
            .send({ success: false, data: "Error in changing password" });
          response.end();
        }
      })
      .catch((_err) => {
        response.send({ success: false, data: "" });
        response.end();
      });
  } else {
    response.send({ success: false, data: "" });
    response.end();
  }
});

/**
 * Profile page, showing user details and list of CCAs for the user
 * @author   
 * @return   {JSONArray} JSON Array
 */
app.get("/api/user/profile", withAuth, function (request, response) {
 
 

});

/**
 * Get the list of CCAs the user has. The list is split into two,
 * one for CCAs that the user is a leader in, and the other that the
 * user is a member in.
 * @author   
 * @return   {JSONArray} JSON Array
 */
app.get("/api/user/cca", withAuth, function (request, response) {
 
 
 
 
 
});

/* ----------------  Misc Code  --------------- */

/**
 * Get all announcements
 * @author   
 * @return   {JSONArray} JSON Array
 */
app.get("/api/misc/annoucement", function (_request, response) {







});


/* ----------------  Template   --------------- */

/**
 * Testing function for backend
 * Default HTTP GET function to edit on
 * @author   Chung Loong
 * @return   void
 */
app.get("/api/get", function (request, response) {
  /**
   *  Use mysql.format() to format strings nicely
   *  Returns a valid, escaped query
   */
  var sql = mysql.format("SELECT * FROM ?? ", [config["TABLE_USERS"]]);
  console.log(sql);

  /**
   *  Use given queryDatabase function to query the database
   *  Returns the results gathered from the database
   */
  queryDatabase(sql)
    .then((data) => {
      /**
       * Do all the logic here
       * eg. sending HTTP response back to the user
       */

      // `data` variable now contains results from database
      console.log(data);

      /**
       *  Always send a response regardless of success or failure
       *  Failed responses can be accompanied with a Error code eg. 404, 500
       *  response.status(401).send('Failed')
       *
       *  Successful responses can be either a string, JSON object or others
       *  Example:
       *  data = {'page' : content.length , 'content' : content};
       *  response.send(data);
       *
       *  response.end() ends the HTTP request.
       */
      //response.send("Success");
      //response.end();
    })
    .catch((err) => {
      console.log(err);
      response.end();
    });
});

/**
 * Testing function for backend
 * Default HTTP POST function to edit on
 * @author   Chung Loong
 * @return   void
 */
app.post("/api/post", function (request, response) {
  // Get all the data from the HTTP Post form
  const body = request.body;

  /**
   *  Use mysql.format() to format strings nicely
   *  Returns a valid, escaped query
   *  Replace with your own SQL query
   */
  var sql = mysql.format("SELECT * FROM ?? ", [config["TABLE_USERS"]]);
  console.log(sql);

  /**
   *  Use given queryDatabase function to query the database
   *  Returns the results gathered from the database
   */
  queryDatabase(sql)
    .then((data) => {
      /**
       * Do all the logic here
       * eg. sending HTTP response back to the user
       */

      // `data` variable now contains results from database
      console.log(data);

      /**
       *  Always send a response regardless of success or failure
       *  Failed responses can be accompanied with a Error code eg. 404, 500
       *  response.status(401).send('Failed')
       *
       *  Successful responses can be either a string, JSON object or others
       *  Example:
       *  data = {'page' : content.length , 'content' : content};
       *  response.send(data);
       *
       *  response.end() ends the HTTP request.
       */
      response.send("Success");
      response.end();
    })
    .catch((err) => {
      console.log(err);
      response.end();
    });
});


/* ----------------  Main Code  --------------- */
app.get("/", function (_request, response) {
  response.send("Hello World");
  response.end();
});

let port = process.env.NODE_PORT;
app.listen(port, () => console.log(`CCA app listening on port ${port}!`));
process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  pool.end(function (_err) {
    console.log("\nClosing all database connection.. (Ctrl-C)");
  });
  process.exit();
});
