const EcouteurDomibus = require('./src/ecouteurDomibus');
const OOTS_FRANCE = require('./src/ootsFrance');
const adaptateurChiffrement = require('./src/adaptateurs/adaptateurChiffrement');
const AdaptateurDomibus = require('./src/adaptateurs/adaptateurDomibus');
const adaptateurEnvironnement = require('./src/adaptateurs/adaptateurEnvironnement');
const adaptateurFranceConnectPlus = require('./src/adaptateurs/adaptateurFranceConnectPlus');
const adaptateurUUID = require('./src/adaptateurs/adaptateurUUID');
const horodateur = require('./src/adaptateurs/horodateur');
const DepotPointsAcces = require('./src/depots/depotPointsAcces');

const adaptateurDomibus = AdaptateurDomibus({ adaptateurUUID, horodateur });
const depotPointsAcces = new DepotPointsAcces(adaptateurDomibus);
const ecouteurDomibus = new EcouteurDomibus({ adaptateurDomibus, intervalleEcoute: 1000 });

const serveur = OOTS_FRANCE.creeServeur({
  adaptateurChiffrement,
  adaptateurDomibus,
  adaptateurEnvironnement,
  adaptateurFranceConnectPlus,
  adaptateurUUID,
  depotPointsAcces,
  ecouteurDomibus,
  horodateur,
});

const port = process.env.PORT || 3000;

serveur.ecoute(port, () => {
  /* eslint-disable no-console */

  console.log(`OOTS-France est démarré et écoute le port ${port} !…`);

  /* eslint-enable no-console */
});

ecouteurDomibus.ecoute();
