const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const app = express();
const ejs = require('ejs');
const port = process.env.PORT || 3000;
// Declare global data structures to store active tokens
const activeTokens = {}; // For admin tokens
app.use(bodyParser.urlencoded({ extended: true }));


const options = {
  definition: {
      openapi: '3.0.0',
      servers: [
          {
            url: 'https://prisonvms.azurewebsites.net',
          },
        ],          
      info: {
          title: ' PRISON VMS API',
          version: '1.0.0',
      },
  },
  apis: ['./swagger.js'],
};

const specs = swaggerJsdoc(options);

// const credentials = 'D:\\User\'s Files\\Documents\\GitHub\\ISassignment\\X509-cert-7205379504641267708.pem';
// const client = new MongoClient('mongodb+srv://cluster0.mucrtf7.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority', {
//   tlsCertificateKeyFile: credentials,
//   serverApi: ServerApiVersion.v1
// });

// async function connectToMongoDB() {
//   const client = new MongoClient('mongodb+srv://cluster0.mucrtf7.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority', {
//     tlsCertificateKeyFile: credentials,
//     serverApi: ServerApiVersion.v1
//   });

//   try {
//     await client.connect();
//     console.log('Connected to MongoDB cluster');

//     const database = client.db("testDB");
//     const collection = database.collection("testCol");

//     // Perform actions using the client
//     const docCount = await collection.countDocuments({});
//     console.log(`Number of documents in the collection: ${docCount}`);

//     // Add more actions as needed

//   } catch (error) {
//     console.error('Error:', error);
//   }
// }
//connectToMongoDB();

// MongoDB connection URL 
const uri = "mongodb+srv://shivaranjini2:4f8GZeWiJmGhRlEx@cluster0.k1veqjb.mongodb.net/?retryWrites=true&w=majority"; 
// Create a new MongoClient 
const client = new MongoClient(uri, {serverApi: {version: ServerApiVersion.v1, strict: true, deprecationErrors: true, } }); 
// Connect to MongoDB 
client.connect() 
  .then(() => {
    console.log('Connected to MongoDB!'); 
  }) 
.catch((error) => { 
    console.error('Failed to connect to MongoDB:', error); 
  });



app.use(express.json());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Welcome to Prison Visitor Management System of Group 17!')
})

// Define collection names
const db = client.db('PRISON_VMS');
const adminCollection = db.collection ('ADMIN');
const visitorCollection = db.collection ('VISITOR');
const visitorPassCollection = db.collection('VISITORPASS');
const securityCollection = db.collection('SECURITY');
const hostCollection = db.collection('HOST');


/** Create security function */
async function registerSecurity(reqUsername, reqPassword, reqName, reqAge, reqGender) {
  try {
    await securityCollection.insertOne({
      username: reqUsername,
      password: reqPassword,
      name: reqName,
      age: reqAge,
      gender: reqGender,
      role: 'security',
      approvalStatus: true, // Security registration is automatically approved
    });

    // If the insertion is successful, return a success message or any other desired response.
    return "Security registration successful!";
  } catch (error) {
    console.error('Error during security registration:', error);

    // Handle the error and return an appropriate error message.
    if (error.code === 11000) {
      // Duplicate key error (unique constraint violation), handle accordingly.
      return "Username already exists. Please choose a different username.";
    } else {
      return "An error occurred during security registration.";
    }
  }
}

app.post('/registerSecurity', async (req, res) => {
  console.log(req.body);

  try {
    const response = await registerSecurity(req.body.username, req.body.password, req.body.name, req.body.age, req.body.gender);
    res.send(response);
  } catch (error) {
    console.error('Error in security registration route:', error);
    res.status(500).send("An error occurred during security registration.");
  }
});



