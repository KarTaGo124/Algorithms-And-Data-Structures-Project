#include "SuffixTree.h"

void capitalizeString(string &s) {
    for (char &i: s) {
        if (i >= 'a' && i <= 'z')
            i = i - 'a' + 'A';
    }
}

int main() {
    string input;
    cout << "Suffix Tree Demo\nConstruccion:\nIngrese la cadena a construir: ";
    cin >> input;
    capitalizeString(input);
    input.push_back('$');

    // Algorithm 1: Construction
    SuffixTree st(input);

    // Algorithm to print the tree
    st.printTree();

    // Algorithm 8: Search (string matching)
    string pattern;
    cout << "\nString Matching:\nIngrese la cadena a buscar: ";
    cin >> pattern;
    capitalizeString(pattern);
    if (st.search(pattern)) {
        cout << "El patron '" << pattern << "' fue encontrado. \n";
    } else {
        cout << "El patron '" << pattern << "' no fue encontrado. \n";
    }

    // Algorithm 9: Find all occurrences
    string substring;
    cout << "\nFind all occurrences:\nIngrese el patron a buscar: ";
    cin >> substring;
    capitalizeString(substring);
    vector<int> positions = st.findAllMatches(substring);
    if (positions.empty()) {
        cout << "El patron '" << substring << "' no se encontro en el texto.\n";
    } else {
        cout << "El patron '" << substring << "' se encontro en las posiciones: ";
        for (const int pos: positions)
            cout << pos << ' ';
        cout << '\n';
    }

    // Algorithm 10: Longest repeated substring
    const string lrs = st.longestRepeatedSubstring();
    cout << "\nLongest Repeated Substring:\n";
    if (lrs.empty()) {
        cout << "No hay subcadenas repetidas." << '\n';
    } else {
        cout << "La subcadena repetida mas larga es: " << lrs << '\n';
    }

    // Algorithm 11: Shortest unique substring
    const string sus = st.shortestUniqueSubstring();
    cout << "\nShortest Unique Substring:\n";
    if (sus.empty()) {
        cout << "No hay subcadenas únicas." << '\n';
    } else {
        cout << "La subcadena unica mas corta es: " << sus << '\n';
    }

    return 0;
}
