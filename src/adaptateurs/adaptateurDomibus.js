const axios = require('axios');
const EventEmitter = require('node:events');

const {
  ErreurAbsenceReponseDestinataire,
  ErreurAucunMessageDomibusRecu,
} = require('../erreurs');
const { requeteListeMessagesEnAttente, requeteRecuperationMessage } = require('../domibus/requetes');
const ReponseEnvoiMessage = require('../domibus/reponseEnvoiMessage');
const ReponseRecuperationMessage = require('../domibus/reponseRecuperationMessage');
const ReponseRequeteListeMessagesEnAttente = require('../domibus/reponseRequeteListeMessagesEnAttente');
const Entete = require('../ebms/entete');
const EnteteErreur = require('../ebms/enteteErreur');
const EnteteRequete = require('../ebms/enteteRequete');
const RequeteJustificatif = require('../ebms/requeteJustificatif');

const urlBase = process.env.URL_BASE_DOMIBUS;
const REPONSE_REDIRECTION_PREVISUALISATION = 'reponseRedirectionPrevisualisation';
const REPONSE_SUCCES = 'reponseSucces';

const enveloppeSOAP = (config, idPayload, enteteEBMS, message) => {
  const messageEnBase64 = Buffer.from(message).toString('base64');

  return `
<soap:Envelope
  xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
  xmlns:ns="http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/"
  xmlns:_1="http://eu.domibus.wsplugin/"
  xmlns:xm="http://www.w3.org/2005/05/xmlmime">

  <soap:Header>${enteteEBMS.enXML()}</soap:Header>

  <soap:Body>
    <_1:submitRequest>
      <bodyload>
        <value>cid:bodyload</value>
      </bodyload>
      <payload payloadId="${idPayload}" contentType="application/x-ebrs+xml">
        <value>${messageEnBase64}</value>
      </payload>
    </_1:submitRequest>
  </soap:Body>
</soap:Envelope>
  `;
};

const AdaptateurDomibus = (config = {}) => {
  const { adaptateurUUID, horodateur } = config;
  const annonceur = new EventEmitter();

  const envoieMessageDomibus = (ClasseEntete, message, destinataire, idConversation) => {
    const suffixe = process.env.SUFFIXE_IDENTIFIANTS_DOMIBUS;
    const idPayload = `cid:${adaptateurUUID.genereUUID()}@${suffixe}`;
    const enteteEBMS = new ClasseEntete(config, { destinataire, idConversation, idPayload });
    const messageAEnvoyer = enveloppeSOAP(
      config,
      idPayload,
      enteteEBMS,
      message,
    );

    return axios.post(
      `${urlBase}/services/wsplugin/submitMessage`,
      messageAEnvoyer,
      { headers: { 'Content-Type': 'text/xml' } },
    ).then(({ data }) => new ReponseEnvoiMessage(data));
  };

  const envoieRequeteREST = (chemin, parametres) => {
    const jetonEncode = btoa(`${process.env.LOGIN_API_REST}:${process.env.MOT_DE_PASSE_API_REST}`);

    return axios({
      method: 'get',
      url: `${urlBase}/${chemin}`,
      headers: { Authorization: `Basic ${jetonEncode}` },
      params: parametres,
    }).then(({ data }) => data);
  };

  const envoieReponseErreur = (...args) => envoieMessageDomibus(EnteteErreur, ...args);
  const envoieRequete = (...args) => envoieMessageDomibus(EnteteRequete, ...args);

  const recupereIdMessageSuivant = (identifiantConversation) => axios.post(
    `${urlBase}/services/wsplugin/listPendingMessages`,
    requeteListeMessagesEnAttente(identifiantConversation),
    { headers: { 'Content-Type': 'text/xml' } },
  )
    .then(({ data }) => new ReponseRequeteListeMessagesEnAttente(data))
    .then((reponse) => {
      if (reponse.messageEnAttente()) {
        return reponse.idMessageSuivant();
      }
      return Promise.reject(new ErreurAucunMessageDomibusRecu());
    });

  const recupereMessage = (idMessage) => axios.post(
    `${urlBase}/services/wsplugin/retrieveMessage`,
    requeteRecuperationMessage(idMessage),
    { headers: { 'Content-Type': 'text/xml' } },
  )
    .then(({ data }) => new ReponseRecuperationMessage(data));

  const repondsA = (requete) => {
    const message = requete.reponse({ adaptateurUUID, horodateur });
    envoieReponseErreur(message.enXML(), requete.expediteur(), requete.idConversation());
  };

  const traiteMessageSuivant = () => recupereIdMessageSuivant()
    .then((idMessage) => recupereMessage(idMessage))
    .then((message) => {
      if (message.action() === Entete.REPONSE_ERREUR) {
        annonceur.emit(REPONSE_REDIRECTION_PREVISUALISATION, message);
      } else if (message.action() === Entete.EXECUTION_REPONSE) {
        annonceur.emit(REPONSE_SUCCES, message);
      } else if (message.action() === Entete.EXECUTION_REQUETE) {
        repondsA(message);
      }
    })
    .catch((e) => {
      if (!(e instanceof ErreurAucunMessageDomibusRecu)) {
        /* eslint-disable no-console */

        console.error(e.response?.data || e);

        /* eslint-enable no-console */
      }
    });

  const envoieMessageRequete = ({
    codeDemarche,
    destinataire,
    idConversation,
    previsualisationRequise,
  }) => {
    const requeteJustificatif = new RequeteJustificatif(
      { adaptateurUUID, horodateur },
      { codeDemarche, previsualisationRequise },
    );

    return envoieRequete(requeteJustificatif.enXML(), destinataire, idConversation)
      .then((reponse) => reponse.idMessage());
  };

  const urlRedirectionDepuisReponse = (idConversation) => new Promise(
    (resolve, reject) => {
      annonceur.on(REPONSE_REDIRECTION_PREVISUALISATION, (reponse) => {
        if (idConversation === reponse.idConversation()) {
          try {
            resolve(reponse.suiteConversation());
          } catch (e) {
            reject(e);
          }
        }
      });

      setTimeout(() => {
        reject(new ErreurAbsenceReponseDestinataire('aucune URL de redirection reçue'));
      }, process.env.DELAI_MAX_ATTENTE_DOMIBUS);
    },
  );

  const pieceJustificativeDepuisReponse = (idConversation) => new Promise(
    (resolve, reject) => {
      annonceur.on(REPONSE_SUCCES, (reponse) => {
        if (idConversation === reponse.idConversation()) {
          resolve(reponse.pieceJustificative());
        }
      });

      setTimeout(() => {
        reject(new ErreurAbsenceReponseDestinataire('aucune pièce justificative reçue'));
      }, process.env.DELAI_MAX_ATTENTE_DOMIBUS);
    },
  );

  const trouvePointAcces = (nomPointAcces) => envoieRequeteREST('ext/party', { name: nomPointAcces });

  return {
    envoieMessageRequete,
    pieceJustificativeDepuisReponse,
    traiteMessageSuivant,
    trouvePointAcces,
    urlRedirectionDepuisReponse,
  };
};

module.exports = AdaptateurDomibus;
