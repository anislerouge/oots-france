const ConstructeurEnveloppeSOAPException = require('../constructeurs/constructeurEnveloppeSOAPException');
const ReponseRecuperationMessage = require('../../src/domibus/reponseRecuperationMessage');
const { ErreurReponseRequete } = require('../../src/erreurs');

describe('La réponse à une requête Domibus de récupération de message', () => {
  it("connaît l'URL de redirection spécifiée", () => {
    const enveloppeSOAP = ConstructeurEnveloppeSOAPException.erreurAutorisationRequise()
      .avecURLRedirection('https://example.com/preview/12345678-1234-1234-1234-1234567890ab')
      .construis();
    const reponse = new ReponseRecuperationMessage(enveloppeSOAP);

    expect(reponse.urlRedirection()).toEqual('https://example.com/preview/12345678-1234-1234-1234-1234567890ab');
  });

  it("connaît le type d'action liée au message", () => {
    const enveloppeSOAP = ConstructeurEnveloppeSOAPException.erreurAutorisationRequise()
      .construis();
    const reponse = new ReponseRecuperationMessage(enveloppeSOAP);

    expect(reponse.action()).toEqual('ExceptionResponse');
  });

  it("connaît l'identifiant de la conversation", () => {
    const enveloppeSOAP = ConstructeurEnveloppeSOAPException.erreurAutorisationRequise()
      .avecIdConversation('12345678-1234-1234-1234-1234567890ab')
      .construis();
    const reponse = new ReponseRecuperationMessage(enveloppeSOAP);

    expect(reponse.idConversation()).toEqual('12345678-1234-1234-1234-1234567890ab');
  });

  it("connaît l'expéditeur", () => {
    const enveloppeSOAP = ConstructeurEnveloppeSOAPException.erreurAutorisationRequise()
      .avecExpediteur('AP_SI_01')
      .construis();
    const reponse = new ReponseRecuperationMessage(enveloppeSOAP);

    expect(reponse.expediteur()).toEqual('AP_SI_01');
  });

  it('connaît son identifiant de message', () => {
    const enveloppeSOAP = ConstructeurEnveloppeSOAPException.erreurAutorisationRequise()
      .avecIdMessage('11111111-1111-1111-1111-111111111111@oots.eu')
      .construis();
    const reponse = new ReponseRecuperationMessage(enveloppeSOAP);

    expect(reponse.idMessage()).toEqual('11111111-1111-1111-1111-111111111111@oots.eu');
  });

  describe("dans le cas d'une réponse en erreur pièce inexistante", () => {
    it("lève une erreur à la tentative de lecture de l'URL de redirection", (suite) => {
      const enveloppeSOAP = new ConstructeurEnveloppeSOAPException()
        .avecErreur({
          type: 'rs:ObjectNotFoundExceptionType',
          code: 'EDM:ERR:0004',
          message: 'Object not found',
          severite: 'urn:oasis:names:tc:ebxml-regrep:ErrorSeverityType:Error',
        })
        .construis();
      const reponse = new ReponseRecuperationMessage(enveloppeSOAP);

      try {
        reponse.urlRedirection();
        suite('Une `ErreurReponseRequete` aurait dû être levée.');
      } catch (e) {
        expect(e).toBeInstanceOf(ErreurReponseRequete);
        expect(e.message).toEqual('Object not found');
        suite();
      }
    });
  });
});