/** Create host function */
async function registerHost(reqUsername, reqPassword, reqName, reqAge, reqGender,reqContactNum, reqRole) {
  try {
    await hostCollection.insertOne({
      username: reqUsername,
      password: reqPassword,
      name: reqName,
      age: reqAge,
      gender: reqGender,
      contactNum: reqContactNum,
      role: reqRole,
      approvalStatus: false, // Host registration requires approval
    });

    // If the insertion is successful, return a success message or any other desired response.
    return "Host registration pending approval from security.";
  } catch (error) {
    console.error('Error during host registration:', error);

    // Handle the error and return an appropriate error message.
    if (error.code === 11000) {
      // Duplicate key error (unique constraint violation), handle accordingly.
      return "Username already exists. Please choose a different username.";
    } else {
      return "An error occurred during host registration.";
    }
  }
}



app.post('/registerHost', async (req, res) => {
  console.log(req.body);

  const approvalStatus = req.body.role === 'host' ? false : true;

  try {
    const response = await registerHost(req.body.username, req.body.password, req.body.name, req.body.age, req.body.gender,req.body.contactNum, req.body.role, approvalStatus);
    res.send(response);
  } catch (error) {
    console.error('Error in register route:', error);
    res.status(500).send("An error occurred during registration.");
  }
});

// Endpoint to register admin
app.post('/registerAdmin', async (req, res) => {
  try {
    // Validate admin registration request (you can add more validation logic)
    if (!req.body.username || !req.body.password ||!req.body.name || !req.body.age || !req.body.gender ) {
      return res.status(400).json({ error: 'Insufficient details.' });
    }

    // Check if the username is unique
    const existingAdmin = await adminCollection.findOne({ username: req.body.username });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }

    // Insert the new admin into the database with the provided role
    const newAdmin = await adminCollection.insertOne({
      username: req.body.username,
      password: req.body.password,
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      role: 'admin',
    });

    res.json({message: 'Admin registration successful!'});
  } catch (error) {
    console.error('Error during admin registration:', error);
    res.status(500).json({ error: 'An error occurred during admin registration.' });
  }
});


function generateToken(userData) {
  const token = jwt.sign(userData, 'inipassword');
  return token;
}


const jwtSecret = 'inipassword';

function verifyToken(req, res, next) {
  let header = req.headers.authorization;

  // Check if Authorization header exists
  if (!header) {
    return res.status(401).send('Unauthorized: Missing Authorization header');
  }

  // Split the header to get the token
  let token = header.split(' ')[1];

  // Check if the token is missing
  if (!token) {
    return res.status(401).send('Unauthorized: Token missing');
  }

  jwt.verify(token, jwtSecret, function (err, decoded) {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).send('Unauthorized: Token expired');
      } else {
        res.status(401).send('Unauthorized: Invalid token');
      }
    } else {
      req.user = decoded;
      next();
    }
  });
}


function verifySecurityToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.split(' ')[1];

  const sessionIdentifier = req.headers['x-session-identifier'];

  // Check if Authorization header exists
  if (!header || !token || !sessionIdentifier) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing Authorization header or token or session identifier.' });
  }

  // Verify token
  jwt.verify(token, jwtSecret, (err, decodedToken) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Token validation failed.' });
    }

    // Verify session identifier (example logic, adjust as needed)
    const storedSessionIdentifier = activeTokens[decodedToken.username]?.session;

    if (storedSessionIdentifier !== sessionIdentifier) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid session identifier.' });
    }

    // Set the decoded token data for later use in route handlers
    req.security = decodedToken;
    next();
  });
}

module.exports = verifySecurityToken;


// // Serve the login page
// app.get('/loginpage', (req, res) => {
//   res.sendFile(path.join(__dirname, 'login.html'));
// });

// Function to generate a session identifier
function generateSessionIdentifier() {
  // Implement your logic to generate a unique session identifier
  // Example: You can use a combination of timestamp and a random number
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `Session_${timestamp}_${random}`;
}

