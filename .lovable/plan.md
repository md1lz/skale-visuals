# Refonte de l’espace client

## Résultat attendu
- Retirer entièrement le menu supérieur de l’espace client.
- Remplacer le fond plein écran par deux rangées de miniatures qui défilent lentement en sens opposés, avec un simple voile sombre.
- Refaire la carte centrale dans la direction « Apple Dark Minimalist » choisie : logo Skale, titre sur deux lignes, description, connexion/inscription, Google et récupération du mot de passe.
- Déplacer « Mot de passe oublié ? » juste sous le champ du mot de passe.
- Conserver une transition glissée fluide entre Connexion et Inscription.
- Ajouter dans « Gestion du site web » l’ajout, l’ordre et la suppression des images utilisées par les deux rangées.

## Comportement
- Les images administrées sont enregistrées avec les autres réglages du site et apparaissent sur app.skalevisuals.com.
- En l’absence d’images ajoutées, les visuels actuels servent de remplissage afin d’éviter un fond vide.
- Les animations ralentissent ou s’arrêtent si l’appareil demande moins de mouvements.
- L’affichage reste adapté aux petits écrans sans masquer le formulaire.

## Détails techniques
- Étendre les réglages existants avec deux listes d’images, limitées en taille et validées côté serveur.
- Réutiliser l’envoi d’images déjà sécurisé dans la gestion du site.
- Signer les images privées avant affichage public et dans l’aperçu administrateur.
- Ajouter des styles sémantiques dédiés à l’espace client et aux deux animations de défilement.
- Vérifier les états Connexion, Inscription et Mot de passe oublié sur ordinateur et mobile.
