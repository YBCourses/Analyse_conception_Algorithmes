/* TP 2 - Listes chaînées, piles et files en C  (code de départ)
   Compilation : gcc tp2.c -o tp2 -O0 -Wall
   Exécution   : ./tp2   (Windows : tp2.exe) */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

typedef struct Noeud {
    int valeur;
    struct Noeud *suivant;
} Noeud;

long nb_malloc = 0, nb_free = 0;       /* pour vérifier qu'il n'y a pas de fuite */

/* ---------- Outils fournis ---------- */
Noeud *creer_noeud(int v) {
    Noeud *n = (Noeud *)malloc(sizeof(Noeud));
    nb_malloc++;
    n->valeur = v;
    n->suivant = NULL;
    return n;
}

void afficher(Noeud *tete) {
    Noeud *c;
    for (c = tete; c != NULL; c = c->suivant) printf("%d -> ", c->valeur);
    printf("NULL\n");
}

int longueur(Noeud *tete) {
    int n = 0;
    while (tete != NULL) { n++; tete = tete->suivant; }
    return n;
}

Noeud *rechercher(Noeud *tete, int x) {
    while (tete != NULL && tete->valeur != x) tete = tete->suivant;
    return tete;                       /* NULL si absent */
}

/* ---------- TODO 1 : insertion en tête ---------- */
void inserer_tete(Noeud **tete, int v) {
    /* TODO 1 : insérer un nouveau nœud de valeur v au DÉBUT de la liste.
       Trois instructions suffisent, dans le bon ordre :
         1. créer le nœud avec creer_noeud(v)
         2. faire désigner par son champ suivant l'ancien premier nœud (*tete)
         3. faire désigner ce nouveau nœud par *tete
       Attention : si vous inversez 2 et 3, vous perdez la liste ! */
}

/* ---------- TODO 2 : suppression de la première occurrence de x ---------- */
int supprimer(Noeud **tete, int x) {
    /* TODO 2 : supprimer la première occurrence de x ; renvoyer 1 si elle existait, 0 sinon.
       Idée : parcourir avec deux pointeurs, prec (le nœud avant) et cour (le nœud courant).
         - si cour est NULL : x est absent, renvoyer 0
         - si prec est NULL : on supprime le premier, *tete doit désigner cour->suivant
         - sinon : prec->suivant doit désigner cour->suivant
       Puis libérer cour avec free, et compter : nb_free++ */
    return 0;
}

/* ---------- TODO 3 : libérer toute la liste ---------- */
void liberer(Noeud **tete) {
    /* TODO 3 : libérer tous les nœuds, puis mettre *tete à NULL.
       Piège : lisez cour->suivant AVANT de faire free(cour).
       N'oubliez pas nb_free++ à chaque free. */
}

/* ---------- Pile de caractères (tableau) : fournie ---------- */
#define MAX 1000
char pile[MAX];
int sommet = -1;
void empiler(char c) { pile[++sommet] = c; }
char depiler(void) { return pile[sommet--]; }
int est_vide(void) { return sommet < 0; }

/* ---------- TODO 4 : expression bien parenthésée ? ---------- */
int bien_parenthesee(const char *s) {
    /* TODO 4 : renvoyer 1 si l'expression s est bien parenthésée, 0 sinon.
       Utilisez la pile fournie (empiler, depiler, est_vide). Pensez à repartir de sommet = -1.
         - ouvrante ( [ { : on empile
         - fermante ) ] } : si la pile est vide, renvoyer 0 ; sinon dépiler et vérifier la correspondance
         - les autres caractères sont ignorés
       À la fin, la pile doit être vide. */
    return 0;
}

/* ---------- File (liste chaînée avec tete et queue) : outils fournis ---------- */
typedef struct {
    Noeud *tete;                       /* premier nœud : celui qui sortira en premier */
    Noeud *queue;                      /* dernier nœud : le dernier arrivé */
} File;