/** Host login function */
async function loginHost(reqUsername, reqPassword) {
  try {
    const host = await hostCollection.findOne({ username: reqUsername, password: reqPassword, role: 'host', approvalStatus: true });

    if (!host) {
      return {
        success: false,
        message: "Host not found or not approved by security."
      };
    } else {
      return {
        success: true,
        host: host
      };
    }
  } catch (error) {
    console.error('Error in host login:', error);
    return {
      success: false,
      message: "An error occurred during host login."
    };
  }
}


app.post('/loginHost', async (req, res) => {
  try {
    const response = await loginHost(req.body.username, req.body.password);

    if (response.success) {
      const newToken = generateToken(response.host);
      const sessionIdentifier = generateSessionIdentifier();

      activeTokens[response.host.username] = { token: newToken, session: sessionIdentifier };

      const responseData = {
        message: 'Host login successful!',
        token: newToken,
        session: sessionIdentifier
      };

      res.status(200).json(responseData);
    } else {
      res.status(401).json({ message: response.message });
    }
  } catch (error) {
    console.error('Error in host login route:', error);
    res.status(500).json({ message: "An error occurred during host login." });
  }
});


/** Login Security function */
async function loginSecurity(reqUsername, reqPassword) {
  try {
    const matchUsers = await securityCollection.findOne({ username: reqUsername, password: reqPassword });

    if (!matchUsers) {
      return {
        success: false,
        message: "Security not found!"
      };
    } else {
      return {
        success: true,
        users: matchUsers
      };
    }
  } catch (error) {
    console.error('Error in security login:', error);
    return {
      success: false,
      message: "An error occurred during security login."
    };
  }
}

app.post('/loginSecurity', async (req, res) => {
  try {
    const response = await loginSecurity(req.body.username, req.body.password);

    if (response.success) {
      const newToken = generateToken(response.users);
      const sessionIdentifier = generateSessionIdentifier();

      activeTokens[response.users.username] = { token: newToken, session: sessionIdentifier };

      const responseData = {
        message: `Login successful! Role: ${response.users.role}`,
        token: newToken,
        session: sessionIdentifier
      };

      res.status(200).json(responseData);
    } else {
      res.status(401).json({ message: "Invalid credentials. Please try again." });
    }
  } catch (error) {
    console.error('Error in security login route:', error);
    res.status(500).json({ message: "An error occurred during security login." });
  }
});



// Endpoint for security approval (to be called after reviewing the created hosts)
app.post('/securityApproval', verifySecurityToken, async (req, res) => {
  try {
    // Check if security is authenticated
    const security = req.security;
    if (!security) {
      return res.status(401).json({ success: false, message: "Unauthorized: Security authentication required." });
    }

    // Process the request to approve a host
    const usernameToApprove = req.body.username;

    // Update the host's approval status in the database
    const result = await hostCollection.updateOne(
      { username: usernameToApprove, role: 'host' },
      { $set: { approvalStatus: true } }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ success: true, message: `Host ${usernameToApprove} approved successfully.` });
    } else {
      res.status(404).json({ success: false, message: `Host ${usernameToApprove} not found or already approved.` });
    }
  } catch (error) {
    console.error('Error in approving host:', error);
    res.status(500).json({ success: false, message: "Error approving host." });
  }
});



