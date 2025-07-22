const express = require("express");
const cloudinary = require("cloudinary").v2;
const fileuploader = require("express-fileupload");
const mysql2 = require("mysql2");
const nodemailer = require("nodemailer");
require("dotenv").config();
var app = express();

app.listen(2005, function (err) {
  if (err == null) console.log("Server Started at Port No.2005");
  else console.error(err);
});
app.use(fileuploader());
app.use(express.static("public"));
app.use(express.urlencoded(true));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const dbConfig = process.env.aiven_pass;
let mySqlServer = mysql2.createConnection(dbConfig);
mySqlServer.connect(function (error) {
  if (error == null)
    console.log("Aiven Connection Established with Success...");
  else console.error(error.message);
});

app.get("/", function (req, resp) {
  let path = __dirname + "/public/index.html";
  resp.sendFile(path);
});

app.get("/signup-details", function (req, resp) {
  if (req.query.txtSel == "SELECT A OPTION") resp.send("Choose an Option");
  else {
    mySqlServer.query(
      "insert into users values(?,?,?,current_date(),1)",
      [req.query.txtEmail, req.query.txtPwd, req.query.txtSel],
      function (err) {
        if (err == null)
          resp.send("..........Thanks for Registering with US ...........");
        else resp.send(err.message);
        // else resp.json(err);
      }
    );
  }
});

app.get("/login-details", function (req, resp) {
  let email = req.query.txtEmail;
  let pwd = req.query.txtPwd;
  mySqlServer.query(
    "SELECT * FROM users WHERE emailid = ? AND password = ?",
    [email, pwd],
    function (err, allRecords) {
      if (allRecords.length == 1) {
        allRecords[0].status;
        allRecords[0].usertype;
        resp.send(allRecords);
      } else {
        resp.send("Wrong emailid / pwd");
      }
    }
  );
});

app.post("/org-details-save", async function (req, resp) {
  // console.log("error");
  // console.log(req.body);
  // console.log(req.files);
  let picUrl = "";
  if (req.files && req.files.orgFile) {
    let fileName = req.files.orgFile.name;
    let fullPath = __dirname + "/public/uploads/" + fileName;
    req.files.orgFile.mv(fullPath);
    try {
      let uploaded = await cloudinary.uploader.upload(fullPath);
      picUrl = uploaded.url;
    } catch (cloudErr) {
      console.log("Cloudinary upload failed:", cloudErr);
      return resp.send("Error Timeout");
    }
  } else {
    picUrl = "nopic.jpg";
  }
  mySqlServer.query(
    "insert into organizers values(?,?,?,?,?,?,?,?,?,?,?)",
    [
      req.body.txtEmail,
      req.body.txtOrgname,
      req.body.txtRegnum,
      req.body.txtAddress,
      req.body.txtCity,
      req.body.txtSports,
      req.body.txtWeblink,
      req.body.txtInstalink,
      req.body.txtOrghead,
      req.body.txtContactnum,
      picUrl,
    ],
    function (err) {
      if (err == null) resp.send("data saved....");
      else resp.send(err.message);
    }
  );
});

