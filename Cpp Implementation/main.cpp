#include "SuffixTree.h"

void capitalizeString(string &s) {
    for (char &i: s) {
        if (i >= 'a' && i <= 'z')
            i = i - 'a' + 'A';
    }
}

int main() {
    string input;
    cout << "Ingrese la cadena (se agregara '$' al final): ";
    cin >> input;
    capitalizeString(input);
    input.push_back('$');

    // Algorithm 1: Construction
    SuffixTree st(input);

    cout << "Suffix Tree construido." << endl;

    // Algorithm to print the tree
    st.printTree();

    // Algorithm 8: Search (string matching)
    string pattern;
    cout << "Ingrese la cadena a buscar: ";
    cin >> pattern;
    capitalizeString(pattern);
    bool found = st.search(pattern);
    if (found) {
        cout << "La cadena " << pattern << " está en la cadena original." << endl;
    } else {
        cout << "La cadena " << pattern << " no está en la cadena original." << endl;
    }

    // Algorithm 9: Find all occurrences
    string substring;
    cout << "Ingrese la cadena a buscar: ";
    cin >> substring;
    capitalizeString(substring);
    cout << "Encontrar todas las ocurrencias de la cadena " << substring << " en la cadena original:" << endl;
    vector<int> positions = st.findAllMatches(substring);
    if (positions.empty()) {
        cout << "El patron no se encontro en el texto." << endl;
    } else {
        cout << "El patron se encontro en las posiciones: ";
        for (const int pos: positions)
            cout << pos << " ";
        cout << endl;
    }

    // Algorithm 10: Longest repeated substring
    string lrs;
    lrs = st.longestRepeatedSubstring();
    if (lrs.empty()) {
        cout << "No hay subcadenas repetidas." << endl;
    } else {
        cout << "La subcadena repetida más larga es: " << lrs << endl;
    }

    // Algorithm 11: Shortest unique substring
    string sus;
    sus = st.shortestUniqueSubstring();
    if (sus.empty()) {
        cout << "No hay subcadenas únicas." << endl;
    } else {
        cout << "La subcadena única más corta es: " << sus << endl;
    }

    return 0;
}
