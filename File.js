process.stdin.setEncoding("utf8");
const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();
const bcrypt = require("bcrypt");

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://opal:WQl5LSUMYj2lxyjZ@cluster0.bn5qnxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const databaseAndCollection = {
  db: "results",
  collection: "results",
};

const app = express();
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");


app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    await client.connect();
    const database = client.db(databaseAndCollection.db);
    const collection = database.collection(databaseAndCollection.collection);

    const user = await collection.findOne({ username: username });
    if (user) {
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid) {
        res.redirect("/weather");
      } else {
        res.render("error");
      }
    } else {
      res.send("User does not exist.");
    }
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).send("Server error during login.");
  } finally {
    await client.close();
  }
});

app.get("/createAccount", (req, res) => {
  res.render("createAccount");
});

app.post("/createAccount", async (req, res) => {
  const { username, password } = req.body;

  try {
    await client.connect();
    const database = client.db(databaseAndCollection.db);
    const collection = database.collection(databaseAndCollection.collection);

    const userExists = await collection.findOne({ username: username });
    if (userExists) {
      res.send("User already exists!");
    } else {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      await collection.insertOne({
        username: username,
        password: hashedPassword,
      });
      res.redirect("/");
    }
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).send("Failed to create account due to server error.");
  } finally {
    await client.close();
  }
});

app.get("/weather", (req, res) => {
  res.render("weather");
});

app.post("/weather", async (req, res) => {
  const cityName = req.body.cityName;
  const apiKey = "c4a1fcaf5ced5a270c283d3c9c29f45b";

  try {
    const weatherResponse = await axios.get(
      `http://api.weatherstack.com/current`,
      {
        params: {
          access_key: apiKey,
          query: cityName,
        },
      }
    );

    console.log(weatherResponse.data);

    if (weatherResponse.data && weatherResponse.data.current) {
      const { temperature, weather_descriptions, wind_speed } =
        weatherResponse.data.current;
      const { name, country } = weatherResponse.data.location;

      res.render("displayWeather", {
        weather: {
          temperature,
          description: weather_descriptions[0],
          windSpeed: wind_speed,
        },
        location: `${name}, ${country}`,
      });
    } else {
      res.send("No weather data found for the provided city.");
    }
  } catch (error) {
    console.error("Error fetching weather data:", error);
    if (error.response) {
      console.error("Error Status:", error.response.status);
      console.error("Error Data:", error.response.data);
      res.status(error.response.status).send(error.response.data.message);
    } else {
      res.status(500).send("Error fetching weather data: " + error.message);
    }
  }
});