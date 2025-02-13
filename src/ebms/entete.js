const PointAcces = require('./pointAcces');

const ACTIONS = {
  EXECUTION_REQUETE: 'ExecuteQueryRequest',
  EXECUTION_REPONSE: 'ExecuteQueryResponse',
  REPONSE_ERREUR: 'ExceptionResponse',
};

class Entete {
  constructor(config = {}, donnees = {}) {
    this.expediteur = PointAcces.expediteur();

    this.horodateur = config.horodateur;
    this.destinataire = donnees.destinataire;
    this.idConversation = donnees.idConversation;
    this.idPayload = donnees.idPayload;
    this.idPieceJointe = donnees.idPieceJointe;

    const { adaptateurUUID } = config;
    const suffixe = process.env.SUFFIXE_IDENTIFIANTS_DOMIBUS;
    this.idMessage = `${adaptateurUUID.genereUUID()}@${suffixe}`;
  }

  static action() {
    throw new Error('Méthode non implémentée dans classe abstraite');
  }

  enXML() {
    const horodatage = this.horodateur.maintenant();
    const baliseIdConversation = (typeof this.idConversation !== 'undefined')
      ? `<eb:ConversationId>${this.idConversation}</eb:ConversationId>`
      : '';

    return `
<eb:Messaging xmlns:eb="http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/
  https://www.oasis-open.org/committees/download.php/64179/ebms-header-3_0-200704_with_property_type_attribute.xsd">
  <eb:UserMessage>
    <eb:MessageInfo>
      <eb:Timestamp>${horodatage}</eb:Timestamp>
      <eb:MessageId>${this.idMessage}</eb:MessageId>
    </eb:MessageInfo>
    <eb:PartyInfo>
      <eb:From>${this.expediteur.enXML()}</eb:From>
      <eb:To>${this.destinataire.enXML()}</eb:To>
    </eb:PartyInfo>
    <eb:CollaborationInfo>
      <eb:Service type="urn:oasis:names:tc:ebcore:ebrs:ebms:binding:1.0">QueryManager</eb:Service>
      <eb:Action>${this.constructor.action()}</eb:Action>
      ${baliseIdConversation}
    </eb:CollaborationInfo>
    <eb:MessageProperties>
      <eb:Property name="originalSender" type="urn:oasis:names:tc:ebcore:partyid-type:unregistered">C1</eb:Property>
      <eb:Property name="finalRecipient" type="urn:oasis:names:tc:ebcore:partyid-type:unregistered">C4</eb:Property>
    </eb:MessageProperties>
    <eb:PayloadInfo>
      <eb:PartInfo href="${this.idPayload}">
        <eb:PartProperties>
          <eb:Property name="MimeType">application/x-ebrs+xml</eb:Property>
        </eb:PartProperties>
      </eb:PartInfo>
      ${this.infosPieceJointe()}
    </eb:PayloadInfo>
  </eb:UserMessage>
</eb:Messaging>
    `;
  }

  infosPieceJointe() {
    if (typeof this.idPieceJointe === 'undefined') {
      return '';
    }

    return `
<eb:PartInfo href="${this.idPieceJointe}">
  <eb:PartProperties>
    <eb:Property name="MimeType">application/pdf</eb:Property>
  </eb:PartProperties>
</eb:PartInfo>
    `;
  }
}

Object.assign(Entete, ACTIONS);

module.exports = Entete;
