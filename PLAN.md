# PLAN — MVP « Décompte BTP »

Application hors ligne (PWA) qui génère automatiquement **Attachement, Décompte provisoire,
Récapitulation et Certificat pour paiement** à partir de la seule saisie du **Métré**.

---

## 0. Objectif et principe

- **Problème** : les entrepreneurs recopient les mêmes valeurs dans 5 fichiers Excel
  (Métré → Attachement → Décompte → Récapitulation → Certificat). C'est lent et source d'erreurs
  (exemples réels : « Gestion 2025 » vs « Gestion 2026 », « 15/09/2028 » au lieu de 2026).
- **Principe** : *saisie unique*. On saisit une fois le bordereau du marché, puis à chaque
  situation uniquement le métré. Les 4 autres documents sont **calculés**, jamais saisis.
- **Contraintes** : 100 % hors ligne, rapide sur téléphone d'entrée de gamme, utilisable sur
  n'importe quel appareil (téléphone, tablette, PC).

---

## 1. Périmètre

### Inclus dans le MVP
- [ ] Profil entreprise (nom, code TVA, banque, RIB), saisi une seule fois
- [ ] Création d'un marché + import du bordereau (Excel ou copier-coller) + contrôle du montant
- [ ] Bibliothèque de désignations avec autocomplétion
- [ ] Saisie du métré avec gabarits par unité et éléments types
- [ ] Calcul automatique : attachement, décompte, récapitulation, certificat
- [ ] Montant en toutes lettres (dinars / millimes)
- [ ] Validation + verrouillage d'un attachement, enchaînement vers l'attachement N+1
- [ ] Export PDF des 5 documents
- [ ] PWA installable, 100 % hors ligne
- [ ] Sauvegarde / restauration dans un fichier `.json`

### Hors MVP (versions suivantes)
- Synchronisation cloud, multi-utilisateurs (entrepreneur / architecte / ingénieur)
- OCR d'un bordereau photographié
- Avenants, prix nouveaux, révision des prix
- Avance forfaitaire et son amortissement (champ prévu à 0 dans le MVP)
- Export Excel des documents
- Emballage Play Store / App Store (Capacitor)

---

## 2. Stack technique

| Couche        | Choix                                   | Remarque                                              |
|---------------|-----------------------------------------|-------------------------------------------------------|
| Langage       | TypeScript (strict)                     |                                                       |
| UI            | Svelte 5 + SvelteKit `adapter-static`   | Mode SPA, aucun serveur                               |
| Style         | Tailwind CSS                            | Mobile-first                                          |
| Base locale   | Dexie 4 (IndexedDB)                     | Migrations versionnées                                |
| Hors ligne    | vite-plugin-pwa (Workbox)               | Précache **aussi** des modules chargés à la demande   |
| PDF           | pdfmake (chargé à la demande)           | Polices incluses dans le précache                     |
| Import Excel  | SheetJS (chargé à la demande)           |                                                       |
| Tests         | Vitest                                  | Couverture visée 100 % sur `core/`                    |

**Budgets de performance**
- JS initial ≤ 150 Ko gzip
- Ouverture ≤ 2 s sur téléphone moyen (Lighthouse mobile ≥ 90)
- Recalcul des 5 documents ≤ 50 ms pour 200 articles / 2 000 lignes de métré

---

## 3. Architecture

```
UI (routes Svelte)
   │
Services : import/ · pdf/ · sauvegarde/ · validation
   │
CORE : moteur de calcul (TS pur, 0 dépendance, 0 accès DB/UI)
   │
Données : Dexie + dépôts (repositories)
   │
Service Worker (précache complet)
```

Règle : `src/lib/core/` ne dépend de rien. Il reçoit des données et rend des résultats.

### Arborescence cible
```
src/
├── lib/
│   ├── core/
│   │   ├── nombres.ts         # millièmes / millimes, arrondis, parsing "179,250"
│   │   ├── gabarits.ts        # ml, m², m³, U, kg → champs + formule
│   │   ├── metre.ts
│   │   ├── attachement.ts
│   │   ├── decompte.ts
│   │   ├── recapitulation.ts
│   │   ├── certificat.ts
│   │   ├── enLettres.ts
│   │   └── controles.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── depots/
│   ├── import/  (excel.ts, collage.ts, colonnes.ts)
│   ├── pdf/     (commun.ts + un fichier par document)
│   └── sauvegarde/
├── routes/
│   ├── +page.svelte                       # liste des marchés
│   ├── parametres/
│   ├── marche/nouveau/
│   └── marche/[id]/
│       ├── +page.svelte                   # tableau de bord
│       ├── bordereau/
│       └── attachement/[n]/{metre,documents}/
tests/
└── marche-12-2025.test.ts                 # test de référence (dossier réel)
```

---

## 4. Modèle de données (Dexie)

