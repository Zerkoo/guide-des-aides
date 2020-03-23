// NPM DEPENDENCIES
const express = require('express');
const { pathOr } = require('ramda');
// LOCAL DEPENDENCIES
const { getAidesForThisProfile } = require('./morbihan');

// CONFIGURATION
const restService = express();
restService.use(bodyParser.json());

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

// MAIN FUNCTION
restService.post('/morbihan/recherche/aides/profile', async function (req, res) {
  try {
      const { Profil: profile, Categorie: category, SousCategorie: subCategory } = pathOr({}, ['body','intent','inputs'], req);

      if (profile || categorie || subCategory) {
          const response = await getAidesForThisProfile({ profile, category, subCategory });

          return successResponsev2(res, response);
      } else {
          return failResponsev3(res, { stream: [{ text: "Je suis désolé mais pour rechercher une aide j'ai besoin que vous me précisiez au moins une catégorie ou un profil." }]});
      }
  } catch (err) {
      console.error("Can't process request", err);
      return failResponsev3(res, err.message || err);
  }
});

// SERVER LAUNCH
restService.listen((process.env.PORT || 5000), function () {
  console.log("Server listening");
});
