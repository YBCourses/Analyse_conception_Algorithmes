"""TP 1 - Mesurer la complexité  (code de départ)
Exécution : python tp1.py     (ou python3 tp1.py)"""
import random
import time

compteur = 0                      # nombre de comparaisons effectuées


def recherche_sequentielle(t, x):
    """Indice de x dans t, ou -1."""
    global compteur
    for i in range(len(t)):
        compteur += 1             # une comparaison
        if t[i] == x:
            return i
    return -1


def recherche_dichotomique(t, x):
    """Indice de x dans t (t doit être TRIÉ), ou -1."""
    global compteur
    debut, fin = 0, len(t) - 1
    while debut <= fin:
        milieu = (debut + fin) // 2
        # TODO 1 : comptez ici une comparaison (une seule ligne à ajouter)
        if t[milieu] == x:
            return milieu
        elif t[milieu] < x:
            debut = milieu + 1
        else:
            fin = milieu - 1
    return -1


def tri_insertion(t):
    for i in range(1, len(t)):
        # TODO 2 : insérer t[i] à sa place parmi t[0..i-1] (déjà triés).
        # Idée : mettre t[i] de côté dans "cle", décaler vers la droite tous les
        # éléments plus grands que "cle", puis poser "cle" dans le trou.
        pass


def fib(n):
    return n if n <= 1 else fib(n - 1) + fib(n - 2)


def tableau_trie(n):
    return [2 * i for i in range(n)]            # 0, 2, 4, ...


def tableau_aleatoire(n):
    return [random.randrange(10 ** 9) for _ in range(n)]


def ms_depuis(debut):
    return (time.perf_counter() - debut) * 1000


def partie1():
    """Compter les comparaisons. On cherche x = 2n+1 : absent et plus grand que tous (pire cas)."""
    global compteur
    print("Partie 1 : comparaisons au pire cas")
    print("%10s %14s %14s" % ("n", "sequentielle", "dichotomique"))
    for n in (16, 1024, 1000000):
        t = tableau_trie(n)
        compteur = 0
        recherche_sequentielle(t, 2 * n + 1)
        a = compteur
        compteur = 0
        recherche_dichotomique(t, 2 * n + 1)
        b = compteur
        print("%10d %14d %14d" % (n, a, b))


def partie2():
    """Mesurer le temps d'une recherche, en millisecondes."""
    print("Partie 2 : temps par recherche (ms)")
    print("%10s %16s %16s" % ("n", "sequentielle", "dichotomique"))
    for n in (100000, 1000000, 5000000):
        t = tableau_trie(n)
        reps_seq = max(1, 3000000 // n)
        reps_dic = 100000
        d = time.perf_counter()
        for _ in range(reps_seq):
            recherche_sequentielle(t, 2 * n + 1)
        ts = ms_depuis(d) / reps_seq
        d = time.perf_counter()
        for _ in range(reps_dic):
            recherche_dichotomique(t, 2 * n + 1)
        td = ms_depuis(d) / reps_dic
        print("%10d %16.6f %16.6f" % (n, ts, td))


def partie3():
    """Tri par insertion : on double n."""
    print("Partie 3 : tri par insertion (ms)")
    print("%10s %12s %10s" % ("n", "temps", "rapport"))
    prec = 0
    n = 1000
    while n <= 8000:
        total = 0
        for _ in range(2):
            t = tableau_aleatoire(n)
            d = time.perf_counter()
            tri_insertion(t)
            total += ms_depuis(d)
        total /= 2
        print("%10d %12.2f %10s" % (n, total, ("%.2f" % (total / prec)) if prec else "-"))
        prec = total
        n *= 2


def partie4():
    """Bonus : Fibonacci récursif."""
    print("Partie 4 : fib(n) recursif (ms)")
    for n in range(20, 33, 2):
        d = time.perf_counter()
        v = fib(n)
        print("fib(%d) = %d : %.1f ms" % (n, v, ms_depuis(d)))


if __name__ == "__main__":
    random.seed(12345)
    partie1()

    # Au fil du TP, activez les parties suivantes une par une (supprimez le # devant) :
    # partie2()
    # partie3()
    # partie4()    # bonus
