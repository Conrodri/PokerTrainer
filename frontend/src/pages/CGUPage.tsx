export function CGUPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 text-gray-300 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Conditions Générales d'Utilisation</h1>
        <p className="text-xs text-gray-500">Dernière mise à jour : juin 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">1. Présentation du service</h2>
        <p>
          PokerPeak est une plateforme de formation au poker en ligne proposant des exercices interactifs
          (pré-flop, pot odds, équité, post-flop, etc.) à des fins exclusivement pédagogiques.
          Aucun jeu d'argent réel n'est proposé sur ce site.
        </p>
        <p>
          Le service est édité par <strong>[NOM DE LA SOCIÉTÉ — à compléter]</strong>,
          dont le siège social est situé <strong>[ADRESSE — à compléter]</strong>.
          Contact : <a href="mailto:contact@pokerpeak.fr" className="text-blue-400 hover:underline">contact@pokerpeak.fr</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">2. Accès au service</h2>
        <p>
          L'accès à PokerPeak est réservé aux personnes âgées d'au moins <strong>18 ans</strong>.
          En vous inscrivant, vous déclarez avoir atteint cet âge.
        </p>
        <p>
          Une partie des fonctionnalités est accessible gratuitement (avec un quota journalier pour
          certains modules). L'accès complet nécessite un abonnement Premium payant.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">3. Création de compte</h2>
        <p>
          Vous pouvez créer un compte avec une adresse e-mail et un mot de passe, ou via votre compte
          Google. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité
          réalisée depuis votre compte.
        </p>
        <p>
          PokerPeak se réserve le droit de suspendre ou supprimer tout compte en cas de violation des
          présentes CGU ou de comportement abusif (tentative de contournement des quotas, accès non
          autorisé, etc.).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">4. Abonnement Premium</h2>
        <p>
          L'abonnement Premium est un service payant donnant accès à l'intégralité des modules de
          formation. Le prix, la durée et les modalités de renouvellement sont précisés sur la page
          <a href="/premium" className="text-blue-400 hover:underline mx-1">Premium</a>.
        </p>
        <p>
          Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation
          de 14 jours ne s'applique pas aux contenus numériques dont l'exécution a commencé avec
          votre accord exprès. Vous pouvez résilier votre abonnement à tout moment ; la résiliation
          prend effet à la fin de la période en cours.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">5. Propriété intellectuelle</h2>
        <p>
          L'ensemble des contenus du site (textes, exercices, algorithmes, interfaces graphiques) est
          protégé par le droit d'auteur et appartient à PokerPeak ou à ses ayants droit. Toute
          reproduction, extraction ou utilisation commerciale sans autorisation écrite est interdite.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">6. Limitation de responsabilité</h2>
        <p>
          PokerPeak est un outil pédagogique. Les stratégies présentées sont basées sur des principes
          GTO (Game Theory Optimal) généraux et ne garantissent aucun résultat au jeu réel.
          PokerPeak ne saurait être tenu responsable des pertes financières liées à l'application
          des conseils proposés.
        </p>
        <p>
          Le service est fourni "en l'état". PokerPeak s'efforce d'assurer une disponibilité maximale
          mais ne garantit pas l'absence d'interruptions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">7. Modifications des CGU</h2>
        <p>
          PokerPeak se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
          seront informés de toute modification significative. La poursuite de l'utilisation du service
          après notification vaut acceptation des nouvelles conditions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">8. Droit applicable</h2>
        <p>
          Les présentes CGU sont régies par le droit français. Tout litige sera soumis aux tribunaux
          compétents du ressort de <strong>[VILLE — à compléter]</strong>.
        </p>
      </section>
    </div>
  );
}
