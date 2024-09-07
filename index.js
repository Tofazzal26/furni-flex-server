const express = require("express");
const app = express();
const port = process.env.PORT || 4000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.get("/", (req, res) => {
  res.send("FurniFlex is Running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rgxjhma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.SECURE_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

const ProductCollection = client.db("FurniFlex").collection("Product");
const UserProductCollection = client.db("FurniFlex").collection("UserProduct");

async function run() {
  try {
    app.get("/allProduct", async (req, res) => {
      const category = req.query.category;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const totalProducts = await ProductCollection.countDocuments();
      const result = await ProductCollection.find({ category: category })
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send({ result, totalProducts });
    });

    app.get("/userProduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ProductCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/singleUser/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await UserProductCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/userCartAdd", async (req, res) => {
      try {
        const cart = req.body;
        const result = await UserProductCollection.insertOne(cart);
        res.send(result);
      } catch (error) {
        res.send({ message: "Server Error" });
      }
    });

    app.get("/cartCount/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const count = await UserProductCollection.countDocuments(query);
      res.send({ count });
    });

    app.delete("/productCartDelete/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: id };
        const result = await UserProductCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.send({ message: "Delete Server Error" });
      }
    });

    app.patch("/quantityUpdate/:id", async (req, res) => {
      try {
        const { quantity, disPrice } = req.body.prd;
        const id = req.params.id;
        const query = { _id: id };

        const updatePrd = {
          $set: {
            quantity: quantity,
          },
        };

        if (disPrice) {
          updatePrd.$set.disPrice = disPrice;
        }

        const result = await UserProductCollection.updateOne(query, updatePrd);

        if (result.modifiedCount > 0) {
          res.send({ message: "Product updated successfully", result });
        } else {
          res.send({ message: "No changes made to the product" });
        }
      } catch (error) {
        res.status(500).send({ message: "Server Error", error });
      }
    });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "365d",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