app.post("/org-details-update", async function (req, resp) {
  try {
    let picUrl = "";
    if (req.files != null) {
      let fName = req.files.orgFile.name;
      let fullPath = __dirname + "/public/uploads/" + fName;
      req.files.orgFile.mv(fullPath);

      await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) {
        picUrl = picUrlResult.url; //will give u the url of ur pic on cloudinary server
      });
    } else {
      const [Records] = await mySqlServer
        .promise()
        .query("select picUrl from organizers where emailid=?", [
          req.body.txtEmail,
        ]);
      if (Records.length == 0) resp.send("Invalid Email ID");
      else picUrl = Records[0].picUrl;
    }
    const [result] = await mySqlServer
      .promise()
      .query(
        "update organizers set organizationName=?,registrationNumber=?,address=?,city=?,sports=?,website=?,insta=?,headName=?,contact=?,picUrl=? where emailid=?;",
        [
          req.body.txtOrgname,
          req.body.txtRegnum,
          req.body.txtAddress,
          req.body.txtCity,
          req.body.txtSports,
          req.body.txtWeblink,
          req.body.txtInstalink,
          req.body.txtOrghead,
          req.body.txtContactnum,
          picUrl,
          req.body.txtEmail,
        ]
      );
    if (result.affectedRows == 1) resp.send("data Updated Successfully....");
    else resp.send("Invalid Email Id");
  } catch (err) {
    console.error("Update error:", err);
    resp.status(500).send("Server error: " + err.message);
  }
});
app.get("/post-tournament", function (req, resp) {
  mySqlServer.query(
    "insert into tournaments values(null,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      req.query.txtEmail,
      req.query.txtEtitle,
      req.query.dateEvent,
      req.query.timeEvent,
      req.query.txtAddress,
      req.query.txtCity,
      req.query.txtSports,
      req.query.numMinage,
      req.query.numMaxage,
      req.query.dateReg,
      req.query.numFee,
      req.query.numPrize,
      req.query.txtContact,
    ],
    function (err) {
      if (err == null) resp.send("Tournament posted Successfully");
      else resp.send(err.message);
    }
  );
});
app.get("/fetch-tournaments", function (req, resp) {
  // console.log(req.query.emailid)
  mySqlServer.query(
    "select * from tournaments where emailid=?",
    [req.query.emailid],
    function (err, Records) {
      if (err == null) {
        console.log(Records.length);
        resp.send(Records);
      } else resp.send(err.message);
    }
  );
});
app.get("/delete-tournament", function (req, resp) {
  mySqlServer.query(
    "delete from tournaments where rid=? and emailid=?",
    [req.query.rid, req.query.emailid],
    function (err, result) {
      if (err == null) {
        if (result.affectedRows == 1) resp.send("Deleted Successfulllyyyy...");
        else resp.send("Invalid Email ID");
      } else resp.send(err.message);
    }
  );
});
app.get("/fetch-org-details", function (req, resp) {
  mySqlServer.query(
    "select * from organizers where emailid=?",
    [req.query.txtEmail],
    (err, Records) => {
      if (err == null) {
        if (Records.length == 0) resp.send("Invalid EmailId!!!");
        else resp.send(Records);
      } else resp.send(err.message);
    }
  );
});
app.get("/fetch-Allusers-details", (req, resp) => {
  mySqlServer.query("select * from users", function (err, Records) {
    resp.send(Records);
  });
});
app.get("/status-user", function (req, resp) {
  let status = parseInt(req.query.status);
  if (status === 0) status = 1;
  else status = 0;
  mySqlServer.query(
    "update users set status=? where emailid=?",
    [status, req.query.emailid],
    function (err, result) {
      if (err == null) {
        if (result.affectedRows == 1) resp.send("status changed");
        else resp.send("Invalid Email ID");
      } else resp.send(err.message);
    }
  );
});
//---------------------organizers------------------------
app.get("/org-dash", function (req, resp) {
  let path = __dirname + "/public/Organizers html files/dash-organizer.html";
  resp.sendFile(path);
});
app.get("/org-details-page", function (req, resp) {
  let path = __dirname + "/public/Organizers html files/org-details.html";
  resp.sendFile(path);
});
app.get("/post-tournaments-page", function (req, resp) {
  let path = __dirname + "/public/Organizers html files/post-tournaments.html";
  resp.sendFile(path);
});
app.get("/manage-tournament", function (req, resp) {
  let path = __dirname + "/public/Organizers html files/tournamentManager.html";
  resp.sendFile(path);
});
//------------------------player----------------------------
app.get("/player-dash", function (req, resp) {
  let path = __dirname + "/public/Player html files/dash-player.html";
  resp.sendFile(path);
});
app.get("/player-details-page", function (req, resp) {
  let path = __dirname + "/public/Player html files/player-details.html";
  resp.sendFile(path);
});
app.get("/show-tournaments", function (req, resp) {
  let path = __dirname + "/public/Player html files/tournaments-show.html";
  resp.sendFile(path);
});
//--------------------Admin-------------------------
app.get("/admin-dash", function (req, resp) {
  let path = __dirname + "/public/Admin html files/dash-admin.html";
  resp.sendFile(path);
});
app.get("/show-users", function (req, resp) {
  let path = __dirname + "/public/Admin html files/admin-users-console.html";
  resp.sendFile(path);
});
app.get("/show-organizers", function (req, resp) {
  let path = __dirname + "/public/Admin html files/organizers-show.html";
  resp.sendFile(path);
});
app.get("/show-players", function (req, resp) {
  let path = __dirname + "/public/Admin html files/players-show.html";
  resp.sendFile(path);
});
//--------------------------------------

app.get("/do-fetch-all-players", function (req, resp) {
  mySqlServer.query("select * from players", function (err, allRecords) {
    resp.send(allRecords);
  });
});
app.get("/do-fetch-all-organizers", function (req, resp) {
  mySqlServer.query("select * from organizers", function (err, allRecords) {
    resp.send(allRecords);
  });
});