```ts
entreprise    { id, nom, codeTVA, banque, rib, updatedAt }

marches       { id, numero, lot, intitule, maitreOuvrage, commissariat,
                dateApprobation, montantMarcheTTC, tauxTVA /*19*/, tauxRetenue /*5*/,
                gestion, statut /*brouillon|actif|clos*/, updatedAt }

articles      { id, marcheId, ordre, code, designation, unite, gabarit,
                qtePrevue, puHT, updatedAt }          // index [marcheId+code] unique

elementsTypes { id, marcheId, code, libelle, L?, l?, h?, updatedAt }

attachements  { id, marcheId, numero, dateArrete, statut /*brouillon|valide*/,
                snapshot?, updatedAt }               // index [marcheId+numero] unique

lignesMetre   { id, attachementId, articleId, ordre, libelle,
                nbr, L?, l?, h?, aDeduire?, elementTypeId?, updatedAt }

bibliotheque  { id, designation, unite, gabarit, dernierPU, nbUtilisations, updatedAt }
```

- Identifiants : **UUID** ; chaque table a un `updatedAt` (prépare la synchro future).
- On ne stocke que la saisie. Seul le `snapshot` (résultats figés à la validation) est dérivé.

---

## 5. Règles de calcul

**Représentation**
- Quantités et dimensions : entiers en **millièmes** (`179,250` → `179250`)
- Montants : entiers en **millimes** (`60,000 dt` → `60000`)
- Produits calculés en `BigInt`, arrondi au plus proche (0,5 → vers le haut) au millième

**Gabarits**

| Unité | Champs           | Formule              |
|-------|------------------|----------------------|
| ml    | Nbr, L           | Nbr × L              |
| m²    | Nbr, L, H        | Nbr × L × H          |
| m³    | Nbr, L, l, H     | Nbr × L × l × H      |
| U     | Nbr              | Nbr                  |
| kg    | Nbr, L, kg/ml    | Nbr × L × kg/ml      |

Chaque ligne : `total = arrondi(formule) − aDeduire`.

**Chaîne**
```
attachement : duMois[a]   = Σ lignes du métré de l'article a
              precedent[a] = snapshot(N−1).cumul[a]   (0 si N = 1)
              cumul[a]     = precedent[a] + duMois[a]
              ecart[a]     = cumul[a] − qtePrevue[a]  (> 0 « en plus », < 0 « en moins »)
decompte    : montant[a] = arrondi(cumul[a] × PU[a])
              HTVA = Σ montant ; TVA = arrondi(HTVA × 19 %) ; TTC = HTVA + TVA
recap       : retenue = arrondi(TTC × 5 %)   (1/20e)
              acomptesAnterieurs = Σ resteAPayer des certificats validés précédents
              resteAPayer = TTC − retenue − acomptesAnterieurs
certificat  : montants + enLettres(resteAPayer) + RIB + gestion + dates du marché
```

---

## 6. Jeu de test de référence — Marché N°12/2025 LOT 1 (Attachement N°1, 15/09/2026)

| Code | Désignation                         | U  | Qté prévue | PU HT     | Cumul    | Montant HT  |
|------|-------------------------------------|----|-----------:|----------:|---------:|------------:|
| A    | Démolition d'une clôture existante  | ml | 180,000    | 60,000    | 179,250  | 10 755,000  |
| B-1  | Fouille en puits                    | m³ | 70,000     | 50,000    | 65,086   | 3 254,300   |
| B-2  | Fouille en rigole                   | m³ | 15,000     | 50,000    | 5,355    | 267,750     |
| C-1  | Gros béton                          | m³ | 55,000     | 280,000   | 35,199   | 9 855,720   |
| C-2  | Béton de propreté                   | m³ | 4,000      | 300,000   | 1,935    | 580,500     |
| C-4  | Béton armé en fondation             | m³ | 23,000     | 1 150,000 | 13,011   | 14 962,650* |
| C-5  | Béton armé en élévation             | m³ | 13,000     | 1 150,000 | 4,780    | 5 497,000*  |
| D    | Mur en brique de 25                 | m² | 324,000    | 40,000    | 114,357  | 4 574,280   |
| E    | Enduit                              | m² | 760,000    | 24,000    | 313,423  | 7 522,152   |

Résultats attendus (selon le décompte papier) :
- Total HTVA **57 269,237** · TVA 19 % **10 881,155** · TTC **68 150,392**
- Retenue de garantie **3 407,520** · Reste à payer **64 742,872**
- En lettres : « Soixante-quatre mille sept cent quarante-deux dinars huit cent soixante-douze millimes »

