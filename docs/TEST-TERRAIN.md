# Test terrain — Décompte BTP

Objectif : vérifier avec 1 ou 2 entrepreneurs, sur un vrai marché, que l'application
produit les mêmes chiffres que leurs documents Excel, et qu'elle est utilisable sur chantier.

## 1. Prérequis avant le test

- [ ] Étape 5 complétée : pré-remplissage N+1 affiché, test hors ligne en mode avion réussi

- [ ] Sauvegarde .json disponible et testée (export puis import sur un second appareil)
- [ ] Fichiers Excel originaux du marché obtenus (métré, attachement, décompte, récap, certificat)

## 2. Comparaison chiffrée (à faire au bureau, avant le terrain)

Saisir un marché réel dans l'application, puis comparer ligne à ligne avec le fichier Excel.

| Contrôle | Attendu | Résultat | OK ? |
|---|---|---|---|
| Quantités cumulées de chaque article | identiques à l'Excel | | |
| Montant HT par article | identique (arrondi au millime) | | |
| Total HTVA | identique | | |
| TVA 19 % et TTC | identiques | | |
| Retenue de garantie | identique (base à confirmer) | | |
| Reste à payer | identique | | |
| Montant en lettres | identique | | |

Tout écart est consigné ici avec son origine : arrondi, base de calcul, erreur de saisie ou erreur de l'Excel.

## 3. Scénarios sur le terrain

1. **Installation** : ouvrir le lien sur un téléphone, ajouter à l'écran d'accueil. Temps mesuré : ____
2. **Premier marché** : saisir l'entreprise, puis coller le bordereau depuis Excel. Temps mesuré : ____ (objectif : moins de 2 minutes)
3. **Métré d'un attachement** : saisir au moins 10 lignes dont 3 avec formule « P1 × 24 ». Noter les gestes inutiles ou les champs mal placés.
4. **Mode avion** : couper le réseau, créer un attachement, saisir, générer le PDF. Tout doit fonctionner.
5. **Validation** : valider l'attachement N°1, vérifier le verrou, puis exporter la sauvegarde.
6. **Attachement N°2** : vérifier que les quantités précédentes sont bien reprises.
7. **Restauration** : importer la sauvegarde sur un autre appareil et vérifier les chiffres.

## 4. Questions à poser aux entrepreneurs

- Quelles étapes de leur processus actuel ne sont pas dans l'application ?
- Quels champs sont inutiles, lesquels manquent ?
- Qui signe quoi, et sur quel document ? Le PDF est-il acceptable tel quel pour la signature ?
- Acceptent-ils une sauvegarde par fichier, ou exigent-ils une synchronisation ?
- Combien de temps gagnent-ils réellement par situation ?

## 5. Critères de sortie du test

- Chiffres identiques aux Excel sur tous les contrôles du tableau (§2), ou écarts expliqués.
- Au moins deux attachements validés de bout en bout hors ligne.
- Aucun bug bloquant pendant le test.
- Les deux entrepreneurs veulent continuer.

## 6. Journal des retours

| Date | Testeur | Constat | Gravité | Action |
|---|---|---|---|---|
| | | | | |