// Issue Visitor Pass for Authenticated Admin
app.post('/visitor/issueVisitorPass', verifyToken, async (req, res) => {
  try {
    // Check if the request is coming from an authenticated admin
    if (req.user && req.user.username && req.user.role === 'host') {
      // Check if the visitor is registered
      const visitor = await visitorCollection.findOne({ visitorId: req.body.visitorId });

      if (!visitor) {
        return res.status(404).send('Visitor not found. Please register the visitor first.');
      }

      // Check if the stored session identifier matches the one in the request
      const storedSessionIdentifier = activeTokens[req.user.username]?.session;
      const requestSessionIdentifier = req.headers['x-session-identifier']; // Include session identifier in the request headers

      if (storedSessionIdentifier !== requestSessionIdentifier) {
        return res.status(403).send('Unauthorized: Session expired. Please login again!');
      }

      // Place your logic here to issue a visitor pass
      // Example: Generate a pass and store it in the database
      const passNumber = generatePassNumber();
      const visitorPass = {
        passNumber: passNumber,
        issuedBy: req.user.username,
        visitorId: req.body.visitorId,
        // Add other pass details as needed
      };

      // Store the visitor pass details in the database or perform any other actions
      await visitorPassCollection.insertOne(visitorPass);

      // Log the pass number and visitor name to the terminal
      console.log(`Visitor Pass Issued 
         Visitor Name: ${visitor.name}
         Pass Number: ${passNumber} `);

      const responseMessage = `Visitor pass issued successfully! 
         Visitor Name: ${visitor.name}
         Pass Number: ${passNumber}`;
      res.status(200).send(responseMessage);
    } else {
      res.status(401).send('Unauthorized: Admin authentication required.');
    }
  } catch (error) {
    console.error('Error issuing visitor pass:', error);
    res.status(500).send('Error issuing visitor pass');
  }
});




// Function to generate a unique visitor pass number
function generatePassNumber() {
  // Implement your logic to generate a unique pass number
  // Example: You can use a combination of timestamp and a random number
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `VP${timestamp}${random}`;
}


// Retrieve Visitor Pass for Authenticated Visitor
app.post('/visitor/retrievepass', async (req, res) => {
  try {
    // Extract visitor ID from the request body
    const visitorId = req.body.visitorId;

    if (!visitorId) {
      return res.status(400).send('Visitor ID is required.');
    }

    // Retrieve the visitor pass based on the visitor's information
    const visitorPass = await visitorPassCollection.findOne({ visitorId });

    if (visitorPass) {
      res.send(`Visitor Pass Number for ${visitorId}: ${visitorPass.passNumber}`);
    } else {
      res.status(404).send('Visitor pass not found.');
    }
  } catch (error) {
    console.error('Error retrieving visitor pass:', error);
    res.status(500).send('Error retrieving visitor pass');
  }
});


// Create a visitor
app.post('/visitor/createvisitorData', verifyToken, async (req, res) => {
  const {
    name,
    city,
    relationship,
    visitorId,
    username,  // Add username to the request body
    password,  // Add password to the request body
  } = req.body;

  const visitorData = {
    name,
    city,
    relationship,
    visitorId,
    username,  // Include username in the visitor data
    password,  // Include password in the visitor data
  };

  // Check if the username is unique before inserting into the database
  const existingVisitor = await visitorCollection.findOne({ username });
  if (existingVisitor) {
    return res.status(400).send('Username already exists. Please choose a different username.');
  }

  visitorCollection
    .insertOne(visitorData)
    .then(() => {
      res.send(visitorData);
    })
    .catch((error) => {
      console.error('Error creating visitor:', error);
      res.status(500).send('An error occurred while creating the visitor');
    });
});


// View all visitors (protected route for authenticated host only)
app.get('/host/viewvisitors', verifyToken, async (req, res) => {
  try {
    // Check if the request is coming from an authenticated host
    if (req.user && req.user.username && req.user.role === 'host') {
      // Check if the stored session identifier matches the one in the request
      const storedSessionIdentifier = activeTokens[req.user.username]?.session;
      const requestSessionIdentifier = req.headers['x-session-identifier']; // Include session identifier in the request headers

      if (storedSessionIdentifier !== requestSessionIdentifier) {
        return res.status(401).send('Unauthorized!');
      }

      // Proceed to fetch and send the list of visitors for authenticated hosts
      const visitors = await visitorCollection.find().toArray();
      res.send(visitors);
    } else {
      res.status(401).send('Unauthorized: Host authentication required.');
    }
  } catch (error) {
    console.error('Error viewing visitors:', error);
    res.status(500).send('Error viewing visitors');
  }
});


