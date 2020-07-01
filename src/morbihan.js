const superagent = require("superagent");
var removeAccents = require('remove-accents');
//var unique = require('array-unique');
import uab from 'unique-array-objects';

const URL_BASE = "http://vm-blu-dev6:8180/engine54/52/PortailJSON?flowName=RequeteAideParMotCle&flowType=EAII&actionJSON=launch";
//const URL_BASE = "https://testa.morbihan.fr/engine54/52/PortailJSON?flowName=RequeteAideParMotCle&flowType=EAII&actionJSON=launch";

const query = (...args) =>
  superagent
    .post(URL_BASE)
    .set("Content-Type", "application/json")
    .query(...args);

const getSubCategories = (...args) =>
  superagent
    .post(
      "http://vm-blu-dev6:8180/engine54/52/PortailJSON?flowName=RequeteAideListeSousCategories&flowType=EAII&actionJSON=launch"
      //"https://testa.morbihan.fr/engine54/52/PortailJSON?flowName=RequeteAideListeSousCategories&flowType=EAII&actionJSON=launch"
    )
    .set("Content-Type", "application/json")
    .query(...args);

const getCategories = (...args) =>
    superagent
      .post(
        "http://vm-blu-dev6:8180/engine54/52/PortailJSON?flowName=RequeteAideListeCategories&flowType=EAII&actionJSON=launch"
        //"https://testa.morbihan.fr/engine54/52/PortailJSON?flowName=RequeteAideListeCategories&flowType=EAII&actionJSON=launch"
      )
      .set("Content-Type", "application/json")
      //.query("");

const getProfils = (...args) =>
      superagent
        .post(
          "http://vm-blu-dev6:8180/engine54/52/PortailJSON?flowType=EAII&actionJSON=launch&flowName=RequeteAideListeProfils"
          //"https://testa.morbihan.fr/engine54/52/PortailJSON?flowType=EAII&actionJSON=launch&flowName=RequeteAideListeProfils"
        )
        .set("Content-Type", "application/json")
        //.query("");

 // Main funcction   
exports.getAidesForThisProfile = async ({ profile = '', category = '', subCategory ='', keyword ='' }) => {
  try {

    
    // On enlève l'accent de collectivité si c'est le profile de l'utilisateur afin d'éviter des erreurs de case 
   
    
    const { body: { ReponseAidesDeptParMotCle: results = []}} = await query({
      "in_profil": removeAccents(profile),
      "in_categorie": removeAccents(category),
      "in_souscategorie": removeAccents(subCategory),
      "in_mots_cles": removeAccents(keyword)
    });

    const cards = buildCards(results);
    console.info(keyword);
    console.info(category);
    console.info("sub : + ", subCategory);

    if (category == "Solidarités, action sociale") category = "Solidarites, action sociale";
    if (results.length === 0) { 
      return { stream: [{ text: `Je n'ai pas de connaissances concernant des aides pour un profil ${profile} dans cette catégorie : ${category}`}]}
    }
    if ( (category == "Solidarites, action sociale" && !subCategory)) {
      const redirectionButtons = await getRedirectionButtons({ profile, category: category, results });
      if (redirectionButtons.length > 0) {
        // Return propositions
        return {
          stream: [{ text: "J'ai beaucoup de résultats pour votre recherche, essayez d'être plus précis, choisissez parmi l'une des sous-catégories suivante :"}],
          posts: [...redirectionButtons]
        }
      }
    } if (results.length > 5 && (!category && profile)) {
      const redirectionButtons = await buttonsCateg({profile, results});
      return {
        stream: [{ text: "J'ai beaucoup de résultats pour votre recherche, essayez d'être plus précis, choisissez parmi l'une des catégories suivante :"}],
        posts: [...redirectionButtons]
      }
      
    } if (results.length > 5 && (!profile && category)) {
      const redirectionButtons = await buttonsProfil({category, results});
      return {
        stream: [{ text: "J'ai beaucoup de résultats pour votre recherche, essayez d'être plus précis, choisissez parmi l'un des profils suivants :"}],
        posts: [...redirectionButtons]
      } 
    } if (results.length > 5 && profile && category && !keyword) {
      return {
        stream: [{ text: "J'ai beaucoup de résultats pour votre recherche, essayez d'être plus précis, veuillez saisir un mot clé:"}],
      }
    }
    const occurance = parseInt(results.length);
    const sing = "J'ai trouvé un résultat !";
    const pluriel = "Voici les " + occurance  + " résultats que j'ai trouvé !";
    const texte = "";
    if (occurance == 1 ) {
      texte = sing;
    }

    if (occurance > 1) {
      texte = pluriel;
    }
    return {
      stream: [{ text: texte }],
      posts: [...cards]
    };
  } catch (error) {
    console.error("Something went wrong, here is the error : ", error);
  }
};
const lien_pdf = "https://www.morbihan.fr/fileadmin";
// construction carte resultat  (str1.concat(' ', str2));
const buildCards = results =>
  results.map(
    ({ titre = "", sous_titre = "", date_limite_depot = "", resume = "", chemin_pdf = "" }) => ({
      type: "card",
      title: titre,
      text: `${sous_titre}<br/>${date_limite_depot}<br></br>${resume}`,
      buttons: [{text: "Fiche détaillée (pdf)", type: "link", value: lien_pdf.concat('', chemin_pdf), "openInPanel":true}]
      
    })
  );

const getRedirectionButtons = async ({ profile = '', category, results }) => {
  if (category) {
    const result = await getSubCategories({
      in_categorie: category
    });

    /* const {
      body: { ReponseAidesListeSousCategories: subCategories = [] }
    } = result; */

    const buttons = uab(results.map(({ libelle_sous_categ }) => ({
      type: "button",
      text: `${libelle_sous_categ}`,
      value: `Aide ${profile} domaine de ${category}, dans la sous-catégorie : ${libelle_sous_categ}`
    })));

    return buttons;
  }
};

const buttonsCateg = async ({ profile, keyword, category, results }) => {
  console.log("result ", results['libelle_categ']);
  const result = await getCategories();

  //let uni = [...new Set(results.map(item => item.libelle_categ))];
  //console.log(uni);

    const {
      body: { ReponseAidesListeCategories: categories = [] }
    } = result;

    const buttons = uab(results.map(({ libelle_categ }) => ({
      type: "button", 
      text: `${libelle_categ}`,
      value: `Aide ${profile} domaine de ${libelle_categ}`
    })));
    return buttons;  
};


const buttonsProfil = async ({ category, results }) => {
  console.log("result ", results);

    const buttons = uab(results.map(({ libelle_profil }) => ({
      type: "button", 
      text: `${libelle_profil}`,
      value: `Aide ${libelle_profil} domaine de ${category}`
    })));
    return buttons;  
};
/*
const buttonsProfil = async ({ category }) => {

  const result = await getProfils();

    const {
      body: { ReponseAidesListeProfils: profils = [] }
    } = result;

    const buttons = profils.map(({ libelle_profil }) => ({
      type: "button", 
      text: `${libelle_profil}`,
      value: `Aide ${libelle_profil} domaine de ${category}`
    }));
    return buttons;  
}; */ 