void file_init(File *f) { f->tete = NULL; f->queue = NULL; }
int file_est_vide(const File *f) { return f->tete == NULL; }

void afficher_file(const File *f) {
    Noeud *c;
    printf("tete -> ");
    for (c = f->tete; c != NULL; c = c->suivant) printf("%d -> ", c->valeur);
    printf("NULL");
    if (f->queue != NULL) printf("   (queue = %d)", f->queue->valeur);
    printf("\n");
}

/* ---------- TODO 5 : enfiler ---------- */
void file_enfiler(File *f, int v) {
    /* TODO 5 : ajouter v à la FIN de la file, en temps constant (sans parcourir la liste).
         1. créer le nœud avec creer_noeud(v)   (son champ suivant vaut déjà NULL)
         2. si la file est vide (f->queue == NULL) : f->tete doit désigner le nouveau nœud
            sinon : le champ suivant de l'ancien dernier nœud (f->queue) doit désigner le nouveau nœud
         3. f->queue doit désigner le nouveau nœud */
}

/* ---------- TODO 6 : défiler ---------- */
int file_defiler(File *f, int *x) {
    /* TODO 6 : retirer le PREMIER nœud. Renvoyer 0 si la file est vide (sans rien modifier),
       sinon ranger sa valeur dans *x et renvoyer 1.
         1. garder l'adresse du premier nœud dans une variable temp
         2. lire sa valeur dans *x
         3. avancer : f->tete désigne temp->suivant
         4. si la file est devenue vide (f->tete == NULL) : f->queue doit valoir NULL aussi
         5. libérer temp avec free, et compter : nb_free++ */
    return 0;
}

/* ---------- Partie 1 : observer la mémoire ---------- */
void partie1(void) {
    int a = 5;
    int *p = &a;
    Noeud *n1 = creer_noeud(1), *n2 = creer_noeud(2), *n3 = creer_noeud(3);
    printf("Partie 1 : observer la memoire\n");
    printf("adresse de a   : %p\n", (void *)&a);
    printf("valeur de p    : %p   (p = &a)\n", (void *)p);
    printf("*p             : %d\n", *p);
    printf("adresse de n1  : %p\n", (void *)n1);
    printf("adresse de n2  : %p\n", (void *)n2);
    printf("adresse de n3  : %p\n", (void *)n3);
    printf("n2 - n1 (octets) : %ld\n", (long)((char *)n2 - (char *)n1));
    printf("n3 - n2 (octets) : %ld\n", (long)((char *)n3 - (char *)n2));
    printf("sizeof(int)      : %lu\n", (unsigned long)sizeof(int));
    printf("sizeof(Noeud *)  : %lu\n", (unsigned long)sizeof(Noeud *));
    printf("sizeof(Noeud)    : %lu\n", (unsigned long)sizeof(Noeud));
    free(n1); free(n2); free(n3); nb_free += 3;
}

/* ---------- Partie 2 : tester la liste ---------- */
void partie2(void) {
    int v;
    Noeud *tete = NULL;
    printf("Partie 2 : tester la liste\n");
    for (v = 1; v <= 5; v++) inserer_tete(&tete, v);
    printf("apres 5 insertions en tete (1 a 5) : "); afficher(tete);
    printf("longueur : %d\n", longueur(tete));
    printf("supprimer(3)  -> %d : ", supprimer(&tete, 3)); afficher(tete);
    printf("supprimer(5)  -> %d : ", supprimer(&tete, 5)); afficher(tete);
    printf("supprimer(1)  -> %d : ", supprimer(&tete, 1)); afficher(tete);
    printf("supprimer(42) -> %d : ", supprimer(&tete, 42)); afficher(tete);
    printf("rechercher(4) -> %s\n", rechercher(tete, 4) != NULL ? "trouve" : "absent");
    liberer(&tete);
    printf("apres liberer : "); afficher(tete);
    printf("malloc = %ld, free = %ld  (doivent etre egaux : pas de fuite)\n", nb_malloc, nb_free);
}

