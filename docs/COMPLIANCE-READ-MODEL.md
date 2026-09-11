# Read-model de conformité

Le read-model de conformité agrège les données persistées nécessaires au tableau de bord serveur sans fabriquer de verdict juridique global.

## Sources agrégées

Pour l'organisation de l'acteur courant, la vue charge en parallèle :
- les salariés ;
- les documents salariés ;
- les assessments ;
- les tâches de conformité.

L'agrégation s'effectue ensuite dans la couche application. Chaque repository reste tenant-scoped et la couche application exige les permissions de lecture correspondantes.

## Documents actuels

Seuls les documents dont `isCurrent = true` peuvent produire une échéance documentaire dans cette vue.

Un document historique, même expiré, ne doit donc pas générer une alerte courante. L'omission de `isCurrent` lors de la création vaut `false` afin de rester fail-closed.

## Assessments

Les assessments peuvent désormais porter un `employeeId` explicite. La vue retient uniquement le dernier assessment réellement rattaché au salarié.

Aucun rapprochement n'est effectué par nom, nationalité, poste ou autre heuristique.

## États opérationnels

La vue expose quatre niveaux :
- `urgent` : signal fort et vérifiable, par exemple document actuel expiré, dernier assessment `blocked`, ou tâche critique en retard ;
- `attention` : document actuel expirant dans les 90 jours, tâche ouverte nécessitant une attention, ou dernier assessment `conditional` / `review_required` ;
- `no_open_signal` : un assessment réel existe et aucun signal opérationnel ouvert n'a été détecté ;
- `unknown` : aucun assessment salarié n'est disponible et aucun signal plus fort ne permet de qualifier la situation.

`no_open_signal` signifie uniquement qu'aucun signal ouvert n'est présent dans les données disponibles. Ce n'est pas un certificat de conformité juridique.

## Compteurs

La vue expose notamment :
- nombre de salariés suivis ;
- tâches ouvertes ;
- tâches critiques ouvertes ;
- tâches ouvertes en retard ;
- documents actuels expirés ;
- documents actuels expirant dans les 90 jours ;
- salariés sans assessment rattaché.

Aucun score de conformité synthétique n'est calculé.

## Priorités

Les priorités sont construites uniquement à partir :
- des tâches ouvertes possédant une échéance ;
- des documents actuels expirés ou expirant dans les 90 jours.

Elles sont ordonnées par urgence puis par date d'échéance. La vue est plafonnée aux 20 premières priorités.

## API

`GET /api/compliance/overview` retourne `{ overview }` en environnement serveur.

Comme les autres routes API, cette route est supprimée lors de l'export statique GitHub Pages.

## Limites

Le read-model ne remplace ni le moteur juridique ni une revue humaine. Il ne déduit pas qu'un salarié est conforme à partir de l'absence de tâche, d'un document manquant ou d'un historique incomplet.
