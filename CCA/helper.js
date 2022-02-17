/**
 * This javascript file contains helper functions to create user accounts
 * or other administrative matters
 */

import mysql from "mysql";
import * as bcrypt from "bcrypt";
import "dotenv/config";
import { queryDatabase } from "./connection.js";
import { config } from "./constants.js";

/* ----------- Create Object Functions --------------*/

/**
 * Creates a user account based on the perimeters given
 * @param {JSON} body JSON Object containing the name, studentID and password
 */
export const createUserAccount = (body) => {
  if (body.name && body.studentID && body.email && body.password) {
    bcrypt.genSalt(parseInt(config["SALT_ROUNDS"]), function (_err, salt) {
      bcrypt.hash(body.password, salt, function (_err, hash) {
        const createSQL = mysql.format(
          "INSERT IGNORE INTO ?? (name, studentID, email, password) VALUES (?, ?, ?, ?) ",
          [
            config["TABLE_USER_LIST"],
            body.name,
            body.studentID,
            body.email,
            hash,
          ]
        );
        queryDatabase(createSQL)
          .then((_data) => {
            console.log("SUCCESSFULLY CREATED {%s} USER", body.name);
          })
          .catch((err) => {
            console.log(err);
          });
      });
    });
  } else {
    console.log("MISSING INFORMATION ON CREATING USER");
  }
};

/**
 * Creates a CCA based on the perimeters given
 * @param {JSON} body JSON Object containing the name, CCA leaders etc
 */
