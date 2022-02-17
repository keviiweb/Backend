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
  getCurrentDate,
  convertStringToArray,
  checkAdminPrivilege,
} from "./helper.js";
import { config } from "./constants.js";
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
        response.locals.studentID = decoded.studentID;
        response.locals.id = decoded.id;
        response.locals.authenticated = true;
        next();
      }
    });
  }
};

/**
 * Get all upcoming CCAs based on the member
 * @author   Chung Loong
 * @return   {JSON} JSON object indicating all upcoming CCAs for the user
 */
app.get("/api/session/member/latest", withAuth, function (_request, response) {
  const id = response.locals.id;

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

/* ----------------  CCA Functions          --------------- */

/**
 * Show the member list for a CCA leader, with individual member and attendance
 * Visible to CCA leaders only for that particular CCA
 * @author   Chung Loong
 * @return   {JSONArray} JSON Array
 */
app.get("/api/cca/overview", withAuth, function (request, response) {
  const id = response.locals.id;
  // TESTING PURPOSE
  let { ccaID } = request.query;

  // ACTUAL
  //let { ccaID } = request.body;

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
  let id = response.locals.id;
  let { targetID, ccaID } = request.query;

  // ACTUAL
  //let { targetID, ccaID } = request.body;

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
 * @author   Chung Loong
 * @return   {JSONArray} JSON Array
 */
app.get("/api/user/profile", withAuth, function (_request, response) {
  const id = response.locals.id;

  if (id) {
    const selectQuery = mysql.format(
      "SELECT name, studentID, email FROM ?? WHERE id = ?",
      [config["TABLE_USER_LIST"], id]
    );
    queryDatabase(selectQuery)
      .then((sqlResult) => {
        const data = sqlResult[0];
        if (data.length == 1) {
          const ccaQuery = mysql.format(
            "SELECT ccaID, ccaAttendance FROM ?? WHERE studentID = ? ",
            [config["TABLE_USER_CCA_RECORD"], id]
          );
          queryDatabase(ccaQuery, data).then((sqlResult) => {
            const profileData = sqlResult[1];
            const ccaResults = sqlResult[0];
            const promiseArray = [];
            if (ccaResults.length > 0) {
              for (let i = 0; i < ccaResults.length; i++) {
                let row = ccaResults[i];
                promiseArray.push(
                  new Promise((resolve, _reject) => {
                    translateCCAIDtoName(
                      row.ccaID,
                      row.ccaAttendance,
                      (result, _parameter) => {
                        resolve({ ccaName: result, ccaAttendance: _parameter });
                      }
                    );
                  })
                );
              }
            }

            Promise.all(promiseArray).then((data) => {
              const profile = {
                name: profileData[0].name,
                studentID: profileData[0].studentID,
                email: profileData[0].email,
              };
              response.send({
                success: true,
                data: { profile: profile, CCA: data },
              });
              response.end();
            });
          });
        } else {
          response.send({ success: false, data: {} });
          response.end();
        }
      })
      .catch((_err) => {
        response.send({ success: false, data: {} });
        response.end();
      });
  } else {
    response.end();
  }
});

/**
 * Get the list of CCAs the user has. The list is split into two,
 * one for CCAs that the user is a leader in, and the other that the
 * user is a member in.
 * @author   Chung Loong
 * @return   {JSONArray} JSON Array
 */
app.get("/api/user/cca", withAuth, function (_request, response) {
  const id = response.locals.id;

  if (id) {
    const selectQuery = mysql.format(
      "SELECT ccaID, leader FROM ?? WHERE studentID = ?",
      [config["TABLE_USER_CCA_RECORD"], id]
    );

    queryDatabase(selectQuery)
      .then((sqlResult) => {
        const data = sqlResult[0];
        if (data.length > 0) {
          const leaderPromiseArray = [];
          const memberPromiseArray = [];
          for (let i = 0; i < data.length; i++) {
            let row = data[i];

            const isLeader = row.leader;
            if (isLeader == 1) {
              leaderPromiseArray.push(
                new Promise((resolve, _reject) => {
                  translateCCAIDtoName(
                    row.ccaID,
                    row,
                    (dataResult, _parameter) => {
                      resolve({ ccaID: _parameter.ccaID, ccaName: dataResult });
                    }
                  );
                })
              );
            } else {
              memberPromiseArray.push(
                new Promise((resolve, _reject) => {
                  translateCCAIDtoName(
                    row.ccaID,
                    row,
                    (dataResult, _parameter) => {
                      resolve({ ccaID: _parameter.ccaID, ccaName: dataResult });
                    }
                  );
                })
              );
            }
          }

          Promise.all(leaderPromiseArray).then((leaderResult) => {
            Promise.all(memberPromiseArray).then((memberResult) => {
              response.send({
                success: true,
                data: {
                  studentID: id,
                  leader: leaderResult,
                  member: memberResult,
                },
              });
              response.end();
            });
          });
        } else {
          response.send({ success: false, data: {} });
          response.end();
        }
      })
      .catch((_err) => {
        response.send({ success: false, data: {} });
        response.end();
      });
  } else {
    response.end();
  }
});

/* ----------------  KE Web Members assignment ----------- */

/**
 * Create a new CCA session
 * @author   TBC by Jian Ming, Cheng Wei
 * @return   {JSON} JSON object indicating success
 */
app.post("/api/session/create", withAuth, function (request, response) {
  // TABLE NAME:   config["TABLE_CCA_SESSIONS"]

  /** 
   * Format of variables
   * name: varchar(30)
	 * ccaID	int(11)
	 * week	int(11)
	 * date	date (in YYYY-MM-DD format)
	 * startTime	time (in HH:ss format)
	 * endTime	time (in HH:ss format)
	 * editable	tinyint(1) (1 represent true, 0 represent false)
	 * remarks	varchar(200)
	 * ldrNotes	varchar(200)
	 * membersE	varchar(200) (array representing user ID eg. "[11,13]")
	 * optional	tinyint(1) (1 represent true, 0 represent false)
   * */ 

  // Parameters to insert {name, ccaID, week, date, startTime, endTime, editable, remarks, ldrNotes, membersE, optional}

  // This id is the id of the currently logged in user.
  const userID = response.locals.id;

  /* Required Tasks: 
    1. Use checkPrivilege on userID to determine if the user is a CCA leader. checkPrivilege takes in a user ID and a CCA id
    3. Write a SQL query to INSERT the parameters above into the database
    4. Return a JSON object indicating success/failure in the following format: { success: true, data: "Success" }
    5. Sample output { success: true, data: "Success" }
  */
});

/**
 * Edit a new CCA session
 * @author   TBC by Jian Ming, Cheng Wei
 * @return   {JSON} JSON object indicating success
 */
app.post("/api/session/edit", withAuth, function (request, response) {
  // TABLE NAME:   config["TABLE_CCA_SESSIONS"]

  /** 
   * Format of variables to use in database query
   * id: int(11)
   * name: varchar(30)
	 * ccaID	int(11)
	 * week	int(11)
	 * date	date (in YYYY-MM-DD format)
	 * startTime	time (in HH:ss format)
	 * endTime	time (in HH:ss format)
	 * editable	tinyint(1) (1 represent true, 0 represent false)
	 * remarks	varchar(200)
	 * ldrNotes	varchar(200)
	 * membersE	varchar(200) (array representing user ID eg. "[11,13]")
	 * optional	tinyint(1) (1 represent true, 0 represent false)
   * */ 
  //Parameters {id, name, ccaID, week, date, startTime, endTime, editable, remarks, ldrNotes, membersE, optional}
  
  // This id is the id of the currently logged in user.
  const userID = response.locals.id;

  /* Required Tasks: 
    1. Use checkPrivilege on userID to determine if the user is a CCA leader. checkPrivilege takes in a user ID and a CCA id
    2. Use the editable variable to determine if the session can be edited.
    3. Write a SQL query to UPDATE the parameters above into the database
    4. Return a JSON object indicating success/failure in the following format:
    5. Sample output { success: true, data: "Success" }
  */
});

/**
 * Delete a new CCA session
 * @author   TBC by Jian Ming, Cheng Wei
 * @return   {JSON} JSON object indicating success
 */
app.post("/api/session/delete", withAuth, function (request, response) {
  // TABLE NAME:   config["TABLE_CCA_SESSIONS"]

  /** 
   * Format of variables to use in database query
   * id: varchar(30) (session ID)
	 * id: int(11) (CCA ID)
   * */ 
  //Parameters {id, ccaID}

  // This id is the id of the currently logged in user.
  const userID = response.locals.id;

  /* Required Tasks: 
    1. Use checkPrivilege on userID to determine if the user is a CCA leader. checkPrivilege takes in a user ID and a CCA id
    2. Write a SQL query to get the editable variable and check if session can be edited
    3. Write a SQL query to DELETE the parameters above into the database
    4. Return a JSON object indicating success/failure in the following format: { success: true, data: "Success" }
    5. Sample output { success: true, data: "Success" }
  */
});

/**
 * Get all upcoming CCAs sessions based on the CCA ID
 * @author   TBC by Ding Xuan
 * @return   {JSON} JSON object indicating all upcoming CCAs sessions for the user
 */
app.get("/api/session/cca/upcoming", withAuth, function (request, response) {
  // TABLE NAME:   config["TABLE_CCA_SESSIONS"]

 /** 
   * Format of variables to use in database query
   * id : varchar(30)
   * */ 
  //Parameters {ccaID}

  /* Required Tasks: 
    1. Get the current date using the getCurrentDate() function provided
    2. Write a SQL query to get all upcoming session that is >= current date
    3. Get the following variables from the database: id, week, date, startTime, endTime 
    4. If number of row > 0, create an array and push the data into the array
    5. Return a JSON object indicating success/failure in the following format: { success: true, data: <results> }
    6. Sample output {"success":true,"data":[{"id":1,"week":1,"date":"2022-02-14","startTime":"21:00","endTime":"22:00"},
                      {"id":2,"week":0,"date":"2022-02-07","startTime":"21:00","endTime":"22:00"}
                      ]} 
  */
});

/**
 * Get all previous CCAs sessions based on the CCA ID
 * @author   TBC by Ang Yong
 * @return   {JSON} JSON object indicating all previous CCAs sessions for the user
 */
app.get("/api/session/cca/previous", withAuth, function (request, response) {
  // TABLE NAME:   config["TABLE_CCA_SESSIONS"]

  /** 
   * Format of variables to use in database query
   * id: varchar(30)
   * */ 
  //Parameters {ccaID}

  /* Required Tasks: 
    1. Get the current date using the getCurrentDate() function provided
    2. Write a SQL query to get all upcoming session that is < current date
    3. Get the following variables from the database: id, week, date, startTime, endTime 
    4. If number of row > 0, create an array and push the data into the array
    5. Return a JSON object indicating success/failure in the following format: { success: true, data: <results> }
    6. Sample output {"success":true,"data":[{"id":1,"week":1,"date":"2022-02-14","startTime":"21:00","endTime":"22:00"},
                      {"id":2,"week":0,"date":"2022-02-07","startTime":"21:00","endTime":"22:00"}
                      ]} 
  */
});

/**
 * View session details based on ID
 * @author   TBC by Brandon, ZhengXi 
 * @return   {JSON} JSON object details based on particular sessionID
 */
app.get("/api/session/cca/id", withAuth, function (request, response) {
  // TABLE NAME:   config["TABLE_CCA_SESSIONS"]

  /** 
   * Format of variables to use in database query
   * id: varchar(30)
   * */ 
  //Parameters {sessionID}

  /* Required Tasks: 
    1. Get the current date using the getCurrentDate() function provided
    2. Write a SQL query to get all upcoming session that is < current date
    3. Get the following variables from the database: id, week, date, startTime, endTime, editable, remarks, ldrNotes, membersE, optional 
    4. If number of row > 0, create an array and push the data into the array
    5. Return a JSON object indicating success/failure in the following format: { success: true, data: <results> }
    6. Sample output {"success":true,"data":[{"id":1,"week":1,"date":"2022-02-14","startTime":"21:00","endTime":"22:00"},
                      {"id":2,"week":0,"date":"2022-02-07","startTime":"21:00","endTime":"22:00"}
                      ]} 
  */
});


/**
 * Get all announcements
 * @author   TBC by MinJiun
 * @return   {JSONArray} JSON Array
 */
app.get("/api/misc/annoucement", withAuth, function (_request, response) {
  // TABLE NAME:  config["TABLE_ANNOUCEMENTS"]
  /** 
   * Format of variables to use in database query
   * none needed
   * */ 
  //Parameters none needed

  /* Required Tasks: 
    1. Write a SQL query to get all annoucements
    2. Get the following variables from the database: id, name, imageURL, lastUpdated 
    3. If number of row > 0, create an array and push the data into the array
    4. Return a JSON object indicating success/failure in the following format: { success: true, data: <results> }
    5. Sample output {"success":true,"data":[{"id":1,"name":"KEWeb Workshop","imageURL":"/img/keweb.png",
                      "lastUpdated":"2022-02-13T13:30:37.000Z"}]}
  */
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
      const selectResult = data[0];
      /**
       * Do all the logic here
       * eg. sending HTTP response back to the user
       */

      // `selectResult` variable now contains results from database
      console.log(selectResult);

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
      const selectResult = data[0];
      /**
       * Do all the logic here
       * eg. sending HTTP response back to the user
       */

      // `selectResult` variable now contains results from database
      console.log(selectResult);

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
  // Examples
  // const categoryBody = { name: "Sports" };
  // createCCACategory(categoryBody);

  // const ccaBody = { name: "Basketball M", categoryName: "Sports" };
  // createCCA(ccaBody);

  // const userBody = {
  //   name: "Yonah",
  //   studentID: "A0231452",
  //   email: "yonah@u.nus.edu",
  //   password: "testing123",
  // };

  // const userBody2 = {
  //   name: "Chung Loong",
  //   studentID: "A0123456",
  //   email: "cl@u.nus.edu",
  //   password: "testing123",
  // };
  // createUserAccount(userBody);
  // createUserAccount(userBody2);

  // translateUserNametoID("Yonah", [], (_parameter, userID) => {
  //   translateCCANametoID("Basketball M", userID, (_parameter, ccaID) => {
  //     addMemberToCCA(userID, ccaID);
  //   })
  // });

  // translateUserNametoID("Chung Loong", [], (_parameter, userID) => {
  //   translateCCANametoID("Basketball M", userID, (_parameter, ccaID) => {
  //     addLeaderToCCA(userID, ccaID);
  //   })
  // });

  //retrieveAllCCA();

  // const annoucementBody = {
  //   name: "KEWeb Workshop",
  //   imageURL: "/img/keweb.png",
  // };
  // createAnnoucement(annoucementBody);

  response.send("Hello World");
  response.end();
});

let port = config["NODE_PORT"];
app.listen(port, () => console.log(`CCA app listening on port ${port}!`));
process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  pool.end(function (_err) {
    console.log("\nClosing all database connection.. (Ctrl-C)");
  });
  process.exit();
});