app.post("/player-details-save", async function (req, resp) {
  let x = [
    { file: "adhaarFile", url: "AdhaarUrl" },
    { file: "profileFile", url: "picUrl" },
  ];
  for (const obj of x) {
    if (req.files && req.files[obj.file]) {
      let fileName = req.files[obj.file].name;
      let fullPath = __dirname + "/public/uploads/" + fileName;
      req.files[obj.file].mv(fullPath);
      try {
        let uploaded = await cloudinary.uploader.upload(fullPath);
        obj.url = uploaded.url;
      } catch (cloudErr) {
        console.log("Cloudinary upload failed:", cloudErr);
        return resp.send("Error Timeout");
      }
    } else {
      obj.url = "nopic.jpg";
    }
  }
  mySqlServer.query(
    "insert into players values(?,?,?,?,?,?,?,?,?)",
    [
      req.body.txtEmail,
      req.body.txtName,
      req.body.dateDOB,
      req.body.numContact,
      req.body.genderSel,
      req.body.txtAddress,
      req.body.txtOther,
      x[1].url,
      x[0].url,
    ],
    function (err) {
      if (err == null) resp.send("data saved....");
      else resp.send(err.message);
    }
  );
});

app.post("/player-details-update", async function (req, resp) {
  try {
    let x = [
      { file: "adhaarFile", url: "AdhaarUrl" },
      { file: "profileFile", url: "picUrl" },
    ];
    for (const obj of x) {
      if (req.files && req.files[obj.file]) {
        let fName = req.files[obj.file].name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        req.files[obj.file].mv(fullPath);

        await cloudinary.uploader
          .upload(fullPath)
          .then(function (picUrlResult) {
            obj.url = picUrlResult.url; //will give u the url of ur pic on cloudinary server
          });
      } else {
        const [Records] = await mySqlServer
          .promise()
          .query(`select ${obj.url} from players where emailid=?`, [
            req.body.txtEmail,
          ]);
        if (Records.length == 0) resp.send("Invalid Email ID");
        else obj.url = Records[0][obj.url];
        console.log(obj.url);
      }
    }
    const [result] = await mySqlServer
      .promise()
      .query(
        "update players set Name=?,DOB=?,contact=?,gender=?,address=?,other=?,picUrl=?,AdhaarUrl=? where emailid=?;",
        [
          req.body.txtName,
          req.body.dateDOB,
          req.body.numContact,
          req.body.genderSel,
          req.body.txtAddress,
          req.body.txtOther,
          x[1].url,
          x[0].url,
          req.body.txtEmail,
        ]
      );
    if (result.affectedRows == 1) resp.send("data Updated Successfully....");
    else resp.send("Invalid Email Id");
  } catch (err) {
    console.error("Update error:", err);
    resp.status(500).send("Server error: " + err.message);
  }
});
app.get("/do-fetch-all-cities", function (req, resp) {
  mySqlServer.query(
    "select distinct City from tournaments",
    function (err, allRecords) {
      resp.send(allRecords);
    }
  );
});
app.get("/do-fetch-all-games", function (req, resp) {
  mySqlServer.query(
    "select distinct SportsCategory from tournaments",
    function (err, allRecords) {
      resp.send(allRecords);
    }
  );
});
app.get("/do-fetch-all-tournaments", function (req, resp) {
  mySqlServer.query(
    "select * from tournaments where City=? and SportsCategory=?",
    [req.query.City, req.query.Game],
    function (err, allRecords) {
      resp.send(allRecords);
    }
  );
});

app.get("/changePwd-player", function (req, resp) {
  mySqlServer.query(
    "update users set password=? where emailid=? and password=?",
    [req.query.newPwd, req.query.email, req.query.Pwd],
    function (err, result) {
      if (err == null) {
        if (result.affectedRows == 0) resp.send("Invalid Password");
        else resp.send("Password Changed Successfully");
      } else resp.send(err.message);
    }
  );
});

app.get("/forgot-pwd", async function (req, resp) {
  try {
    const [records] = await mySqlServer
      .promise()
      .query("select password from users where emailid=?", [
        req.query.txtEmail,
      ]);
    if (records.length === 0) return resp.send("Invalid Email ID");
    const pwd = records[0].password;

    const transporter = await nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
    });
    const mailOptions = {
      from: {
        name: "hardik",
        address: "hardikjindal2020@gmail.com",
      },
      to: [req.query.txtEmail],
      subject: "Here is your Password...",
      text: `Hi How are You? Please do not forget the password Again !!! 
    
    Password : ${pwd}`,
    };
    await transporter.sendMail(mailOptions);
    resp.send("Password sent at your Email address");
  } catch (error) {
    console.error("Error in /forgot-pwd:", error);
    resp.status(500).send("Server error.");
  }
});
app.post("/mail-Mssg", async function (req, resp) {
  try {
    const transporter = await nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
    });
    const mailOptions = {
      from: {
        name: "hardik",
        address: `${req.body.txtEmail}`,
      },
      to: ['hardikjindal2020@gmail.com'],
      subject: `Mail from ${req.body.txtName}`,
      text: `${req.body.txtMssg}`
    };
    await transporter.sendMail(mailOptions);
    resp.send("Message sent successfully! Thank you for getting in touch.");
  } catch (error) {
    console.error("Error in /forgot-pwd:", error);
    resp.status(500).send("Server error.");
  }
});
