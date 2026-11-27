/* Registre du cours. Pour ajouter une séance ou un fichier : modifier uniquement ce fichier,
   puis republier. Les chemins sont relatifs à la racine du site.
   - diaporama : page du diaporama de la séance
   - support   : page HTML « support de cours » (null tant qu'elle n'existe pas)
   - tp        : page HTML du sujet de TP (null tant qu'elle n'existe pas)
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
      diaporama: "s1/slides.html", support: "s1/support.html", tp: "s1/tp.html",
      fichiers: [
        { nom: "TP 1 · code de départ en C", chemin: "files/s1/tp1.c", type: "C" },
        { nom: "TP 1 · code de départ en Python", chemin: "files/s1/tp1.py", type: "Python" }
      ]
    },
    {
      n: 2, titre: "Structures linéaires", duree: "3 h · cours, TD et TP", statut: "disponible",
      resume: "Rappel de la mémoire en C, pointeurs, malloc et free, listes chaînées, piles et files.",
      diaporama: "s2/slides.html", support: "s2/support.html", tp: "s2/tp.html",
      fichiers: [
        { nom: "TP 2 · code de départ en C", chemin: "files/s2/tp2.c", type: "C" }
      ]
    },
    {
      n: 3, titre: "Arbres, tas et files de priorité", duree: "3 h · cours, TD et TP", statut: "disponible",
      resume: "Arbres binaires, parcours, arbres binaires de recherche, tas et file de priorité.",
      diaporama: "s3/slides.html", support: "s3/support.html", tp: "s3/tp.html",
      fichiers: [
        { nom: "TP 3 · code de départ en C", chemin: "files/s3/tp3.c", type: "C" }
      ]
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