// Endpoint to retrieve host contact number by visitor pass
app.post('/security/getHostContactNumber', verifySecurityToken, async (req, res) => {
  try {
    // Check if the request is coming from an authenticated security personnel
    if (req.security && req.security.role === 'security') {
      // Extract visitor pass from the request body
      const visitorPass = req.body.visitorPass;

      // Find the visitor pass in the database
      const visitorPassData = await visitorPassCollection.findOne({ passNumber: visitorPass });

      if (visitorPassData) {
        // Check if the visitor pass is associated with a host
        const hostData = await hostCollection.findOne({ username: visitorPassData.issuedBy });

        if (hostData) {
          // Return the contact number of the host
          res.json({ 'Visitor Pass issued by': visitorPassData.issuedBy,
          'Contact Number': hostData.contactNum });
        } else {
          res.status(404).json({ error: 'Host not found for the given visitor pass.' });
        }
      } else {
        res.status(404).json({ error: 'Visitor pass not found.' });
      }
    } else {
      res.status(401).json({ error: 'Unauthorized: Security authentication required.' });
    }
  } catch (error) {
    console.error('Error retrieving host contact number:', error);
    res.status(500).json({ error: 'Error retrieving host contact number.' });
  }
});


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.set('view engine', 'ejs');
// Serve static files (like stylesheets) from the public folder
app.use(express.static('public'));

// Define a route for the login page
app.get('/loginAdmin', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/loginAdmin', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the username and password match an admin in the admin collection
    const admin = await adminCollection.findOne({ username, password });

    if (admin) {
      // Generate a new token
      const newToken = generateToken({ username: admin.username, role: admin.role });

      // Store the new token with a session identifier
      const sessionIdentifier = generateSessionIdentifier(); // Implement this function
      activeTokens[admin.username] = { token: newToken, session: sessionIdentifier };

      // Fetch all host data from the database
      const allHosts = await hostCollection.find().toArray();

      // Render the login page with admin data, all host data, token, and session identifier

      res.render('login', {
        adminData: admin,
        hostsData: allHosts,
        token: newToken,
        session: sessionIdentifier,
      });

    } else {
      // Render an error page for unsuccessful login
      res.render('error', { message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.render('error', { message: 'An error occurred during login' });
  }
});



async function getUserById(userId) {
  try {
    // Fetch user from the appropriate collection (security/host)
    const securityUser = await securityCollection.findOne({ _id: new ObjectId(userId) });
    const hostUser = await hostCollection.findOne({ _id: new ObjectId(userId) });

    return securityUser || hostUser;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}


// Endpoint to view user roles (GET)
app.get('/admin/viewUserRoles/:userId', verifyToken, async (req, res) => {
  try {
    console.log('UserID:', req.params.userId);
    
    if (req.user && req.user.role === 'admin') {
      // Fetch user data based on the user ID
      const user = await getUserById(req.params.userId);

      if (user) {
        console.log('User:', user);
        res.json({ username: user.username, role: user.role });
      } else {
        console.log('User not found');
        res.status(404).json({ error: 'User not found.' });
      }
    } else {
      res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    }
  } catch (error) {
    console.error('Error viewing user roles:', error);
    res.status(500).json({ error: `Error viewing user roles: ${error.message}` });
  }
});


async function updateUserRole(userId, newRole) {
  try {
    console.log('Updating user role for userId:', userId);

    // Try finding the user in the security collection
    const securityUser = await securityCollection.findOne({ _id: new ObjectId(userId) });

    // Check if the user is found in the security collection
    if (securityUser) {
      // Update the user role in the security collection
      const updatedSecurityUser = await securityCollection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $set: { role: newRole } },
        { returnDocument: 'after' }
      );

      console.log('Updated security user:', updatedSecurityUser);

      return updatedSecurityUser.value;
    }

    // If the user is not found in the security collection, try finding in the host collection
    const hostUser = await hostCollection.findOne({ _id: new ObjectId(userId) });

    // Check if the user is found in the host collection
    if (hostUser) {
      // Update the user role in the host collection
      const updatedHostUser = await hostCollection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $set: { role: newRole } },
        { returnDocument: 'after' }
      );

      console.log('Updated host user:', updatedHostUser);

      return updatedHostUser.value;
    }

    // User not found in any collection, throw an error
    throw new Error('User not found.');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}







