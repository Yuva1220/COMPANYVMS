// Connection URL
const { MongoClient } = require('mongodb');
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const port = 3000;

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Connection URL
const url = 'mongodb+srv://yraj66770:yuva1220@cluster01.c8zbkfb.mongodb.net/';
const client = new MongoClient(url);

app.use(express.json());

// Swagger configuration
const options = {
  definition: {
    openapi: '3.0.0',         
    info: {
      title: 'MyVMS API',
      version: '1.0.0',
    },
  },
  apis: ['swagger-definition.yaml'], // Include the file where your Swagger annotations are located
};

try {
  const swaggerSpec = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} catch (error) {
  console.error('Error generating Swagger spec:', error);
}

app.get('/', (req, res) => {
  res.send('Welcome to MyVMS API');
});

app.post('/login', async function (req, res) { //login route
  const { id, password } = req.body;
  await client.connect();
  let data = await client.db("VMS").collection("USERS").findOne({ id: id });
  console.log(data);

  const loginSuccess = await login(id, password);
  if (loginSuccess) {
    const token = jwt.sign({ id: id, level_of_clearance: data.level_of_clearance }, 'inipassword');
    console.log("Token: " + token);
    res.json({ message: 'Login successful', token: token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

async function login(id, password) { //login function
  try {
    await client.connect();
    const exist = await client.db("VMS").collection("USERS").findOne({ id: id, password: password });

    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });

    const formattedTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });

    // Attendance for Login
    if (exist) {
      console.log("Login Successful");
      await client.db("VMS").collection("ATTENDANCE").insertOne({
        id: exist.id,
        Date: formattedDate,
        entry_time: formattedTime,
        exit_time: "Pending",
        Level_of_clearance: exist.level_of_clearance
      });

      return true; // Login successful
    } else {
      return false; // User not found or invalid credentials
    }
  } catch (error) {
    console.error('Error during login:', error);
    return false; // Login failed due to an error
  } finally {
    // Close the MongoDB connection after login attempt
    await client.close();
  }
}

//Admin Register Visitor
async function register_VISITOR(_ic, Name, Gender, Nationality, Email, Sector_of_Visit, Company, Region, Phone_Number, Reason){
    await client.connect ();
    const exist = await client.db ("VMS").collection("VISITOR").findOne({_ic: _ic});
    if(exist){
        console.log("Ic already exist!");
    }else{
        await client.db ("VMS").collection("VISITOR").insertOne({
            _ic: _ic,
            Name: Name,
            Gender: Gender,
            Nationality: Nationality,
            Email: Email,
            Sector_of_Visit: Sector_of_Visit,
            Company: Company,
            Region: Region,
            Phone_Number: Phone_Number,
            Reason: Reason
        })
        console.log("Registered successfully!");
    }
}

//Register Route Visitor

app.post('/register/VISITOR', async function(req, res) {
  const {_ic, Name, Gender, Nationality, Email, Sector_of_Visit, Company, Region, Phone_Number, Reason} = req.body;
  let header = req.headers.authorization;
  console.log(header);
  let token = header.split(' ')[1];
  jwt.verify(token, 'inipassword', function (err, decoded) {
      if (err) {
          res.status(401).send('Invalid Token');
      }
      if (decoded.level_of_clearance == "ADMIN") {
          register_VISITOR(_ic, Name, Gender, Nationality, Email, Sector_of_Visit, Company, Region, Phone_Number, Reason);
          res.status(200).send('Successfully registered a new visitor.');
      } else {
          console.log("Restricted!");
          console.log(decoded);
          res.status(403).send('Restricted. Only ADMINs are allowed.');
      }
  });
});

//Admin Register Funtion for Staff and Security
async function register_USER(id, level_of_clearance, Name, Email, Phone_Number, password){
    await client.connect ();
    const exist = await client.db ("VMS").collection("USERS").findOne({id: id, password: password});
    if(exist){
        console.log("Registration Failed!");
    }else{
        await client.db ("VMS").collection("USERS").insertOne({
            id: id, 
            level_of_clearance: level_of_clearance,
            Name: Name,
            Email: Email,
            Phone_Number: Phone_Number,
            password: password
 
        })
        console.log("Registered successfully!");
    }

}

//Register Route Staff and Security
app.post('/register/USERS', async function(req, res){
    const {id, level_of_clearance, Name, Email, Phone_Number, password}=req.body;
    let header = req.headers.authorization;
    console.log(header);
    let token = header.split(' ')[1];
    jwt.verify(token, 'inipassword', function (err, decoded) {
        if (err) {
          res.send('Invalid Token');

        }
        if(decoded.level_of_clearance == "ADMIN"){
            register_USER(id, level_of_clearance, Name, Email, Phone_Number, password);
        }else{
            console.log("Restricted!");
            console.log(decoded);
        }
      });
});

//View Users
app.get('/view/USERS', async (req, res) => {
    try {
      const db = client.db('VMS');
      const exist = await db.collection("USERS").find().toArray();
      res.send(exist);
    } catch (error) {
      res.status(500).send('Error viewing USERS');
    }
  });

//View Visitors
app.get('/view/VISITOR', async (req, res) => {
  try {
    const db = client.db('VMS');
    const exist = await db.collection("VISITOR").find().toArray();
    res.send(exist);
  } catch (error) {
    res.status(500).send('Error viewing VISITOR');
  }
});

//Visitor Access Info
app.get('/view/VISITOR/:_ic/access-info', async (req, res) => {
  const _ic = req.params._ic;

  try {
    const db = client.db("VMS");
    const exist = await db.collection("VISITOR").findOne({ _ic: _ic });
    console.log(exist);

    if (exist) {
      res.send(exist.accessInfo);
    } else {
      res.status(404).send('Visitor not found');
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('Error retrieving access information');
  }
});

// Delete User
async function delete_USERS(id, level_of_clearance, Name, Email, Phone_Number, password) {
  await client.connect();
  const exist = await client.db("VMS").collection("USERS").findOne({ id: id, password:password });

  if (!exist) {
    console.log("User not found!");
  } else {
    await client.db("VMS").collection("USERS").deleteOne({
      id: id,
      level_of_clearance: level_of_clearance,
      Name: Name,
      Email: Email,
      Phone_Number: Phone_Number,
      password: password
    });
    console.log("Deleted successfully!");
  }
}

// Delete Route
app.delete('/delete/USERS', async function(req, res) {
  const { id, level_of_clearance, Name, Email, Phone_Number, password } = req.body;
  let header = req.headers.authorization;
  console.log(header);
  let token = header.split(' ')[1];
  jwt.verify(token, 'inipassword', function(err, decoded) {
    if (err) {
      res.send('Invalid Token');
    }
    if (decoded.level_of_clearance === "ADMIN") {
      delete_USERS(id, level_of_clearance, Name, Email, Phone_Number, password);
      res.send('User deleted successfully');
    } else {
      console.log("Restricted!");
      console.log(decoded);
      res.status(403).send('Access denied');
    }
  });
});

// Logout function
const logout = async (id) => {
  try {
    const formattedTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });

    await client.connect();
    const updateResult = await client
      .db("VMS")
      .collection("ATTENDANCE")
      .findOneAndUpdate(
        { id: id, exit_time: "Pending" },
        { $set: { exit_time: formattedTime } }
      );

    if (updateResult.value) {
      console.log('Logout successful');
    } else {
      console.log('Logout failed. Attendance record not found or already has an exit time.');
    }
  } catch (error) {
    console.error('An error occurred during logout:', error);
  }
};

//Logout Route
app.put('/logout/:id', (req, res) => {
  const attendanceId = req.params.id;

  // Call the logout function
  logout(attendanceId)
    .then(() => {
      res.status(200).json({ message: 'Logout successful' });
    })
    .catch((error) => {
      console.error('An error occurred during logout:', error);
      res.status(500).json({ error: 'An error occurred during logout' });
    });
});

// Start Server
async function startServer() {
  await client.connect();
  console.log(`Server listening at http://localhost:${port}`);
}

startServer();
