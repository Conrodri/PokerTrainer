export function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 text-gray-300 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Politique de Confidentialité</h1>
        <p className="text-xs text-gray-500">Dernière mise à jour : juin 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données collectées via PokerPeak est
          <strong> [NOM DE LA SOCIÉTÉ — à compléter]</strong>,
          <strong> [ADRESSE — à compléter]</strong>.
          Contact DPO : <a href="mailto:privacy@pokerpeak.fr" className="text-blue-400 hover:underline">privacy@pokerpeak.fr</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">2. Données collectées</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Données de compte :</strong> adresse e-mail, nom d'utilisateur, mot de passe haché (bcrypt).</li>
          <li><strong>Données Google (si connexion OAuth) :</strong> adresse e-mail vérifiée et ID Google. Aucun mot de passe n'est stocké.</li>
          <li><strong>Données d'entraînement :</strong> résultats des exercices, séries, XP, temps de réponse — utilisés pour l'affichage de vos statistiques personnelles.</li>
          <li><strong>Données techniques :</strong> logs d'accès serveur (adresse IP, user-agent) conservés temporairement à des fins de sécurité.</li>
        </ul>
        <p className="text-sm">Nous ne collectons pas de données de paiement directement — celles-ci sont traitées par notre prestataire de paiement (Stripe).</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">3. Finalités du traitement</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Fourniture et personnalisation du service de formation.</li>
          <li>Gestion des comptes utilisateurs et authentification.</li>
          <li>Affichage de vos statistiques et du classement.</li>
          <li>Prévention de la fraude et sécurité du service.</li>
          <li>Communication relative à votre abonnement (emails transactionnels).</li>
        </ul>
        <p className="text-sm">Base légale : exécution du contrat (art. 6.1.b RGPD) et intérêts légitimes (sécurité).</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">4. Conservation des données</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Données de compte : conservées pendant la durée de vie du compte, puis supprimées dans les 30 jours suivant la clôture.</li>
          <li>Données d'entraînement : conservées pendant la durée de vie du compte.</li>
          <li>Logs serveur : 30 jours maximum.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">5. Transferts hors UE</h2>
        <p className="text-sm">
          Le service est hébergé sur <strong>Render</strong> (infrastructure AWS, région UE Frankfurt pour l'API)
          et <strong>Vercel</strong> (frontend, CDN mondial). La base de données est hébergée sur
          <strong> Neon</strong> (AWS us-east-1). Ces prestataires sont soumis aux Clauses Contractuelles
          Types (CCT) de la Commission européenne pour les transferts hors UE.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">6. Cookies et stockage local</h2>
        <p className="text-sm">
          PokerPeak utilise uniquement des cookies et données de stockage local <strong>strictement nécessaires</strong>
          au fonctionnement du service :
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Jeton d'authentification JWT (localStorage) — maintient votre session.</li>
          <li>Préférences d'affichage (thème, langue, zoom) — localStorage.</li>
          <li>État de progression de l'onboarding — localStorage.</li>
        </ul>
        <p className="text-sm">
          Ces données ne sont pas partagées avec des tiers. Aucun cookie publicitaire ou de traçage
          n'est utilisé à ce jour.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">7. Vos droits (RGPD)</h2>
        <p className="text-sm">Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Accès</strong> — obtenir une copie de vos données.</li>
          <li><strong>Rectification</strong> — corriger des données inexactes.</li>
          <li><strong>Effacement</strong> — supprimer votre compte et vos données depuis la page Profil.</li>
          <li><strong>Portabilité</strong> — recevoir vos données dans un format structuré.</li>
          <li><strong>Opposition / Limitation</strong> — vous opposer à certains traitements.</li>
        </ul>
        <p className="text-sm">
          Pour exercer ces droits : <a href="mailto:privacy@pokerpeak.fr" className="text-blue-400 hover:underline">privacy@pokerpeak.fr</a>.
          Vous pouvez également introduire une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">CNIL</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">8. Contact</h2>
        <p className="text-sm">
          Pour toute question relative à cette politique :{' '}
          <a href="mailto:privacy@pokerpeak.fr" className="text-blue-400 hover:underline">privacy@pokerpeak.fr</a>.
        </p>
      </section>
    </div>
  );
}
