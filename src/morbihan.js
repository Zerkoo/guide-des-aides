const superagent = require("superagent");

const URL_BASE = "https://testa.morbihan.fr/engine54/52/PortailJSON?flowName=RequeteAideParMotCle&flowType=EAII&actionJSON=launch";

const query = (...args) =>
  superagent
    .post(URL_BASE)
    .set("Content-Type", "application/json")
    .query(...args);

const getSubCategories = (...args) =>
  superagent
    .post(
      "https://testa.morbihan.fr/engine54/52/PortailJSON?flowName=RequeteAideListeSousCategories&flowType=EAII&actionJSON=launch"
    )
    .set("Content-Type", "application/json")
    .query(...args);

 // Main funcction   
exports.getAidesForThisProfile = async ({ profile = '', category = '', subCategory ='' }) => {
  try {

    // On enlève l'accent de collectivité si c'est le profile de l'utilisateur afin d'éviter des erreurs de case 
    if ( profile == 'Collectivités territoriales') profile = 'Collectivites territoriales';
    const { body: { ReponseAidesDeptParMotCle: results = []}} = await query({
      "in_profil": profile,
      "in_categorie": category,
      "in_souscategorie": subCategory,
      "in_mots_cles":""
    });

    const cards = buildCards(results);

    if (results.length === 0) {
      return { stream: [{ text: `Je n'ai pas de connaissances concernant des aides pour un profil ${profile} dans cette catégorie : ${category}`}]}
    }
    if (results.length > 5 && (category && !subCategory)) {
      const redirectionButtons = await getRedirectionButtons({ profile, category: category });
      if (redirectionButtons.length > 0) {
        // Return propositions
        return {
          stream: [{ text: "J'ai beaucoup de résultats pour votre recherche, essayez d'être plus précis, choisissez parmit l'une des sous-catégorie suivante :"}],
          posts: [...redirectionButtons]
        }
      }
    }

    return {
      stream: [{ text: "Voici ce que j'ai trouvé !" }],
      posts: [...cards]
    };
  } catch (error) {
    console.error("Something went wrong, here is the error : ", error);
  }
};

// construction carte resultat
const buildCards = results =>
  results.map(
    ({ titre = "", sous_titre = "", date_limite_depot = "", resume = "" }) => ({
      type: "card",
      title: titre,
      text: `${sous_titre}<br/>${date_limite_depot}<br/><br/>${resume}`
    })
  );

const getRedirectionButtons = async ({ profile = '', category }) => {
  if (category) {
    const result = await getSubCategories({
      in_categorie: category
    });

    const {
      body: { ReponseAidesListeSousCategories: subCategories = [] }
    } = result;

    const buttons = subCategories.map(({ libelle_sous_categ }) => ({
      type: "button",
      text: `${libelle_sous_categ}`,
      value: `Aide ${profile} domaine de ${category}, dans la sous-catégorie : ${libelle_sous_categ}`
    }));

    return buttons;
  }
};