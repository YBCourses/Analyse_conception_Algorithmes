/* TP 3 - Arbres binaires de recherche et tas en C  (code de départ)
   Compilation : gcc tp3.c -o tp3 -O0 -Wall
   Exécution   : ./tp3   (Windows : tp3.exe) */
#include <stdio.h>
#include <stdlib.h>

typedef struct Noeud {
    int valeur;
    struct Noeud *gauche;
    struct Noeud *droit;
} Noeud;

int nb_malloc = 0, nb_free = 0;        /* pour vérifier qu'il n'y a pas de fuite */
int nb_comp = 0;                       /* nombre de nœuds examinés par abr_chercher */
int nb_echanges = 0;                   /* nombre d'échanges faits dans le tas */

/* ---------- Outils fournis ---------- */
Noeud *creer_noeud(int v) {
    Noeud *n = (Noeud *)malloc(sizeof(Noeud));
    nb_malloc++;
    n->valeur = v;
    n->gauche = NULL;
    n->droit = NULL;
    return n;
}

void prefixe(Noeud *a) {               /* racine, gauche, droite */
    if (a == NULL) return;
    printf("%d ", a->valeur);
    prefixe(a->gauche);
    prefixe(a->droit);
}

void infixe(Noeud *a) {                /* gauche, racine, droite */
    if (a == NULL) return;
    infixe(a->gauche);
    printf("%d ", a->valeur);
    infixe(a->droit);
}

/* ---------- TODO 1 : insertion dans un ABR ---------- */
Noeud *abr_inserer(Noeud *a, int v) {
    /* TODO 1 : insérer v dans l'ABR de racine a, et renvoyer la racine de l'arbre obtenu.
       Récursivité, en trois cas :
         - a est NULL : l'arbre est vide, renvoyer un nouveau nœud creer_noeud(v)
         - v < a->valeur : le nœud doit aller à gauche, donc  a->gauche = abr_inserer(a->gauche, v);
         - v > a->valeur : même chose à droite
       Si v est déjà présent, ne rien faire (pas de doublon).
       Dans tous les cas, finir par : return a;  */
    return NULL;
}

/* ---------- TODO 2 : recherche dans un ABR ---------- */
Noeud *abr_chercher(Noeud *a, int v) {
    /* TODO 2 : renvoyer le nœud de valeur v, ou NULL s'il est absent.
       À chaque nœud NON NULL examiné, faites  nb_comp++  (c'est notre mesure du coût).
         - v == a->valeur : trouvé, renvoyer a
         - v <  a->valeur : continuer à gauche
         - sinon          : continuer à droite
       Version itérative (boucle while) ou récursive, au choix. */
    return NULL;
}

/* ---------- TODO 3 : hauteur d'un arbre ---------- */
int hauteur(Noeud *a) {
    /* TODO 3 : hauteur de l'arbre a = nombre d'arêtes du plus long chemin racine -> feuille.
         - arbre vide : -1
         - sinon : 1 + le maximum des hauteurs des sous-arbres gauche et droit
       Vérification : une feuille a pour hauteur 0. */
    return 0;
}

/* ---------- TODO 4 : libérer tout l'arbre ---------- */
void liberer(Noeud *a) {
    /* TODO 4 : libérer tous les nœuds de l'arbre a (et faire nb_free++ à chaque free).
       Parcours POSTFIXE : on libère d'abord les deux sous-arbres, puis la racine.
       Pourquoi pas l'inverse ? Après free(a), a->gauche n'est plus lisible ! */
}

/* ---------- Le tas (tas-min dans un tableau) ---------- */
#define MAX 100
typedef struct {
    int t[MAX];
    int n;                             /* nombre d'éléments présents */
} Tas;

void tas_init(Tas *h) { h->n = 0; }

void echanger(int *x, int *y) { int tmp = *x; *x = *y; *y = tmp; }

void afficher_tas(Tas *h) {
    int i;
    printf("[");
    for (i = 0; i < h->n; i++) printf("%s%d", i ? " " : "", h->t[i]);
    printf("]\n");
}

/* ---------- TODO 5 : insertion dans le tas ---------- */
void tas_inserer(Tas *h, int v) {
    /* TODO 5 : insérer v dans le tas h.
         1. écrire v dans la première case libre h->t[h->n], puis h->n++
         2. REMONTER : tant que la case i n'est pas la racine (i > 0) et que son parent
            h->t[(i-1)/2] est PLUS GRAND que h->t[i] : échanger les deux
            (echanger(&h->t[i], &h->t[(i-1)/2]);  nb_echanges++;), puis i = (i-1)/2.
       Si h est plein (h->n == MAX), ne rien faire. */
}

/* ---------- TODO 6 : extraction du minimum ---------- */
int tas_extraire_min(Tas *h) {
    /* TODO 6 : retirer et renvoyer le plus petit élément (on suppose h->n > 0).
         1. mémoriser le minimum : h->t[0]
         2. h->n--, puis recopier le DERNIER élément (h->t[h->n]) dans h->t[0]
         3. DESCENDRE depuis i = 0 : calculer les fils g = 2*i+1 et d = 2*i+2 (s'ils existent,
            c'est-à-dire < h->n), repérer le plus petit des trois (i, g, d). S'il n'est pas i,
            échanger (nb_echanges++) et continuer depuis cette case ; sinon, arrêter.
         4. renvoyer le minimum mémorisé */
    return -1;
}

/* ====================== Expériences (fournies) ====================== */
static void afficher_noeud(const char *nom, Noeud *n) {
    printf("%-8s adresse %p | valeur %d | gauche %p | droit %p\n", nom, (void *)n, n->valeur, (void *)n->gauche, (void *)n->droit);
}

