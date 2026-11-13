/* Registre du cours. Pour ajouter une séance ou un fichier : modifier uniquement ce fichier,
   puis republier. Les chemins sont relatifs à la racine du site.
   - diaporama : page du diaporama de la séance
   - support   : page HTML « support de cours » (null tant qu'elle n'existe pas)
   - fichiers  : fichiers téléchargeables { nom, chemin, type }  (ex. { nom: "Énoncé du TP 1", chemin: "files/s1/tp1.pdf", type: "PDF" })
   - statut    : "disponible" | "bientot" */
window.COURSE = {
  titre: "Conception et Analyse des Algorithmes",
  module: "Module M111 · Algorithmique et Programmation · AP 3",
  ecole: "INPT",
  annee: "2026–2027",
  enseignant: "Yassine Ben-Aboud",
  seances: [
    {
      n: 1, titre: "Complexité des algorithmes", duree: "3 h · cours, TD et TP", statut: "disponible",
      resume: "Compter les opérations, familles de croissance, notations O, Ω, Θ, analyse de boucles, récursivité et théorème maître.",
      diaporama: "s1/slides.html", support: null, fichiers: []
    },
    {
      n: 2, titre: "Structures linéaires", duree: "3 h", statut: "bientot",
      resume: "Rappel de la mémoire en C, listes chaînées, piles et files.",
      diaporama: null, support: null, fichiers: []
    },
    {
      n: 3, titre: "Arbres, tas et files de priorité", duree: "3 h", statut: "bientot",
      resume: "Arbres binaires, arbres binaires de recherche, tas et file de priorité.",
      diaporama: null, support: null, fichiers: []
    },
    {
      n: 4, titre: "Hachage et diviser pour régner", duree: "3 h", statut: "bientot",
      resume: "Tables de hachage, tri fusion, tri rapide.",
      diaporama: null, support: null, fichiers: []
    },
    {
      n: 5, titre: "Glouton et programmation dynamique", duree: "3 h", statut: "bientot",
      resume: "Choix local, sous-problèmes qui se chevauchent, mémoïsation et tabulation.",
      diaporama: null, support: null, fichiers: []
    },
    {
      n: 6, titre: "Graphes", duree: "3 h", statut: "bientot",
      resume: "Représentations, parcours en largeur et en profondeur, Dijkstra, Kruskal.",
      diaporama: null, support: null, fichiers: []
    }
  ]
};
