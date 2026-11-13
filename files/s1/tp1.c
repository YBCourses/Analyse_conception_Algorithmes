/* TP 1 - Mesurer la complexité  (code de départ)
   Compilation : gcc tp1.c -o tp1 -O0
   Exécution   : ./tp1   (Windows : tp1.exe) */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

long compteur = 0;                     /* nombre de comparaisons effectuées */

/* ---------- Recherche séquentielle : indice de x dans t[0..n-1], ou -1 ---------- */
int recherche_sequentielle(int t[], int n, int x) {
    int i;
    for (i = 0; i < n; i++) {
        compteur++;                    /* une comparaison */
        if (t[i] == x) return i;
    }
    return -1;
}

/* ---------- Recherche dichotomique : t doit être TRIÉ ---------- */
int recherche_dichotomique(int t[], int n, int x) {
    int debut = 0, fin = n - 1, milieu;
    while (debut <= fin) {
        milieu = (debut + fin) / 2;
        /* TODO 1 : comptez ici une comparaison (une seule ligne à ajouter) */
        if (t[milieu] == x) return milieu;
        else if (t[milieu] < x) debut = milieu + 1;
        else fin = milieu - 1;
    }
    return -1;
}

/* ---------- Tri par insertion ---------- */
void tri_insertion(int t[], int n) {
    int i, j, cle;
    for (i = 1; i < n; i++) {
        /* TODO 2 : insérer t[i] à sa place parmi t[0..i-1] (déjà triés).
           Idée : mettre t[i] de côté dans "cle", décaler vers la droite tous les
           éléments plus grands que "cle", puis poser "cle" dans le trou. */
    }
}

/* ---------- Fibonacci récursif (partie 4, bonus) ---------- */
long fib(int n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }

/* ---------- Outils ---------- */
int *tableau_trie(int n) {
    int *t = (int *)malloc(n * sizeof(int)), i;
    for (i = 0; i < n; i++) t[i] = 2 * i;          /* 0, 2, 4, ... */
    return t;
}
int *tableau_aleatoire(int n) {
    int *t = (int *)malloc(n * sizeof(int)), i;
    for (i = 0; i < n; i++) t[i] = (rand() << 15) | rand();
    return t;
}
double ms_depuis(clock_t debut) { return 1000.0 * (double)(clock() - debut) / CLOCKS_PER_SEC; }

/* ---------- Partie 1 : compter les comparaisons ----------
   On cherche x = 2n+1 : il est ABSENT et plus grand que tous les éléments (tableau 0, 2, 4, ...).
   C'est le pire cas pour les deux méthodes. */
void partie1(void) {
    int tailles[] = {16, 1024, 1000000}, k;
    printf("Partie 1 : comparaisons au pire cas\n");
    printf("%10s %14s %14s\n", "n", "sequentielle", "dichotomique");
    for (k = 0; k < 3; k++) {
        int n = tailles[k];
        int *t = tableau_trie(n);
        long a, b;
        compteur = 0; recherche_sequentielle(t, n, 2 * n + 1); a = compteur;
        compteur = 0; recherche_dichotomique(t, n, 2 * n + 1); b = compteur;
        printf("%10d %14ld %14ld\n", n, a, b);
        free(t);
    }
}

/* ---------- Partie 2 : mesurer le temps d'une recherche (en millisecondes) ---------- */
void partie2(void) {
    int tailles[] = {100000, 1000000, 10000000}, k, r;
    printf("Partie 2 : temps par recherche (ms)\n");
    printf("%10s %16s %16s\n", "n", "sequentielle", "dichotomique");
    for (k = 0; k < 3; k++) {
        int n = tailles[k];
        int *t = tableau_trie(n);
        int reps_seq = 200000000 / n, reps_dic = 2000000;
        clock_t d;
        double ts, td;
        d = clock(); for (r = 0; r < reps_seq; r++) recherche_sequentielle(t, n, 2 * n + 1); ts = ms_depuis(d) / reps_seq;
        d = clock(); for (r = 0; r < reps_dic; r++) recherche_dichotomique(t, n, 2 * n + 1); td = ms_depuis(d) / reps_dic;
        printf("%10d %16.6f %16.6f\n", n, ts, td);
        free(t);
    }
}

/* ---------- Partie 3 : tri par insertion, on double n ---------- */
void partie3(void) {
    int n, reps, r;
    double prec = 0;
    printf("Partie 3 : tri par insertion (ms)\n");
    printf("%10s %12s %10s\n", "n", "temps", "rapport");
    for (n = 4000; n <= 32000; n *= 2) {
        double total = 0;
        reps = 3;
        for (r = 0; r < reps; r++) {
            int *t = tableau_aleatoire(n);
            clock_t d = clock();
            tri_insertion(t, n);
            total += ms_depuis(d);
            free(t);
        }
        total /= reps;
        if (prec > 0) printf("%10d %12.2f %10.2f\n", n, total, total / prec);
        else printf("%10d %12.2f %10s\n", n, total, "-");
        prec = total;
    }
}

/* ---------- Partie 4 (bonus) : Fibonacci récursif ---------- */
void partie4(void) {
    int n;
    double prec = 0;
    printf("Partie 4 : fib(n) recursif (ms)\n");
    for (n = 30; n <= 40; n += 2) {
        clock_t d = clock();
        long v = fib(n);
        double t = ms_depuis(d);
        printf("fib(%d) = %ld : %.1f ms%s\n", n, v, t, prec > 0 ? "" : "");
        prec = t;
    }
}

int main(void) {
    srand(12345);
    partie1();

    /* Au fil du TP, activez les parties suivantes une par une (supprimez les marques de commentaire) : */
    /* partie2(); */
    /* partie3(); */
    /* partie4(); */   /* bonus */
    return 0;
}