void partie1(void) {
    Noeud *r = creer_noeud(8), *g = creer_noeud(3), *d = creer_noeud(10);
    Noeud *gg = creer_noeud(1), *gd = creer_noeud(6);
    r->gauche = g;  r->droit = d;
    g->gauche = gg; g->droit = gd;
    printf("== Partie 1 : un arbre construit à la main ==\n");
    afficher_noeud("racine", r);
    afficher_noeud("g", g);
    afficher_noeud("d", d);
    afficher_noeud("gg", gg);
    afficher_noeud("gd", gd);
    printf("sizeof(Noeud) = %d, sizeof(Noeud *) = %d\n", (int)sizeof(Noeud), (int)sizeof(Noeud *));
    printf("prefixe : "); prefixe(r); printf("\n");
    printf("infixe  : "); infixe(r); printf("\n");
    /* libération à la main (liberer est le TODO 4, pas encore écrit) */
    free(gg); free(gd); free(g); free(d); free(r);
    nb_free += 5;
    printf("malloc = %d, free = %d\n", nb_malloc, nb_free);
}

static void chercher_et_compter(Noeud *r, int v) {
    Noeud *x;
    nb_comp = 0;
    x = abr_chercher(r, v);
    printf("chercher %d : %s, %d comparaisons\n", v, x ? "trouvé" : "absent", nb_comp);
}

void partie2(void) {
    int vals[7] = {50, 30, 70, 20, 40, 60, 80};
    int i;
    Noeud *r = NULL;
    printf("== Partie 2 : l'arbre binaire de recherche ==\n");
    for (i = 0; i < 7; i++) r = abr_inserer(r, vals[i]);
    printf("infixe  : "); infixe(r); printf("\n");
    printf("prefixe : "); prefixe(r); printf("\n");
    printf("hauteur : %d\n", hauteur(r));
    chercher_et_compter(r, 60);
    chercher_et_compter(r, 65);
    chercher_et_compter(r, 50);
    r = abr_inserer(r, 40);                      /* doublon : l'arbre ne change pas */
    r = abr_inserer(r, 65);
    printf("après insertion de 40 (doublon) et 65 : "); infixe(r); printf("\n");
    printf("hauteur de l'arbre vide : %d, d'une feuille : %d\n", hauteur(NULL), hauteur(abr_chercher(r, 80)));
    liberer(r);
    printf("malloc = %d, free = %d\n", nb_malloc, nb_free);
}

static unsigned long graine = 12345;
static int alea(int m) {                         /* petit générateur déterministe */
    graine = (graine * 1103515245UL + 12345UL) & 0x7fffffffUL;
    return (int)((graine >> 8) % (unsigned long)m);
}

static void mesurer(int n, int melange, int *haut, double *moy) {
    int *v = (int *)malloc(n * sizeof(int)), i, total = 0;
    Noeud *r = NULL;
    for (i = 0; i < n; i++) v[i] = i + 1;
    if (melange) for (i = n - 1; i > 0; i--) { int j = alea(i + 1), tmp = v[i]; v[i] = v[j]; v[j] = tmp; }
    for (i = 0; i < n; i++) r = abr_inserer(r, v[i]);
    *haut = hauteur(r);
    for (i = 1; i <= n; i++) { nb_comp = 0; abr_chercher(r, i); total += nb_comp; }
    *moy = (double)total / n;
    liberer(r);
    free(v);
}

void partie3(void) {
    int tailles[4] = {7, 31, 127, 1023}, k;
    printf("== Partie 3 : l'ordre d'insertion compte ==\n");
    printf("%6s | %-22s | %-22s | %s\n", "n", "ordre croissant", "ordre mélangé", "minimum possible");
    printf("%6s | %-10s %-11s | %-10s %-11s | %s\n", "", "hauteur", "comp. moy.", "hauteur", "comp. moy.", "hauteur");
    for (k = 0; k < 4; k++) {
        int n = tailles[k], h1, h2, hmin = 0, cap = 1;
        double m1, m2;
        mesurer(n, 0, &h1, &m1);
        mesurer(n, 1, &h2, &m2);
        while (cap < n + 1) { cap *= 2; hmin++; }         /* hmin = ceil(log2(n+1)) */
        printf("%6d | %-10d %-11.1f | %-10d %-11.1f | %d\n", n, h1, m1, h2, m2, hmin - 1);
    }
}

void partie4(void) {
    int v[10] = {42, 17, 8, 23, 4, 15, 16, 9, 30, 2};
    int i, ok = 1, prec = -1;
    Tas h;
    tas_init(&h);
    printf("== Partie 4 : le tas ==\n");
    for (i = 0; i < 4; i++) tas_inserer(&h, v[i]);
    printf("après 4 insertions (42 17 8 23) : "); afficher_tas(&h);
    for (i = 4; i < 10; i++) tas_inserer(&h, v[i]);
    printf("après 10 insertions            : "); afficher_tas(&h);
    printf("échanges pendant les insertions : %d\n", nb_echanges);
    printf("minimum : %d (case 0)\n", h.t[0]);
    nb_echanges = 0;
    printf("extractions :");
    while (h.n > 0) {
        int m = tas_extraire_min(&h);
        printf(" %d", m);
        if (m < prec) ok = 0;
        prec = m;
    }
    printf("\n");
    printf("sortie triée : %s, échanges pendant les extractions : %d\n", ok ? "oui" : "NON", nb_echanges);
}

int main(void) {
    partie1();

    /* Au fil du TP, activez les parties suivantes une par une (supprimez les marques de commentaire) : */
    /* printf("\n"); partie2(); */
    /* printf("\n"); partie3(); */
    /* printf("\n"); partie4(); */
    return 0;
}
