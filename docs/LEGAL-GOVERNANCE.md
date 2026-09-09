# Gouvernance juridique

## Règle d'or
Le produit ne doit jamais présenter comme certaine une conclusion qui dépend d'une information absente, ambiguë ou d'un régime spécial non modélisé.

Une donnée inconnue doit rester inconnue. Lorsque le modèle d'entrée prévoit un booléen tri-state, `null` ne doit jamais être transformé silencieusement en `false` ou en `true` par la validation, l'API ou l'UI.

## `review_required`
`review_required` est une sortie fonctionnelle du moteur, pas une erreur technique.

Elle doit notamment être utilisée lorsque :
- une information juridiquement déterminante manque ;
- un intitulé de titre est trop générique pour identifier le fondement exact ;
- un régime spécial n'est pas encore modélisé ;
- plusieurs qualifications sont possibles sans donnée suffisante ;
- le parcours juridique complet dépasse le périmètre actuellement codé.

La validation Zod doit rejeter les entrées structurellement invalides, mais ne doit pas empêcher le moteur de traiter une incertitude qui peut être représentée explicitement.

## Cycle de vie d'une règle
Chaque règle contient :
- un identifiant stable ;
- une version ;
- une date d'effet ;
- une date de dernière revue ;
- des sources officielles ;
- une priorité ;
- des tests.

Toute modification juridique doit passer par :
1. vérification de la source officielle en vigueur ;
2. revue juridique ;
3. mise à jour du registre des sources ;
4. mise à jour de la version de règle si son comportement juridique change ;
5. tests de non-régression, dont au moins un cas positif, négatif et frontière lorsqu'ils existent ;
6. changelog / documentation ;
7. publication datée.

## Traçabilité des assessments
Le résultat conserve `appliedRules`, avec l'identifiant, la version, les dates et les sources de chaque règle appliquée.

Lorsqu'un assessment est sauvegardé, l'application conserve :
- l'input validé ;
- le résultat complet ;
- les versions des règles appliquées ;
- la date de génération.

Cette traçabilité est nécessaire pour pouvoir expliquer ultérieurement pourquoi un verdict a été produit avec le corpus juridique disponible à cet instant.

## Séparation des responsabilités
- Le domaine contient les décisions juridiques déterministes.
- La couche application orchestre l'analyse et la sauvegarde.
- L'infrastructure implémente la persistence et les accès externes.
- L'UI collecte et affiche les données mais ne tranche jamais une règle juridique.

## IA
Un modèle peut extraire d'un titre : type, mention, date d'expiration, nationalité ou autres champs documentaires. Il ne doit pas être la source de vérité du verdict.

Les champs extraits doivent être confirmables par l'utilisateur avant leur injection dans le moteur déterministe. Une extraction incertaine doit rester incertaine.

## Sources
Les règles doivent privilégier les sources officielles correspondant directement au point modélisé : Légifrance pour les textes normatifs, Service-Public ou les ministères pour l'explication opérationnelle lorsque cela complète utilement le texte.

Aucune règle nouvelle ne doit être ajoutée uniquement à partir d'une source secondaire non officielle lorsque la source primaire est disponible.

## Disclaimer
Ce prototype fournit une information et une aide à la conformité. Son positionnement commercial et les modalités d'accompagnement juridique doivent être validés au regard de la loi du 31 décembre 1971 et des règles professionnelles applicables.
