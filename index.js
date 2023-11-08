const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express();

const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:5173','https://grow-barter-project.web.app'],
  credentials: true,

}));





//middlewares

const logger = async (req, res, next) => {
  console.log("called", req.hostname, req.originalUrl);
  next();
}

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log('Value of token in the middleware', token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" })
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized" })
    }
    // if token is valid it would be in the decode
    console.log('Value in the token is : ', decode);
    req.userInfo = decode;

    next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7nwjyzo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db("servicesDB").collection("services");
    const bookingCollection = client.db("bookingDB").collection("bookings");

    // auth related API

    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res       // setting the token in cookie
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        .send({ success: true })
    })

    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    });


    app.get('/services/:id', async (req, res) => {
      const ids = req.params.id;
      const query = { _id: new ObjectId(ids) }
      const result = await serviceCollection.findOne(query)
      res.send(result)
    });

    app.delete('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    });

    app.get('/bookings', async (req, res) => {
      console.log(req.query.email);
      console.log('userInfo from the valid token', req.userInfo);

      // if (req.query?.email !== req.userInfo.email) {
      //   return res.status(403).send({ message: "Forbidden Access" });
      // }

      let query = {};
      if (req.query?.email) {
        query = {
          user_email: req.query.email

        }
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedStatus = req.body;
      console.log(updatedStatus);
      const updateDoc = {
        $set: {
          service_status: updatedStatus.service_status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/pending-work', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('userInfo from the valid token', req.userInfo);
      if (req.query?.email !== req.userInfo.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      let query = {};
      if (req.query?.email) {
        query = {
          Service_Provider_Email: req.query.email
        }
      }

      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { Service_Name: 1, Service_Image: 1, booking_date: 1, service_status: 1, Service_Description: 1, Service_Price: 1 },
      };
      const result = await bookingCollection.find(query, options).toArray();
      res.send(result);
    });

    app.get('/my-services', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('userInfo from the valid token', req.userInfo);
      if (req.query?.email !== req.userInfo.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      let query = {};
      if (req.query?.email) {
        query = {
          Service_Provider_Email: req.query.email
        }
      }

      //   const options = {
      //     // Include only the `title` and `imdb` fields in the returned document
      //     projection: { Service_Name: 1, Service_Image: 1, booking_date: 1, service_status: 1, Service_Description : 1,Service_Price : 1 },
      // };
      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/provider/services', async (req, res) => {
      console.log('provider email :', req.query);

      let query = {};

      if (req.query?.email) {
        query = {
          Service_Provider_Email: req.query.email
        }
      }

      const result = await serviceCollection.find(query).toArray();

      res.send(result);
    });


    app.put('/my-services/update/:id', async (req, res) => {
      const ids = req.params.id;
      const filter = { _id: new ObjectId(ids) };
      const options = { upsert: true };
      const updatedProduct = req.body;
      const product = {
        $set: {

          Service_Name: updatedProduct.Service_Name,
          Service_Image: updatedProduct.Service_Image,
          Service_Description: updatedProduct.Service_Description,
          Service_Price: updatedProduct.Service_Price,
          Service_Area: updatedProduct.Service_Area,
          Service_Provider_Name: updatedProduct.Service_Provider_Name,
          Service_Provider_Email: updatedProduct.Service_Provider_Email

        }
      }

      const result = await serviceCollection.updateOne(filter, product, options);
      res.send(result)

    })



    app.post('/services', async (req, res) => {
      const newService = req.body;
      console.log(newService);
      const result = await serviceCollection.insertOne(newService);
      res.send(result)
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Grow Barter Server running ...')
})

app.listen(port, () => {
  console.log(`Grow Barter Server running on port ${port}`)
})