const avecRequetePieceJustificative = () => process.env.AVEC_REQUETE_PIECE_JUSTIFICATIVE === 'true';

const clePriveeJWK = () => JSON.parse(atob(process.env.CLE_PRIVEE_JWK_EN_BASE64));

const parametresRequeteJeton = () => ({
  client_id: process.env.IDENTIFIANT_CLIENT_FCPLUS,
  client_secret: process.env.SECRET_CLIENT_FCPLUS,
  redirect_uri: process.env.URL_REDIRECTION_CONNEXION,
});

const urlConfigurationOpenIdFCPlus = () => process.env.URL_CONFIGURATION_OPEN_ID_FCPLUS;

module.exports = {
  avecRequetePieceJustificative,
  clePriveeJWK,
  parametresRequeteJeton,
  urlConfigurationOpenIdFCPlus,
};