export const createCCA = (body) => {
  if (body.categoryName && body.name) {
    const selectSQL = mysql.format("SELECT id FROM ?? WHERE name = ?", [
      config["TABLE_CCA_CATEGORY"],
      body.categoryName,
    ]);

    queryDatabase(selectSQL)
      .then((sqlResult) => {
        const data = sqlResult[0];
        if (data.length > 0) {
          const id = data[0].id;
          const insertQuery = mysql.format(
            "INSERT IGNORE INTO ?? (name, notes, categoryID) VALUES (?, ?, ?)",
            [config["TABLE_CCA_LIST"], body.name, body.notes, id]
          );

          queryDatabase(insertQuery)
            .then((_data) => {
              console.log("SUCCESSFULLY CREATED {%s} CCA", body.name);
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    console.log("MISSING INFORMATION ON CREATING CCA");
  }
};

/**
 * Creates a CCA Category based on the perimeters given
 * @param {JSON} body JSON Object containing the name
 */
export const createCCACategory = (body) => {
  if (body.name) {
    const insertQuery = mysql.format(
      "INSERT IGNORE INTO ?? (name) VALUES (?)",
      [config["TABLE_CCA_CATEGORY"], body.name]
    );

    queryDatabase(insertQuery)
      .then((_data) => {
        console.log("SUCCESSFULLY CREATED {%s} CCA Category", body.name);
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    console.log("MISSING INFORMATION ON CREATING CCA CATEGORY");
  }
};

/**
 * Creates an annoucement on the perimeters given
 * @param {JSON} body JSON Object containing the name, imageURL
 */
export const createAnnoucement = (body) => {
  if (body.name) {
    const insertQuery = mysql.format(
      "INSERT IGNORE INTO ?? (name, imageURL) VALUES (?, ?)",
      [config["TABLE_ANNOUCEMENTS"], body.name, body.imageURL]
    );

    queryDatabase(insertQuery)
      .then((_data) => {
        console.log("SUCCESSFULLY CREATED {%s} ANNOUCEMENT", body.name);
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    console.log("MISSING INFORMATION ON CREATING ANNOUCEMENTS");
  }
};

/* ----------- Translation Functions --------------*/

/**
 * Converts CCA ID into CCA Name
 * @param {String} body CCA ID
 * @return {String} CCA name
 */
export const translateCCAIDtoName = (id, _parameter, callback) => {
  if (id) {
    const selectQuery = mysql.format("SELECT name FROM ?? WHERE id = ?", [
      config["TABLE_CCA_LIST"],
      id,
    ]);

    queryDatabase(selectQuery)
      .then((sqlResult) => {
        const data = sqlResult[0];
        if (data.length > 0) {
          console.log("TRANSLATING CCA ID {%s} : {%s}", id, data[0].name);
          callback(data[0].name, _parameter);
        } else {
          console.log("CCA ID DOES NOT EXIST IN DATABASE");
          callback("", _parameter);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    console.log("MISSING ID WHEN TRANSLATING ID TO NAME");
  }
};

/**
 * Converts CCA Name into CCA ID
 * @param {String} body CCA Name
 * @return {String} CCA ID
 */
export const translateCCANametoID = (name, _parameter, callback) => {
  if (name) {
    const selectQuery = mysql.format("SELECT id FROM ?? WHERE name = ?", [
      config["TABLE_CCA_LIST"],
      name,
    ]);

    queryDatabase(selectQuery)
      .then((sqlResult) => {
        const data = sqlResult[0];
        if (data.length > 0) {
          console.log("TRANSLATING CCA NAME {%s} : {%s}", name, data[0].id);
          callback(data[0].id, _parameter);
        } else {
          console.log("CCA NAME DOES NOT EXIST IN DATABASE");
          callback("", _parameter);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    console.log("MISSING ID WHEN TRANSLATING NAME TO ID");
  }
};

/**
 * Converts User ID into User Name
 * @param {String} body User ID
 * @return {String} User name
 */
export const translateUserIDtoName = (id, _parameter, callback) => {
  if (id) {
    const selectQuery = mysql.format("SELECT name FROM ?? WHERE id = ?", [
      config["TABLE_USER_LIST"],
      id,
    ]);

    queryDatabase(selectQuery)
      .then((sqlResult) => {
        const data = sqlResult[0];
        if (data.length > 0) {
          console.log("TRANSLATING USER ID {%s} : {%s}", id, data[0].name);
          callback(data[0].name, _parameter);
        } else {
          console.log("USER ID DOES NOT EXIST IN DATABASE");
          callback("", _parameter);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    console.log("MISSING ID WHEN TRANSLATING ID TO NAME");
  }
};

/**
 * Converts User Name into User ID
 * @param {String} body User Name
 * @return {String} User ID
 */
export const translateUserNametoID = (name, _parameter, callback) => {
  if (name) {
    const selectQuery = mysql.format("SELECT id FROM ?? WHERE name = ?", [
      config["TABLE_USER_LIST"],
      name,
    ]);

    queryDatabase(selectQuery)
      .then((sqlResult) => {
        const data = sqlResult[0];
        if (data.length > 0) {
          console.log("TRANSLATING USER NAME {%s} : {%s}", name, data[0].id);
          callback(data[0].id, _parameter);
        } else {
          console.log("USER NAME DOES NOT EXIST IN DATABASE");
          callback("", _parameter);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    console.log("MISSING ID WHEN TRANSLATING NAME TO ID");
  }
};

/* ----------- CCA Helper Functions --------------*/

/**
 * Gets a list of all the CCAs
 * @return {Array} SQL Array
 */
export const retrieveAllCCA = () => {
  const selectQuery = mysql.format(
    "SELECT id, name, notes, categoryID FROM ?? ",
    [config["TABLE_CCA_LIST"]]
  );

  queryDatabase(selectQuery)
    .then((sqlResult) => {
      const data = sqlResult[0];
      if (data.length > 0) {
        console.log(data);
        return data;
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

/**
 * Check if the user is a CCA leader for the specific CCA
 * @param {String} studentID Student ID
 * @param {String} ccaID CCA ID
 * @return {boolean} True if user is a CCA leader
 */
export const checkPrivilege = (studentID, ccaID, callback) => {
  const selectQuery = mysql.format(
    "SELECT leader FROM ?? WHERE studentID = ? and ccaID = ?",
    [config["TABLE_USER_CCA_RECORD"], studentID, ccaID]
  );

  queryDatabase(selectQuery)
    .then((sqlResult) => {
      const data = sqlResult[0];
      if (data.length > 0) {
        const leader = data[0].leader;
        if (leader == 1) {
          callback(true);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    })
    .catch((err) => {
      console.log(err);
      callback(false);
    });
};

/* ----------- Add Functions --------------*/

/**
 * Add a member into the CCA
 * @param {String} studentID Student ID
 * @param {String} ccaID CCA ID
 */
export const addMemberToCCA = (studentID, ccaID) => {
  const selectQuery = mysql.format(
    "SELECT id FROM ?? WHERE studentID = ? and ccaID = ?",
    [config["TABLE_USER_CCA_RECORD"], studentID, ccaID]
  );

  queryDatabase(selectQuery)
    .then((sqlResult) => {
      const data = sqlResult[0];
      if (data.length > 0) {
        console.log("USER IS ALREADY REGISTERED IN THE CCA");
      } else {
        const insertQuery = mysql.format(
          "INSERT INTO ?? (studentID, ccaID) VALUES (?, ?)",
          [config["TABLE_USER_CCA_RECORD"], studentID, ccaID]
        );
        queryDatabase(insertQuery)
          .then((_data) => {
            console.log("SUCCESSFULLY ADDED MEMBER");
          })
          .catch((err) => {
            console.log(err);
          });
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

/**
 * Add a leader into the CCA
 * @param {String} studentID Student ID
 * @param {String} ccaID CCA ID
 */
export const addLeaderToCCA = (studentID, ccaID) => {
  const selectQuery = mysql.format(
    "SELECT id FROM ?? WHERE studentID = ? and ccaID = ?",
    [config["TABLE_USER_CCA_RECORD"], studentID, ccaID]
  );

  queryDatabase(selectQuery)
    .then((sqlResult) => {
      const data = sqlResult[0];
      if (data.length > 0) {
        console.log("USER IS ALREADY REGISTERED IN THE CCA");
      } else {
        const leader = 1;
        const insertQuery = mysql.format(
          "INSERT INTO ?? (studentID, ccaID, leader) VALUES (?, ?, ?)",
          [config["TABLE_USER_CCA_RECORD"], studentID, ccaID, leader]
        );
        queryDatabase(insertQuery)
          .then((_data) => {
            console.log("SUCCESSFULLY ADDED LEADER");
          })
          .catch((err) => {
            console.log(err);
          });
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

/* -------------- Misc Functions ------------- */

/**
 * Gets the current date in YYYY-MM-DD form
 * @param {Date} date Current date
 */
export const getCurrentDate = () => {
  let date_ob = new Date();

  // current date
  // adjust 0 before single digit date
  let date = ("0" + date_ob.getDate()).slice(-2);

  // current month
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

  // current year
  let year = date_ob.getFullYear();
  // prints date in YYYY-MM-DD format
  let formattedString = year + "-" + month + "-" + date;

  return formattedString;
};

export const translateDate = (dateString) => {
  let date_ob = new Date(dateString);

  // current date
  // adjust 0 before single digit date
  let date = ("0" + date_ob.getDate()).slice(-2);

  // current month
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

  // current year
  let year = date_ob.getFullYear();
  // prints date in YYYY-MM-DD format
  let formattedString = year + "-" + month + "-" + date;

  return formattedString;
};

/**
 * Gets the current time in HH:ss form
 * @param {Date} time Formatted current time
 */
export const translateTime = (time) => {
  // prints time in HH:ss form
  let formattedString = time.substring(0, 5);

  return formattedString;
};

export const convertStringToArray = (string) => {
  const formattedString = String(string).substring(1, string.length - 1);
  var usingArrayFrom = formattedString.split(",").map(function (item) {
    return parseInt(item, 10);
  });

  return usingArrayFrom;
};

/**
 * Clean up script
 * @author   TBC by HaoLi
 * @return   {JSONArray} JSON Array
 */
const checkEditableSessions = () => {
  // TABLE NAME:   config["TABLE_CCA_SESSIONS"]

  /* Required Tasks: 
    1. Initialize a variable that contains the current date (eg. use getCurrentDate())
    2. Write a SQL query to get all sessions with editable variable set to 1 (aka can edit the session) 
    3. If number of row > 0, loop through the results and check if the date is >= current date + 2 weeks
    4. If there is such a row, write a SQL query to UPDATE the editable variable and set it to 0
    5. No output required
  */
}