\* **Écart détecté** : le décompte papier affiche C-4 = **14 962,190** et C-5 = **5 497,345**,
alors que `cumul affiché × PU` donne 14 962,650 et 5 497,000. Le total HTVA papier
(57 269,237) est cohérent avec les montants papier, mais **pas** avec `Σ cumul affiché × PU`
(qui donne **57 269,352**, soit 0,115 dt d'écart).
Explication probable : dans Excel, les quantités ne sont **pas arrondies** (≈ 13,0106 et ≈ 4,7803)
et seul l'affichage montre 3 décimales. L'arrondi au millième change donc le résultat.
**Décision à prendre (voir §8, question 1)** avant d'écrire le test de référence.

---

## 7. Plan de réalisation

### Étape 1 — Fondations et moteur de calcul
- [x] Initialiser SvelteKit + TS + vite-plugin-pwa + Vitest (Tailwind non ajouté)
- [x] `nombres.ts` : parsing avec virgule, format `64 742,872`, arrondis BigInt
- [x] `gabarits.ts`, `metre.ts`, `attachement.ts`, `decompte.ts`, `recapitulation.ts`
- [x] `enLettres.ts` (0 → 999 999 999 dinars + millimes, accords : « quatre-vingts », « cent(s) », « mille »)
- [x] `controles.ts`
- [x] Test de référence Marché 12/2025 au vert (1 écart C-4/C-5 marqué skip, voir §8)
- **Fini quand** : tous les tests passent, couverture 100 % sur `core/`

### Étape 2 — Données, marché et bordereau
- [x] Schéma Dexie + dépôts + `storage.persist()`
- [x] Écran profil entreprise
- [x] Écran nouveau marché (à tester dans le navigateur)
- [x] Import bordereau : collage, détection des colonnes, import Excel (SheetJS à la demande), écran de vérification
- [x] Contrôle « Σ qté prévue × PU × 1,19 = montant du marché » (affiché à l'import)
- [x] Bibliothèque alimentée automatiquement à chaque import
- **Fini quand** : le bordereau du marché 12/2025 est importé en moins de 2 minutes

### Étape 3 — Saisie du métré
- [x] Liste des articles avec avancement (total du mois par article)
- [x] Saisie par ligne : champs du gabarit, `inputmode="decimal"`, total en direct
- [x] Dupliquer une ligne, supprimer [ ] réordonner (reporté)
- [x] Éléments types (P1, S1…) : création + utilisation « P1 × 24 »
- **Fini quand** : saisie fluide sur un téléphone Android d'entrée de gamme

### Étape 4 — Documents et PDF
- [ ] Aperçu à l'écran : attachement, décompte, récap et certificat (4 documents ; le métré n'a pas encore de document séparé)
- [ ] Modèles pdfmake conformes aux documents actuels (mise en page basique : la mise en forme exacte du papier reste à faire)
- [x] Export d'un seul PDF regroupant les documents d'une situation
- **Fini quand** : PDF fidèles aux modèles papier, générés hors ligne

### Étape 5 — Validation, enchaînement, sauvegarde
- [x] Contrôles avant validation (dates, dépassements, montant) (testés)
- [x] Validation → snapshot figé, lignes verrouillées, ordre N+1 imposé ; N+1 pré-rempli : le précédent est calculé mais pas encore affiché dans l’écran de saisie [ ]
- [x] Export / import `.json` versionné + rappel de sauvegarde après validation
- [ ] Vérification hors ligne complète (mode avion : création, saisie, PDF) : non testée
- **Fini quand** : 2 attachements successifs produits entièrement hors ligne

### Étape 6 — Test terrain (checklist : docs/TEST-TERRAIN.md)
- [ ] Déploiement (hébergement statique : Netlify, Cloudflare Pages ou GitHub Pages)
- [ ] Test avec 1 ou 2 entrepreneurs sur un marché réel
- [ ] Corrections et ajustements

---

## 8. Questions ouvertes (à régler avant ou pendant l'étape 1)

1. **Règle d'arrondi** : arrondir les quantités au millième avant de multiplier par le PU
   (ce qui est imprimé = ce qui est payé, recommandé), ou garder la précision complète comme Excel ?
   Comparer sur 2 ou 3 dossiers Excel réels.
2. **Montants C-4 / C-5** du décompte N°1 (voir §6) : 0,115 dt d'écart entre `cumul affiché × PU`
   et le document. Vérifier les quantités exactes dans le fichier Excel original.
3. **Montant du marché** : 138 493,000 dt TTC (certificat) ≠ 124 057,500 dt TTC calculé sur les 9 articles. Le bordereau complet contient-il d'autres articles ?
4. **Retenue de garantie** : toujours 5 % du TTC ? Plafond ? Variable selon le marché ?
5. **« Gestion »** : année budgétaire du paiement (2026) ou du marché (2025) ? Le certificat et le décompte se contredisent.
6. **Modèles PDF** : obtenir les fichiers Excel originaux pour reproduire la mise en page exacte.
7. **Plusieurs lots** dans un même marché (LOT 1 génie civil, LOT 2…) : à gérer dès le MVP ?

---

## 9. Données nécessaires de la part du client

- [ ] Fichiers Excel originaux des 5 documents (Marché 12/2025)
- [ ] Bordereau des prix complet (BPU / DQE) du marché
- [ ] 1 ou 2 autres dossiers réels pour valider les règles d'arrondi
