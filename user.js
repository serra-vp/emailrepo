const argon2 = require("argon2");
const secret = process.env.SECRET_KEY;
const jwt = require("jsonwebtoken");
const email = require("../email/email");

const newVerificationKey = () => {
  let random = Math.random()
    .toString(36)
    .substring(9);
  return random.length === 5 ? random : newVerificationKey();
};

module.exports = {
  createUsers: (req, res) => {
    const db = req.app.get("db");
    const { userData } = req.body;
    db.user_details
      .findOne(
        {
          google_id: userData.googleId
        },
        {
          fields: [
            "userd_id",
            "google_id",
            "user_fname",
            "user_lname",
            "user_email",
            "user_image"
          ]
        }
      )
      .then(user => {
        if (!user) {
          db.user_details
            .insert(
              {
                google_id: userData.googleId,
                user_fname: userData.givenName,
                user_lname: userData.familyName,
                user_email: userData.email,
                user_image: userData.imageUrl,
                user_type: [
                  {
                    userd_id: undefined,
                    user_type: "pending"
                  }
                ]
              },
              {
                deepInsert: true
              },
              {
                fields: [
                  "google_id",
                  "user_fname",
                  "user_lname",
                  "user_email",
                  "user_image"
                ]
              }
            )
            .then(createdUser => {
              res.status(201).send(createdUser);
            })
            .catch(error => {
              console.error(error);
              res.status(500).end();
            });
        } else {
          db.user_type
            .findOne(
              {
                userd_id: user.userd_id
              },
              {
                fields: ["user_type"]
              }
            )
            .then(fetchedUserType => {
              switch (fetchedUserType.user_type) {
                case "mentor":
                  res.status(200).send({ ...user, ...fetchedUserType });
                  break;
                case "student":
                  res.status(200).send({ ...user, ...fetchedUserType });
                  break;
                default:
                  res.status(206).send({ ...user, ...fetchedUserType });
                  break;
              }
            })
            .catch(error => {
              console.error(error);
              res.status(500).end();
            });
        }
      })
      .catch(error => {
        console.error(error);
        res.status(500).end();
      });
  },
  getUsers: (req, res) => {
    db = req.app.get("db");
    db.query(
      `SELECT * FROM user_details AS ud, user_type as ut WHERE NOT EXISTS (SELECT * FROM keys AS k WHERE k.userd_id = ud.userd_id) AND ud.userd_id = ut.userd_id AND ut.user_type = 'pending'`
    )
      .then(u => res.status(200).json(u))
      .catch(err => {
        console.log(err);
        res.status(500).end();
      });
  },
  setUserType: (req, res) => {
    db = req.app.get("db");
    const { key, token } = req.body;
    const tokenObj = JSON.parse(token);
    var decoded = jwt.decode(tokenObj.token);
    if (!decoded) {
      res.status(403).end();
    } else {
      db.keys
        .findOne(
          {
            key: key
          },
          {
            fields: ["userd_id", "key_type", "key"]
          }
        )
        .then(key => {
          if (!key) {
            res.status(401).end();
          } else {
            db.user_type
              .update(
                {
                  userd_id: key.userd_id
                },
                {
                  user_type: key.key_type
                },
                {
                  fields: ["userd_id", "user_type"]
                }
              )
              .then(user => {
                db.keys
                  .destroy({
                    userd_id: user[0].userd_id
                  })
                  .then(() => {
                    res
                      .status(200)
                      .send({ name: decoded.name, type: user[0].user_type });
                  })
                  .catch(error => {
                    console.error(error);
                    res.status(500).end();
                  });
              })
              .catch(error => {
                console.error(error);
                res.status(500).end();
              });
          }
        });
    }
  },
  sendUserKey: (req, res) => {
    const db = req.app.get("db");
    const { id, type } = req.body;
    const newKey = newVerificationKey();
    db.user_details.findOne({ userd_id: id }).then(user => {
      if (!user) {
        res.status(404).end();
      } else {
        const name = user.user_fname + " " + user.user_lname;
        email
          .main(name, user.user_email, newKey)
          .then((res) => {
            console.log(res);
            if(res === 'permission'){
              res.status(400).end();
              return;
            }
            db.keys
              .insert({
                userd_id: id,
                key_type: type,
                key: newKey
              })
              .then(() => {
                res.status(200).send({
                  givenName: user.user_fname,
                  familyName: user.user_lname
                });
              })
              .catch(error => {
                console.error(error);
                res.status(500).end();
              });
          })
          .catch(error => {
            console.error(error);
            res.status(500).end();
          });
      }
    });
  },
  getKeyList: (req, res) => {
    const db = req.app.get("db");

    db.query(
      `SELECT * FROM user_details AS ud, user_type AS ut, keys as K WHERE ud.userd_id = ut.userd_id AND k.userd_id = ut.userd_id AND k.userd_id = ud.userd_id AND ut.user_type = 'pending'`
    )
      .then(response => {
        res.status(200).send(response);
      })
      .catch(error => {
        console.error(error);
        res.status(500).end();
      });
  }
};
