# Changelog

## 2026-09-09 — Parcours « Rompre »

- ajout d'un questionnaire dédié aux situations où une rupture est envisagée à la suite d'une perte ou d'une incertitude sur le droit au travail ;
- distinction explicite entre l'interdiction éventuelle de maintenir le salarié au travail et la décision de rupture, qui reste soumise à une validation de droit social ;
- prise en compte de l'expiration du document, d'une activité non couverte, des documents temporaires et du périmètre de l'autorisation actuelle ;
- branche spéciale pour les salariés protégés avec blocage de toute conclusion automatique ;
- signalement des droits à calculer lorsqu'une période de travail sans autorisation est déclarée, notamment au regard de l'article L. 8252-2 ;
- conservation de `review_required` pour toute décision de rupture afin de ne pas automatiser un licenciement à partir du seul moteur de droit au travail ;
- ajout de sources Légifrance et Ministère du Travail dédiées ;
- tests moteur et validation dédiés.

## 2026-09-09 — Parcours « Peut-il travailler ? »

- ajout d'un questionnaire dédié au contrôle du droit au travail dans la situation actuelle ;
- contrôle de la validité du document et, pour les titres salarié / travailleur temporaire, du périmètre déclaré de l'autorisation conservée ;
- traitement du titre étudiant avec plafond annuel de 964 heures, apprentissage et autorisation correspondant à l'activité actuelle lorsque nécessaire ;
- maintien en `review_required` des documents provisoires, catégories génériques et régimes spéciaux insuffisamment qualifiés ;
- aucune formalité propre à une nouvelle embauche n'est déclenchée artificiellement dans ce parcours ;
- tests moteur et validation dédiés ;
- compatibilité maintenue avec le mode serveur et l'export statique GitHub Pages.

## 2026-09-09 — Parcours « Modifier »

- ajout d'un questionnaire dédié aux modifications de contrat, employeur, poste, région, rémunération et temps de travail ;
- distinction entre droit au travail actuel et possibilité d'appliquer la modification ;
- nouveau contrat traité séparément des modifications internes ;
- contrôle du périmètre de l'autorisation existante pour les changements sans nouveau contrat ;
- conservation de `review_required` lorsqu'une information juridiquement déterminante manque ;
- tests moteur et validation dédiés ;
- compatibilité maintenue avec le mode serveur et l'export statique GitHub Pages.

## 2026-09-09 — Parcours « Renouveler »

- distinction entre titre renouvelé et justificatif d'instruction ;
- prise en charge des attestations, récépissés et nouveaux titres dans le périmètre modélisé ;
- traitement fail-closed des justificatifs insuffisamment qualifiés.

## 2026-09-09 — Parcours « Recruter »

- questionnaire adaptatif ;
- contrôles liés à l'autorisation de travail, à la situation de l'emploi et aux formalités employeur ;
- traitement spécifique du titre étudiant dans le périmètre modélisé.
