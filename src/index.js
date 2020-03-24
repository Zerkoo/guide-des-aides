import bodyParser from "body-parser";
import express from "express";
import routes from "./routes";

// A port should be specified in the environement
const port = process.env.PORT || 8080;

// NPM DEPENDENCIES
const express = require('express');
const { pathOr } = require('ramda');
// LOCAL DEPENDENCIES
const { getAidesForThisProfile } = require('./morbihan');

// Create server and configure it. Here we are also using bodyParser.
const webhookServer = express();
webhookServer.use(bodyParser.json());

// UTILITARIES FUNCTIONS
function successResponsev2(res, data) {
  res.json({
      "speech": data && data.speech,
      "posts": data && data.posts,
      "image": data && data.image,
      "stream": data && data.stream,
      "data": data && data.data
  });
}
const FAIL_DEFAULT_TEXT = "J'ai essayé de contacter un service externe. Celui-ci n'a pas répondu.";
function failResponsev3(res, { stream = [{ text: FAIL_DEFAULT_TEXT }], data = []}) {
  res.json({
      "stream": stream,
      "data": data
  });
}

// Below you can define all your webhooks
webhookServer.post('/morbihan/recherche/aides/profile', async function (req, res) {
  try {
      const { Profil: profile, Categorie: category, SousCategorie: subCategory } = pathOr({}, ['body','intent','inputs'], req);

      if (profile || category || subCategory) {
          const response = await getAidesForThisProfile({ profile, category, subCategory });
          console.info(profile);
          console.info(category);
          return successResponsev2(res, response);
      } else {
          console.info(category);
          return failResponsev3(res, { stream: [{ text: "Je suis désolé mais pour rechercher une aide j'ai besoin que vous me précisiez au moins une catégorie ou un profil." }]});
      }
  } catch (err) {
      console.error("Can't process request", err);
      return failResponsev3(res, err.message || err);
  }
});
// Start the server
webhookServer.listen(port, function() {
  console.info("Webhook server is up and running...");
});
