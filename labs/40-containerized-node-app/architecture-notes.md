**1**

Dans Kubernetes, l'isolation se passe principalement à deux niveaux logiques :

Le Pod : C'est la plus petite unité. L'isolation (réseau et stockage) se fait au niveau du Pod. Tous les conteneurs à l'intérieur d'un même Pod partagent la même IP et les mêmes volumes, mais ils sont isolés des autres Pods.

Le Namespace : C'est une isolation de "groupe". Kubernetes utilise les Namespaces pour diviser un cluster physique en plusieurs clusters virtuels. Cela permet d'isoler les ressources (quotas de CPU/RAM) et les accès (RBAC) entre deux équipes ou deux projets

**2**

Le concept clé ici est le "Self-healing" (l'auto-guérison). Voici ce qui redémarre tout seul :

Les Conteneurs : Si un processus crash à l'intérieur d'un Pod, le kubelet (l'agent sur le nœud) le redémarre immédiatement.

Les Pods : Si un Pod devient "Unhealthy" (ne répond plus aux tests de santé ou Liveness Probes), Kubernetes le tue et en recrée un tout neuf.

Les Répliques : Si tu as configuré un Deployment avec 3 répliques et qu'un serveur (nœud) tombe en panne, Kubernetes va automatiquement recréer les Pods manquants sur les serveurs qui restent allumés pour maintenir ton quota de 3.


**3**


Même si on l'appelle "l'OS du Cloud", Kubernetes s'arrête là où commence la responsabilité de l'infrastructure physique ou du code pur :

Le provisionnement des Nœuds (Servers) : K8s ne va pas installer Linux tout seul sur une machine vierge ou commander un serveur chez Dell. Il a besoin que le système d'exploitation soit déjà là avec un runtime (comme containerd) pour fonctionner.

La persistence des données (hors volume) : Si tu supprimes un volume sans backup, K8s ne "ressuscite" pas tes données. Il gère l'attachement du disque, pas le contenu.

Le filtrage réseau externe au Cluster : Il ne gère pas ton pare-feu (Firewall) d'entreprise ou tes règles de sécurité au niveau du fournisseur Cloud (Security Groups AWS par exemple).

L'optimisation du code : Si ton application consomme 8 Go de RAM à cause d'une fuite mémoire, Kubernetes va simplement tuer le Pod quand il dépasse la limite, il ne réglera pas la fuite dans ton code.

**4**

On préfère une machine virtuelle au conteneur lorsque l'isolation matérielle est une priorité absolue. Puisque chaque VM dispose de son propre noyau (kernel), elle offre une barrière de sécurité plus robuste contre les attaques par élévation de privilèges qui pourraient compromettre l'hôte. Les VM sont également indispensables lorsqu'il est nécessaire d'exécuter un système d'exploitation spécifique (comme une version ancienne de Windows ou une distribution Linux avec un noyau particulier) que le système hôte ne peut pas supporter nativement. Enfin, pour des applications monolithiques très gourmandes en ressources ou des bases de données critiques nécessitant des performances d'entrée/sortie (I/O) garanties sans interférence, la VM reste la solution de référence.

**5**

L'association des machines virtuelles et des conteneurs constitue la norme dans les infrastructures de Cloud modernes. Dans ce schéma, on déploie une ou plusieurs VM robustes pour servir de nœuds (nodes) de calcul, et l'on fait s'exécuter les conteneurs à l'intérieur de celles-ci. Cette approche permet de bénéficier de la sécurité et de la gestion simplifiée de l'infrastructure (fournie par la VM) tout en profitant de l'agilité, de la rapidité de déploiement et de la portabilité des applications (fournies par les conteneurs). Cela permet également de segmenter logiquement un cluster de serveurs physiques en plusieurs environnements isolés et facilement redimensionnables.

**6**

Le changement principal est l'augmentation du nombre d'unités d'exécution. Concrètement, Kubernetes crée de nouveaux Pods basés sur le même modèle de conteneur. Au niveau du cluster, le Scheduler doit trouver des nœuds disposant de suffisamment de ressources (CPU/RAM) pour accueillir ces nouvelles répliques.

Lors de vos tests via le port-forward, vous remarquerez que l'identifiant du Pod (souvent visible dans les logs ou le nom d'hôte affiché sur la page) change d'une requête à l'autre. C'est le signe que le trafic est réparti entre les différentes instances pour équilibrer la charge.

**7**

Malgré l'augmentation du nombre de Pods, plusieurs éléments restent immuables pour garantir la stabilité de l'application :

L'objet Deployment : Sa configuration d'origine (image utilisée, limites de ressources, variables d'environnement) demeure identique ; seul le champ replicas est mis à jour.

Le Service (DNS/IP Cluster) : L'adresse IP virtuelle du Service et son nom DNS ne changent pas. Le Service continue de servir de point d'entrée unique et se charge de rediriger le trafic vers l'un des trois Pods disponibles de manière transparente.

La définition du Pod : Chaque nouvelle réplique est une copie conforme des autres. Elles exécutent exactement le même code et possèdent la même configuration logicielle.

La persistance (si non gérée) : Si l'application stocke des données localement dans le conteneur, ces données ne sont pas partagées entre les répliques. Chaque Pod possède son propre système de fichiers éphémère.

**8**

C'est le ReplicaSet (piloté par le Deployment). Son rôle est de surveiller en permanence le nombre de Pods actifs et de donner l'ordre à l'API Server d'en créer un nouveau si l'un d'eux disparaît.

**9**

À cause du principe de l'état désiré (Desired State). Kubernetes compare sans cesse la réalité du cluster avec votre configuration. Si vous avez demandé 3 répliques, le système fera tout pour maintenir ce chiffre exact, peu importe la cause de la suppression.

**10**

Le Control Plane détecterait que le nœud ne répond plus (état NotReady). Après un court délai, le Scheduler replanifierait automatiquement tous les Pods qui se trouvaient sur ce nœud vers les autres serveurs sains du cluster pour garantir la continuité du service.

**11**

Requests (Requêtes) : C'est le minimum garanti. Kubernetes utilise cette valeur pour choisir un nœud qui a assez de place. Si vous demandez 128Mi, le scheduler ne placera le Pod que sur un serveur disposant de cet espace libre.

Limits (Limites) : C'est le plafond maximum. Le Pod ne pourra jamais dépasser cette valeur. Si l'application tente d'utiliser plus de RAM que la limite (256Mi), elle sera arrêtée par le système (OOMKilled). Pour le CPU, elle sera simplement bridée (Throttling).

**12**

Dans un cluster partagé par plusieurs équipes ou projets, ces contraintes sont vitales pour deux raisons :

Éviter le phénomène du "Voisin bruyant" (Noisy Neighbor) : Sans limites, une seule application avec une fuite mémoire pourrait consommer toute la RAM du serveur et faire planter toutes les autres applications voisines.

Optimiser le placement (Bin Packing) : Les requêtes permettent à Kubernetes de remplir les serveurs intelligemment. Cela évite de surcharger un nœud alors qu'un autre est vide, garantissant ainsi une performance stable pour chaque locataire du cluster.

**13**

Sous K3s, on trouve un système d'exploitation Linux (souvent léger comme Ubuntu Core ou Alpine) et un Container Runtime. Par défaut, K3s utilise containerd. C'est ce logiciel qui gère le cycle de vie des conteneurs (exécution, arrêt, isolation) en utilisant les fonctionnalités du noyau Linux (Namespaces et Cgroups). Contrairement au Kubernetes standard, K3s regroupe tous les composants (API, Scheduler, etc.) dans un seul binaire pour consommer moins de RAM.

**14**

Kubernetes et la virtualisation sont complémentaires. La virtualisation (VM) segmente le matériel physique en serveurs virtuels isolés. Kubernetes, lui, orchestre des applications au-dessus de ces serveurs (qu'ils soient physiques ou virtuels). Si Kubernetes permet de se passer de VM dans certains cas (Bare Metal), la plupart des entreprises gardent les VM pour leur sécurité renforcée et leur facilité de gestion côté infrastructure.

**15**

Chez un fournisseur comme AWS (EKS), Google (GKE) ou Azure (AKS), vos nœuds sont presque toujours des Instances de Machines Virtuelles (ex: instances EC2). Le fournisseur gère une immense flotte de serveurs physiques, les découpe via un hyperviseur, et vous livre des VM sur lesquelles Kubernetes est pré-installé.

**16**

Ce qui tourne dans Kubernetes (Pods/Deployments) :
Les Microservices : Le code de votre application (Frontend, API, Backend).

L'Ingress Controller : Pour gérer le routage du trafic HTTP/HTTPS entrant (Nginx ou Traefik).

Le Monitoring & Logging : Les agents de collecte (Prometheus exporters, Fluentd) et les tableaux de bord.

Les outils de CI/CD : Les "Runners" ou "Agents" qui exécutent vos tests et déploiements.

**17**

Ce qui tourne dans des VMs (Nœuds du cluster) :
Le Plane de Contrôle (Control Plane) : Les composants maîtres de Kubernetes (API Server, Scheduler, etcd).

Les Nœuds de Travail (Worker Nodes) : Les machines virtuelles qui hébergent le runtime (containerd) et font tourner vos Pods.

Les Bastion Hosts : Des VMs sécurisées pour permettre aux administrateurs d'accéder au cluster via SSH.

**18**

Ce qui tourne en dehors du cluster :
La Base de Données (DBaaS) : Pour la production, on préfère souvent une base de données managée (ex: AWS RDS, Cloud SQL) hors du cluster pour une meilleure stabilité et des sauvegardes simplifiées.

Le Load Balancer Cloud : Le point d'entrée IP externe qui distribue le trafic vers les nœuds du cluster.

Le Registre d'Images (Registry) : Là où sont stockées vos images Docker (Docker Hub, GitHub Container Registry).

Le Stockage Objet : Pour les backups longue durée et les fichiers statiques

**19**

Pourquoi est-ce préférable à une configuration en texte brut ?
Séparation des responsabilités : Le développeur définit comment l'application utilise la variable, mais seul l'administrateur (ou le système de CI/CD) connaît la valeur réelle.

Sécurité et Traçabilité : Contrairement aux valeurs en dur dans un fichier YAML stocké sur Git, les Secrets permettent de limiter l'accès aux données sensibles via le RBAC (Role-Based Access Control) de Kubernetes.

Cycle de vie indépendant : Vous pouvez mettre à jour un mot de passe dans le Secret sans avoir à modifier ou à reconstruire l'image Docker de votre application.

**20**

Un Secret est-il chiffré par défaut ?
Non. Par défaut, les Secrets Kubernetes sont uniquement encodés en base64. L'encodage n'est pas du chiffrement ; n'importe qui ayant accès à l'API Kubernetes ou au fichier peut retrouver la valeur originale instantanément.

Où sont-ils stockés ?
Ils sont stockés dans etcd, la base de données clé-valeur du cluster.

Au repos : Dans une installation standard, ils ne sont pas chiffrés sur le disque de l'etcd (sauf si vous activez explicitement le EncryptionConfiguration).

En transit : Ils sont protégés par TLS lors des échanges entre les composants du cluster.

**21**

Ce qui a changé dans le cluster
Les Pods : De nouveaux Pods ont été créés avec de nouveaux identifiants (le hash après quote-app-). Les anciens Pods ont été terminés et supprimés.

Le ReplicaSet : Un nouveau ReplicaSet a été généré pour correspondre à la révision actuelle (Revision 5). L'ancien ReplicaSet est conservé mais mis à l'échelle à 0.

Les Adresses IP : Comme on le voit avec -o wide, chaque nouveau Pod a reçu une nouvelle adresse IP interne au cluster.

**22**

Ce qui est resté identique
Le Service : Le point d'entrée (nom DNS et IP de service) n'a pas bougé. Il a continué d'orienter le trafic de manière transparente pendant la transition.

Le Nom du Deployment : L'objet logique quote-app reste le même.

Le Nombre de répliques : Le cluster a maintenu le quota de 3 Pods Running comme demandé.

**23**

Comment Kubernetes décide de créer ou supprimer les Pods ?
Kubernetes utilise par défaut la stratégie RollingUpdate :

Création progressive : Il lance un nouveau Pod (vNext).

Vérification de santé : Il attend que le nouveau Pod soit READY (grâce aux Readiness Probes).

Suppression progressive : Une fois le nouveau Pod opérationnel, il termine un ancien Pod (vCurrent).

Contrôle du débit : Ce cycle se répète jusqu'à ce que tous les Pods soient mis à jour. Cela garantit qu'il y a toujours assez de Pods actifs pour répondre aux utilisateurs, évitant ainsi toute interruption de service (Zero Downtime).

**24**

D'après ce que j'observe dans ton kubectl describe, c'est le processus interne du conteneur qui a lâché. Je vois un Exit Code: 255 dans la section Last State. Cela signifie que ton application a démarré, mais qu'elle a rencontré une erreur fatale qui l'a forcée à s'arrêter brusquement. Kubernetes l'a ensuite redémarrée automatiquement (d'où le Restart Count: 1), mais si l'erreur persiste, le déploiement restera bloqué.

**25**

Le signal le plus flagrant pour moi a été le Restart Count: 1 combiné au Last State: Terminated. En temps normal, un Pod en bonne santé ne doit pas avoir de "Last State" (il reste en "Started") et son compteur de redémarrages doit rester à 0. Si je vois ces chiffres bouger, je sais immédiatement que l'application est instable.

**26**

Si j'étais face à ce problème sur un vrai serveur, j'irais tout de suite consulter les logs du conteneur précédent avec la commande kubectl logs <nom-du-pod> Puisque le conteneur a redémarré, les logs actuels sont peut-être vides. Je vérifierais aussi si les ressources (CPU/RAM) sont suffisantes, car une limite trop basse peut tuer un processus au démarrage.

**27**

J'ai constaté que le rollback a modifié l'état désiré du Deployment. Concrètement, Kubernetes a repris l'ancienne définition du Pod (celle de la révision stable précédente) et a relancé un cycle de mise à jour. Les Pods qui étaient en échec ou instables ont été supprimés et remplacés par des Pods utilisant l'image et la configuration qui fonctionnaient auparavant. Le ReplicaSet actif a lui aussi changé : l'ancien est redevenu celui avec 3 répliques, tandis que celui de la version défectueuse est retombé à 0.

**28**

J'ai remarqué que certains éléments restent totalement immobiles malgré le retour en arrière. Le Service (l'IP et le nom DNS de l'appli) n'a pas bougé, ce qui a permis aux utilisateurs de retrouver l'accès sans changer d'adresse. De plus, les Secrets et les ConfigMaps ne reviennent pas automatiquement à leur état précédent lors d'un rollout undo ; si j'avais modifié une valeur dans un Secret, le rollback continuerait d'utiliser la nouvelle valeur, à moins que je ne rétablisse aussi manuellement le Secret. Enfin, les données éventuellement écrites dans la base de données pendant la phase d'échec ne sont pas effacées.

**29-31**

Que fait maxSurge ?
Je l'utilise pour définir combien de nouveaux Pods je m'autorise à créer au-delà du nombre prévu. Avec maxSurge: 1 et 1 réplique, je permets à Kubernetes de lancer un deuxième Pod (le nouveau) avant de couper le premier.

Que fait maxUnavailable ?
Je m'en sers pour garantir qu'aucun Pod ne manque à l'appel. En le réglant à 0, j'interdis à Kubernetes de supprimer l'ancien Pod tant que le nouveau n'est pas totalement opérationnel.

Pourquoi choisir 0 pour maxUnavailable ?
Je fais ce choix pour éviter toute interruption de service (Zero Downtime). Si je n'ai qu'une seule réplique, mettre maxUnavailable: 1 couperait mon site web pendant quelques secondes le temps que le nouveau Pod démarre. Avec 0, je m'assure qu'il y a toujours au moins une version de mon application en train de répondre aux utilisateurs.