/* ---------- Partie 3 : mesurer liste contre tableau ---------- */
double ms_depuis(clock_t d) { return 1000.0 * (double)(clock() - d) / CLOCKS_PER_SEC; }

/* Une construction de n nœuds est trop courte pour l'horloge : on la répète, puis on divise. */
double chrono_liste(int n) {
    int i, r, reps = 4000000 / n;
    Noeud *t = NULL;
    double total = 0;
    for (r = 0; r < reps; r++) {
        clock_t d = clock();
        for (i = 0; i < n; i++) inserer_tete(&t, i);
        total += ms_depuis(d);
        liberer(&t);
    }
    return total / reps;                /* ms pour construire une liste de n nœuds */
}

double chrono_tableau(int n) {
    int i, j, taille = 0;
    int *t = (int *)malloc(n * sizeof(int));
    clock_t d = clock();
    for (i = 0; i < n; i++) {
        for (j = taille; j > 0; j--) t[j] = t[j - 1];     /* decaler tout vers la droite */
        t[0] = i;
        taille++;
    }
    {
        double ms = ms_depuis(d);
        free(t);
        return ms;
    }
}

void partie3(void) {
    int tailles[] = {5000, 10000, 20000, 40000}, k;
    double pl = 0, pt = 0;
    printf("Partie 3 : n insertions en tete (ms)\n");
    printf("%8s %12s %10s %12s %10s\n", "n", "liste", "rapport", "tableau", "rapport");
    for (k = 0; k < 4; k++) {
        int n = tailles[k];
        double l = chrono_liste(n), t = chrono_tableau(n);
        if (k == 0) printf("%8d %12.3f %10s %12.3f %10s\n", n, l, "-", t, "-");
        else printf("%8d %12.3f %10.2f %12.3f %10.2f\n", n, l, pl > 0 ? l / pl : 0.0, t, pt > 0 ? t / pt : 0.0);
        pl = l; pt = t;
    }
}

/* ---------- Partie 4 : parenthèses ---------- */
void partie4(void) {
    const char *tests[] = {"([]{})", "([)]", "((a+b)*c", "{[()()]}", "())", "x + y"};
    int k;
    printf("Partie 4 : parentheses\n");
    for (k = 0; k < 6; k++) printf("%-12s -> %s\n", tests[k], bien_parenthesee(tests[k]) ? "bien parenthesee" : "mal parenthesee");
}

/* ---------- Partie 5 : une file ---------- */
void partie5(void) {
    File f;
    int x, k, r;
    printf("Partie 5 : une file\n");
    file_init(&f);
    for (k = 1; k <= 4; k++) file_enfiler(&f, k);
    printf("apres enfiler 1, 2, 3, 4 : "); afficher_file(&f);
    if (file_defiler(&f, &x)) printf("defiler -> %d\n", x);
    if (file_defiler(&f, &x)) printf("defiler -> %d\n", x);
    printf("apres 2 defilages        : "); afficher_file(&f);
    file_enfiler(&f, 5);
    printf("apres enfiler 5          : "); afficher_file(&f);
    printf("on vide la file          :");
    while (file_defiler(&f, &x)) printf(" %d", x);
    printf("\n");
    r = file_defiler(&f, &x);
    printf("file vide ? %s   defiler sur une file vide renvoie %d\n", file_est_vide(&f) ? "oui" : "non", r);
    printf("malloc = %ld, free = %ld  (doivent etre egaux : pas de fuite)\n", nb_malloc, nb_free);
}

int main(void) {
    partie1();

    /* Au fil du TP, activez les parties suivantes une par une (supprimez les marques de commentaire) : */
    /* printf("\n"); partie2(); */
    /* printf("\n"); partie3(); */
    /* printf("\n"); partie4(); */
    /* printf("\n"); partie5(); */
    return 0;
}