// Endpoint to edit user roles (PUT)
app.put('/admin/editUserRoles/:userId', verifyToken, async (req, res) => {
  try {
    // Check if the request is coming from an authenticated admin
    if (req.user && req.user.role === 'admin') {
      // Fetch user data based on the user ID
      const user = await updateUserRole(req.params.userId, req.body.role);

      if (user) {
        // Update user role in the database
        res.json({ message: 'User role updated successfully.', username: user.username, role: user.role });
      } else {
        res.status(404).json({ error: 'User not found.' });
      }
    } else {
      res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    }
  } catch (error) {
    console.error('Error editing user roles:', error);
    res.status(500).json({ error: 'Error editing user roles.' });
  }
});





// Visitor login
// app.post('/visitor/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const visitor = await visitorCollection.findOne({ username, password });

//     if (visitor) {
//       // Generate a new token
//       const newToken = generateToken({ username: visitor.username, password: visitor.password });

//       // Store the new token with a session identifier
//       const sessionIdentifier = generateSessionIdentifier(); // Implement this function
//       activeVisitorTokens[visitor.username] = { token: newToken, session: sessionIdentifier };

//       // Send the new token and session identifier in the response
//       const responseMessage = `Visitor login successful! 
//       Token: ${newToken}
//       Session: ${sessionIdentifier}`;
//       res.send(responseMessage);
//     } else {
//       res.status(401).send('Visitor login failed. Invalid credentials.');
//     }
//   } catch (error) {
//     console.error('Error in visitor login route:', error);
//     res.status(500).send('An error occurred during visitor login.');
//   }
// });

// //Delete a visitor
// app.delete('/deletevisitor/:id', verifyToken, async (req, res) => {
//   const objectId = new ObjectId(req.params);
  

//   try {
//     const deleteResult = await db.collection('VISITOR').deleteOne({ _id:objectId });

//     if (deleteResult.deletedCount === 1) {
//       res.send('Visitor deleted successfully');
//     } else {
//       res.status(404).send('Visitor not found');
//     }
//   } catch (error) {
//     console.error('Error deleting visitor:', error);
//     res.status(500).send('Error deleting visitor');
//   }
// });


// // View all admins
// app.get('/admins', async (req, res) => {
//   try {
//     const db = client.db('PRISON_VMS');
//     const prisoner = await db.collection('ADMIN').find().toArray();
//     res.send(prisoner);
//   } catch (error) {
//     res.status(500).send('Error viewing admins');
//   }
// });


// // View all prisoner
// app.get('/prisoner', async (req, res) => {
//   try {
//     const db = client.db('PRISON_VMS');
//     const prisoner = await db.collection('PRISONER').find().toArray();
//     res.send(prisoner);
//   } catch (error) {
//     res.status(500).send('Error viewing prisoner');
//   }
// });


// // View all cell
// app.get('/cell', async (req, res) => {
//   try {
//     const db = client.db('PRISON_VMS');
//     const cell = await db.collection('CELL').find().toArray();
//     res.send(cell);
//   } catch (error) {
//     res.status(500).send('Error viewing cell');
//   }
// });


// // View all emergency_contact
// app.get('/emergency', async (req, res) => {
//   try {
//     const db = client.db('PRISON_VMS');
//     const emergency = await db.collection('EMERGENCY_CONTACT').find().toArray();
//     res.send(emergency);
//   } catch (error) {
//     res.status(500).send('Error viewing emergency_contact');
//   }
// });


// // View all case_details
// app.get('/casedetail', async (req, res) => {
//   try {
//     const db = client.db('PRISON_VMS');
//     const casedetail = await db.collection('CASE_DETAILS').find().toArray();
//     res.send(casedetail);
//   } catch (error) {
//     res.status(500).send('Error viewing emergency_contact');
//   }
// });

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});